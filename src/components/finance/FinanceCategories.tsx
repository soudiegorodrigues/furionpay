import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Loader2,
  Palette
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  is_default: boolean;
  spending_limit: number | null;
}

const CATEGORY_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f97316', '#ef4444', 
  '#ec4899', '#3b82f6', '#22c55e', '#eab308', '#64748b'
];

export const FinanceCategories = () => {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as string,
    color: '#10b981',
    spending_limit: '' as string
  });

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

  useEffect(() => {
    if (user?.id) {
      fetchCategories();
    }
  }, [user?.id]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Erro ao carregar categorias",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    setShowCustomColor(false);
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
        spending_limit: category.spending_limit?.toString() || ''
      });
      // Show custom color picker if color is not in predefined list
      if (!CATEGORY_COLORS.includes(category.color)) {
        setShowCustomColor(true);
      }
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'expense',
        color: '#10b981',
        spending_limit: ''
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    const spendingLimit = formData.spending_limit ? parseFloat(formData.spending_limit) : null;
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('finance_categories')
          .update({
            name: formData.name,
            type: formData.type,
            color: formData.color,
            spending_limit: spendingLimit
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: "Categoria atualizada!" });
      } else {
        const { error } = await supabase
          .from('finance_categories')
          .insert({
            user_id: user!.id,
            name: formData.name,
            type: formData.type,
            color: formData.color,
            is_default: false,
            spending_limit: spendingLimit
          });

        if (error) throw error;
        toast({ title: "Categoria criada!" });
      }

      setShowDialog(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Erro ao salvar categoria",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.is_default) {
      toast({
        title: "Categorias padrão não podem ser excluídas",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('finance_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      toast({ title: "Categoria excluída!" });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Erro ao excluir categoria",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return <TrendingUp className="h-4 w-4" />;
      case 'expense': return <TrendingDown className="h-4 w-4" />;
      case 'investment': return <PiggyBank className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return 'Receita';
      case 'expense': return 'Despesa';
      case 'investment': return 'Investimento';
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'expense': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'investment': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return '';
    }
  };

  const groupedCategories = {
    income: categories.filter(c => c.type === 'income'),
    expense: categories.filter(c => c.type === 'expense'),
    investment: categories.filter(c => c.type === 'investment')
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Categorias</h2>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income Categories */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groupedCategories.income.map(category => (
              <div 
                key={category.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                  {category.is_default && (
                    <Badge variant="outline" className="text-xs">Padrão</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(category)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {!category.is_default && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {groupedCategories.income.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma categoria de receita
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groupedCategories.expense.map(category => (
              <div 
                key={category.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                  {category.is_default && (
                    <Badge variant="outline" className="text-xs">Padrão</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(category)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {!category.is_default && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {groupedCategories.expense.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma categoria de despesa
              </p>
            )}
          </CardContent>
        </Card>

        {/* Investment Categories */}
        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PiggyBank className="h-5 w-5 text-purple-600" />
              Investimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groupedCategories.investment.map(category => (
              <div 
                key={category.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                  {category.is_default && (
                    <Badge variant="outline" className="text-xs">Padrão</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(category)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {!category.is_default && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {groupedCategories.investment.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma categoria de investimento
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Atualize as informações da categoria'
                : 'Crie uma nova categoria para organizar suas finanças'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Alimentação"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense' | 'investment') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Receita
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Despesa
                    </div>
                  </SelectItem>
                  <SelectItem value="investment">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-purple-600" />
                      Investimento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Cor</Label>
              
              {/* Cores predefinidas */}
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setFormData({ ...formData, color });
                      setShowCustomColor(false);
                    }}
                  />
                ))}
                
                {/* Botão para cor customizada */}
                <button
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 border-dashed transition-all flex items-center justify-center ${
                    showCustomColor || !CATEGORY_COLORS.includes(formData.color)
                      ? 'border-foreground bg-muted scale-110' 
                      : 'border-muted-foreground/50 hover:scale-105 hover:border-foreground'
                  }`}
                  onClick={() => setShowCustomColor(!showCustomColor)}
                >
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Color picker customizado */}
              {showCustomColor && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {/* Input type="color" nativo */}
                  <input
                    type="color"
                    value={isValidHex(formData.color) ? formData.color : '#10b981'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  
                  {/* Input hex manual */}
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (!value.startsWith('#')) value = '#' + value;
                        if (value.length <= 7) {
                          setFormData({ ...formData, color: value });
                        }
                      }}
                      placeholder="#000000"
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                  
                  {/* Preview da cor */}
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-border"
                    style={{ backgroundColor: isValidHex(formData.color) ? formData.color : '#000000' }}
                  />
                </div>
              )}
              
              {/* Mostrar cor atual se for customizada */}
              {!CATEGORY_COLORS.includes(formData.color) && !showCustomColor && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span 
                    className="w-4 h-4 rounded-full inline-block" 
                    style={{ backgroundColor: formData.color }}
                  />
                  Cor personalizada: {formData.color}
                </p>
              )}
            </div>

            {formData.type === 'expense' && (
              <div className="space-y-2">
                <Label>Limite Mensal de Gastos (opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.spending_limit}
                  onChange={(e) => setFormData({ ...formData, spending_limit: e.target.value })}
                  placeholder="Ex: 500.00"
                />
                <p className="text-xs text-muted-foreground">
                  Receba alertas quando ultrapassar este valor no mês
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
