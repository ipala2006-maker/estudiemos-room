import {
  BarChart3,
  CalendarDays,
  Globe2,
  MonitorUp,
  Settings,
  Sparkles,
  Wifi
} from 'lucide-react';
import { useState } from 'react';
import { studyAgendaItems } from '../data/studyAgenda.js';
import { ComputerUI } from './ComputerUI.jsx';

const DESKTOP_APPS = [
  {
    id: 'estudiemos',
    title: 'Estudiemos',
    subtitle: 'Biblioteca principal',
    state: 'Listo',
    icon: Sparkles,
    action: 'estudiemos'
  },
  {
    id: 'navegador',
    title: 'Navegador',
    subtitle: 'Links externos',
    state: 'Listo',
    icon: Globe2,
    action: 'links'
  },
  {
    id: 'agenda',
    title: 'Agenda',
    subtitle: 'Cartel sincronizado',
    state: 'Listo',
    icon: CalendarDays,
    action: 'agenda'
  },
  {
    id: 'ajustes',
    title: 'Ajustes',
    subtitle: 'Estudiemos OS',
    state: 'Sistema',
    icon: Settings,
    action: 'settings'
  }
];

export function VirtualComputerShell(props) {
  const { agendaItems = studyAgendaItems } = props;
  const [appOpen, setAppOpen] = useState(false);
  const [initialApp, setInitialApp] = useState('estudiemos');

  if (appOpen) {
    return <ComputerUI {...props} initialApp={initialApp} />;
  }

  function openComputer(appId) {
    setInitialApp(appId);
    setAppOpen(true);
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
                const canOpen = Boolean(app.action);

                return (
                  <button
                    key={app.id}
                    type="button"
                    className={canOpen ? 'virtual-app-tile is-ready' : 'virtual-app-tile'}
                    onClick={canOpen ? () => openComputer(app.action) : undefined}
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
                  <MonitorUp size={18} aria-hidden="true" />
                  <strong>Pantallas</strong>
                  <span>Controles en la bandeja inferior</span>
                </div>
                <div>
                  <BarChart3 size={18} aria-hidden="true" />
                  <strong>Progreso</strong>
                  <span>Modulo preparado</span>
                </div>
                <div>
                  <CalendarDays size={18} aria-hidden="true" />
                  <strong>Agenda</strong>
                  <span>{agendaItems[0]?.title ?? 'Plan semanal'}</span>
                </div>
              </div>
              <div className="virtual-agenda-list" aria-label="Agenda sincronizada">
                {agendaItems.slice(0, 3).map((item) => (
                  <span key={`${item.time}-${item.title}`}>
                    <strong>{item.time}</strong>
                    {item.title}
                  </span>
                ))}
              </div>
            </aside>
          </section>

          <footer className="virtual-dock" aria-label="Dock">
            <button type="button" className="virtual-dock-button is-active" onClick={() => openComputer('estudiemos')}>
              <Sparkles size={20} aria-hidden="true" />
              <span>Estudiemos</span>
            </button>
          </footer>
        </main>
      </div>
    </section>
  );
}
