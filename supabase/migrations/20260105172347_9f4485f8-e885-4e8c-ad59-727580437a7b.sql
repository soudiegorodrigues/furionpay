-- Adicionar coluna video_url na tabela checkout_offers
ALTER TABLE public.checkout_offers 
ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.checkout_offers.video_url IS 
'URL do vídeo para exibir no popup Vakinha 3 (YouTube, Vimeo ou link direto)';