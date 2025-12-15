import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Wallet, 
  Building2, 
  PiggyBank, 
  CreditCard, 
  Banknote,
  TrendingUp,
  Pencil,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  bank_name: string | null;
  icon: string;
  color: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const accountTypes = [
  { value: "checking", label: "Conta Corrente", icon: Building2 },
  { value: "savings", label: "Poupança", icon: PiggyBank },
  { value: "investment", label: "Investimentos", icon: TrendingUp },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "credit_card", label: "Cartão de Crédito", icon: CreditCard },
];

const defaultColors = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"
];

export const FinanceWallet = () => {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "checking",
    bank_name: "",
    color: "#10b981",
    initial_balance: 0
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar contas");
      console.error(error);
    } else {
      setAccounts(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome da conta é obrigatório");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (editingAccount) {
      const { error } = await supabase
        .from("finance_accounts")
        .update({
          name: formData.name,
          type: formData.type,
          bank_name: formData.bank_name || null,
          color: formData.color,
          initial_balance: formData.initial_balance,
          current_balance: formData.initial_balance
        })
        .eq("id", editingAccount.id);

      if (error) {
        toast.error("Erro ao atualizar conta");
        console.error(error);
      } else {
        toast.success("Conta atualizada com sucesso!");
        loadAccounts();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("finance_accounts")
        .insert({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          bank_name: formData.bank_name || null,
          color: formData.color,
          initial_balance: formData.initial_balance,
          current_balance: formData.initial_balance
        });

      if (error) {
        toast.error("Erro ao criar conta");
        console.error(error);
      } else {
        toast.success("Conta criada com sucesso!");
        loadAccounts();
        resetForm();
      }
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    const { error } = await supabase
      .from("finance_accounts")
      .update({ is_active: false })
      .eq("id", accountId);

    if (error) {
      toast.error("Erro ao excluir conta");
      console.error(error);
    } else {
      toast.success("Conta excluída com sucesso!");
      loadAccounts();
    }
  };

  const openEditDialog = (account: FinanceAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      bank_name: account.bank_name || "",
      color: account.color,
      initial_balance: account.initial_balance
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "checking",
      bank_name: "",
      color: "#10b981",
      initial_balance: 0
    });
    setEditingAccount(null);
    setIsDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type);
    const IconComponent = accountType?.icon || Wallet;
    return <IconComponent className="h-5 w-5" />;
  };

  const getAccountTypeLabel = (type: string) => {
    return accountTypes.find(t => t.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
              </p>
            </div>
            <div className="p-4 bg-primary/10 rounded-full">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Account Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Minhas Contas</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Editar Conta" : "Nova Conta"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Conta *</Label>
                <Input
                  placeholder="Ex: Nubank, Inter, Caixa..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do Banco (opcional)</Label>
                <Input
                  placeholder="Ex: Banco do Brasil, Bradesco..."
                  value={formData.bank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, initial_balance: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/50 transition-all"
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  {editingAccount ? "Salvar" : "Criar Conta"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
            <p className="text-sm text-muted-foreground">Adicione sua primeira conta bancária</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(account => (
            <Card key={account.id} className="relative overflow-hidden group">
              <div 
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: account.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <div style={{ color: account.color }}>
                        {getAccountIcon(account.type)}
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {getAccountTypeLabel(account.type)}
                        {account.bank_name && ` • ${account.bank_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(account.current_balance)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
