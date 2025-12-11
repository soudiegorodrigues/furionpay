export interface ProductOffer {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  price: number;
  type: string;
  domain: string | null;
  offer_code: string | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export interface CheckoutConfig {
  primary_color: string | null;
  template: string | null;
  template_id: string | null;
  require_address: boolean;
  require_phone: boolean;
  require_birthdate: boolean;
  require_cpf: boolean;
  require_email_confirmation: boolean;
  show_countdown: boolean;
  countdown_minutes: number | null;
  show_notifications: boolean;
  custom_button_text: string | null;
  show_banners: boolean;
  thank_you_url: string | null;
  show_whatsapp_button: boolean;
  whatsapp_number: string | null;
  // New customization fields
  checkout_title: string | null;
  checkout_subtitle: string | null;
  buyer_section_title: string | null;
  payment_section_title: string | null;
  footer_text: string | null;
  security_badge_text: string | null;
  show_security_badges: boolean;
  show_product_image: boolean;
  background_color: string | null;
  header_logo_url: string | null;
  // Exit intent popup fields (optional for backwards compatibility)
  show_discount_popup?: boolean;
  discount_popup_title?: string | null;
  discount_popup_message?: string | null;
  discount_popup_cta?: string | null;
  discount_popup_percentage?: number | null;
}

export interface FormData {
  name: string;
  email: string;
  emailConfirm: string;
  phone: string;
  cpf: string;
  birthdate: string;
  address: string;
}

export interface PixData {
  qrCode: string;
  pixCode: string;
  txid: string;
  transactionId: string;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  content: string;
}

export interface CheckoutTemplateProps {
  offer: ProductOffer;
  product: Product | null;
  config: CheckoutConfig | null;
  formData: FormData;
  setFormData: (data: FormData) => void;
  step: "form" | "payment";
  pixData: PixData | null;
  isGeneratingPix: boolean;
  countdown: number | null;
  onGeneratePix: () => void;
  formatPrice: (price: number) => string;
  formatCountdown: (seconds: number) => string;
  testimonials?: Testimonial[];
  // Discount related props
  originalPrice?: number;
  discountApplied?: boolean;
}
