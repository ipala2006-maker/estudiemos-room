import {
  BookOpen,
  CheckCircle2,
  Compass,
  Eraser,
  ExternalLink,
  History,
  Link,
  MonitorUp,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
  Youtube
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  contentSources,
  createScreenContentFromItem,
  createYouTubeSearchUrl,
  filterContentItems,
  findContentItem,
  getContentItemsBySource,
  studyPresets
} from '../data/contentSources.js';
import { parseYouTubeUrl } from '../utils/youtube.js';

const ZONES = [
  {
    id: 'upper',
    label: 'Pantalla principal',
    shortLabel: 'Principal',
    ratio: '70%',
    description: 'Contenido central de la sala'
  },
  {
    id: 'lower',
    label: 'Pantalla secundaria',
    shortLabel: 'Secundaria',
    ratio: '30%',
    description: 'Apoyo, ambiente o referencia'
  }
];

const TABS = [
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'manual', label: 'Link manual', icon: Link },
  { id: 'library', label: 'Biblioteca', icon: BookOpen },
  { id: 'estudiemos', label: 'Estudiemos', icon: Sparkles }
];

const SCREEN_LAYOUTS = [
  {
    id: 'single',
    label: '1 video',
    ratio: '100%',
    description: 'Pantalla completa'
  },
  {
    id: 'split-70-30',
    label: '70/30',
    ratio: '70 + 30',
    description: 'Principal arriba'
  },
  {
    id: 'split-50-50',
    label: '50/50',
    ratio: '50 + 50',
    description: 'Doble foco'
  },
  {
    id: 'split-30-70',
    label: '30/70',
    ratio: '30 + 70',
    description: 'Secundaria grande'
  }
];

const SOURCE_ICON = {
  youtube: Youtube,
  library: BookOpen,
  estudiemos: Sparkles
};

const SEARCH_SUGGESTIONS = ['calculo', 'programacion', 'ingenieria', 'foco', 'python', 'algebra lineal'];

