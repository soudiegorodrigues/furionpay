/**
 * FurionPay Universal UTM Tracker v2.1
 * Atualizado: 2025-12-13
 * Adicione este script nas suas páginas de vendas para preservar UTMs automaticamente
 * 
 * Uso: <script src="https://SEU_DOMINIO/utm-tracker.js"></script>
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

    // Verificar se tem UTMs relevantes
    var hasUTMs = utmData.utm_source || utmData.fbclid || utmData.gclid || utmData.ttclid;

    // Captura referrer se não tiver UTMs
    if (!hasUTMs && document.referrer) {
      try {
        var referrerUrl = new URL(document.referrer);
        var referrerHost = referrerUrl.hostname.toLowerCase();
        
        // Detecta fonte pelo referrer
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
        } else if (referrerHost !== window.location.hostname) {
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

  // Atualiza todos os links de checkout na página
  function updateCheckoutLinks(utmData) {
    if (!utmData) return;

    var links = document.querySelectorAll('a[href]');
    var updatedCount = 0;
    
    links.forEach(function(link) {
      if (isCheckoutLink(link.href)) {
        var newHref = addUTMsToUrl(link.href, utmData);
        if (newHref !== link.href) {
          link.href = newHref;
          updatedCount++;
        }
      }
    });
    
    if (updatedCount > 0) {
      log('Links de checkout atualizados:', updatedCount);
    }
  }

  // Intercepta cliques em links
  function interceptClicks(utmData) {
    if (!utmData) return;

    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (link && isCheckoutLink(link.href)) {
        var newHref = addUTMsToUrl(link.href, utmData);
        if (newHref !== link.href) {
          link.href = newHref;
          log('UTMs adicionados no clique:', newHref);
        }
      }
    }, true);
  }

  // Intercepta submissão de formulários
  function interceptForms(utmData) {
    if (!utmData) return;

    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.action && isCheckoutLink(form.action)) {
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

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'A' && isCheckoutLink(node.href)) {
              node.href = addUTMsToUrl(node.href, utmData);
            }
            // Verifica links dentro do elemento adicionado
            var innerLinks = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
            innerLinks.forEach(function(link) {
              if (isCheckoutLink(link.href)) {
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

  // Inicialização
  function init() {
    log('====================================');
    log('Tracker iniciando...');
    log('URL atual:', window.location.href);
    log('Referrer:', document.referrer || '(nenhum)');
    
    // Verificar fbclid na URL diretamente
    var params = new URLSearchParams(window.location.search);
    log('fbclid na URL:', params.get('fbclid') ? 'SIM ✅' : 'NÃO');
    log('gclid na URL:', params.get('gclid') ? 'SIM ✅' : 'NÃO');
    log('utm_source na URL:', params.get('utm_source') || '(nenhum)');
    
    // Captura UTMs da URL atual
    var currentUTMs = captureUTMs();
    
    // Carrega UTMs salvos anteriormente
    var savedUTMs = loadUTMs();
    
    // Prioriza UTMs da URL atual se tiver fbclid/gclid/ttclid ou utm_source
    var hasCurrentUTMs = currentUTMs.fbclid || currentUTMs.gclid || currentUTMs.ttclid || currentUTMs.utm_source;
    
    var utmData = hasCurrentUTMs ? currentUTMs : (savedUTMs || currentUTMs);
    
    // Salva os UTMs
    saveUTMs(utmData);
    
    // Atualiza links existentes
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        updateCheckoutLinks(utmData);
        observeNewLinks(utmData);
      });
    } else {
      updateCheckoutLinks(utmData);
      observeNewLinks(utmData);
    }
    
    // Intercepta cliques e formulários
    interceptClicks(utmData);
    interceptForms(utmData);
    
    // Expõe API global para debug
    window.FurionPayUTM = {
      getUTMs: function() { return utmData; },
      getSaved: loadUTMs,
      updateLinks: function() { updateCheckoutLinks(utmData); },
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
