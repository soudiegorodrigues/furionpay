// Helper utilities for extracting UTM data from both checkout and API transaction structures
// Checkout saves UTMs directly: { utm_source, utm_medium, ... }
// API saves UTMs nested: { metadata: { utm_source, utm_medium, ... } }

export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  metadata?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
}

export type UTMKey = 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term';

/**
 * Normalizes UTM data that may arrive as JSON strings (e.g. from RPC/json serialization),
 * ensuring we always work with an object and parsed metadata.
 */
function normalizeUtmData(input: any): UTMData | null {
  if (!input) return null;

  let data: any = input;

  // Sometimes JSON fields can arrive stringified
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Sometimes metadata may arrive stringified
  if (data && typeof data === "object" && typeof data.metadata === "string") {
    try {
      data = { ...data, metadata: JSON.parse(data.metadata) };
    } catch {
      // ignore
    }
  }

  return data as UTMData;
}

/**
 * Extracts a UTM value from transaction data, checking both direct and nested (API) structures
 */
export function getUtmValue(utmData: UTMData | null | undefined, key: UTMKey): string | undefined {
  const data = normalizeUtmData(utmData as any);
  if (!data) return undefined;

  // Check direct value first (checkout transactions)
  const directValue = (data as any)[key];
  if (directValue != null && String(directValue).length > 0) {
    return typeof directValue === "string" ? directValue : String(directValue);
  }

  // Check nested metadata (API transactions)
  const nestedValue = (data as any).metadata?.[key];
  if (nestedValue != null && String(nestedValue).length > 0) {
    return typeof nestedValue === "string" ? nestedValue : String(nestedValue);
  }

  return undefined;
}

/**
 * Checks if transaction has any UTM data (from either structure)
 */
export function hasUtmData(utmData: UTMData | null | undefined): boolean {
  const data = normalizeUtmData(utmData as any);
  if (!data) return false;

  const keys: UTMKey[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  // Check direct values
  const hasDirectUtm = keys.some((key) => {
    const value = (data as any)[key];
    return value != null && String(value).length > 0;
  });

  if (hasDirectUtm) return true;

  // Check nested metadata
  const hasNestedUtm = keys.some((key) => {
    const value = (data as any).metadata?.[key];
    return value != null && String(value).length > 0;
  });

  return hasNestedUtm;
}

/**
 * Gets all UTM values as an object (merging both structures)
 */
export function getAllUtmValues(utmData: UTMData | null | undefined): Record<UTMKey, string | undefined> {
  return {
    utm_source: getUtmValue(utmData, 'utm_source'),
    utm_medium: getUtmValue(utmData, 'utm_medium'),
    utm_campaign: getUtmValue(utmData, 'utm_campaign'),
    utm_content: getUtmValue(utmData, 'utm_content'),
    utm_term: getUtmValue(utmData, 'utm_term'),
  };
}

/**
 * Determines traffic source type from UTM data
 */
export function getTrafficSource(utmData: UTMData | null | undefined): 'facebook' | 'google' | 'tiktok' | 'other' | null {
  const source = getUtmValue(utmData, 'utm_source')?.toLowerCase();
  
  if (!source) return null;
  
  if (source.includes('facebook') || source.includes('fb') || source.includes('instagram') || source.includes('ig')) {
    return 'facebook';
  }
  
  if (source.includes('google') || source.includes('gads') || source.includes('youtube')) {
    return 'google';
  }
  
  if (source.includes('tiktok') || source.includes('bytedance')) {
    return 'tiktok';
  }
  
  return 'other';
}

/**
 * Extracts customer email from UTM data or direct donor_email field
 */
export function getCustomerEmail(transaction: { donor_email?: string; utm_data?: UTMData | null } | null | undefined): string | undefined {
  if (!transaction) return undefined;
  
  // Check direct donor_email field first
  if (transaction.donor_email && transaction.donor_email.length > 0) {
    return transaction.donor_email;
  }
  
  // Check nested in utm_data.customer.email (API transactions)
  const utmData = normalizeUtmData(transaction.utm_data as any);
  if (utmData) {
    const customerEmail = (utmData as any).customer?.email;
    if (customerEmail && String(customerEmail).length > 0) {
      return String(customerEmail);
    }
  }
  
  return undefined;
}
