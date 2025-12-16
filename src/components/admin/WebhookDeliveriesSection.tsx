import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Webhook, RefreshCw, CheckCircle, XCircle, Clock, Eye, RotateCcw, AlertTriangle } from 'lucide-react';

interface WebhookDelivery {
  id: string;
  api_client_id: string;
  api_client_name: string;
  transaction_id: string | null;
  event_type: string;
  webhook_url: string;
  status: string;
  response_status: number | null;
  response_body: string | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
}

interface WebhookStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  success_rate: number;
}

interface ApiClient {
  id: string;
  name: string;
}

export function WebhookDeliveriesSection() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [apiClients, setApiClients] = useState<ApiClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedClientId]);

  async function loadData() {
    setLoading(true);
    try {
      const [deliveriesResult, statsResult, clientsResult] = await Promise.all([
        supabase.rpc('get_user_webhook_deliveries', {
          p_limit: 100,
          p_client_id: selectedClientId === 'all' ? null : selectedClientId
        }),
        supabase.rpc('get_user_webhook_stats'),
        supabase.rpc('get_user_api_clients')
      ]);

      if (deliveriesResult.error) throw deliveriesResult.error;
      if (statsResult.error) throw statsResult.error;
      if (clientsResult.error) throw clientsResult.error;

      setDeliveries(deliveriesResult.data || []);
      setStats(statsResult.data as unknown as WebhookStats);
      setApiClients(clientsResult.data || []);
    } catch (error) {
      console.error('Error loading webhook data:', error);
      toast.error('Erro ao carregar dados de webhooks');
    } finally {
      setLoading(false);
    }
  }

  async function retryDelivery(deliveryId: string) {
    try {
      const { error } = await supabase.rpc('retry_webhook_delivery', {
        p_delivery_id: deliveryId
      });

      if (error) throw error;
      toast.success('Webhook agendado para reenvio');
      loadData();
    } catch (error) {
      console.error('Error retrying webhook:', error);
      toast.error('Erro ao reagendar webhook');
    }
  }

  function getStatusBadge(status: string, responseStatus: number | null) {
    switch (status) {
      case 'delivered':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Entregue
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Falhou {responseStatus && `(${responseStatus})`}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getEventTypeBadge(eventType: string) {
    switch (eventType) {
      case 'payment.completed':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Pagamento</Badge>;
      case 'payment.expired':
        return <Badge variant="outline">Expirado</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
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
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Histórico de Webhooks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe as entregas de notificações para seus endpoints
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Entregues</p>
            <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Falhas</p>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
            <p className="text-2xl font-bold">{stats.success_rate}%</p>
          </Card>
        </div>
      )}

      {/* Filtro por API Client */}
      <div className="flex items-center gap-4">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por API Key" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as API Keys</SelectItem>
            {apiClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de entregas */}
      {deliveries.length === 0 ? (
        <Card className="p-8 text-center">
          <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Nenhuma entrega de webhook</h3>
          <p className="text-sm text-muted-foreground">
            As entregas aparecerão aqui quando transações forem processadas
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="text-sm">
                    {formatDate(delivery.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {delivery.api_client_name}
                  </TableCell>
                  <TableCell>
                    {getEventTypeBadge(delivery.event_type)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(delivery.status, delivery.response_status)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{delivery.attempts}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDelivery(delivery)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {delivery.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryDelivery(delivery.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Webhook
              {selectedDelivery && getStatusBadge(selectedDelivery.status, selectedDelivery.response_status)}
            </DialogTitle>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">API Key</p>
                  <p className="font-medium">{selectedDelivery.api_client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Evento</p>
                  <p className="font-medium">{selectedDelivery.event_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="font-medium">{formatDate(selectedDelivery.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última tentativa</p>
                  <p className="font-medium">{formatDate(selectedDelivery.last_attempt_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tentativas</p>
                  <p className="font-medium">{selectedDelivery.attempts}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status HTTP</p>
                  <p className="font-medium">{selectedDelivery.response_status || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
                <code className="block bg-muted px-3 py-2 rounded text-xs break-all">
                  {selectedDelivery.webhook_url}
                </code>
              </div>

              {selectedDelivery.transaction_id && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                  <code className="block bg-muted px-3 py-2 rounded text-xs">
                    {selectedDelivery.transaction_id}
                  </code>
                </div>
              )}

              {selectedDelivery.response_body && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Resposta do Servidor</p>
                  <pre className="bg-muted px-3 py-2 rounded text-xs overflow-auto max-h-40">
                    {selectedDelivery.response_body}
                  </pre>
                </div>
              )}

              {selectedDelivery.status === 'failed' && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    Este webhook falhou. Verifique se a URL está acessível e retornando status 2xx.
                  </p>
                </div>
              )}

              {selectedDelivery.status === 'failed' && (
                <Button onClick={() => retryDelivery(selectedDelivery.id)} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
