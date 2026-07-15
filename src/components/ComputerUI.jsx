import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Clock3,
  Coins,
  Eraser,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Maximize2,
  Minimize2,
  MonitorUp,
  Music2,
  PanelRightOpen,
  Pause,
  PawPrint,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DachshundMascot } from './DachshundMascot.jsx';
import {
  DACHSHUND_SKINS,
  FOCUS_REWARD_CONFIG,
  SKIN_COST_TABLE,
  SKIN_RANKS,
  estimateValidMsForCoins,
  formatFocusDuration,
  getEquippedSkinState,
  getPurchaseCost,
  getRemainingCostToMax,
  getSkinCostPlan,
  getSkinRank,
  getUpgradeCost,
  isSkinPurchased
} from '../data/focusEconomy.js';
import { createStudyAgendaItems, studyAgendaItems } from '../data/studyAgenda.js';
import { ingenieriaRecursosData, ingenieriaRecursosSource } from '../data/ingenieriaRecursos.js';
import { parseSpotifyUrl } from '../utils/spotify.js';
import { parseYouTubeUrl } from '../utils/youtube.js';

const ZONES = [
  {
    id: 'upper',
    label: 'Pantalla izquierda',
    description: 'Contenido principal de la sala'
  },
  {
    id: 'lower',
    label: 'Pantalla derecha',
    description: 'Apoyo, ambiente o referencia'
  }
];

const SCREEN_LAYOUTS = [
  { id: 'side-by-side', label: '2 x 16:9', description: 'Dos videos lado a lado' },
  { id: 'single', label: '100%', description: 'Una pantalla' },
  { id: 'split-50-50', label: '50/50', description: 'Doble foco' },
  { id: 'split-70-30', label: '70/30', description: 'Principal arriba' },
  { id: 'split-30-70', label: '30/70', description: 'Secundaria grande' }
];

function zoneHasContent(zone) {
  return Boolean(zone?.videoId || zone?.resourceUrl);
}

function canUseScreenAudioControls(zone) {
  return !zoneHasContent(zone) || zone?.contentType === 'youtube';
}

function getAudioToggleLabel(zone) {
  return zone?.muted ? 'Activar audio' : 'Silenciar';
}

function getAudioControlHint(zone) {
  if (zone?.contentType === 'spotify' && zoneHasContent(zone)) {
    return 'Spotify se escucha y se controla desde su reproductor embebido.';
  }

  if (zoneHasContent(zone) && zone?.contentType !== 'youtube') {
    return 'Este contenido no tiene controles de audio externos.';
  }

  return '';
}

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
    id: 'agenda',
    title: 'Agenda',
    subtitle: 'Plan semanal',
    description: 'Bloques de estudio sincronizados con el cartel de la sala.',
    icon: CalendarDays,
    state: 'Listo',
    functional: true
  },
  {
    id: 'spotify',
    title: 'Spotify',
    subtitle: 'Musica de fondo',
    description: 'Reproductor embebido para canciones, playlists, albumes y podcasts.',
    icon: Music2,
    state: 'Listo',
    functional: true
  },
  {
    id: 'focus',
    title: 'Perfil',
    subtitle: 'Monedas y skins',
    description: 'Mascota, Monedas de Enfoque y tienda de skins evolutivas.',
    icon: PawPrint,
    state: 'Listo',
    functional: true
  },
  {
    id: 'settings',
    title: 'Configuracion',
    subtitle: 'Sistema',
    description: 'Preferencias del escritorio, pantallas y comodidad visual.',
    icon: Settings,
    state: 'Listo',
    functional: true
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

const COMPUTER_SETTINGS_STORAGE_KEY = 'estudiemos-room-computer-settings';
const SPOTIFY_STORAGE_KEY = 'estudiemos-room-spotify-content';
const DEFAULT_COMPUTER_SETTINGS = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  focusMode: true
};
const TEXT_ENTRY_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week'
]);

const carreraInicial = ingenieriaRecursosData.carreras[0];

function getTodayDateValue() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function parseAgendaDate(value) {
  const [year, month, day] = String(value ?? getTodayDateValue())
    .split('-')
    .map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

function getDateValue(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString().slice(0, 10);
}

function getRoundedAgendaTime(date = new Date()) {
  const normalizedDate = new Date(date);
  normalizedDate.setMinutes(Math.ceil(normalizedDate.getMinutes() / 30) * 30, 0, 0);
  if (normalizedDate.getMinutes() === 60) {
    normalizedDate.setHours(normalizedDate.getHours() + 1, 0, 0, 0);
  }

  return normalizedDate.toTimeString().slice(0, 5);
}

function addAgendaMinutes(timeValue, minutes) {
  const [hours, minutesValue] = String(timeValue ?? '09:00').split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutesValue) ? minutesValue : 0, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toTimeString().slice(0, 5);
}

function getNextAgendaTime(items, dateValue) {
  const dayItems = sortAgendaItems(items).filter((item) => item.date === dateValue && item.time);
  const lastTime = dayItems.at(-1)?.time;
  return lastTime ? addAgendaMinutes(lastTime, 60) : getRoundedAgendaTime();
}

function getAgendaDisplayTitle(item) {
  return String(item?.title ?? '').trim() || 'Bloque sin titulo';
}

function getAgendaDisplayDetail(item) {
  return String(item?.detail ?? '').trim() || 'Sin detalle cargado';
}

function sortAgendaItems(items) {
  return [...items].sort((a, b) => `${a.date ?? ''} ${a.time ?? ''}`.localeCompare(`${b.date ?? ''} ${b.time ?? ''}`));
}

function loadComputerSettings() {
  if (typeof window === 'undefined') return DEFAULT_COMPUTER_SETTINGS;

  try {
    const savedSettings = JSON.parse(window.localStorage.getItem(COMPUTER_SETTINGS_STORAGE_KEY) ?? '{}');
    return { ...DEFAULT_COMPUTER_SETTINGS, ...savedSettings };
  } catch {
    return DEFAULT_COMPUTER_SETTINGS;
  }
}

function loadStoredSpotifyContent() {
  if (typeof window === 'undefined') return null;

  try {
    const savedContent = JSON.parse(window.localStorage.getItem(SPOTIFY_STORAGE_KEY) ?? 'null');
    return savedContent?.embedUrl && savedContent?.id ? savedContent : null;
  } catch {
    return null;
  }
}

function isTextEntryElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable)) return true;
  if (tagName !== 'input') return false;

  const inputType = String(element.getAttribute?.('type') || element.type || 'text').toLowerCase();
  return TEXT_ENTRY_INPUT_TYPES.has(inputType);
}

function isKeyboardActionElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'button' || tagName === 'a' || element?.role === 'button';
}

function findEnterDefault(scope) {
  return scope?.querySelector?.(
    '[data-enter-default]:not(:disabled), button[type="submit"]:not(:disabled), .is-primary:not(:disabled), .mediahub-primary-button:not(:disabled)'
  );
}

function scrollPanelBy(targetRef, left, top) {
  targetRef.current?.scrollBy({
    left,
    top,
    behavior: 'smooth'
  });
}

function scrollElementBy(element, left, top) {
  element?.scrollBy?.({
    left,
    top,
    behavior: 'smooth'
  });
}

function getArrowScrollDelta(key) {
  if (key === 'ArrowUp') return [0, -260];
  if (key === 'ArrowDown') return [0, 260];
  if (key === 'ArrowLeft') return [-260, 0];
  if (key === 'ArrowRight') return [260, 0];
  return null;
}

function canScrollElement(element, left, top) {
  if (!element || element === document || element === window) return false;
  const style = window.getComputedStyle(element);
  const overflowX = `${style.overflowX} ${style.overflow}`;
  const overflowY = `${style.overflowY} ${style.overflow}`;
  const canScrollX = left !== 0 && element.scrollWidth > element.clientWidth + 2 && /(auto|scroll|overlay)/.test(overflowX);
  const canScrollY = top !== 0 && element.scrollHeight > element.clientHeight + 2 && /(auto|scroll|overlay)/.test(overflowY);
  return canScrollX || canScrollY;
}

function findScrollableFromElement(element, boundary, left, top) {
  let current = element;
  while (current && current !== document.body && current !== boundary?.parentElement) {
    if (boundary && !boundary.contains(current)) return null;
    if (canScrollElement(current, left, top)) return current;
    current = current.parentElement;
  }
  return null;
}

