import {
  BarChart3,
  CalendarDays,
  Coins,
  Globe2,
  MonitorUp,
  Music2,
  PawPrint,
  Settings,
  Sparkles,
  Wifi
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DachshundMascot } from './DachshundMascot.jsx';
import { getEquippedSkinState } from '../data/focusEconomy.js';
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
    id: 'spotify',
    title: 'Spotify',
    subtitle: 'Musica de fondo',
    state: 'Listo',
    icon: Music2,
    action: 'spotify'
  },
  {
    id: 'focus',
    title: 'Perfil',
    subtitle: 'Monedas y skins',
    state: 'Listo',
    icon: PawPrint,
    action: 'focus'
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

function isTextEntryElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable);
}

export function VirtualComputerShell(props) {
  const { agendaItems = studyAgendaItems, focusEconomy } = props;
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const agendaPreviewItems = agendaItems.filter((item) => !item.completed);
  const agendaLead = agendaPreviewItems[0] ?? agendaItems[0] ?? null;
  const [appOpen, setAppOpen] = useState(false);
  const [initialApp, setInitialApp] = useState('estudiemos');

  useEffect(() => {
    if (!appOpen) return undefined;

    function onBackspaceFallback(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'Backspace' || isTextEntryElement(event.target)) return;

      event.preventDefault();
      setAppOpen(false);
    }

    document.addEventListener('keydown', onBackspaceFallback);
    return () => document.removeEventListener('keydown', onBackspaceFallback);
  }, [appOpen]);

  if (appOpen) {
    return <ComputerUI {...props} initialApp={initialApp} onBackToDesktop={() => setAppOpen(false)} />;
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
                <span>Estado</span>
                <strong>Listo para estudiar</strong>
                <p>Abre Estudiemos, organiza la agenda o manda material a la pantalla de la sala.</p>
              </div>
              {focusEconomy && (
                <div className="virtual-mascot-card">
                  <DachshundMascot skinId={equippedSkin.skin.id} rank={equippedSkin.rank} size="desktop" />
                  <div>
                    <span>Perfil</span>
                    <strong>{focusEconomy.progress.coins} Monedas</strong>
                    <small>{equippedSkin.skin.name} R{equippedSkin.rank}</small>
                  </div>
                </div>
              )}

              <div className="virtual-mini-grid">
                <div>
                  <MonitorUp size={18} aria-hidden="true" />
                  <strong>Pantallas</strong>
                  <span>Control desde la sala</span>
                </div>
                <div>
                  <BarChart3 size={18} aria-hidden="true" />
                  <strong>Progreso</strong>
                  <span>Rango {equippedSkin.rank}</span>
                </div>
                <div>
                  <Coins size={18} aria-hidden="true" />
                  <strong>Monedas</strong>
                  <span>{focusEconomy?.progress.coins ?? 0} disponibles</span>
                </div>
                <div>
                  <CalendarDays size={18} aria-hidden="true" />
                  <strong>Agenda</strong>
                  <span>{agendaLead?.title || 'Sin bloques'}</span>
                </div>
              </div>
              <div className="virtual-agenda-list" aria-label="Agenda sincronizada">
                {agendaPreviewItems.length > 0 ? (
                  agendaPreviewItems.slice(0, 3).map((item) => (
                    <span key={`${item.id}-${item.time}`}>
                      <strong>{item.time || '--:--'}</strong>
                      {item.title || 'Bloque sin titulo'}
                    </span>
                  ))
                ) : agendaItems.length > 0 ? (
                  <span>
                    <strong>OK</strong>
                    Todo completado
                  </span>
                ) : (
                  <span>
                    <strong>--:--</strong>
                    Agenda vacia
                  </span>
                )}
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