export function ComputerUI({
  onClose,
  screenZones,
  screenLayout = 'split-70-30',
  onAssignVideo,
  onClearZone,
  onUpdateZone,
  onScreenLayoutChange
}) {
  const [activeTab, setActiveTab] = useState('youtube');
  const [sourceQueries, setSourceQueries] = useState({ youtube: '', library: '', estudiemos: '' });
  const [drafts, setDrafts] = useState({ upper: '', lower: '' });
  const [errors, setErrors] = useState({ upper: '', lower: '' });
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState(['yt-calculus-essence', 'yt-lofi-live']);

  const activeLayout = SCREEN_LAYOUTS.find((layout) => layout.id === screenLayout) ?? SCREEN_LAYOUTS[1];
  const zoneRatios = getZoneRatios(activeLayout.id);
  const activeSource = contentSources.find((source) => source.id === activeTab);
  const activeQuery = sourceQueries[activeTab] ?? '';
  const visibleItems = useMemo(
    () => (activeSource ? filterContentItems(activeSource.id, activeQuery) : []),
    [activeQuery, activeSource]
  );

  function rememberVideo(video) {
    setHistory((current) => {
      const next = [video, ...current.filter((item) => item.videoId !== video.videoId)];
      return next.slice(0, 8);
    });
  }

  function assignContent(zoneId, content) {
    onAssignVideo(zoneId, content);
    rememberVideo(content);
  }

  function assignItem(zoneId, item) {
    assignContent(zoneId, createScreenContentFromItem(item));
  }

  function applyPreset(preset) {
    const upperItem = findContentItem(preset.upperItemId);
    const lowerItem = findContentItem(preset.lowerItemId);
    if (upperItem) assignItem('upper', upperItem);
    if (lowerItem) assignItem('lower', lowerItem);
  }

  function toggleFavorite(itemId) {
    setFavorites((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  }

  function updateSourceQuery(value) {
    setSourceQueries((current) => ({ ...current, [activeTab]: value }));
  }

  function updateDraft(zoneId, value) {
    setDrafts((current) => ({ ...current, [zoneId]: value }));
    setErrors((current) => ({ ...current, [zoneId]: '' }));
  }

  function loadZoneFromLink(zoneId) {
    const result = parseYouTubeUrl(drafts[zoneId]);
    if (!result.ok) {
      setErrors((current) => ({ ...current, [zoneId]: result.error }));
      return;
    }

    assignContent(zoneId, {
      ...result.video,
      title: 'YouTube externo',
      creator: 'Link manual',
      sourceId: 'manual'
    });
    setDrafts((current) => ({ ...current, [zoneId]: '' }));
    setErrors((current) => ({ ...current, [zoneId]: '' }));
  }

  function onManualSubmit(event, zoneId) {
    event.preventDefault();
    loadZoneFromLink(zoneId);
  }

  return (
    <section className="computer-overlay" aria-label="Computadora de Casa 1">
      <div className="computer-window computer-window-wide">
        <header className="computer-topbar">
          <div>
            <span>Casa 1 Control Console</span>
            <h1>Centro de contenido</h1>
          </div>
          <button type="button" className="computer-close" onClick={onClose} aria-label="Cerrar computadora">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="computer-desktop computer-desktop-control">
          <aside className="control-status-panel" aria-label="Estado general">
            <div className="control-status-card">
              <MonitorUp size={28} aria-hidden="true" />
              <div>
                <span>Sistema</span>
                <strong>Pantalla {activeLayout.label}</strong>
              </div>
            </div>

            <div className="screen-layout-panel" aria-label="Modo de pantalla">
              <div className="screen-layout-summary">
                <span>Layout activo</span>
                <strong>{activeLayout.description}</strong>
              </div>
              <div className="screen-layout-buttons">
                {SCREEN_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    className={layout.id === activeLayout.id ? 'is-selected' : ''}
                    onClick={() => onScreenLayoutChange?.(layout.id)}
                    aria-pressed={layout.id === activeLayout.id}
                  >
                    <span>{layout.label}</span>
                    <small>{layout.ratio}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-status-list">
              {ZONES.map((zone) => {
                const current = screenZones[zone.id];
                return (
                  <div className="control-status-row" key={zone.id}>
                    <span>{zone.label}</span>
                    <strong>{current.videoId ? current.title ?? current.videoId : 'Sin video'}</strong>
                  </div>
                );
              })}
            </div>

            <div className="computer-tab-list" aria-label="Fuentes de contenido">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={activeTab === tab.id ? 'is-selected' : ''}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="computer-app computer-control-app">
            <div className="app-title computer-console-title">
              <span>Consola de navegacion</span>
              <h2>{getTabTitle(activeTab)}</h2>
              <p>{getTabDescription(activeTab)}</p>
            </div>

            <div className="content-control-grid">
              <section className="content-browser" aria-label="Selector de contenido">
                {activeTab === 'manual' ? (
                  <ManualLinkPanel
                    drafts={drafts}
                    errors={errors}
                    onDraftChange={updateDraft}
                    onSubmit={onManualSubmit}
                  />
                ) : (
                  <SourcePanel
                    source={activeSource}
                    query={activeQuery}
                    items={visibleItems}
                    favorites={favorites}
                    history={history}
                    onQueryChange={updateSourceQuery}
                    onSuggestion={(suggestion) => updateSourceQuery(suggestion)}
                    onAssignItem={assignItem}
                    onToggleFavorite={toggleFavorite}
                    onAssignHistory={assignContent}
                    onApplyPreset={applyPreset}
                  />
                )}
              </section>

              <ScreenControlSidebar
                screenZones={screenZones}
                zoneRatios={zoneRatios}
                onClearZone={onClearZone}
                onUpdateZone={onUpdateZone}
              />
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}

function SourcePanel({
  source,
  query,
  items,
  favorites,
  history,
  onQueryChange,
  onSuggestion,
  onAssignItem,
  onToggleFavorite,
  onAssignHistory,
  onApplyPreset
}) {
  const SourceIcon = SOURCE_ICON[source?.id] ?? Compass;
  const sourceCount = getContentItemsBySource(source.id).length;

  return (
    <>
      <div className="source-hero-panel">
        <div className="source-hero-icon">
          <SourceIcon size={26} aria-hidden="true" />
        </div>
        <div>
          <span>{source.name}</span>
          <h3>{source.description}</h3>
        </div>
      </div>

      {source.id === 'youtube' && <YouTubeSearchNotice query={query} />}
      {source.id === 'estudiemos' && <EstudiemosNotice />}

      <div className="content-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder={source.id === 'youtube' ? 'Buscar tema, canal o tipo de sesion' : 'Filtrar biblioteca'}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      {source.id === 'youtube' && (
        <div className="search-suggestion-row" aria-label="Sugerencias de busqueda">
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => onSuggestion(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {source.id === 'library' && (
        <div className="preset-grid compact-preset-grid">
          {studyPresets.map((preset) => (
            <article className="preset-card" key={preset.id}>
              <div>
                <span>Preset de estudio</span>
                <h3>{preset.name}</h3>
                <p>{preset.description}</p>
              </div>
              <button type="button" className="video-app-action" onClick={() => onApplyPreset(preset)}>
                Aplicar preset
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="content-section-title">
        <h3>{source.id === 'youtube' ? 'Resultados disponibles' : 'Contenido disponible'}</h3>
        <span>{items.length} de {sourceCount}</span>
      </div>

      <div className="video-library-list">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            isFavorite={favorites.includes(item.id)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
            onAssignUpper={() => onAssignItem('upper', item)}
            onAssignLower={() => onAssignItem('lower', item)}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-source-state">
          <Search size={22} aria-hidden="true" />
          <strong>No hay resultados en el catalogo local</strong>
          <span>Proba otra busqueda o usa Link manual si ya tenes un video concreto.</span>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-strip" aria-label="Historial de videos usados">
          <div className="content-section-title">
            <h3>Historial</h3>
            <span>Sesion actual</span>
          </div>
          <div className="history-list">
            {history.map((item) => (
              <button key={item.videoId} type="button" onClick={() => onAssignHistory('upper', item)}>
                <History size={15} aria-hidden="true" />
                <span>{item.title ?? item.videoId}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function YouTubeSearchNotice({ query }) {
  const hasQuery = Boolean(query.trim());
  const searchUrl = hasQuery ? createYouTubeSearchUrl(query) : '';

  return (
    <div className="youtube-mode-panel">
      <div>
        <span>Modo gratuito</span>
        <strong>Busqueda local preparada para API real</strong>
        <p>
          YouTube ya no permite embeber resultados de busqueda sin Data API. Esta consola usa un catalogo curado y mantiene la arquitectura lista para conectar busqueda real si despues hay backend/API.
        </p>
      </div>
      <a
        className={hasQuery ? 'youtube-search-link' : 'youtube-search-link is-disabled'}
        href={hasQuery ? searchUrl : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!hasQuery}
      >
        <ExternalLink size={16} aria-hidden="true" />
        Buscar afuera
      </a>
    </div>
  );
}

function EstudiemosNotice() {
  return (
    <div className="estudiemos-placeholder-panel">
      <Sparkles size={22} aria-hidden="true" />
      <div>
        <span>Estudiemos Room Library</span>
        <strong>Proximamente: biblioteca de videos, materias y recursos de ingenieria.</strong>
        <p>Estas tarjetas son demos visuales preparadas para que una plataforma educativa propia pueda conectarse sin cambiar la consola.</p>
      </div>
    </div>
  );
}

function ManualLinkPanel({ drafts, errors, onDraftChange, onSubmit }) {
  return (
    <div className="advanced-link-panel">
      <div className="content-section-title">
        <h3>Link manual</h3>
        <span>Opcion avanzada</span>
      </div>
      <p>
        Para casos puntuales: pega un link de YouTube y mandalo directo a una pantalla. Acepta watch, youtu.be y embed.
      </p>
      <div className="manual-zone-grid">
        {ZONES.map((zone) => (
          <form className="manual-zone-card" key={zone.id} onSubmit={(event) => onSubmit(event, zone.id)}>
            <label className="youtube-input-label" htmlFor={`${zone.id}-youtube-url`}>
              {zone.label}
            </label>
            <div className="youtube-input-row">
              <input
                id={`${zone.id}-youtube-url`}
                type="text"
                inputMode="url"
                placeholder="youtube.com/watch?v=..."
                value={drafts[zone.id]}
                onChange={(event) => onDraftChange(zone.id, event.target.value)}
              />
              <button type="submit" className="video-app-action">
                Cargar
              </button>
            </div>
            {errors[zone.id] && <p className="screen-zone-error">{errors[zone.id]}</p>}
          </form>
        ))}
      </div>
    </div>
  );
}

function ContentCard({ item, isFavorite, onToggleFavorite, onAssignUpper, onAssignLower }) {
  return (
    <article className="video-library-card content-card">
      <button
        type="button"
        className={isFavorite ? 'favorite-button is-active' : 'favorite-button'}
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Star size={16} aria-hidden="true" />
      </button>
      <div className="video-library-thumb">
        <MonitorUp size={24} aria-hidden="true" />
      </div>
      <div className="video-library-copy">
        <span>{item.category} - {item.duration}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <small>{item.creator} - {item.preset}</small>
      </div>
      <div className="library-actions">
        <button type="button" onClick={onAssignUpper}>Enviar a principal</button>
        <button type="button" onClick={onAssignLower}>Enviar a secundaria</button>
      </div>
    </article>
  );
}

function ScreenControlSidebar({ screenZones, zoneRatios, onClearZone, onUpdateZone }) {
  return (
    <section className="screen-zone-sidebar" aria-label="Pantallas activas">
      {ZONES.map((zone) => {
        const current = screenZones[zone.id];
        const hasVideo = Boolean(current.videoId);

        return (
          <div className="screen-zone-card" key={zone.id}>
            <header className="screen-zone-header">
              <div>
                <span>{zoneRatios[zone.id] ?? zone.ratio}</span>
                <h3>{zone.label}</h3>
                <p>{zone.description}</p>
              </div>
              <div className={hasVideo ? 'zone-state is-ready' : 'zone-state'}>
                {hasVideo ? <CheckCircle2 size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                <span>{hasVideo ? 'Activo' : 'Libre'}</span>
              </div>
            </header>

            <div className="zone-current-video" aria-live="polite">
              <span>Reproduciendo ahora</span>
              <strong>{hasVideo ? current.title ?? current.videoId : 'Ninguno'}</strong>
              {hasVideo && <small>{current.creator ? `${current.creator} - ` : ''}{current.videoId}</small>}
            </div>

            <div className="zone-controls" aria-label={`Controles de ${zone.label}`}>
              <label>
                <span>Volumen</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={current.volume}
                  onChange={(event) => onUpdateZone(zone.id, { volume: Number(event.target.value) })}
                />
                <strong>{current.volume}%</strong>
              </label>
              <button
                type="button"
                className="zone-icon-button"
                onClick={() => onUpdateZone(zone.id, { muted: !current.muted })}
                aria-pressed={current.muted}
              >
                {current.muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
                <span>{current.muted ? 'Mute' : 'Audio'}</span>
              </button>
              <button type="button" className="zone-icon-button" onClick={() => onClearZone(zone.id)}>
                <Eraser size={18} aria-hidden="true" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function getTabTitle(activeTab) {
  if (activeTab === 'manual') return 'Pegar link avanzado';
  if (activeTab === 'library') return 'Biblioteca de sala';
  if (activeTab === 'estudiemos') return 'Estudiemos Room Library';
  return 'Explorar YouTube';
}

function getTabDescription(activeTab) {
  if (activeTab === 'manual') return 'Carga un video concreto cuando ya tenes el link.';
  if (activeTab === 'library') return 'Usa presets y demos locales para armar una sesion rapidamente.';
  if (activeTab === 'estudiemos') return 'Espacio preparado para contenido educativo propio de Estudiemos.';
  return 'Busca dentro del catalogo curado y manda contenido a la pantalla principal o secundaria.';
}

function getZoneRatios(screenLayout) {
  if (screenLayout === 'single') return { upper: '100%', lower: 'Oculta' };
  if (screenLayout === 'split-50-50') return { upper: '50%', lower: '50%' };
  if (screenLayout === 'split-30-70') return { upper: '30%', lower: '70%' };
  return { upper: '70%', lower: '30%' };
}
