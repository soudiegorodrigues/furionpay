-- Permitir que usuários anônimos vejam produtos ativos (necessário para checkout público e testimonials)
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);