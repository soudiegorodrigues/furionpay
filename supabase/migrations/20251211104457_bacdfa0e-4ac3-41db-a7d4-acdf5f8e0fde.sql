-- Add customization fields to product_checkout_configs
ALTER TABLE public.product_checkout_configs 
ADD COLUMN IF NOT EXISTS checkout_title text DEFAULT 'Finalizar Compra',
ADD COLUMN IF NOT EXISTS checkout_subtitle text,
ADD COLUMN IF NOT EXISTS buyer_section_title text DEFAULT 'Dados do comprador',
ADD COLUMN IF NOT EXISTS payment_section_title text DEFAULT 'Forma de pagamento',
ADD COLUMN IF NOT EXISTS footer_text text DEFAULT 'Pagamento processado com segurança',
ADD COLUMN IF NOT EXISTS security_badge_text text DEFAULT 'Pagamento Seguro',
ADD COLUMN IF NOT EXISTS show_security_badges boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_product_image boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#f3f4f6',
ADD COLUMN IF NOT EXISTS header_logo_url text;