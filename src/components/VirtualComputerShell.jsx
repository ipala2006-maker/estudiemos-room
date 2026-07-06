import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ComputerUI } from './ComputerUI.jsx';

export function VirtualComputerShell(props) {
  const [appOpen, setAppOpen] = useState(false);

  if (appOpen) {
    return <ComputerUI {...props} />;
  }

  return (
    <section className="computer-overlay mediahub-boot-overlay" aria-label="Escritorio de la computadora de Casa 1">
      <div className="computer-window computer-window-wide mediahub-window game-computer-window estudiemos-os-live-desktop computer-landing-desktop">
        <div className="computer-boot-glow" aria-hidden="true" />

        <div className="os-screen-grid">
          <div className="os-wallpaper" aria-hidden="true" />

          <main className="computer-desktop mediahub-desktop game-os-desktop os-desktop">
            <div className="os-photo-desktop" aria-label="Escritorio de Estudiemos OS">
              <div className="os-desktop-icons" aria-label="Accesos del escritorio">
                <button
                  type="button"
                  className="os-desktop-icon is-open"
                  onClick={() => setAppOpen(true)}
                  title="Abrir Estudiemos"
                >
                  <span className="os-icon-tile">
                    <Sparkles size={26} aria-hidden="true" />
                  </span>
                  <span className="os-icon-copy">
                    <strong>Estudiemos</strong>
                    <small>Biblioteca principal</small>
                  </span>
                  <span className="os-icon-state">Listo</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
