import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/AdminSidebar";
import { FileCheck, Eye, Check, X, User, Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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

export default function AdminDocuments() {
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
  const [processing, setProcessing] = useState(false);

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
    selfie: "Selfie"
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
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  };

  const handleViewDocuments = async (verification: Verification) => {
    setSelectedVerification(verification);
    setViewDialogOpen(true);
    await loadUserDocuments(verification.user_id);
  };

  const handleApprove = async (verification: Verification) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('approve_document_verification', { 
        p_user_id: verification.user_id 
      });
      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-document-verification-notification', {
        body: {
          userId: verification.user_id,
          userEmail: verification.user_email,
          status: 'approved'
        }
      });

      toast({
        title: "Sucesso",
        description: "Verificação aprovada com sucesso!"
      });

      setViewDialogOpen(false);
      loadVerifications();
    } catch (error: any) {
      console.error("Error approving:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar verificação",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
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

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('reject_document_verification', { 
        p_user_id: selectedVerification.user_id,
        p_reason: rejectionReason.trim()
      });
      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-document-verification-notification', {
        body: {
          userId: selectedVerification.user_id,
          userEmail: selectedVerification.user_email,
          status: 'rejected',
          reason: rejectionReason.trim()
        }
      });

      toast({
        title: "Sucesso",
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
    } finally {
      setProcessing(false);
    }
  };

  const filteredVerifications = verifications.filter(v => v.status === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Aprovado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejeitado</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = verifications.filter(v => v.status === "pending").length;
  const approvedCount = verifications.filter(v => v.status === "approved").length;
  const rejectedCount = verifications.filter(v => v.status === "rejected").length;

  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="Verificação de Documentos" icon={FileCheck} />
      
      <div className="flex-1 p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Aprovados ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejeitados ({rejectedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVerifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma verificação {activeTab === "pending" ? "pendente" : activeTab === "approved" ? "aprovada" : "rejeitada"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredVerifications.map(verification => (
                  <Card key={verification.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {verification.person_type === "pf" ? (
                              <User className="h-5 w-5 text-primary" />
                            ) : (
                              <Building2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{verification.user_email}</p>
                            <p className="text-sm text-muted-foreground">
                              Tipo: {verification.person_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} | 
                              Documento: {documentTypeLabels[verification.document_type_selected] || verification.document_type_selected}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Enviado: {new Date(verification.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(verification.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDocuments(verification)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Documentos
                          </Button>
                          {verification.status === "pending" && (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => handleApprove(verification)}
                                disabled={processing}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Aprovar
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setRejectDialogOpen(true);
                                }}
                                disabled={processing}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Documents Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Documentos de {selectedVerification?.user_email}</DialogTitle>
            <DialogDescription>
              Tipo: {selectedVerification?.person_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} | 
              Documento: {selectedVerification ? documentTypeLabels[selectedVerification.document_type_selected] || selectedVerification.document_type_selected : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingDocs ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : userDocuments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum documento encontrado
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {userDocuments.map(doc => (
                  <DocumentViewer key={doc.id} document={doc} getSignedUrl={getSignedUrl} />
                ))}
              </div>
            )}
          </div>

          {selectedVerification?.status === "pending" && (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setViewDialogOpen(false)}
              >
                Fechar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={processing}
              >
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
              <Button 
                onClick={() => selectedVerification && handleApprove(selectedVerification)}
                disabled={processing}
              >
                <Check className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Verificação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O usuário receberá essa informação por email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Rejeição</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Documento ilegível, por favor envie novamente em melhor qualidade."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? "Processando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Document Viewer Component
function DocumentViewer({ 
  document, 
  getSignedUrl 
}: { 
  document: UserDocument; 
  getSignedUrl: (path: string) => Promise<string | null>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const documentSideLabels: Record<string, string> = {
    frente: "Frente",
    verso: "Verso",
    selfie: "Selfie",
    cnpj_card: "Cartão CNPJ",
    contrato_social: "Contrato Social"
  };

  useEffect(() => {
    const loadImage = async () => {
      const url = await getSignedUrl(document.file_url);
      setImageUrl(url);
      setLoading(false);
    };
    loadImage();
  }, [document.file_url]);

  const label = document.document_side 
    ? documentSideLabels[document.document_side] 
    : documentSideLabels[document.document_type] || document.document_type;

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-muted"></div>
        ) : imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img 
              src={imageUrl} 
              alt={label}
              className="w-full h-full object-contain hover:scale-105 transition-transform cursor-zoom-in"
            />
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Erro ao carregar
          </div>
        )}
      </div>
    </div>
  );
}
