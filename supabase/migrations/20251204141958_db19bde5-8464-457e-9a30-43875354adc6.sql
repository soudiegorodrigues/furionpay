-- Add popup_model column to track which model was used for each transaction
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS popup_model text;