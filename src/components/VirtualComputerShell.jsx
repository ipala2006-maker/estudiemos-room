import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FolderOpen,
  Globe2,
  MonitorUp,
  NotebookPen,
  Settings,
  Sparkles,
  Wifi
} from 'lucide-react';
import { useState } from 'react';
import { ComputerUI } from './ComputerUI.jsx';

const DESKTOP_APPS = [
  {
    id: 'estudiemos',
    title: 'Estudiemos',
    subtitle: 'Biblioteca principal',
    state: 'Listo',
    icon: Sparkles,
    action: 'open'
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca',
    subtitle: 'Material guardado',
    state: 'Proximo',
    icon: FolderOpen
  },
  {
    id: 'apuntes',
    title: 'Apuntes',
    subtitle: 'Cuaderno',
    state: 'Proximo',
    icon: NotebookPen
  },
  {
    id: 'agenda',
    title: 'Agenda',
    subtitle: 'Plan semanal',
    state: 'Proximo',
    icon: CalendarDays
  },
  {
    id: 'progreso',
    title: 'Progreso',
    subtitle: 'Actividad',
    state: 'Proximo',
    icon: BarChart3
  },
  {
    id: 'navegador',
    title: 'Navegador',
    subtitle: 'Links externos',
    state: 'Proximo',
    icon: Globe2
  },
  {
    id: 'pantallas',
    title: 'Pantallas',
    subtitle: 'Sala virtual',
    state: 'Sistema',
    icon: MonitorUp
  },
  {
    id: 'ajustes',
    title: 'Ajustes',
    subtitle: 'Estudiemos OS',
    state: 'Sistema',
    icon: Settings
  }
];

export function VirtualComputerShell(props) {
  const [appOpen, setAppOpen] = useState(false);

  if (appOpen) {
    return <ComputerUI {...props} />;
  }

  return (
    <section className="computer-overlay mediahub-boot-overlay" aria-label="Escritorio de la computadora de Casa 1">
      <div className="computer-window computer-window-wide mediahub-window game-computer-window estudiemos-os-live-desktop computer-landing-desktop">
        <div className="computer-boot-glow" aria-hidden="true" />

        <main className="virtual-desktop-shell" aria-label="Escritorio de Estudiemos OS">
          <header className="virtual-desktop-topbar">
            <div className="virtual-brand">
              <span>Estudiemos OS</span>
              <strong>Room 1</strong>
            </div>

            <div className="virtual-status-tray" aria-label="Estado del sistema">
              <span>
                <Wifi size={16} aria-hidden="true" />
                Red local
              </span>
              <span>Modo enfoque</span>
            </div>
          </header>

          <section className="virtual-desktop-content">
            <div className="virtual-app-grid" aria-label="Aplicaciones">
              {DESKTOP_APPS.map((app) => {
                const Icon = app.icon;
                const canOpen = app.action === 'open';

                return (
                  <button
                    key={app.id}
                    type="button"
                    className={canOpen ? 'virtual-app-tile is-ready' : 'virtual-app-tile'}
                    onClick={canOpen ? () => setAppOpen(true) : undefined}
                    aria-disabled={!canOpen}
                  >
                    <span className="virtual-app-icon">
                      <Icon size={25} aria-hidden="true" />
                    </span>
                    <span className="virtual-app-copy">
                      <strong>{app.title}</strong>
                      <small>{app.subtitle}</small>
                    </span>
                    <span className="virtual-app-state">{app.state}</span>
                  </button>
                );
              })}
            </div>

            <aside className="virtual-side-panel" aria-label="Bandeja de estudio">
              <div className="virtual-focus-card">
                <span>Sesion</span>
                <strong>Escritorio listo</strong>
                <p>Estudiemos queda preparado como app principal de la sala.</p>
              </div>

              <div className="virtual-mini-grid">
                <div>
                  <BookOpen size={18} aria-hidden="true" />
                  <strong>Recursos</strong>
                  <span>Biblioteca conectada</span>
                </div>
                <div>
                  <BarChart3 size={18} aria-hidden="true" />
                  <strong>Progreso</strong>
                  <span>Modulo preparado</span>
                </div>
                <div>
                  <CalendarDays size={18} aria-hidden="true" />
                  <strong>Agenda</strong>
                  <span>Plan semanal</span>
                </div>
              </div>
            </aside>
          </section>

          <footer className="virtual-dock" aria-label="Dock">
            <button type="button" className="virtual-dock-button is-active" onClick={() => setAppOpen(true)}>
              <Sparkles size={20} aria-hidden="true" />
              <span>Estudiemos</span>
            </button>
            <button type="button" className="virtual-dock-button">
              <CalendarDays size={20} aria-hidden="true" />
              <span>Agenda</span>
            </button>
            <button type="button" className="virtual-dock-button">
              <BarChart3 size={20} aria-hidden="true" />
              <span>Progreso</span>
            </button>
          </footer>
        </main>
      </div>
    </section>
  );
}
