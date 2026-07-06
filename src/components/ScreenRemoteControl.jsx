import {
  Eraser,
  Maximize2,
  MonitorUp,
  RotateCcw,
  Send,
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
  { id: 'split-50-50', label: '50/50' }
];

export function ScreenRemoteControl({
  screenZones,
  screenLayout,
  onAssignVideo,
  onUpdateZone,
  onClearZone,
  onScreenLayoutChange,
  onClose
}) {
  const [activeZoneId, setActiveZoneId] = useState('upper');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [remoteNote, setRemoteNote] = useState('Control listo');
  const noteTimerRef = useRef(0);
  const activeZone = screenZones[activeZoneId] ?? screenZones.upper;
  const activeZoneLabel = useMemo(
    () => REMOTE_ZONES.find((zone) => zone.id === activeZoneId)?.label ?? 'Pantalla',
    [activeZoneId]
  );
  const hasContent = Boolean(activeZone.videoId || activeZone.resourceUrl);

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), []);

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
    onUpdateZone(activeZoneId, { updatedAt: Date.now() });
    announce(`Reiniciado en ${activeZoneLabel}`);
  }

  function toggleMute() {
    onUpdateZone(activeZoneId, { muted: !activeZone.muted });
    announce(`${activeZone.muted ? 'Audio activo' : 'Mute activo'} en ${activeZoneLabel}`);
  }

  function updateVolume(value) {
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
      <aside className="screen-remote-phone" role="dialog" aria-modal="true" aria-label="Celular de control">
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
          <strong>{hasContent ? activeZone.title || activeZone.videoId || 'Contenido cargado' : 'Sin video'}</strong>
          <small>{hasContent ? activeZone.watchUrl || activeZone.resourceUrl || 'Pantalla activa' : 'Pega un link de YouTube'}</small>
        </section>
        <div className="screen-remote-note" role="status">{remoteNote}</div>

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

        <section className="screen-remote-controls" aria-label="Controles de reproduccion">
          <button type="button" onClick={toggleMute}>
            {activeZone.muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            <span>{activeZone.muted ? 'Mute' : 'Audio'}</span>
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
