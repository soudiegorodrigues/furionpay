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
}
