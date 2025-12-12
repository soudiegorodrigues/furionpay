import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, Eye, EyeOff, Building2, Key, Mail, Copy, Construction, Clock, History, Percent, ArrowRightLeft, AlertTriangle, Settings, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface BankAccountData {
  bank: string;
  pixKeyType: string;
  pixKey: string;
}

const AdminFinanceiro = () => {
  const { user, isAdmin } = useAdminAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(true);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [bankData, setBankData] = useState<BankAccountData>({
    bank: '',
    pixKeyType: '',
    pixKey: ''
  });
  const { toast } = useToast();

  const banks = [
    { code: '001', name: 'Banco do Brasil S.A.' },
    { code: '033', name: 'Banco Santander Brasil S.A.' },
    { code: '077', name: 'Banco Inter S.A.' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '237', name: 'Bradesco S.A.' },
    { code: '260', name: 'Nubank' },
    { code: '341', name: 'Itaú Unibanco S.A.' },
    { code: '756', name: 'Sicoob' },
  ];

  const pixKeyTypes = [
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone' },
    { value: 'random', label: 'Chave Aleatória' },
  ];

  const getPixKeyPlaceholder = () => {
    switch (bankData.pixKeyType) {
      case 'cpf': return 'Digite seu CPF';
      case 'cnpj': return 'Digite seu CNPJ';
      case 'email': return 'Digite seu e-mail';
      case 'phone': return 'Digite seu telefone';
      case 'random': return 'Digite sua chave aleatória';
      default: return 'Digite sua chave PIX';
    }
  };

  const handleAddBankAccount = () => {
    if (!bankData.bank || !bankData.pixKeyType || !bankData.pixKey.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setHasBankAccount(true);
    setShowBankDialog(false);
    setBankData({ bank: '', pixKeyType: '', pixKey: '' });
    toast({
      title: "Conta adicionada!",
      description: "Sua conta bancária foi configurada com sucesso.",
    });
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_user_transactions', {
        p_limit: 1000
      });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(() => loadTransactions(), 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const stats = useMemo(() => {
    const paid = transactions.filter(tx => tx.status === 'paid');
    const pending = transactions.filter(tx => tx.status === 'generated');
    
    const totalReceived = paid.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPending = pending.reduce((sum, tx) => sum + tx.amount, 0);
    const totalBalance = totalReceived + totalPending;

    return {
      totalBalance,
      totalReceived,
      totalPending,
    };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    if (hideValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCopyPix = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      toast({
        title: "Copiado!",
        description: "Chave PIX copiada para a área de transferência.",
      });
    }
  };

  // Show "Em Produção" for non-admin users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Página em Produção</h2>
            <p className="text-muted-foreground">
              Estamos trabalhando para trazer a melhor experiência de gerenciamento financeiro para você.
            </p>
            <Badge variant="outline" className="text-sm">
              Em breve
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      <Tabs defaultValue="saldo" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0">
          <TabsTrigger 
            value="saldo" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Saldo
          </TabsTrigger>
          <TabsTrigger 
            value="historico" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Histórico de saques
          </TabsTrigger>
          <TabsTrigger 
            value="taxas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Taxas
          </TabsTrigger>
          <TabsTrigger 
            value="movimentacoes" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-4 py-3"
          >
            Movimentações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saldo" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Saldo Total */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-primary font-medium">Saldo Total</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-3xl font-bold mb-3">
                  {formatCurrency(stats.totalBalance)}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Este é o valor do seu saldo disponível mais o saldo pendente da reserva financeira.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setHideValues(!hideValues)}
                  className="gap-2"
                >
                  {hideValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {hideValues ? 'Mostrar valores' : 'Esconder valores'}
                </Button>
              </CardContent>
            </Card>

            {/* Conta Bancária Principal */}
            <Card>
              <CardContent className="pt-6">
                <span className="text-primary font-medium">Conta Bancária Principal</span>
                
                {hasBankAccount ? (
                  <>
                    <div className="flex items-center gap-2 mt-4 mb-4">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">077 - Banco Inter S.A.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Conta PF</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">Chave PIX: {user?.email || 'Não configurado'}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPix}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>Tipo PIX: email</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full mt-6 text-destructive hover:text-destructive"
                      onClick={() => {
                        setHasBankAccount(false);
                        toast({
                          title: "Conta bancária removida",
                          description: "Configure uma nova conta para realizar saques.",
                        });
                      }}
                    >
                      Excluir conta bancária
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mt-4 mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400">
                        Nenhuma conta bancária cadastrada. Configure uma conta para realizar saques.
                      </span>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => setShowBankDialog(true)}
                    >
                      Configurar conta bancária
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dialog de Configurar Conta Bancária */}
          <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar conta bancária</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Informações do Titular */}
                <Card className="border-0 shadow-none bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-primary font-medium mb-4">
                      <Building2 className="h-5 w-5" />
                      Informações do Titular
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Instituição Bancária</Label>
                      <Select 
                        value={bankData.bank} 
                        onValueChange={(value) => setBankData(prev => ({ ...prev, bank: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map(bank => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.code} - {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Chave PIX */}
                <Card className="border-0 shadow-none bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-primary font-medium mb-4">
                      <CreditCard className="h-5 w-5" />
                      Chave PIX
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de Chave PIX</Label>
                        <Select 
                          value={bankData.pixKeyType} 
                          onValueChange={(value) => setBankData(prev => ({ ...prev, pixKeyType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de chave PIX" />
                          </SelectTrigger>
                          <SelectContent>
                            {pixKeyTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Chave PIX</Label>
                        <Input 
                          placeholder={getPixKeyPlaceholder()}
                          value={bankData.pixKey}
                          onChange={(e) => setBankData(prev => ({ ...prev, pixKey: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBankDialog(false);
                    setBankData({ bank: '', pixKeyType: '', pixKey: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddBankAccount}>
                  Adicionar Conta
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Saldo Pendente */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-primary font-medium">Saldo Pendente</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.totalPending > 0 ? '-' : ''}{formatCurrency(stats.totalPending)}
                </p>
              </CardContent>
            </Card>

            {/* Saldo Disponível */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-primary font-medium">Saldo Disponível</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.totalReceived)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gerenciar Saldo */}
          <Card>
            <CardContent className="pt-6">
              <span className="text-primary font-medium text-lg">Gerenciar Saldo</span>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Solicite um saque do valor disponível na sua conta
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo disponível para saque:</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</p>
                </div>
                <Button className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Solicitar Saque
                </Button>
              </div>

              <Button 
                variant="outline" 
                className="mt-6 gap-2"
                onClick={loadTransactions}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar Saldo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Saques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum saque realizado ainda.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Taxas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">PIX</p>
                    <p className="text-sm text-muted-foreground">Taxa por transação</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">4,99%</p>
                    <p className="text-sm text-muted-foreground">+ R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Taxa de Saque</p>
                    <p className="text-sm text-muted-foreground">Por saque realizado</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">0%</p>
                    <p className="text-sm text-muted-foreground">+ R$ 4,99</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma movimentação encontrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 20).map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {tx.status === 'paid' ? 'Pagamento recebido' : 'Aguardando pagamento'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className={`font-bold ${
                        tx.status === 'paid' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {tx.status === 'paid' ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminFinanceiro;
