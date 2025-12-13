/**
 * FurionPay Universal UTM Tracker
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
    'lovable.app'
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

  // Captura UTMs da URL atual
  function captureUTMs() {
    var params = new URLSearchParams(window.location.search);
    var utmData = {};
    var hasUTMs = false;

    UTM_PARAMS.forEach(function(param) {
      var value = params.get(param);
      if (value) {
        utmData[param] = value;
        hasUTMs = true;
      }
    });

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
      // Só salva se tiver dados relevantes
      if (Object.keys(utmData).length > 2) { // Mais que captured_at e landing_page
        localStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
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

  // Adiciona UTMs a uma URL
  function addUTMsToUrl(href, utmData) {
    if (!href || !utmData) return href;
    
    try {
      var url = new URL(href, window.location.origin);
      
      UTM_PARAMS.forEach(function(param) {
        if (utmData[param] && !url.searchParams.has(param)) {
          url.searchParams.set(param, utmData[param]);
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
    links.forEach(function(link) {
      if (isCheckoutLink(link.href)) {
        link.href = addUTMsToUrl(link.href, utmData);
      }
    });
  }

  // Intercepta cliques em links
  function interceptClicks(utmData) {
    if (!utmData) return;

    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (link && isCheckoutLink(link.href)) {
        link.href = addUTMsToUrl(link.href, utmData);
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
    // Captura UTMs da URL atual
    var currentUTMs = captureUTMs();
    
    // Carrega UTMs salvos anteriormente
    var savedUTMs = loadUTMs();
    
    // Prioriza UTMs da URL atual se existirem
    var hasCurrentUTMs = UTM_PARAMS.some(function(param) {
      return currentUTMs[param];
    });
    
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
    
    // Intercepta cliques
    interceptClicks(utmData);
    
    // Expõe API global para debug
    window.FurionPayUTM = {
      getUTMs: function() { return utmData; },
      getSaved: loadUTMs,
      updateLinks: function() { updateCheckoutLinks(utmData); }
    };

    console.log('[FurionPay UTM] Tracker inicializado', utmData);
  }

  // Executa
  init();
})();
