// v2.3 - Meta Pixel configuration restored
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/AccessDenied";
import { Settings, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UTMScriptSection } from "@/components/admin/UTMScriptSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken?: string;
}

interface AdminSettingsData {
  meta_pixels: MetaPixel[];
}

const AdminSettings = () => {
  const { isOwner, hasPermission, loading: permissionsLoading } = usePermissions();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const {
    isAuthenticated,
    loading,
    signOut,
    user,
    isBlocked
  } = useAdminAuth();

  // Meta Pixels state
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [editingPixelId, setEditingPixelId] = useState<string | null>(null);
  const [newPixel, setNewPixel] = useState<Partial<MetaPixel>>({});

  useEffect(() => {
    if (isAuthenticated && !loading) {
      checkAdminRole();
      loadSettings();
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
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .eq('user_id', user.id);

      if (error) throw error;

      const settingsData: AdminSettingsData = { meta_pixels: [] };

      data?.forEach(setting => {
        if (setting.key === 'meta_pixels' && setting.value) {
          try {
            const parsed = JSON.parse(setting.value);
            settingsData.meta_pixels = Array.isArray(parsed) ? parsed : [];
          } catch {
            settingsData.meta_pixels = [];
          }
        }
      });

      setPixels(settingsData.meta_pixels);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro ao carregar configurações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  const addPixel = () => {
    const newId = crypto.randomUUID();
    setPixels([...pixels, { id: newId, name: '', pixelId: '', accessToken: '' }]);
    setEditingPixelId(newId);
  };

  const removePixel = (id: string) => {
    setPixels(pixels.filter(p => p.id !== id));
    if (editingPixelId === id) setEditingPixelId(null);
  };

  const updatePixel = (id: string, field: keyof MetaPixel, value: string) => {
    setPixels(pixels.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validate pixels
      const validPixels = pixels.filter(p => p.name && p.pixelId);

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          user_id: user.id,
          key: 'meta_pixels',
          value: JSON.stringify(validPixels),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,key'
        });

      if (error) throw error;

      setPixels(validPixels);
      setEditingPixelId(null);

      toast({
        title: "Configurações salvas!",
        description: "Seus Meta Pixels foram atualizados."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Permission check
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

      {/* Meta Pixels Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Meta Pixels (Facebook)</CardTitle>
              <CardDescription>
                Configure seus pixels para rastreamento de conversões
              </CardDescription>
            </div>
            <Button onClick={addPixel} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pixel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : pixels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum pixel configurado</p>
              <p className="text-sm">Clique em "Adicionar Pixel" para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pixels.map((pixel) => (
                <div key={pixel.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{pixel.name || 'Novo Pixel'}</h4>
                    <div className="flex gap-2">
                      {editingPixelId === pixel.id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPixelId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPixelId(pixel.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removePixel(pixel.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {editingPixelId === pixel.id ? (
                    <div className="grid gap-3">
                      <div>
                        <Label>Nome do Pixel</Label>
                        <Input
                          value={pixel.name}
                          onChange={(e) => updatePixel(pixel.id, 'name', e.target.value)}
                          placeholder="Ex: Pixel Principal"
                        />
                      </div>
                      <div>
                        <Label>Pixel ID</Label>
                        <Input
                          value={pixel.pixelId}
                          onChange={(e) => updatePixel(pixel.id, 'pixelId', e.target.value)}
                          placeholder="Ex: 123456789012345"
                        />
                      </div>
                      <div>
                        <Label>Access Token (CAPI) - Opcional</Label>
                        <Input
                          value={pixel.accessToken || ''}
                          onChange={(e) => updatePixel(pixel.id, 'accessToken', e.target.value)}
                          placeholder="Token para Conversions API"
                          type="password"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <p>ID: {pixel.pixelId || 'Não configurado'}</p>
                      <p>CAPI: {pixel.accessToken ? '••••••••' : 'Não configurado'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pixels.length > 0 && (
            <div className="pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Pixels'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UTM Script Section */}
      <UTMScriptSection />
    </div>
  );
};

export default AdminSettings;
