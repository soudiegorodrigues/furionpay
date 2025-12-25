export type StepType = 'upsell' | 'downsell' | 'crosssell' | 'thankyou';

export interface FunnelStep {
  id: string;
  funnel_id: string;
  step_type: StepType;
  offer_product_id: string | null;
  position: number;
  title: string;
  headline: string | null;
  description: string | null;
  offer_price: number | null;
  original_price: number | null;
  timer_seconds: number;
  button_accept_text: string;
  button_decline_text: string;
  image_url: string | null;
  video_url: string | null;
  background_color: string;
  button_color: string;
  accept_url: string | null;
  decline_url: string | null;
  next_step_on_accept: string | null;
  next_step_on_decline: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  offer_product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

export interface SalesFunnel {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  is_active: boolean;
  origin_url: string | null;
  thank_you_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  steps?: FunnelStep[];
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

export interface FunnelConversion {
  id: string;
  funnel_id: string;
  step_id: string;
  transaction_id: string | null;
  action: 'viewed' | 'accepted' | 'declined' | 'paid';
  created_at: string;
}

export const STEP_CONFIG = {
  upsell: {
    label: 'Upsell',
    description: 'Oferta de maior valor',
    icon: 'TrendingUp',
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-600',
  },
  downsell: {
    label: 'Downsell',
    description: 'Oferta alternativa de menor valor',
    icon: 'TrendingDown',
    color: 'bg-amber-500',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600',
  },
  crosssell: {
    label: 'Cross-sell',
    description: 'Produto complementar',
    icon: 'Shuffle',
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
  },
  thankyou: {
    label: 'Obrigado',
    description: 'Página de confirmação',
    icon: 'CheckCircle',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
  },
} as const;

export interface StepMetrics {
  views: number;
  accepted: number;
  declined: number;
  paid: number;
  revenue: number;
}
