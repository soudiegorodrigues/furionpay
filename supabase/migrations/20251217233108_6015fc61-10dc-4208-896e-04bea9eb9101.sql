-- Allow collaborators to access finance_* data via effective owner mapping
-- This keeps owners unchanged while enabling collaborators (is_active=true) to read/write the owner's finance records.

-- finance_accounts
ALTER POLICY "Users can view their own accounts" ON public.finance_accounts
  USING (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can create their own accounts" ON public.finance_accounts
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can update their own accounts" ON public.finance_accounts
  USING (user_id = public.get_effective_owner_id(auth.uid()))
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can delete their own accounts" ON public.finance_accounts
  USING (user_id = public.get_effective_owner_id(auth.uid()));

-- finance_categories
ALTER POLICY "Users can view their own categories" ON public.finance_categories
  USING (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can create their own categories" ON public.finance_categories
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can update their own categories" ON public.finance_categories
  USING (user_id = public.get_effective_owner_id(auth.uid()))
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can delete their own categories" ON public.finance_categories
  USING (
    user_id = public.get_effective_owner_id(auth.uid())
    AND is_default = false
  );

-- finance_transactions
ALTER POLICY "Users can view their own transactions" ON public.finance_transactions
  USING (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can create their own transactions" ON public.finance_transactions
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can update their own transactions" ON public.finance_transactions
  USING (user_id = public.get_effective_owner_id(auth.uid()))
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can delete their own transactions" ON public.finance_transactions
  USING (user_id = public.get_effective_owner_id(auth.uid()));

-- finance_goals
ALTER POLICY "Users can view their own goals" ON public.finance_goals
  USING (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can create their own goals" ON public.finance_goals
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can update their own goals" ON public.finance_goals
  USING (user_id = public.get_effective_owner_id(auth.uid()))
  WITH CHECK (user_id = public.get_effective_owner_id(auth.uid()));

ALTER POLICY "Users can delete their own goals" ON public.finance_goals
  USING (user_id = public.get_effective_owner_id(auth.uid()));
