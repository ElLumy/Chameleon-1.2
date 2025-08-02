// content/injector.js
// Este script se ejecuta en el contexto ISOLATED y actúa como puente
(async function() {
  'use strict';
  
  console.log('[Chameleon Injector] Initializing...');
  
  // Establecer comunicación bidireccional
  let sessionData = null;
  
  // Obtener datos de sesión del service worker
  async function getSessionData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSessionInfo' });
      if (response && !response.error) {
        sessionData = response;
        return response;
      }
    } catch (error) {
      console.error('[Chameleon Injector] Error getting session data:', error);
    }
    return null;
  }
  
  // Escuchar mensajes del script principal
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'CHAMELEON_REQUEST') {
      console.log('[Chameleon Injector] Received request:', event.data.action);
      
      let response = null;
      
      try {
        switch (event.data.action) {
          case 'getSessionSeed':
            const seedResponse = await chrome.runtime.sendMessage({ action: 'getSessionSeed' });
            response = {
              type: 'CHAMELEON_RESPONSE',
              action: 'getSessionSeed',
              data: seedResponse
            };
            break;
            
          case 'saveProfile':
            await chrome.storage.session.set({ 
              profile: event.data.profile,
              timestamp: Date.now()
            });
            response = {
              type: 'CHAMELEON_RESPONSE',
              action: 'saveProfile',
              data: { success: true }
            };
            break;
            
          case 'getSessionInfo':
            const info = await getSessionData();
            response = {
              type: 'CHAMELEON_RESPONSE',
              action: 'getSessionInfo',
              data: info
            };
            break;
        }
      } catch (error) {
        console.error('[Chameleon Injector] Error handling request:', error);
        response = {
          type: 'CHAMELEON_RESPONSE',
          action: event.data.action,
          data: { error: error.message }
        };
      }
      
      if (response) {
        window.postMessage(response, '*');
      }
    }
  });
  
  // Inyectar el script principal y los módulos
  function injectScript(file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(file);
      script.onload = function() {
        this.remove();
        resolve();
      };
      script.onerror = function() {
        console.error('[Chameleon Injector] Failed to load:', file);
        reject(new Error(`Failed to load ${file}`));
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }
  
  // Inyectar en orden
  const scriptsToInject = [
    'lib/seedrandom.min.js',
    'content/modules/utils/jitter.js',
    'content/modules/interceptors/meta-proxy.js',
    'content/modules/interceptors/navigator.js',
    'content/modules/interceptors/screen.js',
    'content/modules/interceptors/canvas.js',
    'content/modules/interceptors/webgl.js',
    'content/modules/interceptors/audio.js',
    'content/modules/interceptors/timezone.js',
    'content/chameleon-main.js'
  ];
  
  // Inyectar secuencialmente
  async function injectAll() {
    for (const script of scriptsToInject) {
      try {
        await injectScript(script);
        console.log('[Chameleon Injector] Injected:', script);
      } catch (error) {
        console.error('[Chameleon Injector] Failed to inject:', script, error);
      }
    }
  }
  
  // Iniciar inyección
  await injectAll();
  
  console.log('[Chameleon Injector] All scripts injected');
  
})();