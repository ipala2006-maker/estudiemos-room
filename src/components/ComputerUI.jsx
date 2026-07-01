import { CheckCircle2, Eraser, MonitorUp, ShieldCheck, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import { parseYouTubeUrl } from '../utils/youtube.js';

const ZONES = [
  {
    id: 'upper',
    label: 'Pantalla superior',
    ratio: '70%',
    description: 'Contenido principal de la sala'
  },
  {
    id: 'lower',
    label: 'Pantalla inferior',
    ratio: '30%',
    description: 'Apoyo, playlist o referencia secundaria'
  }
];

export function ComputerUI({ onClose, screenZones, onAssignVideo, onClearZone, onUpdateZone }) {
  const [drafts, setDrafts] = useState({ upper: '', lower: '' });
  const [errors, setErrors] = useState({ upper: '', lower: '' });

  function updateDraft(zoneId, value) {
    setDrafts((current) => ({ ...current, [zoneId]: value }));
    setErrors((current) => ({ ...current, [zoneId]: '' }));
  }

  function loadZone(zoneId) {
    const result = parseYouTubeUrl(drafts[zoneId]);
    if (!result.ok) {
      setErrors((current) => ({ ...current, [zoneId]: result.error }));
      return;
    }

    onAssignVideo(zoneId, result.video);
    setDrafts((current) => ({ ...current, [zoneId]: '' }));
    setErrors((current) => ({ ...current, [zoneId]: '' }));
  }

  function onSubmit(event, zoneId) {
    event.preventDefault();
    loadZone(zoneId);
  }

  return (
    <section className="computer-overlay" aria-label="Computadora de Casa 1">
      <div className="computer-window">
        <header className="computer-topbar">
          <div>
            <span>Casa 1 Control Console</span>
            <h1>Centro audiovisual</h1>
          </div>
          <button type="button" className="computer-close" onClick={onClose} aria-label="Cerrar computadora">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="computer-desktop computer-desktop-control">
          <aside className="control-status-panel" aria-label="Estado general">
            <div className="control-status-card">
              <MonitorUp size={28} aria-hidden="true" />
              <div>
                <span>Sistema</span>
                <strong>Pantalla 70/30</strong>
              </div>
            </div>
            <div className="control-status-list">
              {ZONES.map((zone) => {
                const current = screenZones[zone.id];
                return (
                  <div className="control-status-row" key={zone.id}>
                    <span>{zone.label}</span>
                    <strong>{current.videoId ? 'Video asignado' : 'Sin video'}</strong>
                  </div>
                );
              })}
            </div>
            <p>
              Pegá un link de YouTube, elegí la zona y la sala proyecta cada video de forma independiente.
            </p>
          </aside>

          <main className="computer-app computer-control-app">
            <div className="app-title">
              <span>Consola de sala</span>
              <h2>Control de pantalla gigante</h2>
              <p>
                Dos canales independientes para armar una sesión de estudio con contenido principal y apoyo visual.
              </p>
            </div>

            <div className="screen-zone-grid">
              {ZONES.map((zone) => {
                const current = screenZones[zone.id];
                const hasVideo = Boolean(current.videoId);

                return (
                  <form className="screen-zone-card" key={zone.id} onSubmit={(event) => onSubmit(event, zone.id)}>
                    <header className="screen-zone-header">
                      <div>
                        <span>{zone.ratio}</span>
                        <h3>{zone.label}</h3>
                        <p>{zone.description}</p>
                      </div>
                      <div className={hasVideo ? 'zone-state is-ready' : 'zone-state'}>
                        {hasVideo ? <CheckCircle2 size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                        <span>{hasVideo ? 'Activo' : 'Libre'}</span>
                      </div>
                    </header>

                    <label className="youtube-input-label" htmlFor={`${zone.id}-youtube-url`}>
                      Link de YouTube
                    </label>
                    <div className="youtube-input-row">
                      <input
                        id={`${zone.id}-youtube-url`}
                        type="text"
                        inputMode="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={drafts[zone.id]}
                        onChange={(event) => updateDraft(zone.id, event.target.value)}
                      />
                      <button type="submit" className="video-app-action">
                        Cargar
                      </button>
                    </div>
                    {errors[zone.id] && <p className="screen-zone-error">{errors[zone.id]}</p>}

                    <div className="zone-current-video" aria-live="polite">
                      <span>Video asignado</span>
                      <strong>{hasVideo ? current.videoId : 'Ninguno'}</strong>
                      {hasVideo && <small>{current.watchUrl}</small>}
                    </div>

                    <div className="zone-controls" aria-label={`Controles de ${zone.label}`}>
                      <label>
                        <span>Volumen</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={current.volume}
                          onChange={(event) => onUpdateZone(zone.id, { volume: Number(event.target.value) })}
                        />
                        <strong>{current.volume}%</strong>
                      </label>
                      <button
                        type="button"
                        className="zone-icon-button"
                        onClick={() => onUpdateZone(zone.id, { muted: !current.muted })}
                        aria-pressed={current.muted}
                      >
                        {current.muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
                        <span>{current.muted ? 'Muted' : 'Audio'}</span>
                      </button>
                      <button type="button" className="zone-icon-button" onClick={() => onClearZone(zone.id)}>
                        <Eraser size={18} aria-hidden="true" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  </form>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
