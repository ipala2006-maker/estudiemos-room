import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eraser,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Library,
  Maximize2,
  Minimize2,
  MonitorUp,
  NotebookPen,
  PanelRightOpen,
  Search,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Square,
  UserCircle,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ingenieriaRecursosData, ingenieriaRecursosSource } from '../data/ingenieriaRecursos.js';
import { parseYouTubeUrl } from '../utils/youtube.js';

const ZONES = [
  {
    id: 'upper',
    label: 'Pantalla principal',
    description: 'Contenido central de la sala'
  },
  {
    id: 'lower',
    label: 'Pantalla secundaria',
    description: 'Apoyo, ambiente o referencia'
  }
];

const SCREEN_LAYOUTS = [
  { id: 'single', label: '100%', description: 'Una pantalla' },
  { id: 'split-70-30', label: '70/30', description: 'Principal arriba' },
  { id: 'split-50-50', label: '50/50', description: 'Doble foco' },
  { id: 'split-30-70', label: '30/70', description: 'Secundaria grande' }
];

const DESKTOP_APPS = [
  {
    id: 'estudiemos',
    title: 'Estudiemos',
    subtitle: 'Biblioteca principal',
    description: 'Recursos, carreras, materias y material listo para enviar a la pantalla.',
    icon: Sparkles,
    state: 'Listo',
    functional: true
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca',
    subtitle: 'Coleccion local',
    description: 'Material guardado para organizar proximas sesiones.',
    icon: Library,
    state: 'Proximo',
    functional: false
  },
  {
    id: 'apuntes',
    title: 'Mis apuntes',
    subtitle: 'Cuaderno',
    description: 'Notas personales del estudiante dentro del Room.',
    icon: NotebookPen,
    state: 'Proximo',
    functional: false
  },
  {
    id: 'agenda',
    title: 'Agenda',
    subtitle: 'Plan semanal',
    description: 'Bloques de estudio, entregas y repasos.',
    icon: CalendarDays,
    state: 'Proximo',
    functional: false
  },
  {
    id: 'progreso',
    title: 'Progreso',
    subtitle: 'Actividad',
    description: 'Resumen visual del avance de la sesion.',
    icon: BarChart3,
    state: 'Proximo',
    functional: false
  },
  {
    id: 'settings',
    title: 'Configuracion',
    subtitle: 'Sistema',
    description: 'Preferencias del escritorio y experiencia de estudio.',
    icon: Settings,
    state: 'Proximo',
    functional: false
  },
  {
    id: 'links',
    title: 'Navegador',
    subtitle: 'Carga manual',
    description: 'Preparar links compatibles y enviarlos a una pantalla.',
    icon: Globe2,
    state: 'Listo',
    functional: true
  }
];

const FUNCTIONAL_APP_IDS = DESKTOP_APPS.filter((app) => app.functional).map((app) => app.id);

const EMPTY_ROUTE = {
  carreraSlug: '',
  materiaSlug: '',
  temaSlug: ''
};

const carreraInicial = ingenieriaRecursosData.carreras[0];

