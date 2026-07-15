import {
  CalendarDays,
  Coins,
  Globe2,
  Music2,
  PawPrint,
  Settings,
  Sparkles,
  Wifi
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getEquippedSkinState } from '../data/focusEconomy.js';
import { studyAgendaItems } from '../data/studyAgenda.js';
import {
  isKeyboardActionElement,
  isTextEntryElement,
  moveFocusByArrow,
  shouldPreserveNativeArrowKey
} from '../utils/keyboardNavigation.js';
import { ComputerUI } from './ComputerUI.jsx';

const REQUEST_DESKTOP_EVENT = 'estudiemos:computer-request-desktop';

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

export function VirtualComputerShell(props) {
  const { agendaItems = studyAgendaItems, focusEconomy, onClose } = props;
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const agendaPreviewItems = agendaItems.filter((item) => !item.completed);
  const agendaLead = agendaPreviewItems[0] ?? agendaItems[0] ?? null;
  const [appOpen, setAppOpen] = useState(false);
  const [initialApp, setInitialApp] = useState('estudiemos');
  const desktopRootRef = useRef(null);

  useEffect(() => {
    function onBackspaceFallback(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'Backspace') {
        if (isTextEntryElement(event.target)) return;

        event.preventDefault();
        if (appOpen) {
          setAppOpen(false);
          return;
        }

        onClose?.();
        return;
      }

      if (appOpen || shouldPreserveNativeArrowKey(event.target)) return;

      if (event.key.startsWith('Arrow') && moveFocusByArrow(desktopRootRef.current, event.key)) {
        event.preventDefault();
        return;
      }

      if (event.key === 'Enter' && !isTextEntryElement(event.target)) {
        const activeElement = document.activeElement;
        if (isKeyboardActionElement(activeElement) && desktopRootRef.current?.contains(activeElement)) {
          event.preventDefault();
          activeElement.click();
        }
      }
    }

    document.addEventListener('keydown', onBackspaceFallback);
    return () => document.removeEventListener('keydown', onBackspaceFallback);
  }, [appOpen, onClose]);

  useEffect(() => {
    if (!appOpen) desktopRootRef.current?.focus({ preventScroll: true });
  }, [appOpen]);

  useEffect(() => {
    function onComputerDesktopRequest() {
      setAppOpen(false);
    }

    window.addEventListener(REQUEST_DESKTOP_EVENT, onComputerDesktopRequest);
    return () => window.removeEventListener(REQUEST_DESKTOP_EVENT, onComputerDesktopRequest);
  }, []);

  if (appOpen) {
    return <ComputerUI {...props} initialApp={initialApp} onBackToDesktop={() => setAppOpen(false)} />;
  }

  function openComputer(appId) {
    setInitialApp(appId);
    setAppOpen(true);
  }

  return (
    <section
      ref={desktopRootRef}
      className="computer-overlay mediahub-boot-overlay"
      data-computer-shell-state="desktop"
      tabIndex={-1}
      aria-label="Escritorio de la computadora de Casa 1"
    >
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
              {focusEconomy && (
                <span className="virtual-profile-pill">
                  <PawPrint size={16} aria-hidden="true" />
                  {focusEconomy.progress.coins} Monedas
                </span>
              )}
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
                <div className="virtual-profile-card">
                  <span className="virtual-profile-orb">
                    <PawPrint size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span>Perfil</span>
                    <strong>{equippedSkin.skin.name}</strong>
                    <small>{focusEconomy.progress.coins} monedas - Rango {equippedSkin.rank}</small>
                  </div>
                </div>
              )}

              <div className="virtual-mini-grid">
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

          <footer className="virtual-windows-taskbar" aria-label="Barra de tareas">
            <div className="virtual-start-button" aria-hidden="true">
              <Sparkles size={18} />
              <span>Estudiemos</span>
            </div>

            <div className="virtual-taskbar-tray" aria-label="Estado">
              <span>
                <Wifi size={14} aria-hidden="true" />
                Online
              </span>
              <strong>Modo enfoque</strong>
            </div>
          </footer>
        </main>
      </div>
    </section>
  );
}
