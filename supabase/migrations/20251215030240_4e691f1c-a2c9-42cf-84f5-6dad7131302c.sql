
-- Create finance_categories table for user-customizable categories
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'circle',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create finance_transactions table for all financial entries
CREATE TABLE public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create finance_goals table for financial goals
CREATE TABLE public.finance_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  type TEXT NOT NULL CHECK (type IN ('savings', 'investment', 'debt_payoff')),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_categories
CREATE POLICY "Users can view their own categories" ON public.finance_categories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own categories" ON public.finance_categories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories" ON public.finance_categories
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories" ON public.finance_categories
  FOR DELETE USING (user_id = auth.uid() AND is_default = false);

-- RLS Policies for finance_transactions
CREATE POLICY "Users can view their own transactions" ON public.finance_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transactions" ON public.finance_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions" ON public.finance_transactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions" ON public.finance_transactions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for finance_goals
CREATE POLICY "Users can view their own goals" ON public.finance_goals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own goals" ON public.finance_goals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goals" ON public.finance_goals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own goals" ON public.finance_goals
  FOR DELETE USING (user_id = auth.uid());

-- Function to initialize default categories for new users
CREATE OR REPLACE FUNCTION public.initialize_finance_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Income categories
  INSERT INTO public.finance_categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Vendas', 'income', '#10b981', 'shopping-cart', true),
    (NEW.id, 'Afiliados', 'income', '#06b6d4', 'users', true),
    (NEW.id, 'Serviços', 'income', '#8b5cf6', 'briefcase', true),
    (NEW.id, 'Outros', 'income', '#6b7280', 'circle', true);
  
  -- Expense categories
  INSERT INTO public.finance_categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Ferramentas & Assinaturas', 'expense', '#ef4444', 'credit-card', true),
    (NEW.id, 'Marketing & Tráfego', 'expense', '#f97316', 'megaphone', true),
    (NEW.id, 'Operacional', 'expense', '#eab308', 'settings', true),
    (NEW.id, 'Pessoal', 'expense', '#ec4899', 'user', true),
    (NEW.id, 'Impostos & Taxas', 'expense', '#64748b', 'file-text', true),
    (NEW.id, 'Educação', 'expense', '#3b82f6', 'book-open', true);
  
  -- Investment categories
  INSERT INTO public.finance_categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Ações', 'investment', '#22c55e', 'trending-up', true),
    (NEW.id, 'Criptomoedas', 'investment', '#f59e0b', 'bitcoin', true),
    (NEW.id, 'Reserva de Emergência', 'investment', '#0ea5e9', 'shield', true),
    (NEW.id, 'Reinvestimento', 'investment', '#a855f7', 'refresh-cw', true);
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create categories for new users
CREATE TRIGGER on_new_user_create_finance_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_finance_categories();

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_finance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_finance_categories_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_finance_updated_at();

CREATE TRIGGER update_finance_transactions_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_finance_updated_at();

CREATE TRIGGER update_finance_goals_updated_at
  BEFORE UPDATE ON public.finance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_finance_updated_at();
