import {
  CheckCircle2,
  Eraser,
  History,
  Link,
  MonitorUp,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { createVideoFromLibraryItem, studyPresets, videoLibrary } from '../data/videoLibrary.js';
import { parseYouTubeUrl } from '../utils/youtube.js';

const ZONES = [
  {
    id: 'upper',
    label: 'Pantalla superior',
    ratio: '70%',
    description: 'Contenido principal de la sala'
  },
  {
    id: 'lower',
    label: 'Pantalla inferior',
    ratio: '30%',
    description: 'Apoyo, playlist o referencia secundaria'
  }
];

const TABS = [
  { id: 'library', label: 'Biblioteca', icon: Search },
  { id: 'presets', label: 'Presets', icon: Sparkles },
  { id: 'advanced', label: 'Link avanzado', icon: Link }
];

export function ComputerUI({ onClose, screenZones, onAssignVideo, onClearZone, onUpdateZone }) {
  const [activeTab, setActiveTab] = useState('library');
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState({ upper: '', lower: '' });
  const [errors, setErrors] = useState({ upper: '', lower: '' });
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState(['math-visual-thinking', 'focus-music']);

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return videoLibrary;

    return videoLibrary.filter((item) =>
      [item.title, item.creator, item.category, item.preset, item.description]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query]);

  function rememberVideo(video) {
    setHistory((current) => {
      const next = [video, ...current.filter((item) => item.videoId !== video.videoId)];
      return next.slice(0, 6);
    });
  }

  function assignVideo(zoneId, video) {
    onAssignVideo(zoneId, video);
    rememberVideo(video);
  }

  function assignLibraryItem(zoneId, item) {
    assignVideo(zoneId, createVideoFromLibraryItem(item));
  }

  function applyPreset(preset) {
    const upperItem = videoLibrary.find((item) => item.videoId === preset.upperVideoId);
    const lowerItem = videoLibrary.find((item) => item.videoId === preset.lowerVideoId);
    if (upperItem) assignVideo('upper', createVideoFromLibraryItem(upperItem));
    if (lowerItem) assignVideo('lower', createVideoFromLibraryItem(lowerItem));
  }

  function toggleFavorite(itemId) {
    setFavorites((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
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

    assignVideo(zoneId, {
      ...result.video,
      title: 'YouTube externo',
      creator: 'Link manual'
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
      <div className="computer-window">
        <header className="computer-topbar">
          <div>
            <span>Casa 1 Control Console</span>
            <h1>Centro audiovisual</h1>
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
                <strong>Pantalla 70/30</strong>
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

            <div className="computer-tab-list" aria-label="Secciones de contenido">
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

            <p>
              Elegi contenido desde la biblioteca y mandalo a una zona sin salir de Estudiemos Room. Los links quedan como herramienta avanzada.
            </p>
          </aside>

          <main className="computer-app computer-control-app">
            <div className="app-title">
              <span>Consola de contenido</span>
              <h2>Seleccionar videos</h2>
              <p>
                Busca, guarda favoritos, usa presets y asigna contenido a la pantalla superior o inferior con controles claros.
              </p>
            </div>

            <div className="content-control-grid">
              <section className="content-browser" aria-label="Selector de contenido">
                {activeTab === 'library' && (
                  <>
                    <div className="content-search">
                      <Search size={18} aria-hidden="true" />
                      <input
                        type="search"
                        placeholder="Buscar por tema, canal o tipo de sesion"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>

                    <div className="content-section-title">
                      <h3>Videos recomendados</h3>
                      <span>{filteredVideos.length} disponibles</span>
                    </div>

                    <div className="video-library-list">
                      {filteredVideos.map((item) => (
                        <VideoLibraryCard
                          key={item.id}
                          item={item}
                          isFavorite={favorites.includes(item.id)}
                          onToggleFavorite={() => toggleFavorite(item.id)}
                          onAssignUpper={() => assignLibraryItem('upper', item)}
                          onAssignLower={() => assignLibraryItem('lower', item)}
                        />
                      ))}
                    </div>

                    {history.length > 0 && (
                      <div className="history-strip" aria-label="Historial de videos usados">
                        <div className="content-section-title">
                          <h3>Historial</h3>
                          <span>Sesion actual</span>
                        </div>
                        <div className="history-list">
                          {history.map((item) => (
                            <button key={item.videoId} type="button" onClick={() => assignVideo('upper', item)}>
                              <History size={15} aria-hidden="true" />
                              <span>{item.title ?? item.videoId}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'presets' && (
                  <div className="preset-grid">
                    {studyPresets.map((preset) => (
                      <article className="preset-card" key={preset.id}>
                        <div>
                          <span>Preset de estudio</span>
                          <h3>{preset.name}</h3>
                          <p>{preset.description}</p>
                        </div>
                        <button type="button" className="video-app-action" onClick={() => applyPreset(preset)}>
                          Aplicar preset
                        </button>
                      </article>
                    ))}
                  </div>
                )}

                {activeTab === 'advanced' && (
                  <div className="advanced-link-panel">
                    <div className="content-section-title">
                      <h3>Link manual</h3>
                      <span>Opcion avanzada</span>
                    </div>
                    <p>
                      Usalo cuando el video no este en la biblioteca local. Se aceptan links watch, youtu.be y embed.
                    </p>
                    <div className="manual-zone-grid">
                      {ZONES.map((zone) => (
                        <form className="manual-zone-card" key={zone.id} onSubmit={(event) => onManualSubmit(event, zone.id)}>
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
                              onChange={(event) => updateDraft(zone.id, event.target.value)}
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
                )}
              </section>

              <section className="screen-zone-sidebar" aria-label="Pantallas activas">
                {ZONES.map((zone) => {
                  const current = screenZones[zone.id];
                  const hasVideo = Boolean(current.videoId);

                  return (
                    <div className="screen-zone-card" key={zone.id}>
                      <header className="screen-zone-header">
                        <div>
                          <span>{zone.ratio}</span>
                          <h3>{zone.label}</h3>
                          <p>{zone.description}</p>
                        </div>
                        <div className={hasVideo ? 'zone-state is-ready' : 'zone-state'}>
                          {hasVideo ? <CheckCircle2 size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                          <span>{hasVideo ? 'Activo' : 'Libre'}</span>
                        </div>
                      </header>

                      <div className="zone-current-video" aria-live="polite">
                        <span>Video asignado</span>
                        <strong>{hasVideo ? current.title ?? current.videoId : 'Ninguno'}</strong>
                        {hasVideo && <small>{current.creator ? `${current.creator} · ` : ''}{current.videoId}</small>}
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
                          <span>{current.muted ? 'Muted' : 'Audio'}</span>
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
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}

function VideoLibraryCard({ item, isFavorite, onToggleFavorite, onAssignUpper, onAssignLower }) {
  return (
    <article className="video-library-card">
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
        <span>{item.category} · {item.duration}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <small>{item.creator} · {item.preset}</small>
      </div>
      <div className="library-actions">
        <button type="button" onClick={onAssignUpper}>Superior</button>
        <button type="button" onClick={onAssignLower}>Inferior</button>
      </div>
    </article>
  );
}
