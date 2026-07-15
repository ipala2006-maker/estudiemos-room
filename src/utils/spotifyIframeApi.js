export const SPOTIFY_IFRAME_API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';

export function loadSpotifyIframeApi() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Spotify solo puede cargarse en el navegador.'));
  }

  if (window.__estudiemosSpotifyIframeApi) {
    return Promise.resolve(window.__estudiemosSpotifyIframeApi);
  }

  if (window.__estudiemosSpotifyIframeApiPromise) {
    return window.__estudiemosSpotifyIframeApiPromise;
  }

  window.__estudiemosSpotifyIframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyHandler = window.onSpotifyIframeApiReady;

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      window.__estudiemosSpotifyIframeApi = IFrameAPI;
      resolve(IFrameAPI);
      if (typeof previousReadyHandler === 'function') {
        previousReadyHandler(IFrameAPI);
      }
    };

    const existingScript = document.querySelector(`script[src="${SPOTIFY_IFRAME_API_SRC}"]`);
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = SPOTIFY_IFRAME_API_SRC;
    script.async = true;
    script.dataset.estudiemosSpotifyApi = 'true';
    script.onerror = () => {
      window.__estudiemosSpotifyIframeApiPromise = null;
      reject(new Error('No se pudo cargar el reproductor oficial de Spotify.'));
    };
    document.body.appendChild(script);
  });

  return window.__estudiemosSpotifyIframeApiPromise;
}