function findKeyboardScrollTarget(scope, left, top) {
  if (!scope) return null;

  const activeCandidate = findScrollableFromElement(document.activeElement, scope, left, top);
  if (activeCandidate) return activeCandidate;

  const preferredSelectors = [
    '.estudiemos-real-page',
    '.estudiemos-container',
    '.mediahub-context-panel',
    '.links-card-panel',
    '.settings-app-shell',
    '.focus-profile-app',
    '.agenda-app-shell',
    '.spotify-app-shell',
    '.screen-control-drawer',
    '.os-window-content'
  ];
  for (const selector of preferredSelectors) {
    const candidate = scope.matches?.(selector) ? scope : scope.querySelector?.(selector);
    if (canScrollElement(candidate, left, top)) return candidate;
  }

  const candidates = [scope, ...(scope.querySelectorAll?.('*') ?? [])];
  return candidates.find((candidate) => canScrollElement(candidate, left, top)) ?? null;
}

function handlePanelArrowKey(event, targetRef) {
  const delta = getArrowScrollDelta(event.key);
  if (!delta || isTextEntryElement(event.target)) return;

  event.preventDefault();
  scrollPanelBy(targetRef, delta[0], delta[1]);
}

function useArrowKeyScroll(active, targetRef) {
  useEffect(() => {
    if (!active) return undefined;

    function onKeyDown(event) {
      handlePanelArrowKey(event, targetRef);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, targetRef]);
}

export function ComputerUI({
  onClose,
  onBackToDesktop,
  screenZones,
  screenLayout = 'side-by-side',
  initialApp = 'estudiemos',
  onAssignVideo,
  onClearZone,
  onUpdateZone,
  onScreenLayoutChange,
  onScreenCommand = () => {},
  agendaItems = studyAgendaItems,
  onAgendaItemsChange = () => {},
  focusEconomy
}) {
  const normalizedInitialApp = FUNCTIONAL_APP_IDS.includes(initialApp) ? initialApp : 'estudiemos';
  const [openWindows, setOpenWindows] = useState([normalizedInitialApp]);
  const [focusedWindow, setFocusedWindow] = useState(normalizedInitialApp);
  const [minimizedWindows, setMinimizedWindows] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedContentOrigin, setSelectedContentOrigin] = useState('');
  const [estudiemosRoute, setEstudiemosRoute] = useState(EMPTY_ROUTE);
  const [resourceView, setResourceView] = useState('categories');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [clockTime, setClockTime] = useState(() => new Date());
  const [systemNote, setSystemNote] = useState('Sesion enfocada lista');
  const [actionFeedback, setActionFeedback] = useState('');
  const [computerSettings, setComputerSettings] = useState(loadComputerSettings);
  const [spotifyDraft, setSpotifyDraft] = useState('');
  const [spotifyError, setSpotifyError] = useState('');
  const [spotifyContent, setSpotifyContent] = useState(loadStoredSpotifyContent);
  const computerRootRef = useRef(null);
  const feedbackTimerRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => window.clearTimeout(feedbackTimerRef.current), []);

  useEffect(() => {
    window.localStorage.setItem(COMPUTER_SETTINGS_STORAGE_KEY, JSON.stringify(computerSettings));
  }, [computerSettings]);

  useEffect(() => {
    if (spotifyContent) {
      window.localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify(spotifyContent));
      return;
    }

    window.localStorage.removeItem(SPOTIFY_STORAGE_KEY);
  }, [spotifyContent]);

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
  const activeLayout = SCREEN_LAYOUTS.find((layout) => layout.id === screenLayout) ?? SCREEN_LAYOUTS[0];
  const visibleWindows = openWindows.filter((appId) => !minimizedWindows.includes(appId));
  const taskbarAppIds = FUNCTIONAL_APP_IDS;
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
  const sortedAgendaItems = useMemo(() => sortAgendaItems(agendaItems), [agendaItems]);
  const agendaLead = sortedAgendaItems.find((item) => !item.completed) ?? sortedAgendaItems[0] ?? null;
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);

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

  function goBackInEstudiemos() {
    if (selectedContent && selectedContentOrigin === 'estudiemos') {
      clearSelectedContent('estudiemos');
      setSystemNote('Acciones de contenido cerradas');
      return true;
    }

    if (resourceView !== 'categories') {
      setResourceView('categories');
      setSystemNote('Categorias de recursos');
      return true;
    }

    if (estudiemosRoute.temaSlug) {
      setEstudiemosRoute({ carreraSlug: carrera.slug, materiaSlug: materia.slug, temaSlug: '' });
      setSystemNote('Volviste a la materia');
      return true;
    }

    if (estudiemosRoute.materiaSlug) {
      setEstudiemosRoute({ carreraSlug: carrera.slug, materiaSlug: '', temaSlug: '' });
      setSystemNote('Volviste a la carrera');
      return true;
    }

    if (estudiemosRoute.carreraSlug) {
      openEstudiemosHome();
      setSystemNote('Inicio de Estudiemos');
      return true;
    }

    return false;
  }

  function goBackOneInstance() {
    if (drawerOpen) {
      setDrawerOpen(false);
      setSystemNote('Panel de pantallas cerrado');
      return true;
    }

    if (focusedWindow === 'estudiemos' && goBackInEstudiemos()) return true;

    if (focusedWindow === 'estudiemos') {
      returnToComputerDesktop();
      return true;
    }

    if (focusedWindow === 'links' && selectedContent && selectedContentOrigin === 'links') {
      clearSelectedContent('links');
      setSystemNote('Acciones de link cerradas');
      return true;
    }

    if (focusedWindow === 'links' && linkError) {
      setLinkError('');
      setSystemNote('Error de link descartado');
      return true;
    }

    if (focusedWindow === 'spotify' && spotifyError) {
      setSpotifyError('');
      setSystemNote('Error de Spotify descartado');
      return true;
    }

    if (focusedWindow === 'spotify' && spotifyDraft.trim()) {
      setSpotifyDraft('');
      setSystemNote('Link de Spotify descartado');
      return true;
    }

    returnToComputerDesktop();
    return true;
  }

  function returnToComputerDesktop() {
    setDrawerOpen(false);
    setOpenWindows((current) => (current.length > 0 ? current : [normalizedInitialApp]));
    setMinimizedWindows([]);
    setFocusedWindow((current) => current || normalizedInitialApp);
    setSystemNote('Inicio de la computadora');
    onBackToDesktop?.();
  }

  function shouldKeepBackspaceForTextEntry(element) {
    if (!isTextEntryElement(element)) return false;
    if (element?.isContentEditable) return true;

    const tagName = element?.tagName?.toLowerCase();
    if (tagName === 'select') return true;

    const value = String(element?.value ?? '');
    if (value.length === 0) return false;

    const selectionStart = Number(element?.selectionStart ?? value.length);
    const selectionEnd = Number(element?.selectionEnd ?? value.length);
    return selectionStart !== selectionEnd || selectionStart > 0;
  }

  function handleComputerShortcut(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;

    if (event.key === 'Backspace' && !shouldKeepBackspaceForTextEntry(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      goBackOneInstance();
      return true;
    }

    const arrowDelta = getArrowScrollDelta(event.key);
    if (arrowDelta && !isTextEntryElement(event.target)) {
      const desktopRoot = computerRootRef.current ?? document.querySelector('.estudiemos-os-live-desktop');
      const activeScope = drawerOpen
        ? desktopRoot?.querySelector('.screen-control-drawer')
        : desktopRoot?.querySelector(`.os-window-${focusedWindow}`) ?? desktopRoot;
      const scrollTarget = findKeyboardScrollTarget(activeScope, arrowDelta[0], arrowDelta[1]);
      if (scrollTarget) {
        event.preventDefault();
        event.stopPropagation();
        scrollElementBy(scrollTarget, arrowDelta[0], arrowDelta[1]);
        return true;
      }
    }

    if (event.key === 'Enter' && !isTextEntryElement(event.target)) {
      if (confirmKeyboardAction()) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    }

    return false;
  }

  function confirmKeyboardAction() {
    const activeElement = document.activeElement;
    if (isKeyboardActionElement(activeElement) && !activeElement?.disabled) {
      activeElement.click();
      return true;
    }

    const desktopRoot = document.querySelector('.estudiemos-os-live-desktop');
    const activeScope = drawerOpen
      ? desktopRoot?.querySelector('.screen-control-drawer')
      : desktopRoot?.querySelector(`.os-window-${focusedWindow}`) ?? desktopRoot;
    const defaultAction = findEnterDefault(activeScope);
    if (!defaultAction) return false;

    defaultAction.click();
    return true;
  }

  useEffect(() => {
    computerRootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onComputerKeyDown(event) {
      handleComputerShortcut(event);
    }

    document.addEventListener('keydown', onComputerKeyDown, true);
    return () => document.removeEventListener('keydown', onComputerKeyDown, true);
  }, [
    drawerOpen,
    estudiemosRoute,
    focusedWindow,
    linkError,
    openWindows,
    resourceView,
    selectedContent,
    selectedContentOrigin,
    onBackToDesktop,
    spotifyDraft,
    spotifyError
  ]);

  function showActionFeedback(message) {
    window.clearTimeout(feedbackTimerRef.current);
    setActionFeedback(message);
    feedbackTimerRef.current = window.setTimeout(() => setActionFeedback(''), 2200);
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

  function setPreparedContent(content, origin) {
    setSelectedContent(content);
    setSelectedContentOrigin(origin);
  }

  function clearSelectedContent(origin = '') {
    if (origin && selectedContentOrigin && selectedContentOrigin !== origin) return;
    setSelectedContent(null);
    setSelectedContentOrigin('');
  }

  function openEstudiemosHome() {
    setEstudiemosRoute(EMPTY_ROUTE);
    clearSelectedContent('estudiemos');
    setResourceView('categories');
  }

  function openCarrera(carreraSlug) {
    setEstudiemosRoute({ carreraSlug, materiaSlug: '', temaSlug: '' });
    clearSelectedContent('estudiemos');
    setResourceView('categories');
  }

  function openMateria(materiaSlug) {
    setEstudiemosRoute({ carreraSlug: carrera.slug, materiaSlug, temaSlug: '' });
    clearSelectedContent('estudiemos');
    setResourceView('categories');
  }

  function openTema(temaSlug) {
    setEstudiemosRoute({ carreraSlug: carrera.slug, materiaSlug: materia.slug, temaSlug });
    clearSelectedContent('estudiemos');
    setResourceView('categories');
  }

  function selectVideo(videoItem, index) {
    const result = parseYouTubeUrl(videoItem.url);
    if (!result.ok) return;

    setPreparedContent({
      ...result.video,
      contentType: 'youtube',
      resourceUrl: '',
      title: videoItem.title ?? `${tema.title} - video ${index + 1}`,
      creator: ingenieriaRecursosSource.name,
      description: `${materia.title} / ${tema.title}`,
      category: 'Video'
    }, 'estudiemos');
    setSystemNote('Video listo para enviar a pantalla');
    showActionFeedback('Video preparado');
  }

  function selectPdf(pdfItem) {
    setPreparedContent({
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
    }, 'estudiemos');
    setSystemNote('PDF listo para enviar a pantalla');
    showActionFeedback('Material preparado');
  }

  function prepareManualLink(event) {
    event.preventDefault();
    const result = parseYouTubeUrl(linkDraft);
    if (!result.ok) {
      setLinkError(result.error);
      clearSelectedContent('links');
      setSystemNote('Link no valido');
      showActionFeedback('No se pudo preparar el link');
      return;
    }

    setLinkError('');
    setPreparedContent({
      ...result.video,
      contentType: 'youtube',
      resourceUrl: '',
      title: 'Link de YouTube',
      creator: 'Contenido externo',
      description: 'Video preparado desde Navegador. Elegi donde mostrarlo.',
      category: 'Link'
    }, 'links');
    setSystemNote('Link listo para enviar');
    showActionFeedback('Link preparado');
  }

  function loadSpotifyContent(event) {
    event.preventDefault();
    const result = parseSpotifyUrl(spotifyDraft);

    if (!result.ok) {
      setSpotifyError(result.error);
      setSystemNote('Link de Spotify no valido');
      showActionFeedback('Spotify no cargado');
      return;
    }

    setSpotifyContent(result.item);
    setSpotifyDraft('');
    setSpotifyError('');
    setSystemNote(`${result.item.label} de Spotify cargado`);
    showActionFeedback('Spotify cargado');
  }

  function clearSpotifyContent() {
    setSpotifyContent(null);
    setSpotifyDraft('');
    setSpotifyError('');
    setSystemNote('Spotify limpio');
    showActionFeedback('Spotify limpio');
  }

  function sendSpotifyToSecondary() {
    if (!spotifyContent) return;

    onAssignVideo('lower', {
      videoId: '',
      inputUrl: spotifyContent.inputUrl,
      watchUrl: spotifyContent.watchUrl,
      embedUrl: spotifyContent.embedUrl,
      contentType: 'spotify',
      resourceUrl: spotifyContent.embedUrl,
      title: spotifyContent.title,
      creator: 'Spotify',
      muted: false,
      volume: 70,
      displayScale: 100,
      paused: false,
      updatedAt: Date.now()
    });
    setSystemNote('Spotify enviado a pantalla derecha');
    showActionFeedback('Spotify en pantalla derecha');
  }

  function assignContent(zoneId, layoutId = null) {
    if (!selectedContent) return;
    const zoneLabel = ZONES.find((zone) => zone.id === zoneId)?.label ?? 'pantalla';
    if (layoutId) changeScreenLayout(layoutId, false);
    onAssignVideo(zoneId, {
      ...selectedContent,
      updatedAt: Date.now()
    });
    setSystemNote(`Enviado a ${zoneLabel}`);
    showActionFeedback(`Enviado a ${zoneLabel}`);
  }

  function changeScreenLayout(layoutId, notify = true) {
    const layoutLabel = SCREEN_LAYOUTS.find((layout) => layout.id === layoutId)?.label ?? layoutId;
    onScreenLayoutChange?.(layoutId);
    setSystemNote(`Layout ${layoutLabel} activo`);
    if (notify) showActionFeedback(`Layout ${layoutLabel}`);
  }

  function updateZoneFromComputer(zoneId, patch) {
    onUpdateZone(zoneId, patch);
    const zoneLabel = ZONES.find((zone) => zone.id === zoneId)?.label ?? 'pantalla';
    if ('muted' in patch) {
      showActionFeedback(`${patch.muted ? 'Mute' : 'Audio'} en ${zoneLabel}`);
      setSystemNote(`${zoneLabel}: ${patch.muted ? 'mute activo' : 'audio activo'}`);
    }
    if ('volume' in patch) {
      setSystemNote(`${zoneLabel}: volumen ${patch.volume}%`);
    }
    if ('displayScale' in patch) {
      setSystemNote(`${zoneLabel}: tamano ${patch.displayScale}%`);
    }
  }

  function clearZoneFromComputer(zoneId) {
    onClearZone(zoneId);
    const zoneLabel = ZONES.find((zone) => zone.id === zoneId)?.label ?? 'pantalla';
    setSystemNote(`${zoneLabel} limpia`);
    showActionFeedback(`${zoneLabel} limpia`);
  }

  function updateAgendaItem(itemId, patch) {
    onAgendaItemsChange(
      agendaItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
    setSystemNote('Agenda sincronizada con el cartel de pared');
  }

  function addAgendaItem(date = getTodayDateValue(), patch = {}) {
    const nextItem = {
      id: `agenda-${Date.now()}-${agendaItems.length}`,
      date,
      time: patch.time ?? getNextAgendaTime(agendaItems, date),
      title: patch.title ?? 'Nuevo bloque',
      detail: patch.detail ?? 'Describe el objetivo de estudio',
      completed: Boolean(patch.completed)
    };

    onAgendaItemsChange([...agendaItems, nextItem]);
    setSystemNote('Nuevo bloque agregado a la agenda');
    showActionFeedback('Agenda actualizada');
    return nextItem;
  }

  function removeAgendaItem(itemId) {
    const nextItems = agendaItems.filter((item) => item.id !== itemId);
    onAgendaItemsChange(nextItems);
    setSystemNote('Bloque eliminado de la agenda');
    showActionFeedback('Agenda actualizada');
  }

  function clearAgendaDate(date) {
    onAgendaItemsChange(agendaItems.filter((item) => item.date !== date));
    setSystemNote('Dia de agenda vaciado');
    showActionFeedback('Agenda actualizada');
  }

  function clearAgendaItems() {
    onAgendaItemsChange([]);
    setSystemNote('Agenda vacia');
    showActionFeedback('Agenda vacia');
  }

  function restoreInitialAgendaItems() {
    const restoredItems = createStudyAgendaItems();
    onAgendaItemsChange(restoredItems);
    setSystemNote('Agenda inicial restaurada');
    showActionFeedback('Agenda restaurada');
    return restoredItems;
  }

  function updateComputerSetting(key, value) {
    setComputerSettings((current) => ({ ...current, [key]: value }));
    setSystemNote('Configuracion actualizada');
    showActionFeedback('Ajustes aplicados');
  }

  function clearAllScreens() {
    ZONES.forEach((zone) => onClearZone(zone.id));
    setSystemNote('Pantallas limpias');
    showActionFeedback('Pantallas limpias');
  }

  function muteAllScreens() {
    ZONES.forEach((zone) => {
      if (canUseScreenAudioControls(screenZones[zone.id])) {
        onUpdateZone(zone.id, { muted: true });
      }
    });
    setSystemNote('Audio de YouTube en mute. Spotify se controla desde su reproductor.');
    showActionFeedback('Audio de pantallas ajustado');
  }

  const computerOverlayClass = [
    'computer-overlay mediahub-boot-overlay',
    computerSettings.largeText ? 'is-large-text' : '',
    computerSettings.highContrast ? 'is-high-contrast' : '',
    computerSettings.reduceMotion ? 'is-reduced-motion' : '',
    computerSettings.focusMode ? 'is-focus-mode' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={computerRootRef}
      className={computerOverlayClass}
      data-computer-ui-active-app={focusedWindow || 'desktop'}
      data-computer-ui-drawer-open={drawerOpen ? 'true' : 'false'}
      tabIndex={-1}
      onKeyDownCapture={handleComputerShortcut}
      aria-label="Computadora de Casa 1"
    >
      <div className="computer-window computer-window-wide mediahub-window game-computer-window estudiemos-os-live-desktop">
        <div className="computer-boot-glow" aria-hidden="true" />
        {actionFeedback && (
          <div className="os-action-toast" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{actionFeedback}</span>
          </div>
        )}

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
              {focusEconomy && (
                <span className="os-status-pill">
                  <Coins size={16} aria-hidden="true" />
                  {focusEconomy.progress.coins} Monedas
                </span>
              )}
              <span className="os-status-pill">
                <Clock3 size={16} aria-hidden="true" />
                {clockLabel}
              </span>
            </div>
          </header>

          <div className="computer-desktop mediahub-desktop game-os-desktop os-desktop os-photo-desktop">
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
              <div className="os-glance-card os-agenda-sync-card">
                <span>Agenda</span>
                <strong>{agendaLead ? getAgendaDisplayTitle(agendaLead) : 'Agenda vacia'}</strong>
                <p>{agendaLead ? getAgendaDisplayDetail(agendaLead) : 'No hay bloques cargados.'}</p>
              </div>
              <div className="os-glance-card os-spotify-sync-card">
                <span>Spotify</span>
                <strong>{spotifyContent?.title ?? 'Sin musica cargada'}</strong>
                <p>{spotifyContent ? `${spotifyContent.label} listo para estudiar.` : 'Abrir Spotify para cargar musica de fondo.'}</p>
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
                    selectedContent={selectedContentOrigin === 'estudiemos' ? selectedContent : null}
                    onHome={openEstudiemosHome}
                    onCarrera={openCarrera}
                    onMateria={openMateria}
                    onTema={openTema}
                    onResourceView={setResourceView}
                    onSelectVideo={selectVideo}
                    onSelectPdf={selectPdf}
                    onAssignContent={assignContent}
                    onCloseContent={() => clearSelectedContent('estudiemos')}
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
                    selectedContent={selectedContentOrigin === 'links' ? selectedContent : null}
                    onDraftChange={(value) => {
                      setLinkDraft(value);
                      setLinkError('');
                    }}
                    onPrepareLink={prepareManualLink}
                    onAssignContent={assignContent}
                    onCloseContent={() => clearSelectedContent('links')}
                  />
                </OSWindow>
              )}

              {openWindows.includes('agenda') && !minimizedWindows.includes('agenda') && (
                <OSWindow
                  appId="agenda"
                  title="Agenda"
                  subtitle="Cartel sincronizado"
                  icon={CalendarDays}
                  focused={focusedWindow === 'agenda'}
                  onFocus={focusWindow}
                  onMinimize={minimizeWindow}
                  onClose={closeWindow}
                >
                  <AgendaApp
                    active={focusedWindow === 'agenda'}
                    agendaItems={agendaItems}
                    onUpdateItem={updateAgendaItem}
                    onAddItem={addAgendaItem}
                    onRemoveItem={removeAgendaItem}
                    onClearDate={clearAgendaDate}
                    onClearAll={clearAgendaItems}
                    onRestoreInitial={restoreInitialAgendaItems}
                  />
                </OSWindow>
              )}

              {openWindows.includes('spotify') && !minimizedWindows.includes('spotify') && (
                <OSWindow
                  appId="spotify"
                  title="Spotify"
                  subtitle="Musica de fondo"
                  icon={Music2}
                  focused={focusedWindow === 'spotify'}
                  onFocus={focusWindow}
                  onMinimize={minimizeWindow}
                  onClose={closeWindow}
                >
                  <SpotifyApp
                    active={focusedWindow === 'spotify'}
                    draft={spotifyDraft}
                    error={spotifyError}
                    content={spotifyContent}
                    onDraftChange={(value) => {
                      setSpotifyDraft(value);
                      setSpotifyError('');
                    }}
                    onLoad={loadSpotifyContent}
                    onClear={clearSpotifyContent}
                    onSendSecondary={sendSpotifyToSecondary}
                  />
                </OSWindow>
              )}

              {openWindows.includes('focus') && !minimizedWindows.includes('focus') && focusEconomy && (
                <OSWindow
                  appId="focus"
                  title="Perfil"
                  subtitle="Monedas y skins"
                  icon={PawPrint}
                  focused={focusedWindow === 'focus'}
                  onFocus={focusWindow}
                  onMinimize={minimizeWindow}
                  onClose={closeWindow}
                >
                  <FocusProfileApp
                    focusEconomy={focusEconomy}
                    equippedSkin={equippedSkin}
                    onBuySkin={focusEconomy.actions.buySkin}
                    onUpgradeSkin={focusEconomy.actions.upgradeSkin}
                    onEquipSkin={focusEconomy.actions.equipSkin}
                  />
                </OSWindow>
              )}

              {openWindows.includes('settings') && !minimizedWindows.includes('settings') && (
                <OSWindow
                  appId="settings"
                  title="Configuracion"
                  subtitle="Comodidad y pantallas"
                  icon={Settings}
                  focused={focusedWindow === 'settings'}
                  onFocus={focusWindow}
                  onMinimize={minimizeWindow}
                  onClose={closeWindow}
                >
                  <SettingsApp
                    settings={computerSettings}
                    activeLayout={activeLayout}
                    screenZones={screenZones}
                    onSettingChange={updateComputerSetting}
                    onScreenLayoutChange={changeScreenLayout}
                    onClearAllScreens={clearAllScreens}
                    onMuteAllScreens={muteAllScreens}
                    onBack={returnToComputerDesktop}
                  />
                </OSWindow>
              )}
            </main>
          </div>

          <footer className="os-system-bar" aria-label="Barra del sistema">
            <div className="os-taskbar-start" aria-hidden="true">
              <Sparkles size={18} />
            </div>

            <div className="os-running-apps" aria-label="Aplicaciones abiertas">
              {taskbarAppIds.length > 0 ? (
                taskbarAppIds.map((appId) => {
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
                })
              ) : (
                <span className="os-running-apps-empty">Sin ventanas abiertas</span>
              )}
            </div>

            <div className="os-system-tray">
              <button type="button" className="os-screen-button" onClick={() => setDrawerOpen(true)}>
                <PanelRightOpen size={18} aria-hidden="true" />
                <span>Pantallas</span>
              </button>

              <div className="os-clock" aria-label={`Hora del sistema ${clockLabel}`}>
                <strong>{clockLabel}</strong>
                <span>{dateLabel}</span>
              </div>

              <button type="button" className="computer-close os-close-button" onClick={onClose} aria-label="Cerrar computadora">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </div>

        {drawerOpen && (
          <ScreenControlDrawer
            activeLayout={activeLayout}
            screenZones={screenZones}
            onClose={() => setDrawerOpen(false)}
            onClearZone={clearZoneFromComputer}
            onUpdateZone={updateZoneFromComputer}
            onScreenLayoutChange={changeScreenLayout}
            onScreenCommand={onScreenCommand}
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

function getFocusCoinAvailability(progress) {
  return DACHSHUND_SKINS.map((skin) => {
    const purchased = isSkinPurchased(progress, skin.id);
    const rank = getSkinRank(progress, skin.id);
    const isEquipped = progress.equippedSkin === skin.id;

    if (!purchased) {
      const cost = getPurchaseCost(skin.id);
      return {
        id: `${skin.id}-buy`,
        skin,
        title: `Comprar ${skin.name}`,
        description: cost === 0 ? 'Disponible sin costo.' : `Desbloquea esta skin por ${cost} monedas.`,
        cost,
        available: progress.coins >= cost,
        missing: Math.max(0, cost - progress.coins),
        estimateMs: estimateValidMsForCoins(Math.max(0, cost - progress.coins)),
        state: progress.coins >= cost ? 'Disponible' : 'Faltan monedas'
      };
    }

    if (rank < 7) {
      const cost = getUpgradeCost(skin.id, rank);
      return {
        id: `${skin.id}-upgrade`,
        skin,
        title: `Mejorar ${skin.name}`,
        description: `Sube de rango ${rank} a rango ${rank + 1}.`,
        cost,
        available: progress.coins >= cost,
        missing: Math.max(0, cost - progress.coins),
        estimateMs: estimateValidMsForCoins(Math.max(0, cost - progress.coins)),
        state: progress.coins >= cost ? 'Disponible' : 'Faltan monedas'
      };
    }

    return {
      id: `${skin.id}-max`,
      skin,
      title: `${skin.name} completa`,
      description: isEquipped ? 'Equipada y en rango maximo.' : 'Rango maximo desbloqueado.',
      cost: 0,
      available: isEquipped,
      missing: 0,
      estimateMs: 0,
      state: isEquipped ? 'Equipada' : 'Lista para equipar'
    };
  });
}

function FocusProfileApp({ focusEconomy, equippedSkin, onBuySkin, onUpgradeSkin, onEquipSkin }) {
  const progress = focusEconomy.progress;
  const [activeFocusTab, setActiveFocusTab] = useState('overview');
  const [selectedSkinId, setSelectedSkinId] = useState(equippedSkin.skin.id);
  const nextRewardPercent = Math.min(100, Math.max(0, Math.round((focusEconomy.nextRewardProgress ?? 0) * 100)));
  const selectedSkin = DACHSHUND_SKINS.find((skin) => skin.id === selectedSkinId) ?? equippedSkin.skin;
  const selectedRank = Math.max(1, getSkinRank(progress, selectedSkin.id));
  const selectedSkinPlan = getSkinCostPlan(selectedSkin.id);
  const selectedRemainingToMax = getRemainingCostToMax(progress, selectedSkin.id);
  const selectedRemainingEstimate = estimateValidMsForCoins(Math.max(0, selectedRemainingToMax - progress.coins));
  const availabilityItems = useMemo(() => getFocusCoinAvailability(progress), [progress]);

  return (
    <div className="os-fullscreen-app focus-profile-app">
      <section className="focus-hero-panel" aria-label="Perfil de enfoque">
        <div className="focus-hero-copy">
          <span>Perfil de Enfoque</span>
          <h2>Monedas de Enfoque</h2>
          <p>Ganas monedas solo con contenido cargado, pestana visible y actividad reciente.</p>
          <div className="focus-stat-row">
            <div>
              <Coins size={20} aria-hidden="true" />
              <strong>{progress.coins}</strong>
              <span>Monedas</span>
            </div>
            <div>
              <Clock3 size={20} aria-hidden="true" />
              <strong>{formatFocusDuration(progress.totalValidContentMs)}</strong>
              <span>Tiempo valido total</span>
            </div>
            <div>
              <Sparkles size={20} aria-hidden="true" />
              <strong>{formatFocusDuration(progress.sessionValidContentMs)}</strong>
              <span>Sesion valida</span>
            </div>
            <div>
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>{progress.dailyEarned}</strong>
              <span>Ganadas hoy</span>
            </div>
          </div>
        </div>

        <div className="focus-mascot-stage">
          <DachshundMascot skinId={equippedSkin.skin.id} rank={equippedSkin.rank} size="profile" />
          <strong>{equippedSkin.skin.name}</strong>
          <span>Rango {equippedSkin.rank}: {equippedSkin.rankLabel}</span>
        </div>
      </section>

      <section className="focus-progress-panel" aria-label="Progreso de recompensas">
        <div>
          <strong>{focusEconomy.status.label}</strong>
          <span>{formatFocusDuration(focusEconomy.nextRewardRemainingMs)} para +{FOCUS_REWARD_CONFIG.rewardCoins} moneda</span>
        </div>
        <div className="focus-progress-track">
          <span style={{ width: `${nextRewardPercent}%` }} />
        </div>
        <small>
          Bonus: +{FOCUS_REWARD_CONFIG.bonusCoins} cada 60 min validos, +{FOCUS_REWARD_CONFIG.deepBonusCoins} cada 5 h. Primera sesion valida del dia: +{FOCUS_REWARD_CONFIG.dailyBonusCoins}.
        </small>
      </section>

      <nav className="focus-profile-tabs" aria-label="Explorar perfil">
        {[
          ['overview', 'Resumen'],
          ['shop', 'Tienda'],
          ['ranks', 'Rangos']
        ].map(([tabId, label]) => (
          <button key={tabId} type="button" className={activeFocusTab === tabId ? 'is-selected' : ''} onClick={() => setActiveFocusTab(tabId)}>
            {label}
          </button>
        ))}
      </nav>

      {activeFocusTab === 'overview' && (
        <section className="focus-overview-grid">
          <article className="focus-selected-skin-panel">
            <div className="focus-selected-stage">
              <DachshundMascot skinId={selectedSkin.id} rank={selectedRank} size="profile" />
            </div>
            <div>
              <span>{selectedSkin.rarity}</span>
              <h3>{selectedSkin.name}</h3>
              <p>{selectedSkin.description}</p>
              <strong>Vista previa rango {selectedRank} - tier {selectedSkinPlan.label}</strong>
              <small className="focus-estimate-note">
                Para completar esta skin: {selectedRemainingToMax} monedas pendientes, aprox. {formatFocusDuration(selectedRemainingEstimate)} de contenido activo.
              </small>
              <button type="button" className="focus-open-shop-button" onClick={() => setActiveFocusTab('shop')}>
                <PawPrint size={17} aria-hidden="true" />
                <span>Abrir tienda de skins</span>
              </button>
            </div>
          </article>

          <article className="focus-availability-panel">
            <div className="focus-panel-title">
              <Coins size={20} aria-hidden="true" />
              <div>
                <strong>Que podes hacer con tus monedas</strong>
                <span>{progress.coins} disponibles ahora</span>
              </div>
            </div>
            <div className="focus-availability-list">
              {availabilityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.available ? 'is-available' : ''}
                  onClick={() => {
                    setSelectedSkinId(item.skin.id);
                    setActiveFocusTab('shop');
                  }}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <em>{item.available ? item.state : `Faltan ${item.missing} - ${formatFocusDuration(item.estimateMs)}`}</em>
                </button>
              ))}
            </div>
          </article>

          <article className="focus-economy-rules">
            <div className="focus-panel-title">
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>Economia lenta y justa</strong>
                <span>Una o dos pantallas cuentan como una sola sesion valida.</span>
              </div>
            </div>
            <ul>
              <li>Solo suma con contenido en pantalla, pestana visible y actividad reciente.</li>
              <li>No suma por caminar, dejar la pagina abierta o estar AFK.</li>
              <li>El progreso alto requiere muchas horas reales de contenido activo.</li>
            </ul>
          </article>
        </section>
      )}

      {activeFocusTab === 'shop' && (
        <section className="focus-shop-grid" aria-label="Tienda de skins">
          {DACHSHUND_SKINS.map((skin) => {
            const purchased = isSkinPurchased(progress, skin.id);
            const rank = Math.max(0, getSkinRank(progress, skin.id));
            const visibleRank = Math.max(1, rank);
            const isEquipped = progress.equippedSkin === skin.id;
            const purchaseCost = getPurchaseCost(skin.id);
            const upgradeCost = getUpgradeCost(skin.id, rank);
            const canBuy = !purchased && progress.coins >= purchaseCost;
            const canUpgrade = purchased && rank < 7 && progress.coins >= upgradeCost;
            const nextCost = purchased ? upgradeCost : purchaseCost;
            const missingForNext = Math.max(0, nextCost - progress.coins);
            const nextEstimate = estimateValidMsForCoins(missingForNext);
            const skinPlan = getSkinCostPlan(skin.id);

            return (
              <article className={`focus-skin-card${isEquipped ? ' is-equipped' : ''}${selectedSkinId === skin.id ? ' is-selected' : ''}`} key={skin.id}>
                <button type="button" className="focus-skin-preview" onClick={() => setSelectedSkinId(skin.id)}>
                  <DachshundMascot skinId={skin.id} rank={visibleRank} size="shop" />
                </button>
                <div className="focus-skin-copy">
                  <span>{skin.rarity} - {skinPlan.label}</span>
                  <h3>{skin.name}</h3>
                  <p>{skin.description}</p>
                </div>
                <div className="focus-rank-track" aria-label={`Rango ${visibleRank} de 7`}>
                  {SKIN_RANKS.map((rankItem) => (
                    <span key={rankItem.rank} className={rankItem.rank <= visibleRank && purchased ? 'is-active' : ''} title={rankItem.label} />
                  ))}
                </div>
                <div className="focus-skin-meta">
                  <strong>{purchased ? `Rango ${visibleRank}/7` : `Comprar: ${purchaseCost}`}</strong>
                  <span>{purchased && rank < 7 ? `Mejora: ${upgradeCost} monedas` : rank >= 7 ? 'Maximo rango' : canBuy ? 'Disponible ahora' : `Faltan ${purchaseCost - progress.coins} monedas`}</span>
                  {missingForNext > 0 && <small>Aprox. {formatFocusDuration(nextEstimate)} de contenido activo</small>}
                </div>
                <div className="focus-skin-actions">
                  {!purchased && (
                    <button type="button" onClick={() => onBuySkin(skin.id)} disabled={!canBuy}>
                      <Coins size={16} aria-hidden="true" />
                      <span>Comprar</span>
                    </button>
                  )}
                  {purchased && (
                    <>
                      <button type="button" onClick={() => onUpgradeSkin(skin.id)} disabled={!canUpgrade || rank >= 7}>
                        <Sparkles size={16} aria-hidden="true" />
                        <span>Mejorar</span>
                      </button>
                      <button type="button" className="is-primary" onClick={() => onEquipSkin(skin.id)} disabled={isEquipped}>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>{isEquipped ? 'Equipada' : 'Equipar'}</span>
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {activeFocusTab === 'ranks' && (
        <section className="focus-rank-guide">
          {SKIN_RANKS.map((rankItem) => (
            <article key={rankItem.rank}>
              <strong>Rango {rankItem.rank}</strong>
              <span>{rankItem.label}</span>
              <p>{getRankGuideCopy(rankItem.rank)}</p>
              <small>{getRankCostGuide(rankItem.rank)}</small>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function getRankGuideCopy(rank) {
  if (rank === 1) return 'Desbloquea la skin y su identidad base.';
  if (rank === 2) return 'Primera mejora real: requiere una base sostenida de contenido valido.';
  if (rank === 3) return 'Empieza a sentirse como progreso de varias sesiones.';
  if (rank === 4) return 'Objetivo intermedio de largo plazo.';
  if (rank === 5) return 'Entra en rangos de compromiso serio.';
  if (rank === 6) return 'Marca premium con muchas horas acumuladas.';
  return 'Version legendaria: recompensa de muy largo plazo.';
}

function getRankCostGuide(rank) {
  if (rank === 1) {
    return `Comprar: Comun ${SKIN_COST_TABLE.common.purchase}, Rara ${SKIN_COST_TABLE.rare.purchase}, Legendaria ${SKIN_COST_TABLE.legendary.purchase}.`;
  }

  const previousRank = rank - 1;
  return `R${previousRank}->R${rank}: Comun ${SKIN_COST_TABLE.common.upgrades[previousRank]}, Rara ${SKIN_COST_TABLE.rare.upgrades[previousRank]}, Legendaria ${SKIN_COST_TABLE.legendary.upgrades[previousRank]}.`;
}

function AgendaApp({ active, agendaItems, onUpdateItem, onAddItem, onRemoveItem, onClearDate, onClearAll, onRestoreInitial }) {
  const shellRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(() => agendaItems[0]?.date ?? getTodayDateValue());
  const [calendarCursor, setCalendarCursor] = useState(() => parseAgendaDate(agendaItems[0]?.date ?? getTodayDateValue()));
  const [quickDate, setQuickDate] = useState(() => agendaItems[0]?.date ?? getTodayDateValue());
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState(() => getNextAgendaTime(agendaItems, quickDate));
  const [quickDetail, setQuickDetail] = useState('');
  const sortedAgendaItems = useMemo(() => sortAgendaItems(agendaItems), [agendaItems]);
  const selectedDateItems = useMemo(
    () => sortedAgendaItems.filter((item) => item.date === selectedDate),
    [selectedDate, sortedAgendaItems]
  );
  const activeAgendaItems = useMemo(() => sortedAgendaItems.filter((item) => !item.completed), [sortedAgendaItems]);
  const agendaCountsByDate = useMemo(
    () =>
      agendaItems.reduce((counts, item) => {
        const date = item.date ?? getTodayDateValue();
        const current = counts[date] ?? { total: 0, completed: 0 };
        counts[date] = {
          total: current.total + 1,
          completed: current.completed + (item.completed ? 1 : 0)
        };
        return counts;
      }, {}),
    [agendaItems]
  );
  const calendarDays = useMemo(() => buildCalendarDays(calendarCursor), [calendarCursor]);
  const monthLabel = useMemo(
    () =>
      calendarCursor.toLocaleDateString('es-AR', {
        month: 'long',
        year: 'numeric'
      }),
    [calendarCursor]
  );
  const selectedDateLabel = useMemo(
    () =>
      parseAgendaDate(selectedDate).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      }),
    [selectedDate]
  );
  const selectedOpenCount = selectedDateItems.filter((item) => !item.completed).length;
  const selectedDoneCount = selectedDateItems.length - selectedOpenCount;
  const todayCount = agendaCountsByDate[getTodayDateValue()]?.total ?? 0;
  const nextAgendaItem = activeAgendaItems.find((item) => (item.date ?? '') >= getTodayDateValue()) ?? activeAgendaItems[0] ?? null;

  useArrowKeyScroll(active, shellRef);

  useEffect(() => {
    if (active && !isTextEntryElement(document.activeElement)) {
      shellRef.current?.focus({ preventScroll: true });
    }
  }, [active]);

  useEffect(() => {
    setQuickDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setQuickTime(getNextAgendaTime(agendaItems, quickDate));
  }, [agendaItems, quickDate]);

  function shiftCalendarMonth(offset) {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  function selectAgendaDate(dateValue) {
    setSelectedDate(dateValue);
    setCalendarCursor(parseAgendaDate(dateValue));
  }

  function addItemForSelectedDate() {
    const targetDate = quickDate || selectedDate;
    const createdItem = onAddItem?.(targetDate, {
      time: quickTime,
      title: quickTitle.trim() || 'Nuevo bloque',
      detail: quickDetail.trim() || 'Objetivo de estudio',
      completed: false
    });
    setQuickTitle('');
    setQuickDetail('');
    selectAgendaDate(createdItem?.date ?? targetDate);
    setQuickTime(addAgendaMinutes(createdItem?.time ?? quickTime, 60));
  }

  function submitQuickAdd(event) {
    event.preventDefault();
    addItemForSelectedDate();
  }

  function selectToday() {
    selectAgendaDate(getTodayDateValue());
  }

  function selectTomorrow() {
    const tomorrow = parseAgendaDate(getTodayDateValue());
    tomorrow.setDate(tomorrow.getDate() + 1);
    selectAgendaDate(getDateValue(tomorrow));
  }

  function clearSelectedDate() {
    if (selectedDateItems.length === 0) return;
    if (window.confirm('Vaciar los bloques de este dia?')) {
      onClearDate?.(selectedDate);
    }
  }

  function clearAllAgenda() {
    if (agendaItems.length === 0) return;
    if (window.confirm('Vaciar toda la agenda?')) {
      onClearAll?.();
    }
  }

  function restoreInitialAgenda() {
    if (window.confirm('Restaurar la agenda inicial? Se reemplaza la agenda actual.')) {
      const restoredItems = onRestoreInitial?.() ?? createStudyAgendaItems();
      const nextDate = restoredItems[0]?.date ?? getTodayDateValue();
      selectAgendaDate(nextDate);
      setQuickDate(nextDate);
    }
  }

  return (
    <div className="os-fullscreen-app agenda-app-shell" ref={shellRef} tabIndex={0}>
      <header className="agenda-app-header">
        <div>
          <span>Agenda sincronizada</span>
          <h2>Plan de estudio de la sala</h2>
          <p>Los cambios se reflejan en el cartel de pared y en el monitor fisico.</p>
        </div>
        <div className="agenda-app-actions">
          <button type="button" onClick={selectToday}>
            <CalendarDays size={17} aria-hidden="true" />
            <span>Hoy</span>
          </button>
          <button type="button" onClick={selectTomorrow}>
            <ChevronRight size={17} aria-hidden="true" />
            <span>Manana</span>
          </button>
          <button type="button" onClick={restoreInitialAgenda}>
            <CalendarDays size={17} aria-hidden="true" />
            <span>Restaurar inicio</span>
          </button>
          <button type="button" className="agenda-danger-button" onClick={clearAllAgenda} disabled={agendaItems.length === 0}>
            <Eraser size={17} aria-hidden="true" />
            <span>Vaciar</span>
          </button>
          <button type="button" className="is-primary" data-enter-default onClick={addItemForSelectedDate}>
            <Plus size={18} aria-hidden="true" />
            <span>Agregar</span>
          </button>
          <ScrollPad targetRef={shellRef} label="Mover agenda" />
        </div>
      </header>

      <section className="agenda-stats-strip" aria-label="Resumen de agenda">
        <div>
          <span>Hoy</span>
          <strong>{todayCount}</strong>
        </div>
        <div>
          <span>Dia abierto</span>
          <strong>{selectedOpenCount}</strong>
        </div>
        <div>
          <span>Completados</span>
          <strong>{selectedDoneCount}</strong>
        </div>
        <div className="agenda-next-card">
          <span>Proximo</span>
          <strong>{nextAgendaItem ? `${nextAgendaItem.time || '--:--'} ${getAgendaDisplayTitle(nextAgendaItem)}` : 'Sin bloques pendientes'}</strong>
        </div>
      </section>

      <section className="agenda-calendar-layout">
        <aside className="agenda-calendar-panel" aria-label="Calendario de agenda">
          <div className="agenda-calendar-head">
            <button type="button" onClick={() => shiftCalendarMonth(-1)} aria-label="Mes anterior">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => shiftCalendarMonth(1)} aria-label="Mes siguiente">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="agenda-weekdays" aria-hidden="true">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>

          <div className="agenda-calendar-grid">
            {calendarDays.map((day) => {
              const count = agendaCountsByDate[day.value]?.total ?? 0;
              const completedCount = agendaCountsByDate[day.value]?.completed ?? 0;
              return (
                <button
                  key={day.value}
                  type="button"
                  className={`${day.isCurrentMonth ? '' : 'is-outside'}${day.value === selectedDate ? ' is-selected' : ''}${day.isToday ? ' is-today' : ''}${count > 0 ? ' has-items' : ''}${count > 0 && completedCount === count ? ' is-complete' : ''}`}
                  onClick={() => selectAgendaDate(day.value)}
                  aria-pressed={day.value === selectedDate}
                >
                  <span>{day.day}</span>
                  {count > 0 && <small>{count}</small>}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="agenda-day-panel" aria-label="Bloques del dia seleccionado">
          <div className="agenda-day-head">
            <div>
              <span>Dia seleccionado</span>
              <strong>{selectedDateLabel}</strong>
            </div>
            <div className="agenda-day-tools">
              <input type="date" value={selectedDate} onChange={(event) => selectAgendaDate(event.target.value)} />
              <button type="button" onClick={clearSelectedDate} disabled={selectedDateItems.length === 0}>
                <Eraser size={16} aria-hidden="true" />
                <span>Vaciar dia</span>
              </button>
            </div>
          </div>

          <form className="agenda-quick-add" onSubmit={submitQuickAdd}>
            <label>
              <span>Fecha</span>
              <input type="date" value={quickDate} onChange={(event) => setQuickDate(event.target.value)} />
            </label>
            <label>
              <span>Hora</span>
              <input type="time" value={quickTime} onChange={(event) => setQuickTime(event.target.value)} />
            </label>
            <label>
              <span>Titulo rapido</span>
              <input
                type="text"
                value={quickTitle}
                maxLength={48}
                placeholder="Ej: Repasar limites"
                onChange={(event) => setQuickTitle(event.target.value)}
              />
            </label>
            <label className="agenda-quick-detail">
              <span>Detalle</span>
              <input
                type="text"
                value={quickDetail}
                maxLength={96}
                placeholder="Objetivo, material o pendiente"
                onChange={(event) => setQuickDetail(event.target.value)}
              />
            </label>
            <button type="submit" data-enter-default>
              <Plus size={17} aria-hidden="true" />
              <span>Agregar</span>
            </button>
          </form>

          <div className="agenda-editor-list" aria-label="Bloques de la agenda">
            {selectedDateItems.length === 0 && (
              <div className="agenda-empty-day">
                <CalendarDays size={28} aria-hidden="true" />
                <strong>Sin bloques para este dia</strong>
                <button type="button" onClick={addItemForSelectedDate}>
                  <Plus size={17} aria-hidden="true" />
                  <span>Agregar bloque</span>
                </button>
              </div>
            )}

            {selectedDateItems.map((item) => (
              <article className={`agenda-editor-row${item.completed ? ' is-completed' : ''}`} key={item.id}>
                <button
                  type="button"
                  className={`agenda-complete-button${item.completed ? ' is-done' : ''}`}
                  onClick={() => onUpdateItem(item.id, { completed: !item.completed })}
                  aria-label={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
                >
                  {item.completed ? <CheckCircle2 size={19} aria-hidden="true" /> : <Square size={19} aria-hidden="true" />}
                </button>

                <div className="agenda-editor-when">
                  <label>
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={item.date ?? selectedDate}
                      onChange={(event) => onUpdateItem(item.id, { date: event.target.value })}
                    />
                  </label>

                  <label>
                    <span>Hora</span>
                    <input
                      type="time"
                      value={item.time ?? ''}
                      onChange={(event) => onUpdateItem(item.id, { time: event.target.value })}
                    />
                  </label>
                </div>

                <div className="agenda-editor-copy">
                  <label>
                    <span>Titulo</span>
                    <input
                      type="text"
                      value={item.title ?? ''}
                      maxLength={48}
                      placeholder="Bloque sin titulo"
                      onChange={(event) => onUpdateItem(item.id, { title: event.target.value })}
                    />
                  </label>

                  <label className="agenda-detail-field">
                    <span>Detalle</span>
                    <textarea
                      value={item.detail ?? ''}
                      maxLength={96}
                      placeholder="Objetivo, guia o material"
                      onChange={(event) => onUpdateItem(item.id, { detail: event.target.value })}
                    />
                  </label>
                </div>

                <button type="button" className="agenda-remove-button" onClick={() => onRemoveItem(item.id)} aria-label={`Eliminar ${item.title}`}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function buildCalendarDays(cursorDate) {
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const firstDay = new Date(year, month, 1, 12);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset, 12);
  const today = getTodayDateValue();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const value = getDateValue(date);
    return {
      value,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: value === today
    };
  });
}

function SettingsApp({
  settings,
  activeLayout,
  screenZones,
  onSettingChange,
  onScreenLayoutChange,
  onClearAllScreens,
  onMuteAllScreens,
  onBack
}) {
  const activeScreenCount = ZONES.filter((zone) => Boolean(screenZones[zone.id]?.videoId || screenZones[zone.id]?.resourceUrl)).length;

  return (
    <div className="os-fullscreen-app settings-app-shell">
      <header className="settings-app-header">
        <div>
          <span>Configuracion</span>
          <h2>Comodidad del Room</h2>
          <p>{activeScreenCount} pantalla{activeScreenCount === 1 ? '' : 's'} con contenido. Layout actual: {activeLayout.label}.</p>
        </div>
        <div className="settings-header-actions">
          <button type="button" className="settings-back-button" onClick={onBack}>
            <ChevronLeft size={18} aria-hidden="true" />
            <span>Volver</span>
          </button>
          <SlidersHorizontal size={28} aria-hidden="true" />
        </div>
      </header>

      <section className="settings-grid" aria-label="Preferencias de comodidad">
        <SettingToggle
          title="Texto grande"
          description="Aumenta la legibilidad de ventanas, bandeja y paneles."
          checked={settings.largeText}
          onChange={(checked) => onSettingChange('largeText', checked)}
        />
        <SettingToggle
          title="Contraste alto"
          description="Refuerza fondos y bordes para leer mejor."
          checked={settings.highContrast}
          onChange={(checked) => onSettingChange('highContrast', checked)}
        />
        <SettingToggle
          title="Reducir movimiento"
          description="Quita transiciones para una experiencia mas estable."
          checked={settings.reduceMotion}
          onChange={(checked) => onSettingChange('reduceMotion', checked)}
        />
        <SettingToggle
          title="Modo enfoque"
          description="Prioriza apps utiles y reduce ruido visual."
          checked={settings.focusMode}
          onChange={(checked) => onSettingChange('focusMode', checked)}
        />
      </section>

      <section className="settings-panel" aria-label="Pantallas de la sala">
        <div className="settings-panel-head">
          <MonitorUp size={19} aria-hidden="true" />
          <strong>Pantallas</strong>
        </div>
        <div className="settings-layout-options">
          {SCREEN_LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className={activeLayout.id === layout.id ? 'is-selected' : ''}
              onClick={() => onScreenLayoutChange(layout.id)}
            >
              <span>{layout.label}</span>
              <small>{layout.description}</small>
            </button>
          ))}
        </div>
        <div className="settings-action-grid">
          <button type="button" onClick={onClearAllScreens}>
            <Eraser size={17} aria-hidden="true" />
            <span>Limpiar pantallas</span>
          </button>
          <button type="button" onClick={onMuteAllScreens}>
            <VolumeX size={17} aria-hidden="true" />
            <span>Silenciar todo</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingToggle({ title, description, checked, onChange }) {
  return (
    <label className="settings-toggle-card">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ScrollPad({ targetRef, label = 'Mover panel', tone = 'light' }) {
  return (
    <div className={`os-scroll-pad is-${tone}`} aria-label={label}>
      <button type="button" onClick={() => scrollPanelBy(targetRef, 0, -260)} aria-label={`${label} arriba`}>
        <ChevronUp size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => scrollPanelBy(targetRef, -260, 0)} aria-label={`${label} izquierda`}>
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => scrollPanelBy(targetRef, 260, 0)} aria-label={`${label} derecha`}>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => scrollPanelBy(targetRef, 0, 260)} aria-label={`${label} abajo`}>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function SpotifyApp({ active, draft, error, content, onDraftChange, onLoad, onClear, onSendSecondary }) {
  const shellRef = useRef(null);

  useArrowKeyScroll(active, shellRef);

  useEffect(() => {
    if (active && !isTextEntryElement(document.activeElement)) {
      shellRef.current?.focus({ preventScroll: true });
    }
  }, [active]);

  return (
    <div className="os-fullscreen-app spotify-app-shell" ref={shellRef} tabIndex={0}>
      <section className="spotify-hero-panel" aria-label="Spotify en Estudiemos Room">
        <div>
          <span>Musica de fondo</span>
          <h2>Spotify</h2>
          <p>Carga canciones, playlists, albumes o podcasts y presiona Play dentro del reproductor oficial.</p>
        </div>
        <div className="spotify-current-card">
          <Music2 size={24} aria-hidden="true" />
          <span>{content ? content.label : 'Sin contenido'}</span>
          <strong>{content?.title ?? 'Pega un link para empezar'}</strong>
          {content && <small>Activo dentro de la computadora. El audio queda en el player de Spotify.</small>}
          <ScrollPad targetRef={shellRef} label="Mover Spotify" tone="dark" />
        </div>
      </section>

      <section className="spotify-workspace">
        <form className="spotify-link-panel" onSubmit={onLoad}>
          <label htmlFor="spotify-room-link">Link de Spotify</label>
          <div className="spotify-input-row">
            <input
              id="spotify-room-link"
              type="text"
              inputMode="url"
              placeholder="https://open.spotify.com/playlist/..."
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
            />
            <button type="submit">
              <Play size={17} aria-hidden="true" />
              <span>Cargar</span>
            </button>
          </div>
          {error && <p className="screen-zone-error">{error}</p>}
          <div className="spotify-support-list" aria-label="Tipos soportados">
            <span>Canciones</span>
            <span>Playlists</span>
            <span>Albumes</span>
            <span>Podcasts</span>
            <span>Episodios</span>
          </div>
        </form>

        <aside className="spotify-action-panel">
          <button type="button" onClick={onSendSecondary} disabled={!content}>
            <MonitorUp size={18} aria-hidden="true" />
            <span>Enviar a pantalla derecha</span>
          </button>
          <button type="button" onClick={onClear} disabled={!content}>
            <Eraser size={18} aria-hidden="true" />
            <span>Limpiar Spotify</span>
          </button>
          {content && (
            <a href={content.watchUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={17} aria-hidden="true" />
              <span>Abrir en Spotify</span>
            </a>
          )}
        </aside>
      </section>

      <section className={`spotify-player-panel${content ? ' is-loaded' : ''}`} aria-label="Reproductor de Spotify">
        {content ? (
          <iframe
            key={content.embedUrl}
            title={content.title}
            src={content.embedUrl}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        ) : (
          <div className="spotify-empty-player">
            <Music2 size={34} aria-hidden="true" />
            <strong>Spotify listo</strong>
            <span>El reproductor aparece aca cuando cargues un link compatible.</span>
          </div>
        )}
      </section>
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
            <button type="submit" className="mediahub-primary-button" data-enter-default>
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
        <button type="button" className="mediahub-primary-button" data-enter-default onClick={() => onAssignContent('upper')}>
          Enviar a izquierda
        </button>
        <button type="button" className="mediahub-secondary-button" onClick={() => onAssignContent('lower')}>
          Enviar a derecha
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
  onScreenLayoutChange,
  onScreenCommand
}) {
  function sendScreenCommand(zoneId, action, payload = {}) {
    onScreenCommand?.(zoneId, action, payload);
  }

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
              const hasContent = zoneHasContent(current);
              const canControlPlayback = current.contentType === 'youtube' && Boolean(current.videoId);
              const canUseAudioControls = canUseScreenAudioControls(current);
              const audioToggleLabel = getAudioToggleLabel(current);
              const audioHint = getAudioControlHint(current);
              const isPaused = Boolean(current.paused);
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

                  <div className="drawer-playback-actions" aria-label={`Reproduccion de ${zone.label}`}>
                    <button type="button" onClick={() => sendScreenCommand(zone.id, isPaused ? 'play' : 'pause')} disabled={!canControlPlayback}>
                      {isPaused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
                      <span>{isPaused ? 'Play' : 'Pausa'}</span>
                    </button>
                    <button type="button" onClick={() => sendScreenCommand(zone.id, 'seek-relative', { seconds: -15 })} disabled={!canControlPlayback}>
                      <SkipBack size={17} aria-hidden="true" />
                      <span>15s</span>
                    </button>
                    <button type="button" onClick={() => sendScreenCommand(zone.id, 'seek-relative', { seconds: 15 })} disabled={!canControlPlayback}>
                      <SkipForward size={17} aria-hidden="true" />
                      <span>15s</span>
                    </button>
                    <button type="button" onClick={() => sendScreenCommand(zone.id, 'skip-ad', { seconds: 45 })} disabled={!canControlPlayback}>
                      <SkipForward size={17} aria-hidden="true" />
                      <span>Anuncio</span>
                    </button>
                  </div>

                  <label className="drawer-volume">
                    <span>Volumen {current.volume}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={current.volume}
                      disabled={!canUseAudioControls}
                      onChange={(event) => onUpdateZone(zone.id, { volume: Number(event.target.value) })}
                    />
                  </label>
                  {audioHint && <p className="drawer-audio-hint">{audioHint}</p>}

                  <label className="drawer-volume">
                    <span>Tamano {current.displayScale ?? 100}%</span>
                    <input
                      type="range"
                      min="80"
                      max="100"
                      step="5"
                      value={current.displayScale ?? 100}
                      onChange={(event) => onUpdateZone(zone.id, { displayScale: Number(event.target.value) })}
                    />
                  </label>

                  <div className="drawer-zone-actions">
                    <button type="button" onClick={() => onUpdateZone(zone.id, { muted: !current.muted })} disabled={!canUseAudioControls}>
                      {current.muted ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
                      <span>{audioToggleLabel}</span>
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
