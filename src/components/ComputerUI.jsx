import {
  ArrowLeft,
  CheckCircle2,
  Eraser,
  ExternalLink,
  FileText,
  Link,
  MonitorUp,
  Settings,
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
    subtitle: 'Ingenieria Recursos',
    description: 'La pagina real de recursos de ingenieria conectada a la sala.',
    icon: Sparkles
  },
  {
    id: 'links',
    title: 'Links',
    subtitle: 'Contenido externo',
    description: 'Pega un link compatible y envialo a la pantalla.',
    icon: Link
  }
];

const carrera = ingenieriaRecursosData.carreras[0];

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
  const [materiaSlug, setMateriaSlug] = useState(carrera.materias[0].slug);
  const [temaSlug, setTemaSlug] = useState(carrera.materias[0].temas[0].slug);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');

  const materia = useMemo(
    () => carrera.materias.find((item) => item.slug === materiaSlug) ?? carrera.materias[0],
    [materiaSlug]
  );
  const tema = useMemo(
    () => materia.temas.find((item) => item.slug === temaSlug) ?? materia.temas[0],
    [materia, temaSlug]
  );
  const activeLayout = SCREEN_LAYOUTS.find((layout) => layout.id === screenLayout) ?? SCREEN_LAYOUTS[1];

  function openApp(appId) {
    setActiveApp(appId);
    setSelectedContent(null);
    setDrawerOpen(false);
  }

  function backToLauncher() {
    setActiveApp('launcher');
    setSelectedContent(null);
    setDrawerOpen(false);
  }

  function changeMateria(nextMateriaSlug) {
    const nextMateria = carrera.materias.find((item) => item.slug === nextMateriaSlug) ?? carrera.materias[0];
    setMateriaSlug(nextMateria.slug);
    setTemaSlug(nextMateria.temas[0].slug);
    setSelectedContent(null);
  }

  function changeTema(nextTemaSlug) {
    setTemaSlug(nextTemaSlug);
    setSelectedContent(null);
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
    <section className="computer-overlay" aria-label="Computadora de Casa 1">
      <div className="computer-window computer-window-wide mediahub-window">
        <header className="computer-topbar mediahub-topbar">
          <div className="mediahub-titlebar">
            {activeApp !== 'launcher' && (
              <button type="button" className="mediahub-icon-button" onClick={backToLauncher} aria-label="Volver al launcher">
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
                <Settings size={18} aria-hidden="true" />
                <span>Pantalla</span>
              </button>
            )}
            <button type="button" className="computer-close" onClick={onClose} aria-label="Cerrar computadora">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="computer-desktop mediahub-desktop">
          {activeApp === 'launcher' && <ComputerLauncher onOpenApp={openApp} />}

          {activeApp === 'estudiemos' && (
            <EstudiemosApp
              materia={materia}
              tema={tema}
              selectedContent={selectedContent}
              onMateriaChange={changeMateria}
              onTemaChange={changeTema}
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
    <div className="computer-launcher" aria-label="Launcher de computadora">
      <div className="launcher-heading">
        <span>Launcher</span>
        <h2>Elegir app</h2>
      </div>

      <div className="launcher-app-grid">
        {LAUNCHER_APPS.map((app) => {
          const Icon = app.icon;
          return (
            <button key={app.id} type="button" className="launcher-app-card" onClick={() => onOpenApp(app.id)}>
              <div className="launcher-app-icon">
                <Icon size={34} aria-hidden="true" />
              </div>
              <div>
                <span>{app.subtitle}</span>
                <strong>{app.title}</strong>
                <p>{app.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EstudiemosApp({
  materia,
  tema,
  selectedContent,
  onMateriaChange,
  onTemaChange,
  onSelectVideo,
  onSelectPdf,
  onAssignContent,
  onCloseContent
}) {
  return (
    <div className="mediahub-app-shell estudiemos-resource-shell">
      <section className="mediahub-main-panel recursos-main-panel">
        <div className="context-section-title">
          <span>{ingenieriaRecursosSource.repository}</span>
          <h3>{carrera.title}</h3>
          <p>{carrera.description}</p>
        </div>

        <div className="resource-browser-grid">
          <section className="resource-column">
            <span>Materias</span>
            {carrera.materias.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={item.slug === materia.slug ? 'resource-nav-card is-selected' : 'resource-nav-card'}
                onClick={() => onMateriaChange(item.slug)}
              >
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </section>

          <section className="resource-column">
            <span>Temas</span>
            {materia.temas.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={item.slug === tema.slug ? 'resource-nav-card is-selected' : 'resource-nav-card'}
                onClick={() => onTemaChange(item.slug)}
              >
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </button>
            ))}
          </section>
        </div>

        <ResourceSection
          title="Videos"
          emptyText="Este tema todavia no tiene videos cargados en ingenieria-recursos."
          items={tema.videos}
          icon={Video}
          onSelect={onSelectVideo}
        />

        <ResourceSection
          title="PDFs"
          emptyText="Este tema todavia no tiene PDFs cargados en ingenieria-recursos."
          items={tema.pdfs}
          icon={FileText}
          onSelect={onSelectPdf}
        />

        <ToolSection tools={tema.herramientas} />
      </section>

      <aside className="mediahub-context-panel">
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

function ResourceSection({ title, emptyText, items = [], icon: Icon, onSelect }) {
  return (
    <section className="resource-content-section">
      <div className="content-section-title">
        <h3>{title}</h3>
        <span>{items.length} disponibles</span>
      </div>
      {items.length > 0 ? (
        <div className="resource-card-list">
          {items.map((item, index) => (
            <button key={`${item.title}-${index}`} type="button" className="resource-action-card" onClick={() => onSelect(item, index)}>
              <Icon size={20} aria-hidden="true" />
              <div>
                <strong>{item.title ?? `${title} ${index + 1}`}</strong>
                <span>{title === 'PDFs' ? 'Material de lectura' : 'Video de clase'}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="resource-empty-note">{emptyText}</p>
      )}
    </section>
  );
}

function ToolSection({ tools = [] }) {
  return (
    <section className="resource-content-section">
      <div className="content-section-title">
        <h3>Herramientas</h3>
        <span>{tools.length} disponibles</span>
      </div>
      {tools.length > 0 ? (
        <div className="resource-card-list">
          {tools.map((tool) => (
            <a key={tool.url} className="resource-action-card" href={tool.url} target="_blank" rel="noreferrer">
              <Wrench size={20} aria-hidden="true" />
              <div>
                <strong>{tool.title}</strong>
                <span>{tool.type}</span>
              </div>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : (
        <p className="resource-empty-note">Este tema todavia no tiene herramientas cargadas.</p>
      )}
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
    <div className="mediahub-app-shell links-app-shell">
      <section className="links-card-panel">
        <div className="context-section-title">
          <span>Links</span>
          <h3>Cargar contenido externo</h3>
          <p>Pega un link de YouTube compatible. El sistema lo valida antes de mostrar acciones.</p>
        </div>

        <form className="links-input-card" onSubmit={onPrepareLink}>
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

        <div className="links-format-note">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Compatibles: youtube.com/watch, youtu.be y youtube.com/embed.</span>
        </div>
      </section>

      <aside className="mediahub-context-panel">
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
      <div className="content-action-panel is-empty">
        <MonitorUp size={28} aria-hidden="true" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="content-action-panel">
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
      <aside className="screen-control-drawer" aria-label="Controles de pantalla">
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

function getAppTitle(activeApp) {
  if (activeApp === 'links') return 'Links';
  return 'Estudiemos';
}
