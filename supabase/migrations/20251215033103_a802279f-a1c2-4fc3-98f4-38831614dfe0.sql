-- Add spending_limit column to finance_categories table
ALTER TABLE public.finance_categories 
ADD COLUMN spending_limit numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.finance_categories.spending_limit IS 'Monthly spending limit for expense categories. When exceeded, triggers an alert.';