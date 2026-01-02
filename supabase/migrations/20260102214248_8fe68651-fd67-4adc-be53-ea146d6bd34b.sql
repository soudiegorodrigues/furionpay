-- Add countdown customization columns
ALTER TABLE product_checkout_configs 
ADD COLUMN IF NOT EXISTS countdown_color text DEFAULT '#dc2626',
ADD COLUMN IF NOT EXISTS countdown_text text DEFAULT 'OFERTA EXPIRA EM:';