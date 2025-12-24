-- Adicionar campos de entrega digital na tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS delivery_link TEXT,
ADD COLUMN IF NOT EXISTS delivery_file_url TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.products.delivery_link IS 'Link externo para entrega do produto (Drive, Dropbox, etc.)';
COMMENT ON COLUMN public.products.delivery_file_url IS 'URL do arquivo de entrega no storage';

-- Criar bucket para arquivos de entrega de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-deliverables', 'product-deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- Política: Usuários podem fazer upload para seus próprios produtos
CREATE POLICY "Users can upload deliverables"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-deliverables' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem visualizar seus próprios arquivos
CREATE POLICY "Users can view own deliverables"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-deliverables' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own deliverables"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-deliverables' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Service role pode ler qualquer arquivo (para edge functions enviarem emails)
CREATE POLICY "Service role can read deliverables"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-deliverables'
  AND auth.role() = 'service_role'
);