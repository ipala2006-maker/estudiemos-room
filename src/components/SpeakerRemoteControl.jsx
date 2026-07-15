import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Music2,
  Pause,
  Play,
  Power,
  RefreshCw,
  Send,
  Trash2,
  Volume2
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { parseSpotifyUrl } from '../utils/spotify.js';

function isSpeakerRemoteTextEntry(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable);
}

function shouldKeepSpeakerBackspaceForText(element) {
  if (!isSpeakerRemoteTextEntry(element)) return false;
  if (element?.isContentEditable) return true;
  if (element?.tagName?.toLowerCase() === 'select') return true;

  const value = String(element?.value ?? '');
  if (!value) return false;
  const selectionStart = Number(element?.selectionStart ?? value.length);
  const selectionEnd = Number(element?.selectionEnd ?? value.length);
  return selectionStart !== selectionEnd || selectionStart > 0;
}

export function SpeakerRemoteControl({
  content,
  speakerState,
  onLoadSpotify,
  onClearSpotify,
  onSpeakerCommand,
  onClose
}) {
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [remoteNote, setRemoteNote] = useState('Control listo');
  const remoteRef = useRef(null);
  const noteTimerRef = useRef(0);
  const hasContent = Boolean(content);
  const isPaused = speakerState?.paused !== false;
  const apiState = speakerState?.apiState ?? 'idle';
  const statusNote = speakerState?.note || (hasContent ? 'Spotify listo para reproducir' : 'Carga musica desde la PC o este control');

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), []);

  useEffect(() => {
    remoteRef.current?.focus({ preventScroll: true });

    function onRemoteKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'Escape' || (event.key === 'Backspace' && !shouldKeepSpeakerBackspaceForText(event.target))) {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
      }
    }

    document.addEventListener('keydown', onRemoteKeyDown, true);
    return () => document.removeEventListener('keydown', onRemoteKeyDown, true);
  }, [onClose]);

  function announce(message) {
    window.clearTimeout(noteTimerRef.current);
    setRemoteNote(message);
    noteTimerRef.current = window.setTimeout(() => setRemoteNote('Control listo'), 2200);
  }

  function submitSpotify(event) {
    event.preventDefault();
    const result = parseSpotifyUrl(linkDraft);

    if (!result.ok) {
      setLinkError(result.error);
      announce('Link de Spotify no valido');
      return;
    }

    onLoadSpotify(result.item);
    setLinkDraft('');
    setLinkError('');
    announce('Spotify cargado en el parlante');
  }

  function sendCommand(action, message) {
    if (!hasContent) {
      announce('Carga Spotify primero');
      return;
    }

    onSpeakerCommand(action);
    announce(message);
  }

  function togglePlayback() {
    sendCommand(isPaused ? 'play' : 'pause', isPaused ? 'Reproduciendo en la sala' : 'Spotify pausado');
  }

  function openSpotify() {
    if (!content?.watchUrl) {
      announce('No hay Spotify cargado');
      return;
    }

    window.open(content.watchUrl, '_blank', 'noopener,noreferrer');
    announce('Abriendo Spotify oficial');
  }

  function clearSpotify() {
    if (!hasContent) return;
    onClearSpotify();
    announce('Parlante limpio');
  }

  function announceVolumeLimit() {
    announce('Spotify maneja el volumen desde su reproductor o el navegador');
  }

  return (
    <section className="screen-remote-overlay speaker-remote-overlay" aria-label="Control remoto de parlante">
      <div className="screen-remote-backdrop" onClick={onClose} />
      <aside
        ref={remoteRef}
        className="screen-remote-phone speaker-remote-phone"
        role="dialog"
        aria-modal="true"
        aria-label="Control remoto del parlante"
        tabIndex={-1}
      >
        <header className="screen-remote-device-head">
          <button type="button" className="screen-remote-key screen-remote-power" onClick={onClose} aria-label="Cerrar control">
            <Power size={15} aria-hidden="true" />
          </button>
          <div className="screen-remote-brand">
            <span>Estudiemos</span>
            <strong>Audio</strong>
          </div>
          <button
            type="button"
            className="screen-remote-key screen-remote-top-action"
            onClick={togglePlayback}
            disabled={!hasContent}
            aria-label={isPaused ? 'Reproducir Spotify' : 'Pausar Spotify'}
          >
            {isPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          </button>
        </header>

        <section className="screen-remote-display speaker-remote-display" aria-label="Estado del parlante">
          <span>Parlante de sala</span>
          <strong>{hasContent ? content.title : 'Sin musica'}</strong>
          <small>{remoteNote !== 'Control listo' ? remoteNote : statusNote}</small>
        </section>

        {apiState === 'fallback' && (
          <div className="screen-remote-audio-hint">
            Spotify no habilito control remoto para este contenido. Abrilo en Spotify o proba recargar.
          </div>
        )}

        <div className="screen-remote-targets speaker-remote-targets" aria-label="Seleccionar parlante">
          <button type="button" className="is-selected" onClick={() => announce('Controlando parlante de sala')}>
            <Volume2 size={17} aria-hidden="true" />
            <span>Parlante</span>
          </button>
        </div>

        <section className="screen-remote-dpad" aria-label="Control principal del parlante">
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-up"
            onClick={announceVolumeLimit}
            aria-label="Informacion de volumen"
          >
            <ChevronUp size={18} aria-hidden="true" />
            <span>VOL</span>
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-left"
            onClick={() => sendCommand('pause', 'Spotify pausado')}
            disabled={!hasContent}
            aria-label="Pausar Spotify"
          >
            <ChevronLeft size={20} aria-hidden="true" />
            <Pause size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-center"
            onClick={togglePlayback}
            disabled={!hasContent}
            aria-label={isPaused ? 'Reproducir' : 'Pausar'}
          >
            {isPaused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            <span>OK</span>
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-right"
            onClick={() => sendCommand('play', 'Reproduciendo en la sala')}
            disabled={!hasContent}
            aria-label="Reproducir Spotify"
          >
            <Play size={13} aria-hidden="true" />
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-down"
            onClick={announceVolumeLimit}
            aria-label="Informacion de volumen"
          >
            <ChevronDown size={18} aria-hidden="true" />
            <span>VOL</span>
          </button>
        </section>

        <section className="speaker-remote-actions" aria-label="Acciones del parlante">
          <button type="button" className="screen-remote-key" onClick={() => sendCommand('reload', 'Parlante recargado')} disabled={!hasContent}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>RPT</span>
          </button>
          <button type="button" className="screen-remote-key" onClick={openSpotify} disabled={!hasContent}>
            <ExternalLink size={15} aria-hidden="true" />
            <span>WEB</span>
          </button>
          <button type="button" className="screen-remote-key" onClick={clearSpotify} disabled={!hasContent}>
            <Trash2 size={15} aria-hidden="true" />
            <span>CLR</span>
          </button>
        </section>

        <form className="screen-remote-link speaker-remote-link" onSubmit={submitSpotify}>
          <label htmlFor="speaker-remote-spotify">Spotify</label>
          <div>
            <input
              id="speaker-remote-spotify"
              value={linkDraft}
              onChange={(event) => {
                setLinkDraft(event.target.value);
                setLinkError('');
              }}
              placeholder="Link de Spotify"
            />
            <button type="submit" className="screen-remote-key" aria-label="Cargar Spotify en parlante">
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
          {linkError && <p>{linkError}</p>}
        </form>

        <div className="speaker-remote-footer">
          <Music2 size={15} aria-hidden="true" />
          <span>El reproductor queda activo al cerrar la computadora.</span>
        </div>
      </aside>
    </section>
  );
}
