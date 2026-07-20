import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minus,
  MonitorUp,
  Pause,
  Play,
  Plus,
  Power,
  Send,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
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

function clampRemoteValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  const currentLayout = useMemo(
    () => REMOTE_LAYOUTS.find((layout) => layout.id === screenLayout) ?? REMOTE_LAYOUTS[0],
    [screenLayout]
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

  function adjustVolume(delta) {
    const currentVolume = Number(activeZone.volume ?? 0);
    updateVolume(clampRemoteValue(currentVolume + delta, 0, 100));
  }

  function updateDisplayScale(value) {
    onUpdateZone(activeZoneId, { displayScale: value });
    announce(`Tamano ${value}% en ${activeZoneLabel}`);
  }

  function adjustDisplayScale(delta) {
    const currentScale = Number(activeZone.displayScale ?? 100);
    updateDisplayScale(clampRemoteValue(currentScale + delta, 80, 100));
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

  function cycleLayout(direction = 1) {
    const currentIndex = Math.max(
      0,
      REMOTE_LAYOUTS.findIndex((layout) => layout.id === screenLayout)
    );
    const nextLayout = REMOTE_LAYOUTS[(currentIndex + direction + REMOTE_LAYOUTS.length) % REMOTE_LAYOUTS.length];
    changeLayout(nextLayout.id);
  }

  return (
    <section className="screen-remote-overlay" aria-label="Control remoto de pantalla">
      <div className="screen-remote-backdrop" onClick={onClose} />
      <aside className="screen-remote-guide-panel" aria-label="Guia rapida del control de pantalla">
        <span>Guia rapida</span>
        <strong>Pantalla</strong>
        <div className="screen-remote-guide-list">
          <div className="screen-remote-guide-row">
            <kbd>OK</kbd>
            <em>Play / pausa</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>VOL</kbd>
            <em>Volumen</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>&lt;</kbd>
            <em>Retroceder 15s</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>&gt;</kbd>
            <em>Avanzar 15s</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>CLR</kbd>
            <em>Limpiar</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>ADS</kbd>
            <em>Saltar anuncio</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>FMT</kbd>
            <em>Formato</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>RPT</kbd>
            <em>Reiniciar</em>
          </div>
          <div className="screen-remote-guide-row">
            <kbd>ZOOM</kbd>
            <em>Ajustar tamano</em>
          </div>
        </div>
      </aside>
      <aside
        ref={remoteRef}
        className="screen-remote-phone"
        role="dialog"
        aria-modal="true"
        aria-label="Control remoto"
        tabIndex={-1}
      >
        <header className="screen-remote-device-head">
          <button type="button" className="screen-remote-key screen-remote-power" onClick={onClose} aria-label="Cerrar control">
            <Power size={15} aria-hidden="true" />
          </button>
          <div className="screen-remote-brand">
            <span>Estudiemos</span>
            <strong>Room</strong>
          </div>
          <button
            type="button"
            className="screen-remote-key screen-remote-top-action"
            onClick={toggleMute}
            disabled={!canUseAudioControls}
            aria-label={audioActionLabel}
          >
            {activeZone.muted ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          </button>
        </header>

        <section className="screen-remote-display" aria-label="Estado de pantalla">
          <span>{activeZoneLabel}</span>
          <strong>{hasContent ? activeZone.title || activeZone.videoId || 'Contenido cargado' : 'Sin contenido'}</strong>
          <small>{remoteNote}</small>
        </section>

        {audioHint && <div className="screen-remote-audio-hint">{audioHint}</div>}

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

        <section className="screen-remote-dpad" aria-label="Control principal">
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-up"
            onClick={() => adjustVolume(10)}
            disabled={!canUseAudioControls}
            aria-label="Subir volumen"
          >
            <ChevronUp size={18} aria-hidden="true" />
            <span>VOL</span>
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-left"
            onClick={() => seekRelative(-15)}
            disabled={!canControlPlayback}
            aria-label="Retroceder 15 segundos"
          >
            <ChevronLeft size={20} aria-hidden="true" />
            <SkipBack size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-center"
            onClick={togglePlayback}
            disabled={!canControlPlayback}
            aria-label={isPaused ? 'Reproducir' : 'Pausar'}
          >
            {isPaused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            <span>OK</span>
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-right"
            onClick={() => seekRelative(15)}
            disabled={!canControlPlayback}
            aria-label="Avanzar 15 segundos"
          >
            <SkipForward size={13} aria-hidden="true" />
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="screen-remote-key screen-remote-dpad-down"
            onClick={() => adjustVolume(-10)}
            disabled={!canUseAudioControls}
            aria-label="Bajar volumen"
          >
            <ChevronDown size={18} aria-hidden="true" />
            <span>VOL</span>
          </button>
        </section>

        <section className="screen-remote-color-row" aria-label="Acciones rapidas">
          <button
            type="button"
            className="screen-remote-color-key is-red"
            onClick={clearActiveZone}
            disabled={!hasContent}
            aria-label="Limpiar pantalla"
          >
            CLR
          </button>
          <button
            type="button"
            className="screen-remote-color-key is-green"
            onClick={skipAd}
            disabled={!canControlPlayback}
            aria-label="Saltar anuncio"
          >
            ADS
          </button>
          <button
            type="button"
            className="screen-remote-color-key is-yellow"
            onClick={() => cycleLayout(1)}
            aria-label="Cambiar formato"
          >
            FMT
          </button>
          <button
            type="button"
            className="screen-remote-color-key is-blue"
            onClick={restartVideo}
            disabled={!hasContent}
            aria-label="Reiniciar contenido"
          >
            RPT
          </button>
        </section>

        <section className="screen-remote-utility-row" aria-label="Ajuste de imagen">
          <button type="button" className="screen-remote-key" onClick={() => adjustDisplayScale(-5)} aria-label="Achicar pantalla">
            <Minus size={16} aria-hidden="true" />
            <span>ZOOM</span>
          </button>
          <div className="screen-remote-format-readout">
            <Maximize2 size={15} aria-hidden="true" />
            <span>{currentLayout.label}</span>
          </div>
          <button type="button" className="screen-remote-key" onClick={() => adjustDisplayScale(5)} aria-label="Agrandar pantalla">
            <Plus size={16} aria-hidden="true" />
            <span>ZOOM</span>
          </button>
        </section>

        <form className="screen-remote-link" onSubmit={submitLink}>
          <label htmlFor="screen-remote-youtube">YouTube</label>
          <div>
            <input
              id="screen-remote-youtube"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              placeholder="Link de YouTube"
            />
            <button type="submit" className="screen-remote-key" aria-label="Enviar a pantalla">
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
          {linkError && <p>{linkError}</p>}
        </form>
      </aside>
    </section>
  );
}
