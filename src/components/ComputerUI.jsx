import { Monitor, Play, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { videoPlatforms } from '../data/videoPlatforms.js';

export function ComputerUI({ onClose }) {
  const [selectedPlatformId, setSelectedPlatformId] = useState(videoPlatforms[0].id);
  const selectedPlatform = useMemo(
    () => videoPlatforms.find((platform) => platform.id === selectedPlatformId) ?? videoPlatforms[0],
    [selectedPlatformId]
  );

  return (
    <section className="computer-overlay" aria-label="Computadora de Casa 1">
      <div className="computer-window">
        <header className="computer-topbar">
          <div>
            <span>Casa 1</span>
            <h1>Computadora</h1>
          </div>
          <button type="button" className="computer-close" onClick={onClose} aria-label="Cerrar computadora">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="computer-desktop">
          <nav className="computer-dock" aria-label="Plataformas de video">
            {videoPlatforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                className={platform.id === selectedPlatform.id ? 'is-selected' : ''}
                onClick={() => setSelectedPlatformId(platform.id)}
                style={{ '--platform-accent': platform.accent }}
              >
                <Monitor size={22} aria-hidden="true" />
                <span>{platform.name}</span>
              </button>
            ))}
          </nav>

          <main className="computer-app" style={{ '--platform-accent': selectedPlatform.accent }}>
            <div className="app-title">
              <span>{selectedPlatform.status === 'locked' ? 'Bloqueado' : 'App de video'}</span>
              <h2>{selectedPlatform.name}</h2>
              <p>{selectedPlatform.description}</p>
            </div>

            <div className="video-app-panel">
              <div className="video-app-icon">
                <Play size={54} aria-hidden="true" />
              </div>
              <h3>{selectedPlatform.status === 'locked' ? 'No implementado' : 'Placeholder funcional'}</h3>
              <p>{selectedPlatform.note}</p>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