export function ComputerUI({
  onClose,
  screenZones,
  screenLayout = 'split-70-30',
  onAssignVideo,
  onClearZone,
  onUpdateZone,
  onScreenLayoutChange
}) {
  const [openWindows, setOpenWindows] = useState(['estudiemos']);
  const [focusedWindow, setFocusedWindow] = useState('estudiemos');
  const [minimizedWindows, setMinimizedWindows] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [estudiemosRoute, setEstudiemosRoute] = useState(EMPTY_ROUTE);
  const [resourceView, setResourceView] = useState('categories');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [clockTime, setClockTime] = useState(() => new Date());
  const [systemNote, setSystemNote] = useState('Sesion enfocada lista');

  useEffect(() => {
    const timer = window.setInterval(() => setClockTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const carreras = ingenieriaRecursosData.carreras;
  const carrera = useMemo(
    () => carreras.find((item) => item.slug === estudiemosRoute.carreraSlug) ?? carreras[0] ?? carreraInicial,
    [carreras, estudiemosRoute.carreraSlug]
  );
  const materia = useMemo(
    () => carrera.materias.find((item) => item.slug === estudiemosRoute.materiaSlug) ?? carrera.materias[0],
    [carrera, estudiemosRoute.materiaSlug]
  );
  const tema = useMemo(
    () => materia.temas.find((item) => item.slug === estudiemosRoute.temaSlug) ?? materia.temas[0],
    [materia, estudiemosRoute.temaSlug]
  );
  const activeLayout = SCREEN_LAYOUTS.find((layout) => layout.id === screenLayout) ?? SCREEN_LAYOUTS[1];
  const visibleWindows = openWindows.filter((appId) => !minimizedWindows.includes(appId));
  const clockLabel = useMemo(
    () =>
      clockTime.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
    [clockTime]
  );
  const dateLabel = useMemo(
    () =>
      clockTime.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }),
    [clockTime]
  );

  function openApp(appId) {
    const app = findDesktopApp(appId);
    if (!app?.functional) {
      setSystemNote(`${app?.title ?? 'Modulo'} queda preparado para una proxima version.`);
      return;
    }

    setOpenWindows((current) => (current.includes(appId) ? current : [...current, appId]));
    setMinimizedWindows((current) => current.filter((id) => id !== appId));
    setFocusedWindow(appId);
    setDrawerOpen(false);
    setSystemNote(`${app.title} activo`);
  }

  function focusWindow(appId) {
    setFocusedWindow(appId);
    setMinimizedWindows((current) => current.filter((id) => id !== appId));
  }

  function minimizeWindow(appId) {
    setMinimizedWindows((current) => (current.includes(appId) ? current : [...current, appId]));
    setFocusedWindow((current) => {
      if (current !== appId) return current;
      return visibleWindows.find((id) => id !== appId) ?? '';
    });
  }

  function closeWindow(appId) {
    const remainingOpen = openWindows.filter((id) => id !== appId);
    const remainingVisible = remainingOpen.filter((id) => !minimizedWindows.includes(id));

    setOpenWindows(remainingOpen);
    setMinimizedWindows((current) => current.filter((id) => id !== appId));
    setFocusedWindow((current) => {
      if (current !== appId) return current;
      return remainingVisible.at(-1) ?? remainingOpen.at(-1) ?? '';
    });
    setSystemNote(`${findDesktopApp(appId)?.title ?? 'Ventana'} cerrada`);
  }

  function openEstudiemosHome() {
    setEstudiemosRoute(EMPTY_ROUTE);
    setSelectedContent(null);
    setResourceView('categories');
  }

  function openCarrera(carreraSlug) {
    setEstudiemosRoute({ carreraSlug, materiaSlug: '', temaSlug: '' });
    setSelectedContent(null);
    setResourceView('categories');
  }

  function openMateria(materiaSlug) {
    setEstudiemosRoute({ carreraSlug: carrera.slug, materiaSlug, temaSlug: '' });
    setSelectedContent(null);
    setResourceView('categories');
  }

  function openTema(temaSlug) {
    setEstudiemosRoute({ carreraSlug: carrera.slug, materiaSlug: materia.slug, temaSlug });
    setSelectedContent(null);
    setResourceView('categories');
  }

  function selectVideo(videoItem, index) {
    const result = parseYouTubeUrl(videoItem.url);
    if (!result.ok) return;

    setSelectedContent({
      ...result.video,
      contentType: 'youtube',
      resourceUrl: '',
      title: videoItem.title ?? `${tema.title} - video ${index + 1}`,
      creator: ingenieriaRecursosSource.name,
      description: `${materia.title} / ${tema.title}`,
      category: 'Video'
    });
  }

  function selectPdf(pdfItem) {
    setSelectedContent({
      videoId: '',
      inputUrl: pdfItem.url,
      watchUrl: pdfItem.url,
      embedUrl: '',
      contentType: 'pdf',
      resourceUrl: pdfItem.url,
      title: pdfItem.title,
      creator: ingenieriaRecursosSource.name,
      description: `${materia.title} / ${tema.title}`,
      category: 'PDF'
    });
  }

  function prepareManualLink(event) {
    event.preventDefault();
    const result = parseYouTubeUrl(linkDraft);
    if (!result.ok) {
      setLinkError(result.error);
      setSelectedContent(null);
      return;
    }

    setLinkError('');
    setSelectedContent({
      ...result.video,
      contentType: 'youtube',
      resourceUrl: '',
      title: 'Link de YouTube',
      creator: 'Contenido externo',
      description: 'Video preparado desde Navegador. Elegi donde mostrarlo.',
      category: 'Link'
    });
  }

  function assignContent(zoneId, layoutId = null) {
    if (!selectedContent) return;
    if (layoutId) onScreenLayoutChange?.(layoutId);
    onAssignVideo(zoneId, {
      ...selectedContent,
      updatedAt: Date.now()
    });
  }

  return (
    <section className="computer-overlay mediahub-boot-overlay" aria-label="Computadora de Casa 1">
      <div className="computer-window computer-window-wide mediahub-window game-computer-window estudiemos-os-live-desktop">
        <div className="computer-boot-glow" aria-hidden="true" />

        <div className="os-screen-grid">
          <div className="os-wallpaper" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <header className="os-system-strip">
            <div>
              <span>Estudiemos OS</span>
              <strong>Room 1</strong>
            </div>
            <div className="os-status-cluster" aria-label="Estado del sistema">
              <span className="os-status-pill">
                <Wifi size={16} aria-hidden="true" />
                Red local
              </span>
              <span className="os-status-pill">
                <Signal size={16} aria-hidden="true" />
                Sincronizado
              </span>
              <span className="os-status-pill">
                <Clock3 size={16} aria-hidden="true" />
                {clockLabel}
              </span>
            </div>
          </header>

          <div className="computer-desktop mediahub-desktop game-os-desktop os-desktop">
            <aside className="os-desktop-icons" aria-label="Accesos del escritorio">
              {DESKTOP_APPS.map((app) => {
                const Icon = app.icon;
                const isOpen = openWindows.includes(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    className={`os-desktop-icon${app.functional ? '' : ' is-quiet'}${isOpen ? ' is-open' : ''}`}
                    onClick={() => openApp(app.id)}
                    title={app.description}
                  >
                    <span className="os-icon-tile">
                      <Icon size={26} aria-hidden="true" />
                    </span>
                    <span className="os-icon-copy">
                      <strong>{app.title}</strong>
                      <small>{app.subtitle}</small>
                    </span>
                    <span className="os-icon-state">{app.state}</span>
                  </button>
                );
              })}
            </aside>

            <section className="os-notification-stack" aria-label="Actividad del sistema">
              <div className="os-glance-card">
                <span>Sesion</span>
                <strong>{systemNote}</strong>
                <p>El escritorio queda activo mientras usas la computadora.</p>
              </div>
              <div className="os-glance-row">
                <FolderOpen size={18} aria-hidden="true" />
                <span>{carreras.length} carreras disponibles</span>
              </div>
              <div className="os-glance-row">
                <MonitorUp size={18} aria-hidden="true" />
                <span>Pantalla {activeLayout.label}</span>
              </div>
            </section>

            <main className="os-window-stage" aria-label="Ventanas abiertas">
              {visibleWindows.length === 0 && (
                <div className="os-empty-desktop">
                  <Sparkles size={32} aria-hidden="true" />
                  <strong>Escritorio listo</strong>
                  <span>Abrir una app desde los accesos.</span>
                </div>
              )}

              {openWindows.includes('estudiemos') && !minimizedWindows.includes('estudiemos') && (
                <OSWindow
                  appId="estudiemos"
                  title="Estudiemos"
                  subtitle="Biblioteca principal"
                  icon={Sparkles}
                  focused={focusedWindow === 'estudiemos'}
                  onFocus={focusWindow}
                  onMinimize={minimizeWindow}
                  onClose={closeWindow}
                >
                  <EstudiemosApp
                    carreras={carreras}
                    carrera={carrera}
                    materia={materia}
                    tema={tema}
                    route={estudiemosRoute}
                    resourceView={resourceView}
                    selectedContent={selectedContent}
                    onHome={openEstudiemosHome}
                    onCarrera={openCarrera}
                    onMateria={openMateria}
                    onTema={openTema}
                    onResourceView={setResourceView}
                    onSelectVideo={selectVideo}
                    onSelectPdf={selectPdf}
                    onAssignContent={assignContent}
                    onCloseContent={() => setSelectedContent(null)}
                  />
                </OSWindow>
              )}

              {openWindows.includes('links') && !minimizedWindows.includes('links') && (
                <OSWindow
                  appId="links"
                  title="Navegador"
                  subtitle="Links externos"
                  icon={Globe2}
                  focused={focusedWindow === 'links'}
                  onFocus={focusWindow}
                  onMinimize={minimizeWindow}
                  onClose={closeWindow}
                >
                  <LinksApp
                    linkDraft={linkDraft}
                    linkError={linkError}
                    selectedContent={selectedContent}
                    onDraftChange={(value) => {
                      setLinkDraft(value);
                      setLinkError('');
                    }}
                    onPrepareLink={prepareManualLink}
                    onAssignContent={assignContent}
                    onCloseContent={() => setSelectedContent(null)}
                  />
                </OSWindow>
              )}
            </main>
          </div>

          <footer className="os-system-bar" aria-label="Barra del sistema">
            <button type="button" className="os-main-button" onClick={() => openApp('estudiemos')}>
              <Square size={15} aria-hidden="true" />
              <span>Estudiemos OS</span>
            </button>

            <div className="os-running-apps" aria-label="Aplicaciones abiertas">
              {FUNCTIONAL_APP_IDS.map((appId) => {
                const app = findDesktopApp(appId);
                const Icon = app.icon;
                const isOpen = openWindows.includes(appId);
                const isMinimized = minimizedWindows.includes(appId);
                return (
                  <button
                    key={appId}
                    type="button"
                    className={`${focusedWindow === appId ? 'is-focused' : ''}${isMinimized ? ' is-minimized' : ''}`}
                    onClick={() => openApp(appId)}
                    aria-pressed={isOpen && !isMinimized}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{app.title}</span>
                  </button>
                );
              })}
            </div>

            <button type="button" className="os-screen-button" onClick={() => setDrawerOpen(true)}>
              <PanelRightOpen size={18} aria-hidden="true" />
              <span>Pantallas</span>
            </button>

            <div className="os-clock" aria-label={`Hora del sistema ${clockLabel}`}>
              <strong>{clockLabel}</strong>
              <span>{dateLabel}</span>
            </div>

            <div className="os-user-chip">
              <UserCircle size={19} aria-hidden="true" />
              <span>Perfil</span>
            </div>

            <button type="button" className="computer-close os-close-button" onClick={onClose} aria-label="Cerrar computadora">
              <X size={20} aria-hidden="true" />
            </button>
          </footer>
        </div>

        {drawerOpen && (
          <ScreenControlDrawer
            activeLayout={activeLayout}
            screenZones={screenZones}
            onClose={() => setDrawerOpen(false)}
            onClearZone={onClearZone}
            onUpdateZone={onUpdateZone}
            onScreenLayoutChange={onScreenLayoutChange}
          />
        )}
      </div>
    </section>
  );
}

function OSWindow({ appId, title, subtitle, icon: Icon, focused, children, onFocus, onMinimize, onClose }) {
  return (
    <section
      className={`os-window os-window-${appId}${focused ? ' is-focused' : ''}`}
      onMouseDown={() => onFocus(appId)}
      aria-label={`Ventana ${title}`}
    >
      <header className="os-window-titlebar">
        <div className="os-window-title">
          <span className="os-window-icon">
            <Icon size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </div>

        <div className="os-window-actions">
          <button type="button" onClick={() => onMinimize(appId)} aria-label={`Minimizar ${title}`}>
            <Minimize2 size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onFocus(appId)} aria-label={`Enfocar ${title}`}>
            <Maximize2 size={15} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onClose(appId)} aria-label={`Cerrar ${title}`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="os-window-content">{children}</div>
    </section>
  );
}

