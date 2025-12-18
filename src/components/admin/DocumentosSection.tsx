import { useState, useEffect } from "react";
import { FileCheck, Eye, Check, X, User, Building2, Clock, CheckCircle, XCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Verification {
  id: string;
  user_id: string;
  user_email: string;
  person_type: string;
  document_type_selected: string;
  status: string;
  created_at: string;
}

interface UserDocument {
  id: string;
  document_type: string;
  document_side: string | null;
  file_url: string;
  created_at: string;
}

export function DocumentosSection() {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const documentTypeLabels: Record<string, string> = {
    rg: "RG",
    cnh: "CNH",
    passaporte: "Passaporte",
    cnpj_card: "Cartão CNPJ",
    contrato_social: "Contrato Social",
    cnpj: "CNPJ + Contrato Social"
  };

  const documentSideLabels: Record<string, string> = {
    frente: "Frente",
    verso: "Verso",
    selfie: "Selfie",
    cnpj_card: "Cartão CNPJ",
    contrato_social: "Contrato Social"
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_verifications');
      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error("Error loading verifications:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar verificações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserDocuments = async (userId: string) => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase.rpc('get_user_documents_admin', { p_user_id: userId });
      if (error) throw error;
      setUserDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive"
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  };

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(filePath, 3600, { download: true });
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting download URL:", error);
      return null;
    }
  };

  const handleViewDocuments = async (verification: Verification) => {
    setSelectedVerification(verification);
    setViewDialogOpen(true);
    await loadUserDocuments(verification.user_id);
  };

  const handleApprove = async (verification: Verification) => {
    setProcessingId(verification.id);
    
    // Show immediate feedback
    const loadingToast = toast({
      title: "Processando...",
      description: "Aprovando documentos e enviando notificação",
    });

    try {
      // Execute RPC call
      const { error } = await supabase.rpc('approve_document_verification', { 
        p_user_id: verification.user_id 
      });
      if (error) throw error;

      // Optimistic update - remove from list immediately
      setVerifications(prev => 
        prev.map(v => v.id === verification.id ? { ...v, status: 'approved' } : v)
      );

      // Fire and forget - don't await email notification
      supabase.functions.invoke('send-document-verification-notification', {
        body: {
          userId: verification.user_id,
          userEmail: verification.user_email,
          status: 'approved'
        }
      }).catch(err => console.error("Email notification error:", err));

      toast({
        title: "✅ Aprovado!",
        description: "Verificação aprovada com sucesso!"
      });

      setViewDialogOpen(false);
      
      // Reload in background
      loadVerifications();
    } catch (error: any) {
      console.error("Error approving:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar verificação",
        variant: "destructive"
      });
      // Revert optimistic update
      loadVerifications();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o motivo da rejeição",
        variant: "destructive"
      });
      return;
    }

    setProcessingId(selectedVerification.id);
    
    toast({
      title: "Processando...",
      description: "Rejeitando documentos e enviando notificação",
    });

    try {
      const { error } = await supabase.rpc('reject_document_verification', { 
        p_user_id: selectedVerification.user_id,
        p_reason: rejectionReason.trim()
      });
      if (error) throw error;

      // Optimistic update
      setVerifications(prev => 
        prev.map(v => v.id === selectedVerification.id ? { ...v, status: 'rejected' } : v)
      );

      // Fire and forget
      supabase.functions.invoke('send-document-verification-notification', {
        body: {
          userId: selectedVerification.user_id,
          userEmail: selectedVerification.user_email,
          status: 'rejected',
          reason: rejectionReason.trim()
        }
      }).catch(err => console.error("Email notification error:", err));

      toast({
        title: "Rejeitado",
        description: "Verificação rejeitada"
      });

      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectionReason("");
      loadVerifications();
    } catch (error: any) {
      console.error("Error rejecting:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar verificação",
        variant: "destructive"
      });
      loadVerifications();
    } finally {
      setProcessingId(null);
    }
  };

  const filteredVerifications = verifications.filter(v => v.status === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">Aprovado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">Rejeitado</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = verifications.filter(v => v.status === "pending").length;
  const approvedCount = verifications.filter(v => v.status === "approved").length;
  const rejectedCount = verifications.filter(v => v.status === "rejected").length;

  const isProcessing = (id: string) => processingId === id;

  return (
    <>
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Documentos KYC
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[400px] space-y-4 sm:space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="w-full sm:w-auto inline-flex min-w-max">
                  <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Pendentes</span>
                    <span className="ml-0.5">({pendingCount})</span>
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Aprovados</span>
                    <span className="ml-0.5">({approvedCount})</span>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Rejeitados</span>
                    <span className="ml-0.5">({rejectedCount})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="mt-4 sm:mt-6">
                {loading ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="animate-pulse">
                      <div className="h-12 bg-muted/50"></div>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 border-t bg-muted/20"></div>
                      ))}
                    </div>
                  </div>
                ) : filteredVerifications.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center border rounded-lg">
                    <FileCheck className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Nenhuma verificação {activeTab === "pending" ? "pendente" : activeTab === "approved" ? "aprovada" : "rejeitada"}
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold">Nome</TableHead>
                            <TableHead className="text-xs font-semibold hidden sm:table-cell">Email</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Tipo</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Documentos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredVerifications.map(verification => (
                            <TableRow key={verification.id} className="hover:bg-muted/30">
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    {verification.person_type === "pf" ? (
                                      <User className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Building2 className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate max-w-[150px] sm:max-w-[200px]">
                                      {verification.user_email.split('@')[0]}
                                    </p>
                                    <p className="text-xs text-muted-foreground sm:hidden truncate max-w-[150px]">
                                      {verification.user_email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                                  {verification.user_email}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant="outline" 
                                  className={verification.person_type === "pf" 
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs" 
                                    : "bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs"
                                  }
                                >
                                  {verification.person_type === "pf" ? "PF" : "PJ"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(verification.status)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs h-8 px-3"
                                  onClick={() => handleViewDocuments(verification)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                                  Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* View Documents Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-sm sm:text-base truncate pr-8">
              Documentos de {selectedVerification?.user_email}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedVerification?.person_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} • {selectedVerification ? documentTypeLabels[selectedVerification.document_type_selected] || selectedVerification.document_type_selected : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {loadingDocs ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : userDocuments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhum documento encontrado
              </p>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {userDocuments.map(doc => (
                  <DocumentViewer key={doc.id} document={doc} getSignedUrl={getSignedUrl} getDownloadUrl={getDownloadUrl} documentSideLabels={documentSideLabels} />
                ))}
              </div>
            )}
          </div>

          {selectedVerification?.status === "pending" && (
            <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setViewDialogOpen(false)}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Fechar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={processingId === selectedVerification.id}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Rejeitar
              </Button>
              <Button 
                onClick={() => selectedVerification && handleApprove(selectedVerification)}
                disabled={processingId === selectedVerification.id}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {processingId === selectedVerification.id ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                {processingId === selectedVerification.id ? "Aprovando..." : "Aprovar"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Rejeitar Verificação</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Informe o motivo da rejeição. O usuário receberá essa informação por email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs sm:text-sm">Motivo da Rejeição</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Documento ilegível, por favor envie novamente em melhor qualidade."
                rows={4}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={!!processingId || !rejectionReason.trim()}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              {processingId ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Rejeição"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Document Viewer Component
function DocumentViewer({ 
  document, 
  getSignedUrl,
  getDownloadUrl,
  documentSideLabels
}: { 
  document: UserDocument; 
  getSignedUrl: (path: string) => Promise<string | null>;
  getDownloadUrl: (path: string) => Promise<string | null>;
  documentSideLabels: Record<string, string>;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const isPdf = document.file_url.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    const loadFile = async () => {
      const url = await getSignedUrl(document.file_url);
      setFileUrl(url);
      setLoading(false);
    };
    loadFile();
  }, [document.file_url]);

  const label = document.document_side 
    ? documentSideLabels[document.document_side] 
    : documentSideLabels[document.document_type] || document.document_type;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const downloadUrl = await getDownloadUrl(document.file_url);
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error("Error downloading:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="aspect-[4/3] bg-muted relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </div>
        ) : fileUrl ? (
          isPdf ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4">
              <FileCheck className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground text-center">Documento PDF</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 text-xs"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                Visualizar PDF
              </Button>
            </div>
          ) : (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
              <img 
                src={fileUrl} 
                alt={label}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
              />
            </a>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs sm:text-sm text-muted-foreground">Erro ao carregar</p>
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3 bg-background flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium">{label}</span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleDownload}
          disabled={downloading || !fileUrl}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          {downloading ? (
            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
