import { useEffect, useRef, useState } from 'react';
import { loadSpotifyIframeApi } from '../utils/spotifyIframeApi.js';

const SPEAKER_COMMAND_EVENT = 'estudiemos:room-speaker-command';

function getContentKey(content) {
  return content?.uri || content?.embedUrl || content?.watchUrl || '';
}

export function RoomSpeakerPlayer({ content, command, onPlayerStateChange = () => {} }) {
  const hostRef = useRef(null);
  const controllerRef = useRef(null);
  const handledCommandRef = useRef('');
  const pendingCommandRef = useRef(null);
  const stateChangeRef = useRef(onPlayerStateChange);
  const [reloadNonce, setReloadNonce] = useState(0);
  const contentKey = getContentKey(content);

  useEffect(() => {
    stateChangeRef.current = onPlayerStateChange;
  }, [onPlayerStateChange]);

  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;

    controllerRef.current?.destroy?.();
    controllerRef.current = null;
    if (host) host.textContent = '';

    if (!contentKey || !host) {
      stateChangeRef.current({ apiState: 'idle', paused: true, note: 'Parlante sin musica cargada' });
      return () => {
        cancelled = true;
      };
    }

    stateChangeRef.current({ apiState: 'loading', paused: true, note: 'Preparando parlante de sala...' });

    loadSpotifyIframeApi()
      .then((IFrameAPI) => {
        if (cancelled || !hostRef.current) return;

        IFrameAPI.createController(
          hostRef.current,
          {
            uri: content.uri,
            width: '100%',
            height: '100%',
            theme: 'dark'
          },
          (embedController) => {
            if (cancelled) {
              embedController?.destroy?.();
              return;
            }

            controllerRef.current = embedController;
            stateChangeRef.current({
              apiState: 'ready',
              paused: true,
              note: 'Parlante listo. Usa Play desde el control.'
            });

            embedController?.addListener?.('playback_update', (event) => {
              if (event?.data?.isPaused === false) {
                stateChangeRef.current({ apiState: 'ready', paused: false, note: 'Spotify sonando en la sala' });
              } else if (event?.data?.isPaused === true) {
                stateChangeRef.current({ apiState: 'ready', paused: true, note: 'Spotify pausado' });
              }
            });

            const pendingCommand = pendingCommandRef.current;
            if (pendingCommand) {
              pendingCommandRef.current = null;
              runSpeakerCommand(pendingCommand);
            }
          }
        );
      })
      .catch(() => {
        stateChangeRef.current({
          apiState: 'fallback',
          paused: true,
          note: 'Spotify no permitio control remoto. Abri el link oficial.'
        });
      });

    return () => {
      cancelled = true;
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
    };
  }, [contentKey, content?.uri, reloadNonce]);

  function runSpeakerCommand(nextCommand) {
    if (!nextCommand?.action) return;

    if (nextCommand.action === 'reload') {
      stateChangeRef.current({ apiState: 'loading', paused: true, note: 'Recargando parlante de sala...' });
      setReloadNonce((value) => value + 1);
      return;
    }

    const controller = controllerRef.current;
    if (!controller) {
      pendingCommandRef.current = nextCommand;
      stateChangeRef.current({ apiState: 'loading', note: 'El parlante esta preparando Spotify...' });
      return;
    }

    if (nextCommand.action === 'play' && typeof controller.play === 'function') {
      controller.play();
      stateChangeRef.current({ apiState: 'ready', paused: false, note: 'Intentando reproducir Spotify...' });
      return;
    }

    if (nextCommand.action === 'pause' && typeof controller.pause === 'function') {
      controller.pause();
      stateChangeRef.current({ apiState: 'ready', paused: true, note: 'Spotify pausado' });
      return;
    }

    stateChangeRef.current({
      apiState: 'fallback',
      note: 'Este embed de Spotify no permite esa accion remota.'
    });
  }

  useEffect(() => {
    function onSpeakerCommand(event) {
      runSpeakerCommand(event.detail);
    }

    window.addEventListener(SPEAKER_COMMAND_EVENT, onSpeakerCommand);
    return () => window.removeEventListener(SPEAKER_COMMAND_EVENT, onSpeakerCommand);
  }, []);

  useEffect(() => {
    if (!command?.id || handledCommandRef.current === command.id) return;
    handledCommandRef.current = command.id;
    runSpeakerCommand(command);
  }, [command]);

  return (
    <aside className="room-speaker-player" aria-hidden={!content}>
      <div ref={hostRef} className="room-speaker-player-host" />
    </aside>
  );
}

export function dispatchRoomSpeakerCommand(command) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SPEAKER_COMMAND_EVENT, { detail: command }));
}
