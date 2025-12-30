// Types only - use type-only imports for tree-shaking
export type {
  ProductOffer,
  Product,
  CheckoutConfig,
  FormData,
  PixData,
  Testimonial,
  OrderBumpData,
  CheckoutTemplateProps,
} from "./types";

// NOTE: Components should be imported directly from their files
// or using lazy() for code splitting. This barrel export is kept
// for backwards compatibility but should be avoided in new code.
// Example: import { CheckoutTemplatePadrao } from "@/components/checkout/CheckoutTemplatePadrao";
