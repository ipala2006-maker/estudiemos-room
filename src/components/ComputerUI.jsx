import { CheckCircle2, Clock3, Lock, Monitor, Play, ShieldCheck, X } from 'lucide-react';
import { useMemo } from 'react';
import { videoPlatforms } from '../data/videoPlatforms.js';

export function ComputerUI({ onClose, onPlatformSelect, selectedPlatformId = videoPlatforms[0].id }) {
  const selectedPlatform = useMemo(
    () => videoPlatforms.find((platform) => platform.id === selectedPlatformId) ?? videoPlatforms[0],
    [selectedPlatformId]
  );
  const isLocked = selectedPlatform.status === 'locked';

  return (
    <section className="computer-overlay" aria-label="Computadora de Casa 1">
      <div className="computer-window">
        <header className="computer-topbar">
          <div>
            <span>Casa 1 Workstation</span>
            <h1>Centro de estudio</h1>
          </div>
          <button type="button" className="computer-close" onClick={onClose} aria-label="Cerrar computadora">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="computer-desktop">
          <nav className="computer-dock" aria-label="Plataformas de video">
            <p>Fuentes</p>
            {videoPlatforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                className={platform.id === selectedPlatform.id ? 'is-selected' : ''}
                onClick={() => onPlatformSelect(platform.id)}
                style={{ '--platform-accent': platform.accent }}
              >
                <Monitor size={22} aria-hidden="true" />
                <span>{platform.name}</span>
              </button>
            ))}
          </nav>

          <main className="computer-app" style={{ '--platform-accent': selectedPlatform.accent }}>
            <div className="app-title">
              <span>{isLocked ? 'Acceso restringido' : 'Fuente preparada'}</span>
              <h2>{selectedPlatform.name}</h2>
              <p>{selectedPlatform.description}</p>
            </div>

            <div className="video-app-panel">
              <div className="video-app-summary">
                <div className="video-app-icon">
                  {isLocked ? <Lock size={44} aria-hidden="true" /> : <Play size={44} aria-hidden="true" />}
                </div>
                <div>
                  <h3>{isLocked ? 'Integracion no disponible' : 'Sesion lista para configurar'}</h3>
                  <p>{selectedPlatform.note}</p>
                </div>
              </div>

              <div className="source-details" aria-label="Estado de la fuente">
                <div className="source-detail">
                  <Monitor size={18} aria-hidden="true" />
                  <span>Fuente</span>
                  <strong>{selectedPlatform.name}</strong>
                </div>
                <div className="source-detail">
                  {isLocked ? <Lock size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
                  <span>Estado</span>
                  <strong>{isLocked ? 'Restringido' : 'Preparado'}</strong>
                </div>
                <div className="source-detail">
                  <Clock3 size={18} aria-hidden="true" />
                  <span>Uso sugerido</span>
                  <strong>{isLocked ? 'Solo referencia' : 'Sesion de foco'}</strong>
                </div>
                <div className="source-detail">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span>Control</span>
                  <strong>Contenido curado</strong>
                </div>
              </div>

              <button type="button" className="video-app-action" disabled={isLocked}>
                {isLocked ? 'No disponible' : 'Preparar sesion'}
              </button>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
