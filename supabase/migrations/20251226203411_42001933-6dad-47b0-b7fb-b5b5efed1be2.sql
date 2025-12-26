-- Add redirect_url column to product_offers table
ALTER TABLE product_offers 
ADD COLUMN redirect_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN product_offers.redirect_url IS 'URL para redirecionar o cliente após pagamento confirmado (upsell, downsell, cross-sell, ou página externa)';