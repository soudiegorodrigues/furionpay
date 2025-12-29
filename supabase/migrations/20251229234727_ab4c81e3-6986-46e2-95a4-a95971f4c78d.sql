-- Criar bucket para vídeos de checkout
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('checkout-videos', 'checkout-videos', true, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Política: Usuários autenticados podem fazer upload
CREATE POLICY "Users can upload checkout videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'checkout-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Qualquer um pode visualizar (público para o checkout)
CREATE POLICY "Anyone can view checkout videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'checkout-videos');

-- Política: Usuários podem deletar seus próprios vídeos
CREATE POLICY "Users can delete own checkout videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'checkout-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);