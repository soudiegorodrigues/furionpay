export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  traffic_type?: string;
  fbclid?: string;
}

// Storage key for persistence
const UTM_STORAGE_KEY = "furionpay_utm_params";

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

    // Map known domains to sources - Facebook domains expanded
    const sourceMap: Record<string, { source: string; medium: string }> = {
      // Facebook - ALL domains
      "facebook.com": { source: "facebook", medium: "paid" },
      "fb.com": { source: "facebook", medium: "paid" },
      "l.facebook.com": { source: "facebook", medium: "paid" },
      "lm.facebook.com": { source: "facebook", medium: "paid" },
      "m.facebook.com": { source: "facebook", medium: "paid" },
      "web.facebook.com": { source: "facebook", medium: "paid" },
      "business.facebook.com": { source: "facebook", medium: "paid" },
      // Instagram
      "instagram.com": { source: "instagram", medium: "paid" },
      "l.instagram.com": { source: "instagram", medium: "paid" },
      // Google
      "google.com": { source: "google", medium: "organic" },
      "google.com.br": { source: "google", medium: "organic" },
      // Twitter/X
      "twitter.com": { source: "twitter", medium: "social" },
      "t.co": { source: "twitter", medium: "social" },
      "x.com": { source: "twitter", medium: "social" },
      // LinkedIn
      "linkedin.com": { source: "linkedin", medium: "social" },
      // YouTube
      "youtube.com": { source: "youtube", medium: "social" },
      "youtu.be": { source: "youtube", medium: "social" },
      // TikTok
      "tiktok.com": { source: "tiktok", medium: "paid" },
      // Pinterest
      "pinterest.com": { source: "pinterest", medium: "social" },
      // Search engines
      "bing.com": { source: "bing", medium: "organic" },
      "yahoo.com": { source: "yahoo", medium: "organic" },
      "duckduckgo.com": { source: "duckduckgo", medium: "organic" },
      // Messaging
      "whatsapp.com": { source: "whatsapp", medium: "social" },
      "web.whatsapp.com": { source: "whatsapp", medium: "social" },
      "telegram.org": { source: "telegram", medium: "social" },
      "t.me": { source: "telegram", medium: "social" },
    };

    // Check exact match first
    if (sourceMap[hostname]) {
      return sourceMap[hostname];
    }

    // Check partial match (for subdomains)
    for (const [key, value] of Object.entries(sourceMap)) {
      if (hostname.includes(key) || hostname.endsWith(`.${key}`)) {
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
 * Limpa UTM source corrompido por sistemas como Utmify
 * Patterns detectados:
 * - "FBjLj694..." -> "facebook"
 * - "tiktokjLj694..." -> "tiktok"
 * - "googlejLj694..." -> "google"
 */
function cleanUtmSource(source: string | null | undefined): string | null {
  if (!source) return null;
  
  const sourceLower = source.toLowerCase();
  
  // Pattern: starts with known platform name followed by "jLj" (Utmify lead ID pattern)
  const utmifyPattern = /^(tiktok|facebook|fb|google|instagram|ig|twitter|youtube|pinterest|linkedin|whatsapp|telegram|kwai|snapchat)jlj/i;
  const match = sourceLower.match(utmifyPattern);
  
  if (match) {
    const platform = match[1].toLowerCase();
    console.log('[UTM DEBUG] UTM source corrompido detectado:', source, '-> limpo para:', platform);
    // Normalize platform names
    if (platform === 'fb') return 'facebook';
    if (platform === 'ig') return 'instagram';
    return platform;
  }
  
  // Pattern: starts with "FBjLj" (Facebook specific pattern from Utmify)
  if (/^fbjlj/i.test(sourceLower)) {
    console.log('[UTM DEBUG] UTM source Facebook corrompido detectado:', source, '-> limpo para: facebook');
    return 'facebook';
  }
  
  // No corruption detected, return original
  return source;
}

/**
 * Captura os parâmetros UTM da URL atual
 */
export function captureUTMParams(): UTMParams {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  
  // PRIORIDADE MÁXIMA: Capturar fbclid PRIMEIRO
  const fbclid = params.get("fbclid");
  
  if (fbclid) {
    console.log('[UTM DEBUG] fbclid encontrado na URL:', fbclid.substring(0, 20) + '...');
    // Limpar utm_source se estiver corrompido
    const rawUtmSource = params.get("utm_source");
    const cleanedSource = cleanUtmSource(rawUtmSource) || "facebook";
    
    const facebookUtms: UTMParams = {
      fbclid: fbclid,
      utm_source: cleanedSource,
      utm_medium: params.get("utm_medium") || "paid",
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
      utm_term: params.get("utm_term") || undefined,
      traffic_type: "ad",
    };
    
    // Remove undefined values
    Object.keys(facebookUtms).forEach((key) => {
      if (facebookUtms[key as keyof UTMParams] === undefined) {
        delete facebookUtms[key as keyof UTMParams];
      }
    });
    
    console.log('[UTM DEBUG] UTMs do Facebook capturados (limpos):', facebookUtms);
    return facebookUtms;
  }

  // Capturar e limpar utm_source
  const rawUtmSource = params.get("utm_source");
  const cleanedUtmSource = cleanUtmSource(rawUtmSource);

  // Se não tem fbclid, continuar com lógica normal
  const utmParams: UTMParams = {
    utm_source: cleanedUtmSource || undefined,
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
  if (!utmParams.utm_source) {
    const referrerData = parseReferrer();
    
    if (referrerData) {
      utmParams.utm_source = referrerData.source;
      utmParams.utm_medium = referrerData.medium;
      utmParams.referrer = document.referrer;
      utmParams.traffic_type = referrerData.medium === "paid" ? "ad" : "organic";
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
 * Salva os parâmetros UTM no localStorage E sessionStorage para máxima persistência
 */
export function saveUTMParams(utmParams: UTMParams): void {
  if (typeof window === "undefined") return;

  try {
    const jsonParams = JSON.stringify(utmParams);
    // Use both storages for maximum persistence
    sessionStorage.setItem(UTM_STORAGE_KEY, jsonParams);
    localStorage.setItem(UTM_STORAGE_KEY, jsonParams);
    console.log('[UTM DEBUG] UTMs salvos em localStorage e sessionStorage:', utmParams);
  } catch (error) {
    console.error("Erro ao salvar UTM params:", error);
  }
}

/**
 * Recupera os parâmetros UTM salvos (prioriza sessionStorage, depois localStorage)
 */
export function getSavedUTMParams(): UTMParams {
  if (typeof window === "undefined") return {};

  try {
    // Try sessionStorage first (current session)
    let saved = sessionStorage.getItem(UTM_STORAGE_KEY);
    
    // Fallback to localStorage (persists across sessions)
    if (!saved) {
      saved = localStorage.getItem(UTM_STORAGE_KEY);
    }
    
    if (saved) {
      const params = JSON.parse(saved);
      
      // Validate that parsed data is a valid object (not array or primitive)
      if (typeof params !== 'object' || params === null || Array.isArray(params)) {
        console.warn('[UTM] Dados corrompidos no storage, limpando...');
        try {
          sessionStorage.removeItem(UTM_STORAGE_KEY);
          localStorage.removeItem(UTM_STORAGE_KEY);
        } catch {}
        return {};
      }
      
      console.log('[UTM DEBUG] UTMs recuperados do storage:', params);
      return params;
    }
    return {};
  } catch (error) {
    // JSON inválido - limpar storage para evitar problemas futuros
    console.warn('[UTM] Erro ao parsear UTMs, limpando storage:', error);
    try {
      sessionStorage.removeItem(UTM_STORAGE_KEY);
      localStorage.removeItem(UTM_STORAGE_KEY);
    } catch {}
    return {};
  }
}

/**
 * Captura UTMs da URL ou recupera do storage
 * Prioriza os parâmetros da URL atual
 */
export function getUTMParams(): UTMParams {
  const currentParams = captureUTMParams();
  const savedParams = getSavedUTMParams();

  // Se os params atuais têm UTMs reais (não apenas direct), use-os
  const hasRealUtms = currentParams.utm_source && currentParams.utm_source !== "direct";
  const savedHasRealUtms = savedParams.utm_source && savedParams.utm_source !== "direct";
  
  // Mescla os parâmetros, dando prioridade aos atuais se tiverem UTMs reais
  let merged: UTMParams;
  if (hasRealUtms) {
    merged = { ...savedParams, ...currentParams };
  } else if (savedHasRealUtms) {
    // Se salvos têm UTMs reais, use-os mas mantenha traffic_type atual se for direct
    merged = { ...currentParams, ...savedParams };
  } else {
    merged = { ...savedParams, ...currentParams };
  }

  // SEMPRE salva os parâmetros - inclusive tráfego direto
  // Isso garante que todas as transações tenham utm_data registrado
  if (Object.keys(merged).length > 0) {
    saveUTMParams(merged);
  }

  console.log('[UTM DEBUG] getUTMParams resultado final:', merged);
  return merged;
}
