export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
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
