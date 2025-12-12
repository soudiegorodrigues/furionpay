import { useState, useEffect } from "react";
import { Upload, FileCheck, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type PersonType = "pf" | "pj";
type DocumentType = "rg" | "cnh" | "passaporte" | "cnpj_card" | "contrato_social";
type VerificationStatus = "pending" | "approved" | "rejected" | null;

interface VerificationData {
  id: string;
  person_type: PersonType;
  document_type_selected: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface UploadedFile {
  side: string;
  file: File | null;
  preview: string | null;
}

export function DocumentVerificationSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  
  const [personType, setPersonType] = useState<PersonType>("pf");
  const [documentType, setDocumentType] = useState<DocumentType>("rg");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const documentTypeLabels: Record<string, string> = {
    rg: "RG",
    cnh: "CNH",
    passaporte: "Passaporte",
    cnpj_card: "Cartão CNPJ",
    contrato_social: "Contrato Social"
  };

  const getRequiredUploads = () => {
    if (personType === "pf") {
      return [
        { side: "frente", label: "Frente do Documento" },
        { side: "verso", label: "Verso do Documento" },
        { side: "selfie", label: "Selfie segurando o Documento" }
      ];
    }
    return [
      { side: "cnpj_card", label: "Cartão CNPJ" },
      { side: "contrato_social", label: "Contrato Social" }
    ];
  };

  useEffect(() => {
    loadVerificationStatus();
  }, [userId]);

  useEffect(() => {
    const required = getRequiredUploads();
    setUploadedFiles(required.map(r => ({ side: r.side, file: null, preview: null })));
  }, [personType]);

  const loadVerificationStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_verification_status');
      if (error) throw error;
      
      if (data && data.length > 0) {
        setVerification(data[0] as VerificationData);
      }
    } catch (error) {
      console.error("Error loading verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (side: string, file: File | null) => {
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "Arquivo muito grande. Máximo 5MB.",
          variant: "destructive"
        });
        return;
      }

      const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Erro",
          description: "Formato inválido. Use JPG, PNG, WebP ou PDF.",
          variant: "destructive"
        });
        return;
      }
    }

    setUploadedFiles(prev => prev.map(uf => {
      if (uf.side === side) {
        return {
          ...uf,
          file,
          preview: file ? URL.createObjectURL(file) : null
        };
      }
      return uf;
    }));
  };

  const handleSubmit = async () => {
    const allFilesUploaded = uploadedFiles.every(uf => uf.file !== null);
    if (!allFilesUploaded) {
      toast({
        title: "Erro",
        description: "Por favor, envie todos os documentos necessários.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Delete existing documents if re-submitting
      if (verification?.status === "rejected") {
        await supabase.from("user_documents").delete().eq("user_id", userId);
        await supabase.from("user_verification").delete().eq("user_id", userId);
      }

      // Upload each file
      for (const uf of uploadedFiles) {
        if (!uf.file) continue;

        const fileExt = uf.file.name.split(".").pop();
        const filePath = `${userId}/${Date.now()}_${uf.side}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("user-documents")
          .upload(filePath, uf.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("user-documents")
          .getPublicUrl(filePath);

        // Insert document record
        const { error: docError } = await supabase.from("user_documents").insert({
          user_id: userId,
          person_type: personType,
          document_type: personType === "pf" ? documentType : uf.side,
          document_side: personType === "pf" ? uf.side : null,
          file_url: filePath // Store path, not public URL (bucket is private)
        });

        if (docError) throw docError;
      }

      // Create verification record
      const { error: verError } = await supabase.from("user_verification").insert({
        user_id: userId,
        person_type: personType,
        document_type_selected: personType === "pf" ? documentType : "cnpj",
        status: "pending"
      });

      if (verError) throw verError;

      toast({
        title: "Sucesso",
        description: "Documentos enviados para verificação!"
      });

      loadVerificationStatus();
    } catch (error: any) {
      console.error("Error submitting documents:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar documentos",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    setVerification(null);
    setUploadedFiles(getRequiredUploads().map(r => ({ side: r.side, file: null, preview: null })));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Verificação de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Approved status
  if (verification?.status === "approved") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <FileCheck className="h-5 w-5" />
            Status da Verificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-green-600">
            <FileCheck className="h-8 w-8" />
            <div>
              <p className="font-semibold">Documentos verificados e aprovados</p>
              {verification.reviewed_at && (
                <p className="text-sm text-muted-foreground">
                  Aprovado em: {new Date(verification.reviewed_at).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending status
  if (verification?.status === "pending") {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Clock className="h-5 w-5" />
            Status da Verificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-yellow-600">
            <Clock className="h-8 w-8" />
            <div>
              <p className="font-semibold">Aguardando Análise</p>
              <p className="text-sm text-muted-foreground">
                Seus documentos foram enviados e estão em análise. Você receberá um email quando a verificação for concluída.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Enviado em: {new Date(verification.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rejected status
  if (verification?.status === "rejected") {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Status da Verificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 text-destructive">
            <XCircle className="h-8 w-8 shrink-0" />
            <div>
              <p className="font-semibold">Verificação Rejeitada</p>
              <p className="text-sm text-muted-foreground">
                Motivo: {verification.rejection_reason || "Não especificado"}
              </p>
            </div>
          </div>
          <Button onClick={handleResubmit} variant="outline">
            Reenviar Documentos
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Upload form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Verificação de Documentos
        </CardTitle>
        <CardDescription>
          Para liberar todas as funcionalidades, complete a verificação de documentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Person Type Selection */}
        <div className="space-y-3">
          <Label>Tipo de Pessoa</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="personType"
                value="pf"
                checked={personType === "pf"}
                onChange={(e) => setPersonType(e.target.value as PersonType)}
                className="accent-primary"
              />
              <span>Pessoa Física (PF)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="personType"
                value="pj"
                checked={personType === "pj"}
                onChange={(e) => setPersonType(e.target.value as PersonType)}
                className="accent-primary"
              />
              <span>Pessoa Jurídica (PJ)</span>
            </label>
          </div>
        </div>

        {/* Document Type Selection (PF only) */}
        {personType === "pf" && (
          <div className="space-y-3">
            <Label>Tipo de Documento</Label>
            <div className="flex flex-wrap gap-4">
              {(["rg", "cnh", "passaporte"] as DocumentType[]).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="documentType"
                    value={type}
                    checked={documentType === type}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    className="accent-primary"
                  />
                  <span>{documentTypeLabels[type]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Upload Fields */}
        <div className="space-y-4">
          <Label>Documentos</Label>
          <div className="grid gap-4 sm:grid-cols-3">
            {getRequiredUploads().map((upload) => {
              const uploadedFile = uploadedFiles.find(uf => uf.side === upload.side);
              return (
                <div key={upload.side} className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{upload.label}</Label>
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    {uploadedFile?.preview ? (
                      <div className="relative w-full h-full p-2">
                        <img 
                          src={uploadedFile.preview} 
                          alt={upload.label}
                          className="w-full h-full object-contain rounded"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded">
                          <span className="text-white text-xs">Trocar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">
                          Clique para enviar
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(upload.side, e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: JPG, PNG, WebP ou PDF. Máximo 5MB por arquivo.
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={submitting || !uploadedFiles.every(uf => uf.file !== null)}
          className="w-full"
        >
          {submitting ? "Enviando..." : "Enviar para Verificação"}
        </Button>
      </CardContent>
    </Card>
  );
}