function findDesktopApp(appId) {
  return DESKTOP_APPS.find((app) => app.id === appId);
}

function EstudiemosApp({
  carreras,
  carrera,
  materia,
  tema,
  route,
  resourceView,
  selectedContent,
  onHome,
  onCarrera,
  onMateria,
  onTema,
  onResourceView,
  onSelectVideo,
  onSelectPdf,
  onAssignContent,
  onCloseContent
}) {
  const isHome = !route.carreraSlug;
  const isCarrera = Boolean(route.carreraSlug) && !route.materiaSlug;
  const isMateria = Boolean(route.materiaSlug) && !route.temaSlug;
  const isTema = Boolean(route.temaSlug);
  const browserPath = buildBrowserPath(route);

  return (
    <div className="mediahub-app-shell estudiemos-resource-shell estudiemos-os-shell">
      <section className="estudiemos-browser-frame" aria-label="Estudiemos integrado">
        <header className="estudiemos-browser-bar">
          <div className="browser-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="browser-address">
            <Search size={15} aria-hidden="true" />
            <span>{browserPath}</span>
          </div>
        </header>

        <div className="estudiemos-real-page">
          <header className="estudiemos-real-topbar">
            <button type="button" className="estudiemos-brand" onClick={onHome}>
              Estudiemos
            </button>
            <nav className="estudiemos-breadcrumbs" aria-label="Ruta actual">
              <button type="button" onClick={onHome}>
                Carreras
              </button>
              {!isHome && (
                <>
                  <span>/</span>
                  <button type="button" onClick={() => onCarrera(carrera.slug)}>
                    {carrera.title}
                  </button>
                </>
              )}
              {(isMateria || isTema) && (
                <>
                  <span>/</span>
                  <button type="button" onClick={() => onMateria(materia.slug)}>
                    {materia.title}
                  </button>
                </>
              )}
              {isTema && (
                <>
                  <span>/</span>
                  <span>{tema.title}</span>
                </>
              )}
            </nav>
          </header>

          <main className="estudiemos-container">
            {isHome && <EstudiemosHome carreras={carreras} onCarrera={onCarrera} />}
            {isCarrera && <CarreraPage carrera={carrera} onMateria={onMateria} />}
            {isMateria && <MateriaPage materia={materia} onTema={onTema} />}
            {isTema && (
              <TemaPage
                tema={tema}
                resourceView={resourceView}
                onResourceView={onResourceView}
                onSelectVideo={onSelectVideo}
                onSelectPdf={onSelectPdf}
              />
            )}
          </main>
        </div>
      </section>

      <aside className="mediahub-context-panel game-context-panel">
        <ContentActionPanel
          content={selectedContent}
          emptyText="Selecciona un video o PDF de Estudiemos para enviarlo a la pantalla."
          onAssignContent={onAssignContent}
          onClose={onCloseContent}
        />
      </aside>
    </div>
  );
}

