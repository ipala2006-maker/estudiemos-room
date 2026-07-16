import { loadSpotifyIframeApi } from './spotifyIframeApi.js';

const SPOTIFY_EMBED_PREFIX = 'https://open.spotify.com/embed/';
const SPOTIFY_ROOM_CONTENT_EVENT = 'estudiemos:spotify-room-content';
const SPEAKER_COMMAND_EVENT = 'estudiemos:room-speaker-command';
const SPOTIFY_LABELS = {
  track: 'Cancion',
  album: 'Album',
  playlist: 'Playlist',
  show: 'Podcast',
  episode: 'Episodio',
  artist: 'Artista'
};

function parseSpotifyEmbedContent(src) {
  try {
    const url = new URL(src);
    if (url.origin !== 'https://open.spotify.com') return '';

    const parts = url.pathname.split('/').filter(Boolean);
    const embedIndex = parts[0] === 'embed' ? 1 : 0;
    const type = parts[embedIndex];
    const id = parts[embedIndex + 1];
    if (!type || !id) return '';

    const label = SPOTIFY_LABELS[type] ?? 'Spotify';
    return {
      type,
      id,
      label,
      inputUrl: src,
      uri: `spotify:${type}:${id}`,
      watchUrl: `https://open.spotify.com/${type}/${id}`,
      embedUrl: `${SPOTIFY_EMBED_PREFIX}${type}/${id}?utm_source=estudiemos-room&theme=0`,
      title: `Spotify - ${label}`
    };
  } catch {
    return null;
  }
}

function notifyRoomSpotifyContent(content, command = '') {
  if (!content) return;
  window.dispatchEvent(new CustomEvent(SPOTIFY_ROOM_CONTENT_EVENT, { detail: { content, command } }));
}

function dispatchSpeakerCommand(action) {
  window.dispatchEvent(
    new CustomEvent(SPEAKER_COMMAND_EVENT, {
      detail: {
        id: `spotify-pc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        action
      }
    })
  );
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

  const roomSpotifyContent = parseSpotifyEmbedContent(iframe.src);
  if (!roomSpotifyContent?.uri) return;
  const { uri } = roomSpotifyContent;

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
    if (methodName === 'play') {
      notifyRoomSpotifyContent(roomSpotifyContent, 'play');
    } else if (methodName === 'pause') {
      dispatchSpeakerCommand('pause');
    }

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
      notifyRoomSpotifyContent(roomSpotifyContent);
      dispatchSpeakerCommand('reload');
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
