import {
  Eraser,
  Pause,
  Play,
  Maximize2,
  MonitorUp,
  RotateCcw,
  Send,
  SkipBack,
  SkipForward,
  Smartphone,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseYouTubeUrl } from '../utils/youtube.js';

const REMOTE_ZONES = [
  { id: 'upper', label: 'Izquierda' },
  { id: 'lower', label: 'Derecha' }
];

const REMOTE_LAYOUTS = [
  { id: 'side-by-side', label: '2 x 16:9' },
  { id: 'single', label: '100%' },
  { id: 'split-50-50', label: '50/50' },
  { id: 'split-70-30', label: '70/30' },
  { id: 'split-30-70', label: '30/70' }
];

function isRemoteTextEntry(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable);
}

function shouldKeepRemoteBackspaceForText(element) {
  if (!isRemoteTextEntry(element)) return false;
  if (element?.isContentEditable) return true;
  if (element?.tagName?.toLowerCase() === 'select') return true;

  const value = String(element?.value ?? '');
  if (!value) return false;
  const selectionStart = Number(element?.selectionStart ?? value.length);
  const selectionEnd = Number(element?.selectionEnd ?? value.length);
  return selectionStart !== selectionEnd || selectionStart > 0;
}

function zoneHasContent(zone) {
  return Boolean(zone?.videoId || zone?.resourceUrl);
}

function canUseRemoteAudioControls(zone) {
  return !zoneHasContent(zone) || zone?.contentType === 'youtube';
}

function getRemoteAudioActionLabel(zone) {
  return zone?.muted ? 'Activar audio' : 'Silenciar';
}

function getRemoteAudioHint(zone) {
  if (zone?.contentType === 'spotify' && zoneHasContent(zone)) {
    return 'Spotify se escucha desde su reproductor. Usa Play y volumen dentro del embed.';
  }

  if (zoneHasContent(zone) && zone?.contentType !== 'youtube') {
    return 'Este contenido no permite audio externo desde el control.';
  }

  return '';
}

