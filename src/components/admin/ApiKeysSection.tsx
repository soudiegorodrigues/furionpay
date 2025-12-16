import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw, Activity, Globe, Book, Webhook } from 'lucide-react';
import { ApiDocsSection } from './ApiDocsSection';
import { WebhookDeliveriesSection } from './WebhookDeliveriesSection';

interface ApiClient {
  id: string;
  name: string;
  api_key_prefix: string;
  webhook_url: string | null;
  is_active: boolean;
  rate_limit_per_minute: number;
  total_requests: number;
  last_request_at: string | null;
  created_at: string;
}

interface ApiClientStats {
  total_requests: number;
  requests_today: number;
  requests_last_7_days: number;
  success_rate: number | null;
  avg_response_time_ms: number | null;
  webhook_deliveries: number;
  webhook_success_rate: number | null;
}

export function ApiKeysSection() {
  const [apiClients, setApiClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ApiClient | null>(null);
  const [clientStats, setClientStats] = useState<ApiClientStats | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWebhookUrl, setEditWebhookUrl] = useState('');

  useEffect(() => {
    loadApiClients();
  }, []);

  async function loadApiClients() {
    try {
      const { data, error } = await supabase.rpc('get_user_api_clients');
      if (error) throw error;
      setApiClients(data || []);
    } catch (error) {
      console.error('Error loading API clients:', error);
      toast.error('Erro ao carregar API keys');
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey() {
    if (!newApiKeyName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_api_client', {
        p_name: newApiKeyName.trim(),
        p_webhook_url: newWebhookUrl.trim() || null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setCreatedApiKey(data[0].api_key);
        toast.success('API key criada com sucesso!');
        loadApiClients();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Erro ao criar API key');
    }
  }

  async function toggleApiKey(clientId: string, isActive: boolean) {
    try {
      const { error } = await supabase.rpc('update_api_client', {
        p_client_id: clientId,
        p_is_active: isActive
      });

      if (error) throw error;
      toast.success(isActive ? 'API key ativada' : 'API key desativada');
      loadApiClients();
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast.error('Erro ao atualizar API key');
    }
  }

  async function deleteApiKey(clientId: string) {
    if (!confirm('Tem certeza que deseja deletar esta API key? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_api_client', {
        p_client_id: clientId
      });

      if (error) throw error;
      toast.success('API key deletada');
      loadApiClients();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Erro ao deletar API key');
    }
  }

  async function loadClientDetails(client: ApiClient) {
    setSelectedClient(client);
    setShowWebhookSecret(false);
    setWebhookSecret(null);

    try {
      const { data: stats, error: statsError } = await supabase.rpc('get_api_client_stats', {
        p_client_id: client.id
      });

      if (statsError) throw statsError;
      setClientStats(stats as unknown as ApiClientStats);
    } catch (error) {
      console.error('Error loading client stats:', error);
    }
  }

  async function loadWebhookSecret(clientId: string) {
    try {
      const { data, error } = await supabase.rpc('get_webhook_secret', {
        p_client_id: clientId
      });

      if (error) throw error;
      setWebhookSecret(data);
      setShowWebhookSecret(true);
    } catch (error) {
      console.error('Error loading webhook secret:', error);
      toast.error('Erro ao carregar webhook secret');
    }
  }

  async function regenerateWebhookSecret(clientId: string) {
    if (!confirm('Tem certeza que deseja regenerar o webhook secret? O secret antigo deixará de funcionar.')) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('regenerate_webhook_secret', {
        p_client_id: clientId
      });

      if (error) throw error;
      setWebhookSecret(data);
      setShowWebhookSecret(true);
      toast.success('Webhook secret regenerado');
    } catch (error) {
      console.error('Error regenerating webhook secret:', error);
      toast.error('Erro ao regenerar webhook secret');
    }
  }

  async function updateApiClient() {
    if (!selectedClient) return;

    try {
      const { error } = await supabase.rpc('update_api_client', {
        p_client_id: selectedClient.id,
        p_name: editName.trim() || null,
        p_webhook_url: editWebhookUrl.trim() || null
      });

      if (error) throw error;
      toast.success('API key atualizada');
      setEditDialogOpen(false);
      loadApiClients();
      if (selectedClient) {
        loadClientDetails({ ...selectedClient, name: editName, webhook_url: editWebhookUrl });
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Erro ao atualizar API key');
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  function openEditDialog(client: ApiClient) {
    setEditName(client.name);
    setEditWebhookUrl(client.webhook_url || '');
    setEditDialogOpen(true);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="keys" className="space-y-6">
      <TabsList>
        <TabsTrigger value="keys" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          API Keys
        </TabsTrigger>
        <TabsTrigger value="webhooks" className="flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          Webhooks
        </TabsTrigger>
        <TabsTrigger value="docs" className="flex items-center gap-2">
          <Book className="h-4 w-4" />
          Documentação
        </TabsTrigger>
      </TabsList>

      <TabsContent value="keys" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas chaves de API para integração externa
            </p>
          </div>
          <Button onClick={() => {
            setNewApiKeyName('');
            setNewWebhookUrl('');
            setCreatedApiKey(null);
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova API Key
          </Button>
        </div>

      {/* Lista de API Keys */}
      <div className="grid gap-4">
        {apiClients.length === 0 ? (
          <Card className="p-8 text-center">
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhuma API key criada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie uma API key para começar a integrar com a FurionPay
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar API Key
            </Button>
          </Card>
        ) : (
          apiClients.map((client) => (
            <Card key={client.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{client.name}</h3>
                    <Badge variant={client.is_active ? "default" : "secondary"}>
                      {client.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <code className="bg-muted px-2 py-0.5 rounded text-xs">
                      {client.api_key_prefix}
                    </code>
                    <span>•</span>
                    <span>{client.total_requests.toLocaleString()} requests</span>
                    {client.last_request_at && (
                      <>
                        <span>•</span>
                        <span>Último: {formatDate(client.last_request_at)}</span>
                      </>
                    )}
                  </div>
                  {client.webhook_url && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Globe className="h-3 w-3" />
                      <span className="truncate max-w-[300px]">{client.webhook_url}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={client.is_active}
                    onCheckedChange={(checked) => toggleApiKey(client.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadClientDetails(client)}
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteApiKey(client.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialog: Criar API Key */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova API Key</DialogTitle>
            <DialogDescription>
              Crie uma nova chave de API para integração
            </DialogDescription>
          </DialogHeader>

          {!createdApiKey ? (
            <div className="space-y-4">
              <div>
                <Label>Nome do Projeto</Label>
                <Input
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="Ex: Minha Loja, App Mobile"
                />
              </div>
              <div>
                <Label>Webhook URL (opcional)</Label>
                <Input
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://seu-site.com/webhook"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL que receberá notificações de pagamento
                </p>
              </div>
              <Button onClick={createApiKey} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Criar API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                  ⚠️ Copie sua API key agora!
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Esta é a única vez que você verá a chave completa. Guarde-a em um local seguro.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background px-3 py-2 rounded border text-xs break-all">
                    {createdApiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdApiKey, 'API key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreatedApiKey(null);
                }}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da API Key */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedClient?.name}
              <Badge variant={selectedClient?.is_active ? "default" : "secondary"}>
                {selectedClient?.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              {/* API Key Prefix */}
              <div>
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                    {selectedClient.api_key_prefix}
                  </code>
                </div>
              </div>

              {/* Webhook URL */}
              <div>
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={selectedClient.webhook_url || ''}
                    disabled
                    placeholder="Não configurado"
                    className="text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedClient)}>
                    Editar
                  </Button>
                </div>
              </div>

              {/* Webhook Secret */}
              {selectedClient.webhook_url && (
                <div>
                  <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {showWebhookSecret && webhookSecret ? (
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-xs break-all">
                        {webhookSecret}
                      </code>
                    ) : (
                      <Input
                        value="••••••••••••••••••••••••••••••••"
                        disabled
                        className="flex-1 text-sm"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showWebhookSecret ? setShowWebhookSecret(false) : loadWebhookSecret(selectedClient.id)}
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {showWebhookSecret && webhookSecret && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhookSecret, 'Webhook secret')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateWebhookSecret(selectedClient.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Estatísticas */}
              {clientStats && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Requests Hoje</p>
                    <p className="text-lg font-semibold">{clientStats.requests_today}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                    <p className="text-lg font-semibold">{clientStats.requests_last_7_days}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                    <p className="text-lg font-semibold">{clientStats.success_rate ?? 0}%</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tempo Médio</p>
                    <p className="text-lg font-semibold">{clientStats.avg_response_time_ms ?? 0}ms</p>
                  </div>
                </div>
              )}

              {/* Link para Documentação */}
              <div className="border-t pt-4">
                <p className="text-xs text-center text-muted-foreground">
                  Consulte a aba "Documentação" para exemplos de integração
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar API Key */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Projeto</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={editWebhookUrl}
                onChange={(e) => setEditWebhookUrl(e.target.value)}
                placeholder="https://seu-site.com/webhook"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={updateApiClient} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="webhooks">
        <WebhookDeliveriesSection />
      </TabsContent>

      <TabsContent value="docs">
        <ApiDocsSection />
      </TabsContent>
    </Tabs>
  );
}
