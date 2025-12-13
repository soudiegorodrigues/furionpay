/**
 * FurionPay Universal UTM Tracker v2.2
 * Atualizado: 2025-12-13
 * Adicione este script nas suas páginas de vendas para preservar UTMs automaticamente
 * 
 * Uso: <script src="https://SEU_DOMINIO/utm-tracker.js"></script>
 * 
 * NOVIDADE v2.2: Preserva fbclid entre navegações internas do site
 */
(function() {
  'use strict';

  // Domínios de checkout conhecidos
  var CHECKOUT_DOMAINS = [
    'vakinha-doar.shop',
    'www.vakinha-doar.shop',
    'vakinha.doehoje.shop',
    'www.vakinha.doehoje.shop',
    'doehoje.shop',
    'www.doehoje.shop',
    'furionpay.com',
    'www.furionpay.com',
    'lovable.app',
    'lovableproject.com',
    'lovable.dev'
  ];

  var UTM_PARAMS = [
    'utm_source',
    'utm_medium', 
    'utm_campaign',
    'utm_content',
    'utm_term',
    'fbclid',
    'gclid',
    'ttclid',
    'ref'
  ];

  var STORAGE_KEY = 'furionpay_utm_data';

  // Log com prefixo para debug
  function log(message, data) {
    if (data !== undefined) {
      console.log('[FurionPay UTM] ' + message, data);
    } else {
      console.log('[FurionPay UTM] ' + message);
    }
  }

  // Captura UTMs da URL atual - PRIORIZA fbclid
  function captureUTMs() {
    var params = new URLSearchParams(window.location.search);
    var utmData = {};
    
    // PRIORIDADE MÁXIMA: Capturar fbclid PRIMEIRO
    var fbclid = params.get('fbclid');
    if (fbclid) {
      log('✅ fbclid DETECTADO:', fbclid.substring(0, 30) + '...');
      utmData.fbclid = fbclid;
      utmData.utm_source = params.get('utm_source') || 'facebook';
      utmData.utm_medium = params.get('utm_medium') || 'paid';
      utmData.traffic_type = 'ad';
      
      // Capturar outros UTMs do Facebook
      var campaign = params.get('utm_campaign');
      var content = params.get('utm_content');
      var term = params.get('utm_term');
      
      if (campaign) utmData.utm_campaign = campaign;
      if (content) utmData.utm_content = content;
      if (term) utmData.utm_term = term;
      
      utmData.captured_at = new Date().toISOString();
      utmData.landing_page = window.location.href;
      
      log('UTMs do Facebook capturados:', utmData);
      return utmData;
    }

    // Capturar gclid (Google Ads)
    var gclid = params.get('gclid');
    if (gclid) {
      log('✅ gclid DETECTADO (Google Ads)');
      utmData.gclid = gclid;
      utmData.utm_source = params.get('utm_source') || 'google';
      utmData.utm_medium = params.get('utm_medium') || 'cpc';
      utmData.traffic_type = 'ad';
    }

    // Capturar ttclid (TikTok Ads)
    var ttclid = params.get('ttclid');
    if (ttclid) {
      log('✅ ttclid DETECTADO (TikTok Ads)');
      utmData.ttclid = ttclid;
      utmData.utm_source = params.get('utm_source') || 'tiktok';
      utmData.utm_medium = params.get('utm_medium') || 'paid';
      utmData.traffic_type = 'ad';
    }

    // Capturar demais UTMs
    UTM_PARAMS.forEach(function(param) {
      var value = params.get(param);
      if (value && !utmData[param]) {
        utmData[param] = value;
      }
    });

    // Verificar se tem UTMs relevantes na URL
    var hasUTMs = utmData.utm_source || utmData.fbclid || utmData.gclid || utmData.ttclid;

    // NÃO capturar referrer se for navegação interna (mesmo domínio)
    // Isso evita sobrescrever o fbclid salvo com "referral"
    if (!hasUTMs && document.referrer) {
      try {
        var referrerUrl = new URL(document.referrer);
        var referrerHost = referrerUrl.hostname.toLowerCase();
        var currentHost = window.location.hostname.toLowerCase();
        
        // Se é navegação interna (mesmo domínio), NÃO sobrescrever
        if (referrerHost === currentHost || 
            referrerHost.endsWith('.' + currentHost) || 
            currentHost.endsWith('.' + referrerHost)) {
          log('Navegação interna detectada - preservando UTMs salvos');
          utmData._isInternalNavigation = true;
          return utmData;
        }
        
        // Detecta fonte pelo referrer (apenas para navegação externa)
        if (referrerHost.includes('facebook') || referrerHost.includes('fb.com')) {
          utmData.utm_source = 'facebook';
          utmData.utm_medium = 'social';
        } else if (referrerHost.includes('instagram')) {
          utmData.utm_source = 'instagram';
          utmData.utm_medium = 'social';
        } else if (referrerHost.includes('google')) {
          utmData.utm_source = 'google';
          utmData.utm_medium = 'organic';
        } else if (referrerHost.includes('tiktok')) {
          utmData.utm_source = 'tiktok';
          utmData.utm_medium = 'social';
        } else if (referrerHost.includes('youtube')) {
          utmData.utm_source = 'youtube';
          utmData.utm_medium = 'social';
        } else {
          utmData.utm_source = referrerHost;
          utmData.utm_medium = 'referral';
        }
        
        utmData.referrer = document.referrer;
      } catch (e) {
        // Ignora erros de parse
      }
    }

    utmData.captured_at = new Date().toISOString();
    utmData.landing_page = window.location.href;

    return utmData;
  }

  // Salva UTMs no localStorage
  function saveUTMs(utmData) {
    try {
      // Só salva se tiver dados relevantes (fbclid, gclid, ttclid ou utm_source)
      var hasRelevantData = utmData.fbclid || utmData.gclid || utmData.ttclid || utmData.utm_source;
      if (hasRelevantData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
        log('UTMs salvos no storage');
      }
    } catch (e) {
      // localStorage pode estar bloqueado
    }
  }

  // Carrega UTMs salvos
  function loadUTMs() {
    try {
      var sessionData = sessionStorage.getItem(STORAGE_KEY);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
      var localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (e) {
      // Ignora erros
    }
    return null;
  }

  // Verifica se é um link interno (mesmo domínio)
  function isInternalLink(href) {
    if (!href) return false;
    try {
      var url = new URL(href, window.location.origin);
      var linkHost = url.hostname.toLowerCase();
      var currentHost = window.location.hostname.toLowerCase();
      
      return linkHost === currentHost || 
             linkHost.endsWith('.' + currentHost) || 
             currentHost.endsWith('.' + linkHost);
    } catch (e) {
      return false;
    }
  }

  // Verifica se é um link de checkout
  function isCheckoutLink(href) {
    if (!href) return false;
    try {
      var url = new URL(href, window.location.origin);
      var hostname = url.hostname.toLowerCase();
      
      return CHECKOUT_DOMAINS.some(function(domain) {
        return hostname === domain || hostname.endsWith('.' + domain);
      });
    } catch (e) {
      return false;
    }
  }

  // Adiciona UTMs a uma URL - PRIORIZA fbclid
  function addUTMsToUrl(href, utmData) {
    if (!href || !utmData) return href;
    
    try {
      var url = new URL(href, window.location.origin);
      
      // PRIORIDADE MÁXIMA: Sempre adicionar fbclid se existir
      if (utmData.fbclid && !url.searchParams.has('fbclid')) {
        url.searchParams.set('fbclid', utmData.fbclid);
        log('✅ fbclid adicionado ao link');
      }
      
      // Adicionar gclid se existir
      if (utmData.gclid && !url.searchParams.has('gclid')) {
        url.searchParams.set('gclid', utmData.gclid);
      }
      
      // Adicionar ttclid se existir
      if (utmData.ttclid && !url.searchParams.has('ttclid')) {
        url.searchParams.set('ttclid', utmData.ttclid);
      }
      
      // Adicionar outros UTMs
      UTM_PARAMS.forEach(function(param) {
        if (param !== 'fbclid' && param !== 'gclid' && param !== 'ttclid') {
          if (utmData[param] && !url.searchParams.has(param)) {
            url.searchParams.set(param, utmData[param]);
          }
        }
      });
      
      return url.toString();
    } catch (e) {
      return href;
    }
  }

  // Atualiza todos os links na página (internos E de checkout)
  function updateAllLinks(utmData) {
    if (!utmData || (!utmData.fbclid && !utmData.gclid && !utmData.ttclid)) return;

    var links = document.querySelectorAll('a[href]');
    var updatedCount = 0;
    
    links.forEach(function(link) {
      // Atualizar links internos E de checkout
      if (isInternalLink(link.href) || isCheckoutLink(link.href)) {
        var newHref = addUTMsToUrl(link.href, utmData);
        if (newHref !== link.href) {
          link.href = newHref;
          updatedCount++;
        }
      }
    });
    
    if (updatedCount > 0) {
      log('Links atualizados com UTMs:', updatedCount);
    }
  }

  // Intercepta cliques em links
  function interceptClicks(utmData) {
    if (!utmData || (!utmData.fbclid && !utmData.gclid && !utmData.ttclid)) return;

    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (link && (isInternalLink(link.href) || isCheckoutLink(link.href))) {
        var newHref = addUTMsToUrl(link.href, utmData);
        if (newHref !== link.href) {
          link.href = newHref;
          log('UTMs adicionados no clique:', newHref.substring(0, 100) + '...');
        }
      }
    }, true);
  }

  // Intercepta submissão de formulários
  function interceptForms(utmData) {
    if (!utmData) return;

    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.action && (isInternalLink(form.action) || isCheckoutLink(form.action))) {
        // Adicionar UTMs como campos hidden
        UTM_PARAMS.forEach(function(param) {
          if (utmData[param]) {
            // Verificar se já existe
            var existing = form.querySelector('input[name="' + param + '"]');
            if (!existing) {
              var input = document.createElement('input');
              input.type = 'hidden';
              input.name = param;
              input.value = utmData[param];
              form.appendChild(input);
            }
          }
        });
        log('UTMs adicionados ao formulário');
      }
    }, true);
  }

  // Observa novos links adicionados dinamicamente
  function observeNewLinks(utmData) {
    if (!utmData || !window.MutationObserver) return;
    if (!utmData.fbclid && !utmData.gclid && !utmData.ttclid) return;

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'A' && (isInternalLink(node.href) || isCheckoutLink(node.href))) {
              node.href = addUTMsToUrl(node.href, utmData);
            }
            // Verifica links dentro do elemento adicionado
            var innerLinks = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
            innerLinks.forEach(function(link) {
              if (isInternalLink(link.href) || isCheckoutLink(link.href)) {
                link.href = addUTMsToUrl(link.href, utmData);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Mescla UTMs salvos com UTMs atuais (prioriza fbclid salvo)
  function mergeUTMs(currentUTMs, savedUTMs) {
    if (!savedUTMs) return currentUTMs;
    if (!currentUTMs) return savedUTMs;
    
    var merged = {};
    
    // Se é navegação interna, usar os UTMs salvos completamente
    if (currentUTMs._isInternalNavigation) {
      log('🔄 Navegação interna - usando UTMs salvos');
      return savedUTMs;
    }
    
    // Priorizar fbclid/gclid/ttclid salvos se não tiver na URL atual
    if (savedUTMs.fbclid && !currentUTMs.fbclid) {
      log('🔄 Usando fbclid salvo:', savedUTMs.fbclid.substring(0, 20) + '...');
      merged.fbclid = savedUTMs.fbclid;
      merged.traffic_type = savedUTMs.traffic_type || 'ad';
    }
    
    if (savedUTMs.gclid && !currentUTMs.gclid) {
      merged.gclid = savedUTMs.gclid;
      merged.traffic_type = savedUTMs.traffic_type || 'ad';
    }
    
    if (savedUTMs.ttclid && !currentUTMs.ttclid) {
      merged.ttclid = savedUTMs.ttclid;
      merged.traffic_type = savedUTMs.traffic_type || 'ad';
    }
    
    // Copiar todos os UTMs do atual
    Object.keys(currentUTMs).forEach(function(key) {
      if (key !== '_isInternalNavigation' && !merged[key]) {
        merged[key] = currentUTMs[key];
      }
    });
    
    // Copiar UTMs salvos que não existem no atual
    Object.keys(savedUTMs).forEach(function(key) {
      if (!merged[key]) {
        merged[key] = savedUTMs[key];
      }
    });
    
    // Se temos fbclid, garantir source/medium corretos
    if (merged.fbclid) {
      merged.utm_source = merged.utm_source || 'facebook';
      merged.utm_medium = merged.utm_medium || 'paid';
      merged.traffic_type = 'ad';
    }
    
    return merged;
  }

  // Inicialização
  function init() {
    log('====================================');
    log('Tracker v2.2 iniciando...');
    log('URL atual:', window.location.href);
    log('Referrer:', document.referrer || '(nenhum)');
    
    // Verificar fbclid na URL diretamente
    var params = new URLSearchParams(window.location.search);
    log('fbclid na URL:', params.get('fbclid') ? 'SIM ✅' : 'NÃO');
    log('gclid na URL:', params.get('gclid') ? 'SIM ✅' : 'NÃO');
    log('utm_source na URL:', params.get('utm_source') || '(nenhum)');
    
    // Carrega UTMs salvos PRIMEIRO
    var savedUTMs = loadUTMs();
    if (savedUTMs && savedUTMs.fbclid) {
      log('📦 fbclid SALVO encontrado:', savedUTMs.fbclid.substring(0, 20) + '...');
    }
    
    // Captura UTMs da URL atual
    var currentUTMs = captureUTMs();
    
    // MESCLA os UTMs - prioriza fbclid salvo se não tiver na URL
    var utmData = mergeUTMs(currentUTMs, savedUTMs);
    
    // Salva os UTMs mesclados
    saveUTMs(utmData);
    
    // Atualiza TODOS os links (internos e de checkout)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        updateAllLinks(utmData);
        observeNewLinks(utmData);
      });
    } else {
      updateAllLinks(utmData);
      observeNewLinks(utmData);
    }
    
    // Intercepta cliques e formulários
    interceptClicks(utmData);
    interceptForms(utmData);
    
    // Expõe API global para debug
    window.FurionPayUTM = {
      getUTMs: function() { return utmData; },
      getSaved: loadUTMs,
      updateLinks: function() { updateAllLinks(utmData); },
      debug: function() {
        log('====== DEBUG INFO ======');
        log('UTMs ativos:', utmData);
        log('UTMs salvos:', loadUTMs());
        log('Domínios de checkout:', CHECKOUT_DOMAINS);
        log('========================');
      }
    };

    log('Tracker inicializado com sucesso ✅');
    log('UTMs ativos:', utmData);
    log('====================================');
  }

  // Executa
  init();
})();
