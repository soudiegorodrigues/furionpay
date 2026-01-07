// v2.2 - Added loading skeleton for pixels
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Activity, Save, Loader2, Plus, Trash2, AlertTriangle, Pencil, ChevronDown, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UTMScriptSection } from "@/components/admin/UTMScriptSection";

// Skeleton component for pixel items during loading
const PixelSkeleton = () => (
  <div className="border rounded-lg overflow-hidden">
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  </div>
);

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken: string;
}
interface AdminSettingsData {
  meta_pixels: string;
}
const AdminSettings = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [settings, setSettings] = useState<AdminSettingsData>({
    meta_pixels: "[]"
  });
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [editingPixelId, setEditingPixelId] = useState<string | null>(null);
  const [pixelPage, setPixelPage] = useState(1);
  const PIXELS_PER_PAGE = 5;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();
  const {
    isAuthenticated,
    loading,
    signOut,
    user,
    isBlocked
  } = useAdminAuth();

  // Load settings when authenticated - AdminLayout handles auth redirects
  useEffect(() => {
    if (isAuthenticated && !loading) {
      loadSettings();
      checkAdminRole();
    }
  }, [isAuthenticated, loading]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin_authenticated');
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_user_settings');
      if (error) throw error;
      const settingsMap: AdminSettingsData = {
        meta_pixels: "[]"
      };
      if (data) {
        (data as {
          key: string;
          value: string;
        }[]).forEach(item => {
          if (item.key === 'meta_pixels') {
            settingsMap.meta_pixels = item.value || "[]";
          } else if (item.key === 'meta_pixel_id' && item.value) {
            const oldToken = (data as {
              key: string;
              value: string;
            }[]).find(d => d.key === 'meta_pixel_token')?.value || "";
            settingsMap.meta_pixels = JSON.stringify([{
              id: crypto.randomUUID(),
              pixelId: item.value,
              accessToken: oldToken
            }]);
          }
        });
      }
      setSettings(settingsMap);
      try {
        const parsedPixels = JSON.parse(settingsMap.meta_pixels);
        setPixels(Array.isArray(parsedPixels) ? parsedPixels : []);
      } catch {
        setPixels([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive"
      });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };
  const addPixel = () => {
    const newPixel: MetaPixel = {
      id: crypto.randomUUID(),
      name: "",
      pixelId: "",
      accessToken: ""
    };
    setPixels([...pixels, newPixel]);
  };
  const removePixel = async (id: string) => {
    const previousPixels = pixels;
    const updatedPixels = pixels.filter(p => p.id !== id);
    setPixels(updatedPixels);
    
    try {
      await supabase.rpc('update_user_setting', {
        setting_key: 'meta_pixels',
        setting_value: JSON.stringify(updatedPixels)
      });
      toast({
        title: "Pixel excluído",
        description: "O pixel foi removido com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir pixel:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir pixel. Tente novamente.",
        variant: "destructive"
      });
      setPixels(previousPixels);
    }
  };
  const updatePixel = (id: string, field: 'name' | 'pixelId' | 'accessToken', value: string) => {
    setPixels(pixels.map(p => p.id === id ? {
      ...p,
      [field]: value
    } : p));
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const pixelsJson = JSON.stringify(pixels);
      await supabase.rpc('update_user_setting', {
        setting_key: 'meta_pixels',
        setting_value: pixelsJson
      });
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };
  const handleResetDashboard = async () => {
    setIsResetting(true);
    try {
      const {
        error
      } = await supabase.rpc('reset_user_transactions');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Todas as transações foram apagadas!"
      });
    } catch (error) {
      console.error('Error resetting transactions:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar transações",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Permission check - AFTER all hooks
  if (!permissionsLoading && !isOwner && !hasPermission('can_manage_settings')) {
    return <AccessDenied message="Você não tem permissão para gerenciar Configurações." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Personalize suas configurações de pagamento</p>
          </div>
        </div>


        {/* Two column layout for desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meta Pixel Settings */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Meta Pixels (Facebook)
              </CardTitle>
              <CardDescription>
                Configure múltiplos pixels do Meta para rastreamento de eventos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <PixelSkeleton />
                  <PixelSkeleton />
                </div>
              ) : pixels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pixel configurado. Clique em "Adicionar Pixel" para começar.
                </p>
              ) : <>
                {pixels.slice((pixelPage - 1) * PIXELS_PER_PAGE, pixelPage * PIXELS_PER_PAGE).map((pixel, index) => {
                  const actualIndex = (pixelPage - 1) * PIXELS_PER_PAGE + index;
                  const isEditing = editingPixelId === pixel.id;
                  return <div key={pixel.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setEditingPixelId(isEditing ? null : pixel.id)}>
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {pixel.name || `Pixel #${actualIndex + 1}`}
                            </span>
                            {pixel.pixelId && <span className="text-xs text-muted-foreground">
                                ID: {pixel.pixelId}
                              </span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={e => {
                      e.stopPropagation();
                      setEditingPixelId(isEditing ? null : pixel.id);
                    }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()} className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Pixel</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o pixel "{pixel.name || `Pixel #${actualIndex + 1}`}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removePixel(pixel.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {isEditing && <div className="p-4 pt-0 space-y-3 border-t bg-secondary/20">
                          <div className="space-y-2">
                            <Label htmlFor={`pixel_name_${pixel.id}`}>Nome (BM/Perfil)</Label>
                            <Input id={`pixel_name_${pixel.id}`} type="text" placeholder="Ex: BM Principal, Perfil João..." value={pixel.name || ""} onChange={e => updatePixel(pixel.id, 'name', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`pixel_id_${pixel.id}`}>Pixel ID</Label>
                            <Input id={`pixel_id_${pixel.id}`} type="text" placeholder="Digite o ID do Pixel" value={pixel.pixelId} onChange={e => updatePixel(pixel.id, 'pixelId', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`pixel_token_${pixel.id}`}>Access Token (opcional)</Label>
                            <Input id={`pixel_token_${pixel.id}`} type="password" placeholder="Digite o token de acesso" value={pixel.accessToken} onChange={e => updatePixel(pixel.id, 'accessToken', e.target.value)} />
                          </div>
                        </div>}
                    </div>;
                })}
                {pixels.length > PIXELS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Página {pixelPage} de {Math.ceil(pixels.length / PIXELS_PER_PAGE)}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPixelPage(p => Math.max(1, p - 1))}
                        disabled={pixelPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPixelPage(p => Math.min(Math.ceil(pixels.length / PIXELS_PER_PAGE), p + 1))}
                        disabled={pixelPage >= Math.ceil(pixels.length / PIXELS_PER_PAGE)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>}
              
              <Button variant="outline" onClick={addPixel} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pixel
              </Button>

              <Separator />
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Eventos rastreados:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li><code>InitiateCheckout</code> - Quando abre o popup de Checkout</li>
                  <li><code>PixGenerated</code> - Quando o QR Code PIX é gerado</li>
                  <li><code>Purchase</code> - Quando o pagamento PIX é confirmado</li>
                </ul>
              </div>

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Código de UTMs do Facebook
                </p>
                <p className="text-xs text-muted-foreground">Use este código nas suas campanhas para rastrear a origem dos pagamentos</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-secondary p-2 rounded break-all">
                    utm_source=FB&utm_campaign={"{{campaign.name}}"}|{"{{campaign.id}}"}&utm_medium={"{{adset.name}}"}|{"{{adset.id}}"}&utm_content={"{{ad.name}}"}|{"{{ad.id}}"}&utm_term={"{{placement}}"}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText("utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}");
                      toast({
                        title: "Copiado!",
                        description: "Código UTM copiado para a área de transferência"
                      });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Save Button - inside Meta Pixels card */}
              <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
                {isSaving ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </> : <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>}
              </Button>
            </CardContent>
          </Card>

          {/* UTM Script Section */}
          <UTMScriptSection />
        </div>
    </div>
  );
};
export default AdminSettings;