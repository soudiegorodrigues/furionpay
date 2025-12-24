-- Remover a política RESTRICTIVE existente
DROP POLICY IF EXISTS "Anyone can view banners for active products" ON checkout_banners;

-- Criar nova política PERMISSIVE para visualização pública
CREATE POLICY "Anyone can view banners for active products" 
ON checkout_banners 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = checkout_banners.product_id 
    AND p.is_active = true
  )
);