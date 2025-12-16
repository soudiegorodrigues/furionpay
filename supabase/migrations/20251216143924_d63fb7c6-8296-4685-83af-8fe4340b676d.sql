-- Add delivery_description column to product_checkout_configs
ALTER TABLE product_checkout_configs 
ADD COLUMN delivery_description TEXT DEFAULT 'Acesso imediato';