export function ScreenRemoteControl({
  screenZones,
  screenLayout,
  onAssignVideo,
  onUpdateZone,
  onClearZone,
  onScreenLayoutChange,
  onScreenCommand = () => {},
  onClose
}) {
  const [activeZoneId, setActiveZoneId] = useState('upper');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [remoteNote, setRemoteNote] = useState('Control listo');
  const remoteRef = useRef(null);
  const noteTimerRef = useRef(0);
  const activeZone = screenZones[activeZoneId] ?? screenZones.upper;
  const activeZoneLabel = useMemo(
    () => REMOTE_ZONES.find((zone) => zone.id === activeZoneId)?.label ?? 'Pantalla',
    [activeZoneId]
  );
  const hasContent = zoneHasContent(activeZone);
  const canControlPlayback = activeZone.contentType === 'youtube' && Boolean(activeZone.videoId);
  const canUseAudioControls = canUseRemoteAudioControls(activeZone);
  const audioActionLabel = getRemoteAudioActionLabel(activeZone);
  const audioHint = getRemoteAudioHint(activeZone);
  const isPaused = Boolean(activeZone.paused);

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), []);

  useEffect(() => {
    remoteRef.current?.focus({ preventScroll: true });

    function onRemoteKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'Escape' || (event.key === 'Backspace' && !shouldKeepRemoteBackspaceForText(event.target))) {
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

  function selectZone(zoneId) {
    setActiveZoneId(zoneId);
    const label = REMOTE_ZONES.find((zone) => zone.id === zoneId)?.label ?? 'pantalla';
    announce(`Controlando ${label}`);
  }

  function submitLink(event) {
    event.preventDefault();
    const result = parseYouTubeUrl(linkDraft);

    if (!result.ok) {
      setLinkError(result.error);
      announce('Link no valido');
      return;
    }

    onAssignVideo(activeZoneId, {
      ...result.video,
      contentType: 'youtube',
      resourceUrl: '',
      title: `YouTube - ${result.video.videoId}`,
      creator: 'Control de sala'
    });
    setLinkDraft('');
    setLinkError('');
    announce(`Enviado a ${activeZoneLabel}`);
  }

  function restartVideo() {
    if (!hasContent) return;
    if (canControlPlayback) {
      onScreenCommand(activeZoneId, 'restart');
    } else {
      onUpdateZone(activeZoneId, { updatedAt: Date.now() });
    }
    announce(`Reiniciado en ${activeZoneLabel}`);
  }

  function sendPlaybackCommand(action, payload, message) {
    if (!canControlPlayback) {
      announce('Controles disponibles para YouTube');
      return;
    }

    onScreenCommand(activeZoneId, action, payload);
    announce(message);
  }

  function togglePlayback() {
    sendPlaybackCommand(
      isPaused ? 'play' : 'pause',
      {},
      `${isPaused ? 'Reproduciendo' : 'Pausado'} en ${activeZoneLabel}`
    );
  }

  function seekRelative(seconds) {
    sendPlaybackCommand(
      'seek-relative',
      { seconds },
      `${seconds > 0 ? 'Avance' : 'Retroceso'} ${Math.abs(seconds)}s en ${activeZoneLabel}`
    );
  }

  function skipAd() {
    sendPlaybackCommand('skip-ad', { seconds: 45 }, `Intento de salto +45s en ${activeZoneLabel}`);
  }

  function toggleMute() {
    if (!canUseAudioControls) {
      announce(audioHint || 'Audio externo no disponible');
      return;
    }

    onUpdateZone(activeZoneId, { muted: !activeZone.muted });
    announce(`${activeZone.muted ? 'Audio activo' : 'Mute activo'} en ${activeZoneLabel}`);
  }

  function updateVolume(value) {
    if (!canUseAudioControls) {
      announce(audioHint || 'Audio externo no disponible');
      return;
    }

    onUpdateZone(activeZoneId, { volume: value });
    announce(`Volumen ${value}% en ${activeZoneLabel}`);
  }

  function updateDisplayScale(value) {
    onUpdateZone(activeZoneId, { displayScale: value });
    announce(`Tamano ${value}% en ${activeZoneLabel}`);
  }

  function clearActiveZone() {
    if (!hasContent) return;
    onClearZone(activeZoneId);
    announce(`${activeZoneLabel} limpia`);
  }

  function changeLayout(layoutId) {
    onScreenLayoutChange(layoutId);
    const label = REMOTE_LAYOUTS.find((layout) => layout.id === layoutId)?.label ?? layoutId;
    announce(`Layout ${label}`);
  }

  return (
    <section className="screen-remote-overlay" aria-label="Control remoto de pantalla">
      <div className="screen-remote-backdrop" onClick={onClose} />
      <aside
        ref={remoteRef}
        className="screen-remote-phone"
        role="dialog"
        aria-modal="true"
        aria-label="Celular de control"
        tabIndex={-1}
      >
        <header className="screen-remote-header">
          <div>
            <span>
              <Smartphone size={16} aria-hidden="true" />
              Control Room
            </span>
            <strong>{activeZoneLabel}</strong>
          </div>
          <button type="button" className="screen-remote-icon-button" onClick={onClose} aria-label="Cerrar control">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="screen-remote-targets" aria-label="Seleccionar pantalla">
          {REMOTE_ZONES.map((zone) => (
            <button
              key={zone.id}
              type="button"
              className={zone.id === activeZoneId ? 'is-selected' : ''}
              onClick={() => selectZone(zone.id)}
            >
              <MonitorUp size={17} aria-hidden="true" />
              <span>{zone.label}</span>
            </button>
          ))}
        </div>

        <section className="screen-remote-now">
          <span>Reproduciendo</span>
          <strong>{hasContent ? activeZone.title || activeZone.videoId || 'Contenido cargado' : 'Sin contenido'}</strong>
          <small>{hasContent ? activeZone.watchUrl || activeZone.resourceUrl || 'Pantalla activa' : 'Pega un link de YouTube'}</small>
        </section>
        <div className="screen-remote-note" role="status">{remoteNote}</div>
        {audioHint && <div className="screen-remote-audio-hint">{audioHint}</div>}

        <form className="screen-remote-link" onSubmit={submitLink}>
          <label htmlFor="screen-remote-youtube">YouTube</label>
          <div>
            <input
              id="screen-remote-youtube"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              placeholder="youtube.com/watch?v=..."
            />
            <button type="submit" aria-label="Enviar a pantalla">
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
          {linkError && <p>{linkError}</p>}
        </form>

        <section className="screen-remote-playback" aria-label="Controles de reproduccion">
          <button type="button" onClick={togglePlayback} disabled={!canControlPlayback}>
            {isPaused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            <span>{isPaused ? 'Play' : 'Pausa'}</span>
          </button>
          <button type="button" onClick={() => seekRelative(-15)} disabled={!canControlPlayback}>
            <SkipBack size={18} aria-hidden="true" />
            <span>15s</span>
          </button>
          <button type="button" onClick={() => seekRelative(15)} disabled={!canControlPlayback}>
            <SkipForward size={18} aria-hidden="true" />
            <span>15s</span>
          </button>
          <button type="button" onClick={skipAd} disabled={!canControlPlayback}>
            <SkipForward size={18} aria-hidden="true" />
            <span>Anuncio</span>
          </button>
        </section>

        <section className="screen-remote-controls" aria-label="Controles de pantalla">
          <button type="button" onClick={toggleMute} disabled={!canUseAudioControls}>
            {activeZone.muted ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            <span>{audioActionLabel}</span>
          </button>
          <button type="button" onClick={restartVideo} disabled={!hasContent}>
            <RotateCcw size={18} aria-hidden="true" />
            <span>Reiniciar</span>
          </button>
          <button type="button" onClick={clearActiveZone} disabled={!hasContent}>
            <Eraser size={18} aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        </section>

        <section className="screen-remote-sliders">
          <label>
            <span>Volumen {activeZone.volume}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={activeZone.volume}
              disabled={!canUseAudioControls}
              onChange={(event) => updateVolume(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Tamano {activeZone.displayScale ?? 100}%</span>
            <input
              type="range"
              min="80"
              max="100"
              step="5"
              value={activeZone.displayScale ?? 100}
              onChange={(event) => updateDisplayScale(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="screen-remote-layouts" aria-label="Formato de pantalla">
          {REMOTE_LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className={screenLayout === layout.id ? 'is-selected' : ''}
              onClick={() => changeLayout(layout.id)}
            >
              <Maximize2 size={16} aria-hidden="true" />
              <span>{layout.label}</span>
            </button>
          ))}
        </section>
      </aside>
    </section>
  );
}
