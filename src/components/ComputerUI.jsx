import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eraser,
  Link,
  MonitorUp,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { createScreenContentFromItem, getContentItemsBySource } from '../data/contentSources.js';
import { studySubjects } from '../data/mockStudyContent.js';
import { parseYouTubeUrl } from '../utils/youtube.js';
import { StudyRoomContent } from './StudyOverlay.jsx';

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
    subtitle: 'Biblioteca de estudio',
    description: 'Materias, clases demo y recursos preparados para la sala.',
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

const STUDY_RECOMMENDATIONS = {
  'analisis-matematico-i': 'est-calculus',
  algebra: 'est-static',
  'fisica-i': 'est-static'
};

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
  const [subjectId, setSubjectId] = useState(studySubjects[0].id);
  const [videoId, setVideoId] = useState(studySubjects[0].videos[0].id);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');

  const subject = studySubjects.find((item) => item.id === subjectId) ?? studySubjects[0];
  const video = subject.videos.find((item) => item.id === videoId) ?? subject.videos[0];
  const studyItems = useMemo(() => getContentItemsBySource('estudiemos'), []);
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

  function handleSubjectChange(nextSubjectId) {
    const nextSubject = studySubjects.find((item) => item.id === nextSubjectId) ?? studySubjects[0];
    setSubjectId(nextSubject.id);
    setVideoId(nextSubject.videos[0].id);
    setSelectedContent(null);
  }

  function selectItem(item) {
    setSelectedContent({
      ...createScreenContentFromItem(item),
      title: item.title,
      creator: item.creator,
      description: item.description,
      category: item.category
    });
  }

  function selectCurrentStudyLesson() {
    const recommendedId = STUDY_RECOMMENDATIONS[subject.id] ?? studyItems[0]?.id;
    const item = studyItems.find((entry) => entry.id === recommendedId) ?? studyItems[0];
    if (item) selectItem(item);
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
              subject={subject}
              video={video}
              studyItems={studyItems}
              selectedContent={selectedContent}
              onSubjectChange={handleSubjectChange}
              onVideoChange={(nextVideoId) => {
                setVideoId(nextVideoId);
                setSelectedContent(null);
              }}
              onSelectLesson={selectCurrentStudyLesson}
              onSelectItem={selectItem}
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
  subject,
  video,
  studyItems,
  selectedContent,
  onSubjectChange,
  onVideoChange,
  onSelectLesson,
  onSelectItem,
  onAssignContent,
  onCloseContent
}) {
  return (
    <div className="mediahub-app-shell">
      <section className="mediahub-main-panel">
        <StudyRoomContent
          subject={subject}
          video={video}
          onSubjectChange={onSubjectChange}
          onVideoChange={onVideoChange}
          className="computer-study-grid"
          actions={
            <div className="study-action-row">
              <button type="button" className="mediahub-primary-button" onClick={onSelectLesson}>
                <Play size={17} aria-hidden="true" />
                <span>Preparar en pantalla</span>
              </button>
            </div>
          }
        />
      </section>

      <aside className="mediahub-context-panel">
        <div className="context-section-title">
          <span>Recursos</span>
          <h3>Estudiemos</h3>
        </div>
        <div className="compact-content-list">
          {studyItems.map((item) => (
            <button key={item.id} type="button" className="compact-content-card" onClick={() => onSelectItem(item)}>
              <strong>{item.title}</strong>
              <span>{item.category} - {item.duration}</span>
            </button>
          ))}
        </div>

        <ContentActionPanel
          content={selectedContent}
          emptyText="Selecciona una clase o recurso para ver acciones de pantalla."
          onAssignContent={onAssignContent}
          onClose={onCloseContent}
        />
      </aside>
    </div>
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
              const hasVideo = Boolean(current.videoId);
              return (
                <div className="drawer-zone-card" key={zone.id}>
                  <div className="drawer-zone-title">
                    <div>
                      <strong>{zone.label}</strong>
                      <small>{hasVideo ? current.title ?? current.videoId : 'Sin contenido'}</small>
                    </div>
                    <div className={hasVideo ? 'zone-state is-ready' : 'zone-state'}>
                      {hasVideo ? <CheckCircle2 size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
                      <span>{hasVideo ? 'Activo' : 'Libre'}</span>
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
