import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eraser,
  ExternalLink,
  FileText,
  Link,
  MonitorUp,
  PanelRightOpen,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  Wrench,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

const LAUNCHER_APPS = [
  {
    id: 'estudiemos',
    title: 'Estudiemos',
    subtitle: 'Biblioteca principal',
    description: 'Entrar a la pagina real de recursos y elegir material para estudiar.',
    icon: Sparkles,
    accent: 'primary'
  },
  {
    id: 'links',
    title: 'Links',
    subtitle: 'Carga manual',
    description: 'Pegar un link compatible y enviarlo a una de las pantallas.',
    icon: Link,
    accent: 'secondary'
  }
];

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
  const [activeApp, setActiveApp] = useState('launcher');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [estudiemosRoute, setEstudiemosRoute] = useState(EMPTY_ROUTE);
  const [resourceView, setResourceView] = useState('categories');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');

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

  function openApp(appId) {
    setActiveApp(appId);
    setDrawerOpen(false);
    setSelectedContent(null);
    setResourceView('categories');
    if (appId === 'estudiemos') {
      setEstudiemosRoute(EMPTY_ROUTE);
    }
  }

  function backToLauncher() {
    setActiveApp('launcher');
    setSelectedContent(null);
    setDrawerOpen(false);
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
      description: 'Video preparado desde Links. Elegi donde mostrarlo.',
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
      <div className="computer-window computer-window-wide mediahub-window game-computer-window">
        <div className="computer-boot-glow" aria-hidden="true" />
        <header className="computer-topbar mediahub-topbar game-os-topbar">
          <div className="mediahub-titlebar">
            {activeApp !== 'launcher' && (
              <button type="button" className="mediahub-icon-button" onClick={backToLauncher} aria-label="Volver al inicio">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
            )}
            <div>
              <span>Estudiemos Room OS</span>
              <h1>{activeApp === 'launcher' ? 'Inicio' : getAppTitle(activeApp)}</h1>
            </div>
          </div>

          <div className="mediahub-top-actions">
            {activeApp !== 'launcher' && (
              <button type="button" className="mediahub-ghost-button" onClick={() => setDrawerOpen(true)}>
                <PanelRightOpen size={18} aria-hidden="true" />
                <span>Pantalla</span>
              </button>
            )}
            <button type="button" className="computer-close" onClick={onClose} aria-label="Cerrar computadora">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="computer-desktop mediahub-desktop game-os-desktop">
          {activeApp === 'launcher' && <ComputerLauncher onOpenApp={openApp} />}

          {activeApp === 'estudiemos' && (
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
          )}

          {activeApp === 'links' && (
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
          )}
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

function ComputerLauncher({ onOpenApp }) {
  return (
    <div className="computer-launcher game-launcher" aria-label="Launcher de computadora">
      <div className="launcher-heading game-launcher-heading">
        <span>Sistema listo</span>
        <h2>Elegir espacio de trabajo</h2>
        <p>Dos accesos principales, sin controles tecnicos a la vista.</p>
      </div>

      <div className="launcher-app-grid game-launcher-grid">
        {LAUNCHER_APPS.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              type="button"
              className={`launcher-app-card game-app-card game-app-card-${app.accent}`}
              onClick={() => onOpenApp(app.id)}
            >
              <div className="launcher-app-icon game-app-icon">
                <Icon size={34} aria-hidden="true" />
              </div>
              <div>
                <span>{app.subtitle}</span>
                <strong>{app.title}</strong>
                <p>{app.description}</p>
              </div>
              <ChevronRight size={24} aria-hidden="true" className="game-card-arrow" />
            </button>
          );
        })}
      </div>
    </div>
  );
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
          renderItem={(item, index) => (
            <button key={`${item.url}-${index}`} type="button" className="resource-action-card game-resource-action" onClick={() => onSelectPdf(item)}>
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
          <span>Links</span>
          <h3>Cargar contenido externo</h3>
          <p>El input vive aca para mantener limpio el inicio de la computadora.</p>
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
  if (!route.temaSlug) return `estudiemos.local/pages/materia/${route.materiaSlug}.html`;
  return `estudiemos.local/pages/tema/${route.temaSlug}.html`;
}

function buildThumbnail(url) {
  const result = parseYouTubeUrl(url);
  if (!result.ok) return '';
  return `https://img.youtube.com/vi/${result.video.videoId}/hqdefault.jpg`;
}

function getAppTitle(activeApp) {
  if (activeApp === 'links') return 'Links';
  return 'Estudiemos';
}
