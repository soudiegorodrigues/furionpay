export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  traffic_type?: string;
}

/**
 * Parse referrer URL to identify traffic source
 */
function parseReferrer(): { source: string; medium: string } | null {
  if (typeof window === "undefined" || !document.referrer) {
    return null;
  }

  try {
    const referrerUrl = new URL(document.referrer);
    const hostname = referrerUrl.hostname.toLowerCase();

    // Map known domains to sources
    const sourceMap: Record<string, { source: string; medium: string }> = {
      "google": { source: "google", medium: "organic" },
      "facebook": { source: "facebook", medium: "social" },
      "fb": { source: "facebook", medium: "social" },
      "instagram": { source: "instagram", medium: "social" },
      "twitter": { source: "twitter", medium: "social" },
      "x.com": { source: "twitter", medium: "social" },
      "linkedin": { source: "linkedin", medium: "social" },
      "youtube": { source: "youtube", medium: "social" },
      "tiktok": { source: "tiktok", medium: "social" },
      "pinterest": { source: "pinterest", medium: "social" },
      "bing": { source: "bing", medium: "organic" },
      "yahoo": { source: "yahoo", medium: "organic" },
      "duckduckgo": { source: "duckduckgo", medium: "organic" },
      "whatsapp": { source: "whatsapp", medium: "social" },
      "telegram": { source: "telegram", medium: "social" },
    };

    for (const [key, value] of Object.entries(sourceMap)) {
      if (hostname.includes(key)) {
        return value;
      }
    }

    // Return the domain as source for unknown referrers
    return { source: hostname.replace("www.", ""), medium: "referral" };
  } catch {
    return null;
  }
}

/**
 * Captura os parâmetros UTM da URL atual
 */
export function captureUTMParams(): UTMParams {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  const utmParams: UTMParams = {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
  };

  // Remove undefined values
  Object.keys(utmParams).forEach((key) => {
    if (utmParams[key as keyof UTMParams] === undefined) {
      delete utmParams[key as keyof UTMParams];
    }
  });

  // If no UTMs, try to capture from referrer
  if (Object.keys(utmParams).length === 0) {
    const referrerData = parseReferrer();
    
    if (referrerData) {
      utmParams.utm_source = referrerData.source;
      utmParams.utm_medium = referrerData.medium;
      utmParams.referrer = document.referrer;
      utmParams.traffic_type = "organic";
      console.log('[UTM DEBUG] UTMs criados a partir do referrer:', referrerData);
    } else {
      // No UTMs and no referrer = direct traffic
      utmParams.utm_source = "direct";
      utmParams.utm_medium = "none";
      utmParams.traffic_type = "direct";
      console.log('[UTM DEBUG] Tráfego direto detectado (sem UTMs e sem referrer)');
    }
  } else {
    utmParams.traffic_type = "campaign";
  }

  return utmParams;
}

/**
 * Salva os parâmetros UTM no sessionStorage para persistência
 */
export function saveUTMParams(utmParams: UTMParams): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem("utm_params", JSON.stringify(utmParams));
  } catch (error) {
    console.error("Erro ao salvar UTM params:", error);
  }
}

/**
 * Recupera os parâmetros UTM salvos no sessionStorage
 */
export function getSavedUTMParams(): UTMParams {
  if (typeof window === "undefined") return {};

  try {
    const saved = sessionStorage.getItem("utm_params");
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error("Erro ao recuperar UTM params:", error);
    return {};
  }
}

/**
 * Captura UTMs da URL ou recupera do sessionStorage
 * Prioriza os parâmetros da URL atual
 */
export function getUTMParams(): UTMParams {
  const currentParams = captureUTMParams();
  const savedParams = getSavedUTMParams();

  // Mescla os parâmetros, dando prioridade aos atuais
  const merged = { ...savedParams, ...currentParams };

  // Salva os parâmetros mesclados
  if (Object.keys(merged).length > 0) {
    saveUTMParams(merged);
  }

  return merged;
}
