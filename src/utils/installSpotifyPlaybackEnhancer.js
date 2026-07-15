const SPOTIFY_IFRAME_API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
const SPOTIFY_EMBED_PREFIX = 'https://open.spotify.com/embed/';

let spotifyIframeApiPromise = null;

function loadSpotifyIframeApi() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Spotify solo puede cargarse en el navegador.'));
  }

  if (window.__estudiemosSpotifyIframeApi) {
    return Promise.resolve(window.__estudiemosSpotifyIframeApi);
  }

  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

  spotifyIframeApiPromise = new Promise((resolve, reject) => {
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
      spotifyIframeApiPromise = null;
      reject(new Error('No se pudo cargar el reproductor oficial de Spotify.'));
    };
    document.body.appendChild(script);
  });

  return spotifyIframeApiPromise;
}

function parseSpotifyEmbedUri(src) {
  try {
    const url = new URL(src);
    if (url.origin !== 'https://open.spotify.com') return '';

    const parts = url.pathname.split('/').filter(Boolean);
    const embedIndex = parts[0] === 'embed' ? 1 : 0;
    const type = parts[embedIndex];
    const id = parts[embedIndex + 1];
    if (!type || !id) return '';

    return `spotify:${type}:${id}`;
  } catch {
    return '';
  }
}

function setStatus(wrapper, message, state = 'idle') {
  const status = wrapper.querySelector('.spotify-api-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function makeToolbarButton(label, iconText, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `<span aria-hidden="true">${iconText}</span><strong>${label}</strong>`;
  button.addEventListener('click', onClick);
  return button;
}

function makeToolbarLink(label, href) {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.innerHTML = `<span aria-hidden="true">EXT</span><strong>${label}</strong>`;
  return link;
}

function enhanceSpotifyFrame(iframe) {
  if (!iframe?.src || iframe.dataset.estudiemosSpotifyEnhanced === 'true') return;
  if (!iframe.src.startsWith(SPOTIFY_EMBED_PREFIX)) return;

  const uri = parseSpotifyEmbedUri(iframe.src);
  if (!uri) return;

  iframe.dataset.estudiemosSpotifyEnhanced = 'true';

  const panel = iframe.closest('.spotify-player-panel');
  if (!panel || panel.querySelector('.spotify-embed-enhancer')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'spotify-embed-enhancer';

  const toolbar = document.createElement('div');
  toolbar.className = 'spotify-player-toolbar';

  const status = document.createElement('p');
  status.className = 'spotify-api-status';
  status.dataset.state = 'loading';
  status.textContent = 'Preparando reproductor oficial de Spotify...';

  const host = document.createElement('div');
  host.className = 'spotify-embed-host';

  let controller = null;

  const callController = (methodName, feedback) => {
    if (controller && typeof controller[methodName] === 'function') {
      controller[methodName]();
      setStatus(wrapper, feedback, 'ready');
      return;
    }

    setStatus(wrapper, 'Si el navegador bloquea el comando, toca Play dentro del reproductor de Spotify.', 'fallback');
    iframe.focus?.();
  };

  toolbar.append(
    makeToolbarButton('Play', 'P', () => callController('play', 'Intentando reproducir Spotify...')),
    makeToolbarButton('Pausa', 'II', () => callController('pause', 'Spotify pausado.')),
    makeToolbarButton('Recargar', 'R', () => {
      controller?.destroy?.();
      controller = null;
      host.textContent = '';
      iframe.src = iframe.src;
      setStatus(wrapper, 'Reproductor recargado. Toca Play para escuchar.', 'idle');
    }),
    makeToolbarLink('Abrir Spotify', iframe.src.replace('/embed/', '/'))
  );

  wrapper.append(toolbar, status, host);
  panel.insertBefore(wrapper, iframe);
  iframe.classList.add('spotify-fallback-frame');

  loadSpotifyIframeApi()
    .then((IFrameAPI) => {
      IFrameAPI.createController(
        host,
        {
          uri,
          width: '100%',
          height: '100%',
          theme: 'dark'
        },
        (embedController) => {
          controller = embedController;
          iframe.classList.add('is-api-ready');
          setStatus(wrapper, 'Reproductor listo. Toca Play para escuchar dentro de Estudiemos Room.', 'ready');

          embedController?.addListener?.('playback_update', (event) => {
            if (event?.data?.isPaused === false) {
              setStatus(wrapper, 'Spotify reproduciendo dentro de Estudiemos Room.', 'ready');
            }
          });
        }
      );
    })
    .catch(() => {
      setStatus(wrapper, 'El API oficial no cargo. Usa el Play del reproductor embebido.', 'fallback');
    });
}

function enhanceSpotifyPlayers() {
  document.querySelectorAll('.spotify-player-panel iframe[src^="https://open.spotify.com/embed/"]').forEach(enhanceSpotifyFrame);
}

function installSpotifyPlaybackEnhancer() {
  if (typeof window === 'undefined' || window.__estudiemosSpotifyPlaybackEnhancerInstalled) return;
  window.__estudiemosSpotifyPlaybackEnhancerInstalled = true;

  const observer = new MutationObserver(enhanceSpotifyPlayers);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener('load', enhanceSpotifyPlayers);
  window.requestAnimationFrame(enhanceSpotifyPlayers);
}

installSpotifyPlaybackEnhancer();
