-- Create secure function to fetch checkout config for public checkout page
CREATE OR REPLACE FUNCTION public.get_public_checkout_config(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  template text,
  primary_color text,
  background_color text,
  show_banners boolean,
  header_logo_url text,
  show_countdown boolean,
  countdown_minutes integer,
  show_video boolean,
  video_url text,
  show_notifications boolean,
  show_product_image boolean,
  show_discount_popup boolean,
  discount_popup_title text,
  discount_popup_message text,
  discount_popup_cta text,
  discount_popup_color text,
  discount_popup_percentage numeric,
  discount_popup_image_url text,
  require_phone boolean,
  require_cpf boolean,
  require_birthdate boolean,
  require_address boolean,
  require_email_confirmation boolean,
  buyer_section_title text,
  payment_section_title text,
  security_badge_text text,
  footer_text text,
  custom_button_text text,
  show_whatsapp_button boolean,
  whatsapp_number text,
  back_redirect_url text,
  thank_you_url text,
  checkout_title text,
  checkout_subtitle text,
  show_security_badges boolean,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcc.id, pcc.product_id, pcc.template, pcc.primary_color, pcc.background_color,
    pcc.show_banners, pcc.header_logo_url, pcc.show_countdown, pcc.countdown_minutes,
    pcc.show_video, pcc.video_url, pcc.show_notifications, pcc.show_product_image,
    pcc.show_discount_popup, pcc.discount_popup_title, pcc.discount_popup_message,
    pcc.discount_popup_cta, pcc.discount_popup_color, pcc.discount_popup_percentage,
    pcc.discount_popup_image_url, pcc.require_phone, pcc.require_cpf, pcc.require_birthdate,
    pcc.require_address, pcc.require_email_confirmation, pcc.buyer_section_title,
    pcc.payment_section_title, pcc.security_badge_text, pcc.footer_text,
    pcc.custom_button_text, pcc.show_whatsapp_button, pcc.whatsapp_number,
    pcc.back_redirect_url, pcc.thank_you_url, pcc.checkout_title, pcc.checkout_subtitle,
    pcc.show_security_badges, pcc.user_id
  FROM product_checkout_configs pcc
  JOIN products p ON p.id = pcc.product_id
  WHERE pcc.product_id = p_product_id
    AND p.is_active = true;
END;
$$;