function EstudiemosHome({ carreras, onCarrera }) {
  return (
    <>
      <section className="estudiemos-hero">
        <h1>Estudiemos</h1>
      </section>

      <section className="estudiemos-section">
        <div className="estudiemos-section-head">
          <h2>Carreras</h2>
          <p>Haz clic para ver las materias.</p>
        </div>

        <div className="estudiemos-cards-grid">
          {carreras.map((item) => (
            <button key={item.slug} type="button" className="estudiemos-card estudiemos-card-compact" onClick={() => onCarrera(item.slug)}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function CarreraPage({ carrera, onMateria }) {
  return (
    <section className="estudiemos-section">
      <div className="estudiemos-section-head">
        <h2>{carrera.title}</h2>
        <p>{carrera.description}</p>
      </div>

      <div className="estudiemos-cards-grid">
        {carrera.materias.map((item) => (
          <button key={item.slug} type="button" className="estudiemos-card" onClick={() => onMateria(item.slug)}>
            <BookOpen size={22} aria-hidden="true" />
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function MateriaPage({ materia, onTema }) {
  return (
    <section className="estudiemos-section">
      <div className="estudiemos-section-head">
        <h2>{materia.title}</h2>
        <p>{materia.description}</p>
      </div>

      <div className="estudiemos-topic-grid">
        {materia.temas.map((item) => (
          <button key={item.slug} type="button" className="estudiemos-topic-card" onClick={() => onTema(item.slug)}>
            <div>
              <p>{item.title}</p>
              <span>{item.meta}</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function TemaPage({ tema, resourceView, onResourceView, onSelectVideo, onSelectPdf }) {
  const videos = tema.videos ?? [];
  const pdfs = tema.pdfs ?? [];
  const tools = tema.herramientas ?? [];

  return (
    <section className="estudiemos-topic-panel">
      <div className="topic-page-head">
        <div>
          <h1>{tema.title}</h1>
          <p>{tema.meta}</p>
        </div>
      </div>

      <div className="resource-categories-game">
        <ResourceCategoryButton
          icon={Video}
          title="Videos"
          description="Explicaciones y clases"
          count={videos.length}
          selected={resourceView === 'videos'}
          onClick={() => onResourceView('videos')}
        />
        <ResourceCategoryButton
          icon={FileText}
          title="Material"
          description="Apuntes y guias"
          count={pdfs.length}
          selected={resourceView === 'pdfs'}
          onClick={() => onResourceView('pdfs')}
        />
        <ResourceCategoryButton
          icon={Wrench}
          title="Herramientas"
          description="Simuladores"
          count={tools.length}
          selected={resourceView === 'tools'}
          onClick={() => onResourceView('tools')}
        />
      </div>

      {resourceView === 'categories' && (
        <p className="resource-empty-note game-empty-note">Elegir una categoria para ver el contenido cargado en Estudiemos.</p>
      )}

      {resourceView === 'videos' && (
        <ResourceSection
          title="Videos"
          emptyText="No hay videos disponibles todavia."
          items={videos}
          renderItem={(item, index) => (
            <button key={`${item.url}-${index}`} type="button" className="estudiemos-video-card" onClick={() => onSelectVideo(item, index)}>
              <img src={buildThumbnail(item.url)} alt="" />
              <div>
                <strong>{item.title ?? `Video ${index + 1}`}</strong>
                <span>Enviar a pantalla</span>
              </div>
            </button>
          )}
        />
      )}

      {resourceView === 'pdfs' && (
        <ResourceSection
          title="Material"
          emptyText="No hay material disponible todavia."
          items={pdfs}
          renderItem={(item) => (
            <button key={item.url} type="button" className="resource-action-card game-resource-action" onClick={() => onSelectPdf(item)}>
              <FileText size={22} aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <span>PDF de Estudiemos</span>
              </div>
              <MonitorUp size={17} aria-hidden="true" />
            </button>
          )}
        />
      )}

      {resourceView === 'tools' && (
        <ResourceSection
          title="Herramientas"
          emptyText="No hay herramientas disponibles todavia."
          items={tools}
          renderItem={(item) => (
            <a key={item.url} className="resource-action-card game-resource-action" href={item.url} target="_blank" rel="noreferrer">
              <Wrench size={22} aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <span>{item.type}</span>
              </div>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          )}
        />
      )}
    </section>
  );
}

function ResourceCategoryButton({ icon: Icon, title, description, count, selected, onClick }) {
  return (
    <button type="button" className={selected ? 'resource-category-game is-selected' : 'resource-category-game'} onClick={onClick}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span>{count}</span>
    </button>
  );
}

function ResourceSection({ title, emptyText, items = [], renderItem }) {
  return (
    <section className="resource-content-section game-resource-section">
      <div className="content-section-title">
        <h3>{title}</h3>
        <span>{items.length} disponibles</span>
      </div>
      {items.length > 0 ? <div className="resource-card-list game-resource-list">{items.map(renderItem)}</div> : <p className="resource-empty-note">{emptyText}</p>}
    </section>
  );
}

function LinksApp({
  linkDraft,
  linkError,
  selectedContent,
  onDraftChange,
  onPrepareLink,
  onAssignContent,
  onCloseContent
}) {
  return (
    <div className="mediahub-app-shell links-app-shell game-links-shell">
      <section className="links-card-panel game-links-panel">
        <div className="context-section-title">
          <span>Navegador</span>
          <h3>Cargar contenido externo</h3>
          <p>Prepara un link compatible para enviarlo a las pantallas de la sala.</p>
        </div>

        <form className="links-input-card game-links-input-card" onSubmit={onPrepareLink}>
          <label htmlFor="manual-youtube-link">Link embebible</label>
          <div className="links-input-row">
            <input
              id="manual-youtube-link"
              type="text"
              inputMode="url"
              placeholder="youtube.com/watch?v=..."
              value={linkDraft}
              onChange={(event) => onDraftChange(event.target.value)}
            />
            <button type="submit" className="mediahub-primary-button">
              Preparar
            </button>
          </div>
          {linkError && <p className="screen-zone-error">{linkError}</p>}
        </form>

        <div className="links-format-note game-links-note">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Compatibles: youtube.com/watch, youtu.be y youtube.com/embed.</span>
        </div>
      </section>

      <aside className="mediahub-context-panel game-context-panel">
        <ContentActionPanel
          content={selectedContent}
          emptyText="Prepara un link para elegir pantalla, layout o pantalla completa."
          onAssignContent={onAssignContent}
          onClose={onCloseContent}
        />
      </aside>
    </div>
  );
}

function ContentActionPanel({ content, emptyText, onAssignContent, onClose }) {
  if (!content) {
    return (
      <div className="content-action-panel is-empty game-action-panel">
        <MonitorUp size={30} aria-hidden="true" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="content-action-panel game-action-panel">
      <div>
        <span>{content.category ?? 'Contenido'}</span>
        <h3>{content.title}</h3>
        <p>{content.description}</p>
      </div>
      <div className="content-action-buttons">
        <button type="button" className="mediahub-primary-button" onClick={() => onAssignContent('upper')}>
          Enviar a principal
        </button>
        <button type="button" className="mediahub-secondary-button" onClick={() => onAssignContent('lower')}>
          Enviar a secundaria
        </button>
        <button type="button" className="mediahub-secondary-button" onClick={() => onAssignContent('upper', 'single')}>
          Pantalla completa
        </button>
        <button type="button" className="mediahub-text-button" onClick={onClose}>
          Cerrar acciones
        </button>
      </div>
    </div>
  );
}

function ScreenControlDrawer({
  activeLayout,
  screenZones,
  onClose,
  onClearZone,
  onUpdateZone,
  onScreenLayoutChange
}) {
  return (
    <>
      <button type="button" className="screen-drawer-backdrop" onClick={onClose} aria-label="Cerrar controles de pantalla" />
      <aside className="screen-control-drawer game-screen-drawer" aria-label="Controles de pantalla">
        <header>
          <div>
            <span>Ahora reproduciendo</span>
            <h2>Pantalla {activeLayout.label}</h2>
          </div>
          <button type="button" className="mediahub-icon-button" onClick={onClose} aria-label="Cerrar panel">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <section className="drawer-section">
          <span>Layout</span>
          <div className="drawer-layout-grid">
            {SCREEN_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className={layout.id === activeLayout.id ? 'is-selected' : ''}
                onClick={() => onScreenLayoutChange?.(layout.id)}
              >
                <strong>{layout.label}</strong>
                <small>{layout.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="drawer-section">
          <span>Pantallas</span>
          <div className="drawer-zone-list">
            {ZONES.map((zone) => {
              const current = screenZones[zone.id];
              const hasContent = Boolean(current.videoId || current.resourceUrl);
              return (
                <div className="drawer-zone-card" key={zone.id}>
                  <div className="drawer-zone-title">
                    <div>
                      <strong>{zone.label}</strong>
                      <small>{hasContent ? current.title ?? current.videoId ?? current.resourceUrl : 'Sin contenido'}</small>
                    </div>
                    <div className={hasContent ? 'zone-state is-ready' : 'zone-state'}>
                      {hasContent ? <CheckCircle2 size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
                      <span>{hasContent ? 'Activo' : 'Libre'}</span>
                    </div>
                  </div>

                  <label className="drawer-volume">
                    <span>Volumen {current.volume}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={current.volume}
                      onChange={(event) => onUpdateZone(zone.id, { volume: Number(event.target.value) })}
                    />
                  </label>

                  <div className="drawer-zone-actions">
                    <button type="button" onClick={() => onUpdateZone(zone.id, { muted: !current.muted })}>
                      {current.muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
                      <span>{current.muted ? 'Mute' : 'Audio'}</span>
                    </button>
                    <button type="button" onClick={() => onClearZone(zone.id)}>
                      <Eraser size={17} aria-hidden="true" />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </>
  );
}

function buildBrowserPath(route) {
  if (!route.carreraSlug) return 'estudiemos.local/';
  if (!route.materiaSlug) return `estudiemos.local/pages/carrera/${route.carreraSlug}.html`;
  if (!route.temaSlug) return `estudiemos.local/pages/materia/${route.temaSlug}.html`;
  return `estudiemos.local/pages/tema/${route.temaSlug}.html`;
}

function buildThumbnail(url) {
  const result = parseYouTubeUrl(url);
  if (!result.ok) return '';
  return `https://img.youtube.com/vi/${result.video.videoId}/hqdefault.jpg`;
}