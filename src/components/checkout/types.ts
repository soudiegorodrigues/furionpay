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
  upsell_url?: string | null;
  downsell_url?: string | null;
  crosssell_url?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  product_code?: string | null;
  is_active?: boolean;
}

export interface CheckoutConfig {
  user_id?: string;
  discount_popup_color?: string | null;
  discount_popup_image_url?: string | null;
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
  countdown_color?: string | null;
  countdown_text?: string | null;
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
  // Video fields
  show_video?: boolean;
  video_url?: string | null;
  video_poster_url?: string | null;
  video_play_overlay_url?: string | null;
  // Back redirect
  back_redirect_url?: string | null;
  // Delivery description field
  delivery_description?: string | null;
}

export interface FormData {
  name: string;
  email: string;
  emailConfirm: string;
  phone: string;
  cpf: string;
  birthdate: string;
  address: string;
  // Structured address fields
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
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

export interface OrderBumpData {
  id: string;
  title: string;
  description: string | null;
  bump_price: number;
  image_url?: string | null;
  bump_product: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

export interface Banner {
  id: string;
  image_url: string;
  display_order: number;
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
  // Order Bump props
  orderBumps?: OrderBumpData[];
  selectedBumps?: string[];
  onToggleBump?: (bumpId: string) => void;
  // Banners prop to eliminate internal fetch and CLS
  banners?: Banner[];
}
