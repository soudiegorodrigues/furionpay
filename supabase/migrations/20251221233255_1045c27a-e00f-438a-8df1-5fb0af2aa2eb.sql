-- Adicionar constraint NOT NULL na coluna user_id para prevenir transações órfãs
ALTER TABLE public.pix_transactions 
ALTER COLUMN user_id SET NOT NULL;