import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  Home,
  Play,
  Plus,
  Square,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { studyAgendaItems } from '../data/studyAgenda.js';

const DEFAULT_SUBJECTS = [
  { id: 'general', label: 'General', color: '#ead58f', soft: 'rgba(234, 213, 143, 0.18)', aliases: [] },
  { id: 'matematica', label: 'Matematica', color: '#a9c7ff', soft: 'rgba(169, 199, 255, 0.18)', aliases: ['matematica', 'analisis', 'algebra', 'integral', 'limite'] },
  { id: 'fisica', label: 'Fisica', color: '#88d8c5', soft: 'rgba(136, 216, 197, 0.18)', aliases: ['fisica', 'movimiento', 'energia', 'mecanica'] },
  { id: 'quimica', label: 'Quimica', color: '#f2b6d0', soft: 'rgba(242, 182, 208, 0.18)', aliases: ['quimica', 'molecula', 'estequiometria'] },
  { id: 'programacion', label: 'Programacion', color: '#f8bc7d', soft: 'rgba(248, 188, 125, 0.18)', aliases: ['programacion', 'codigo', 'web', 'codex'] },
  { id: 'idiomas', label: 'Idiomas', color: '#c6b4ff', soft: 'rgba(198, 180, 255, 0.18)', aliases: ['ingles', 'idioma', 'lectura'] }
];

const AGENDA_SUBJECTS_STORAGE_KEY = 'estudiemos-room-agenda-subjects-v1';

const PRIORITIES = [
  { id: 'Alta', label: 'Alta' },
  { id: 'Media', label: 'Media' },
  { id: 'Baja', label: 'Baja' }
];

const DURATIONS = [
  { value: 25, label: '25 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h' },
  { value: 90, label: '1 h 30' },
  { value: 120, label: '2 h' }
];

const STATUS_FILTERS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Completadas' },
  { id: 'high', label: 'Prioridad alta' },
  { id: 'unscheduled', label: 'Sin fecha' }
];

function getTodayDateValue() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function isValidDateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function parseDateValue(value) {
  if (!isValidDateValue(value)) return parseDateValue(getTodayDateValue());
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setHours(12, 0, 0, 0);
  return date;
}

function getDateValue(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = parseDateValue(dateValue);
  date.setDate(date.getDate() + days);
  return getDateValue(date);
}

function getWeekStartValue(dateValue) {
  const date = parseDateValue(dateValue);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return getDateValue(date);
}

function buildMonthDays(cursorDate) {
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

function normalizeForSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sanitizeSubject(subject, index = 0) {
  const fallback = DEFAULT_SUBJECTS[index % DEFAULT_SUBJECTS.length] ?? DEFAULT_SUBJECTS[0];
  const label = String(subject?.label ?? fallback.label).replace(/\s+/g, ' ').trim().slice(0, 28) || fallback.label;
  const id = String(subject?.id ?? normalizeForSearch(label) ?? fallback.id).replace(/\s+/g, '-').trim() || fallback.id;
  return {
    ...fallback,
    id,
    label,
    color: subject?.color ?? fallback.color,
    soft: subject?.soft ?? fallback.soft,
    aliases: Array.isArray(subject?.aliases) ? subject.aliases.map(normalizeForSearch).filter(Boolean) : fallback.aliases
  };
}

function loadStoredSubjects() {
  if (typeof window === 'undefined') return DEFAULT_SUBJECTS;

  try {
    const storedSubjects = JSON.parse(window.localStorage.getItem(AGENDA_SUBJECTS_STORAGE_KEY) ?? 'null');
    if (!Array.isArray(storedSubjects) || storedSubjects.length === 0) return DEFAULT_SUBJECTS;
    return storedSubjects.map(sanitizeSubject);
  } catch {
    return DEFAULT_SUBJECTS;
  }
}

function saveStoredSubjects(subjects) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(AGENDA_SUBJECTS_STORAGE_KEY, JSON.stringify(subjects.map(sanitizeSubject)));
  } catch {
    // Local storage can be unavailable in strict/private contexts; the agenda still works for the session.
  }
}

function getItemTitle(item) {
  return String(item?.title ?? '').trim();
}

function getItemDate(item) {
  return isValidDateValue(item?.date) ? String(item.date) : '';
}

function getSubjectMeta(item, subjects = DEFAULT_SUBJECTS) {
  const storedSubject = normalizeForSearch(item?.subject);
  const searchableText = normalizeForSearch(`${item?.subject ?? ''} ${item?.title ?? ''} ${item?.detail ?? ''}`);
  return (
    subjects.find((subject) => normalizeForSearch(subject.label) === storedSubject || subject.id === storedSubject) ??
    subjects.find((subject) => subject.aliases.some((alias) => searchableText.includes(alias))) ??
    subjects[0] ??
    DEFAULT_SUBJECTS[0]
  );
}

function getPriority(item) {
  const priority = String(item?.priority ?? '').trim();
  const match = PRIORITIES.find((entry) => normalizeForSearch(entry.id) === normalizeForSearch(priority));
  if (match) return match.id;

  const text = normalizeForSearch(`${item?.title ?? ''} ${item?.detail ?? ''} ${item?.type ?? ''}`);
  if (text.includes('parcial') || text.includes('examen') || text.includes('entrega')) return 'Alta';
  if (text.includes('repaso') || text.includes('guia')) return 'Media';
  return 'Baja';
}

function getDuration(item) {
  const explicitDuration = Number(item?.durationMinutes);
  if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
    return Math.max(15, Math.min(360, explicitDuration));
  }

  const text = normalizeForSearch(`${item?.title ?? ''} ${item?.detail ?? ''}`);
  if (text.includes('parcial') || text.includes('examen')) return 120;
  if (text.includes('guia') || text.includes('tp')) return 90;
  if (text.includes('repaso')) return 60;
  return 45;
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(15, Number(minutes) || 45);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (hours > 0 && remainder > 0) return `${hours} h ${remainder} min`;
  if (hours > 0) return `${hours} h`;
  return `${safeMinutes} min`;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function formatDayLabel(dateValue) {
  return parseDateValue(dateValue).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatShortDate(dateValue) {
  if (!getItemDate({ date: dateValue })) return 'Sin fecha';
  return parseDateValue(dateValue).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function sortAgendaItems(items) {
  return [...items].sort((a, b) => {
    const aDate = getItemDate(a) || '9999-12-31';
    const bDate = getItemDate(b) || '9999-12-31';
    const dateCompare = aDate.localeCompare(bDate);
    if (dateCompare !== 0) return dateCompare;
    return getItemTitle(a).localeCompare(getItemTitle(b));
  });
}

function getAgendaStyle(item, subjects = DEFAULT_SUBJECTS) {
  const subject = getSubjectMeta(item, subjects);
  return { '--agenda-subject-color': subject.color, '--agenda-subject-soft': subject.soft };
}

function getStatusLabel(item) {
  if (item?.completed) return 'Completada';
  if (!getItemDate(item)) return 'Sin fecha';
  if (getItemDate(item) < getTodayDateValue()) return 'Atrasada';
  return 'Pendiente';
}

function getLoadMinutes(items) {
  return items.reduce((total, item) => total + (item.completed ? 0 : getDuration(item)), 0);
}

function isThisWeek(dateValue, selectedDate) {
  if (!isValidDateValue(dateValue)) return false;
  const start = getWeekStartValue(selectedDate);
  const end = addDays(start, 6);
  return dateValue >= start && dateValue <= end;
}

function isTextEntryElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable);
}

function createSubjectStats(items, subjects = DEFAULT_SUBJECTS) {
  return subjects.map((subject) => {
    const subjectItems = items.filter((item) => getSubjectMeta(item, subjects).id === subject.id && !item.completed);
    return {
      ...subject,
      count: subjectItems.length,
      load: getLoadMinutes(subjectItems)
    };
  });
}

function groupItemsByDate(items) {
  return items.reduce((groups, item) => {
    const date = getItemDate(item);
    if (!date) return groups;
    groups[date] = groups[date] ? [...groups[date], item] : [item];
    return groups;
  }, {});
}

function itemMatchesStatus(item, statusFilter) {
  if (statusFilter === 'completed') return Boolean(item.completed);
  if (statusFilter === 'high') return getPriority(item) === 'Alta' && !item.completed;
  if (statusFilter === 'unscheduled') return !getItemDate(item) && !item.completed;
  return !item.completed;
}

function TaskCard({ item, subjects, selected, compact = false, onClick }) {
  const title = getItemTitle(item);
  return (
    <button
      type="button"
      className={`agenda-task-card${compact ? ' is-compact' : ''}${selected ? ' is-selected' : ''}${item.completed ? ' is-completed' : ''}`}
      style={getAgendaStyle(item, subjects)}
      onClick={onClick}
    >
      <span className="agenda-task-subject">{getSubjectMeta(item, subjects).label}</span>
      <strong>{title || 'Tarea sin titulo'}</strong>
      <small>
        {getPriority(item)} - {formatDuration(getDuration(item))} - {getStatusLabel(item)}
      </small>
    </button>
  );
}

function TaskRow({ item, subjects, selected, onClick }) {
  return (
    <button
      type="button"
      className={`agenda-task-row-pro${selected ? ' is-selected' : ''}${item.completed ? ' is-completed' : ''}`}
      style={getAgendaStyle(item, subjects)}
      onClick={onClick}
    >
      <span className="agenda-task-row-dot" aria-hidden="true" />
      <span>
        <strong>{getItemTitle(item) || 'Tarea sin titulo'}</strong>
        <small>{getSubjectMeta(item, subjects).label} - {formatDuration(getDuration(item))}</small>
      </span>
      <em>{formatShortDate(getItemDate(item))}</em>
    </button>
  );
}

function EmptyPanel({ title, children }) {
  return (
    <div className="agenda-empty-panel">
      <FolderOpen size={22} aria-hidden="true" />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function AgendaCalendarPlanner({
  agendaItems = studyAgendaItems,
  onAgendaItemsChange = () => {},
  onBackToDesktop,
  onClose,
  active = true,
  context = 'wall'
}) {
  const shellRef = useRef(null);
  const centerRef = useRef(null);
  const titleInputRef = useRef(null);
  const todayValue = getTodayDateValue();
  const safeItems = Array.isArray(agendaItems) ? agendaItems : [];
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(todayValue);
  const [calendarCursor, setCalendarCursor] = useState(() => parseDateValue(todayValue));
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [composerOpen, setComposerOpen] = useState(safeItems.length === 0);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [draftError, setDraftError] = useState('');
  const [subjects, setSubjects] = useState(loadStoredSubjects);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    detail: '',
    subject: subjects[0]?.label ?? DEFAULT_SUBJECTS[0].label,
    date: todayValue,
    durationMinutes: '45',
    priority: 'Media'
  });

  const sortedItems = useMemo(() => sortAgendaItems(safeItems), [safeItems]);
  const filteredItems = useMemo(
    () =>
      sortedItems.filter((item) => {
        const subjectMatches = subjectFilter === 'all' || getSubjectMeta(item, subjects).id === subjectFilter;
        return subjectMatches && itemMatchesStatus(item, statusFilter);
      }),
    [sortedItems, subjectFilter, statusFilter, subjects]
  );
  const tasksByDate = useMemo(() => groupItemsByDate(filteredItems), [filteredItems]);
  const calendarDays = useMemo(() => buildMonthDays(calendarCursor), [calendarCursor]);
  const selectedDateItems = tasksByDate[selectedDate] ?? [];
  const unscheduledItems = filteredItems.filter((item) => !getItemDate(item) && !item.completed);
  const weekItems = filteredItems.filter((item) => isThisWeek(getItemDate(item), selectedDate) && !item.completed);
  const todayItems = filteredItems.filter((item) => getItemDate(item) === todayValue && !item.completed);
  const completedCount = sortedItems.filter((item) => item.completed).length;
  const subjectStats = useMemo(() => createSubjectStats(sortedItems, subjects), [sortedItems, subjects]);
  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? sortedItems[0] ?? null;

  useEffect(() => {
    saveStoredSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    if (!active) return;
    if (!isTextEntryElement(document.activeElement)) {
      shellRef.current?.focus({ preventScroll: true });
    }
  }, [active]);

  useEffect(() => {
    if (!selectedItemId && filteredItems[0]) {
      setSelectedItemId(filteredItems[0].id);
      return;
    }

    if (selectedItemId && !filteredItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(filteredItems[0]?.id ?? sortedItems[0]?.id ?? '');
    }
  }, [filteredItems, selectedItemId, sortedItems]);

  useEffect(() => {
    if (composerOpen) return;
    setDraft((current) => ({ ...current, date: selectedDate }));
  }, [composerOpen, selectedDate]);

  useEffect(() => {
    if (!active) return undefined;

    function onKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTextEntryElement(event.target)) return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        shiftMonth(event.key === 'ArrowRight' ? 1 : -1);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        centerRef.current?.scrollBy({ top: event.key === 'ArrowDown' ? 260 : -260, behavior: 'smooth' });
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackToDesktop?.();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, onBackToDesktop, selectedDate]);

  function commitItems(nextItemsOrUpdater) {
    const nextItems = typeof nextItemsOrUpdater === 'function' ? nextItemsOrUpdater(safeItems) : nextItemsOrUpdater;
    onAgendaItemsChange(nextItems);
  }

  function selectDate(dateValue) {
    if (!isValidDateValue(dateValue)) return;
    setSelectedDate(dateValue);
    setCalendarCursor(parseDateValue(dateValue));
    setViewMode((current) => (current === 'tasks' ? current : 'calendar'));
  }

  function shiftMonth(offset) {
    setCalendarCursor((current) => {
      const nextCursor = new Date(current.getFullYear(), current.getMonth() + offset, 1, 12);
      setSelectedDate(getDateValue(nextCursor));
      return nextCursor;
    });
    setViewMode('calendar');
  }

  function updateSubjectLabel(subjectId, value) {
    setSubjects((currentSubjects) =>
      currentSubjects.map((subject) => {
        if (subject.id !== subjectId) return subject;
        const nextLabel = value.replace(/\s+/g, ' ').slice(0, 28);
        const previousLabel = normalizeForSearch(subject.label);
        const aliases = previousLabel ? Array.from(new Set([...(subject.aliases ?? []), previousLabel])) : subject.aliases;
        return { ...subject, label: nextLabel, aliases };
      })
    );
  }

  function addSubject() {
    const fallback = DEFAULT_SUBJECTS[subjects.length % DEFAULT_SUBJECTS.length] ?? DEFAULT_SUBJECTS[0];
    setSubjects((currentSubjects) => [
      ...currentSubjects,
      {
        id: `materia-${Date.now()}`,
        label: 'Nueva materia',
        color: fallback.color,
        soft: fallback.soft,
        aliases: []
      }
    ]);
    setEditingSubjects(true);
  }

  function openComposer(dateValue = selectedDate) {
    setComposerOpen(true);
    setDraftError('');
    setDraft((current) => ({
      ...current,
      date: isValidDateValue(dateValue) ? dateValue : ''
    }));
    window.requestAnimationFrame(() => titleInputRef.current?.focus({ preventScroll: true }));
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (draftError) setDraftError('');
  }

  function createTask(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setDraftError('Escribi una tarea para guardarla.');
      titleInputRef.current?.focus({ preventScroll: true });
      return;
    }

    const date = isValidDateValue(draft.date) ? draft.date : '';
    const nextItem = {
      id: `agenda-task-${Date.now()}-${safeItems.length}`,
      date,
      time: '',
      title,
      detail: draft.detail.trim(),
      subject: draft.subject,
      durationMinutes: Number(draft.durationMinutes) || 45,
      priority: draft.priority,
      type: draft.priority === 'Alta' ? 'entrega' : 'repaso',
      completed: false
    };

    commitItems([...safeItems, nextItem]);
    setSelectedItemId(nextItem.id);
    if (date) selectDate(date);
    setComposerOpen(false);
    setDraft((current) => ({ ...current, title: '', detail: '', date: selectedDate }));
  }

  function updateItem(itemId, patch) {
    commitItems((items) => items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function removeItem(itemId) {
    commitItems((items) => items.filter((item) => item.id !== itemId));
  }

  function selectItem(item) {
    setSelectedItemId(item.id);
    const itemDate = getItemDate(item);
    if (itemDate) {
      setSelectedDate(itemDate);
      setCalendarCursor(parseDateValue(itemDate));
    }
  }

  return (
    <div
      ref={shellRef}
      className={`agenda-calendar-planner agenda-app-shell agenda-calendar-context-${context}`}
      tabIndex={0}
      aria-label="Agenda de estudio"
    >
      <aside className="agenda-calendar-sidebar" aria-label="Navegacion de agenda">
        <div className="agenda-calendar-brand">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <span>Agenda</span>
            <strong>Planner academico</strong>
          </div>
        </div>

        <nav className="agenda-calendar-nav" aria-label="Vistas">
          <button type="button" className={viewMode === 'today' ? 'is-active' : ''} onClick={() => { setViewMode('today'); selectDate(todayValue); }}>
            <Clock3 size={16} aria-hidden="true" />
            <span>Hoy</span>
            <small>{todayItems.length}</small>
          </button>
          <button type="button" className={viewMode === 'calendar' ? 'is-active' : ''} onClick={() => setViewMode('calendar')}>
            <CalendarDays size={16} aria-hidden="true" />
            <span>Calendario</span>
            <small>{filteredItems.filter((item) => getItemDate(item)).length}</small>
          </button>
          <button type="button" className={viewMode === 'tasks' ? 'is-active' : ''} onClick={() => setViewMode('tasks')}>
            <FileText size={16} aria-hidden="true" />
            <span>Tareas</span>
            <small>{filteredItems.length}</small>
          </button>
        </nav>

        <section className="agenda-calendar-filter-group" aria-label="Materias">
          <div className="agenda-subjects-head">
            <span>Materias</span>
            <button type="button" className="agenda-subject-edit-toggle" onClick={() => setEditingSubjects((current) => !current)}>
              {editingSubjects ? 'Listo' : 'Editar'}
            </button>
          </div>
          {editingSubjects ? (
            <div className="agenda-subject-edit-list">
              {subjects.map((subject) => (
                <label key={subject.id} style={{ '--agenda-subject-color': subject.color, '--agenda-subject-soft': subject.soft }}>
                  <i className="agenda-subject-dot" aria-hidden="true" />
                  <input
                    type="text"
                    value={subject.label}
                    maxLength={28}
                    aria-label={`Editar materia ${subject.label}`}
                    onChange={(event) => updateSubjectLabel(subject.id, event.target.value)}
                  />
                </label>
              ))}
              <button type="button" className="agenda-add-subject-button" onClick={addSubject}>
                <Plus size={14} aria-hidden="true" />
                <span>Nueva materia</span>
              </button>
            </div>
          ) : (
            <>
              <button type="button" className={subjectFilter === 'all' ? 'is-active' : ''} onClick={() => setSubjectFilter('all')}>
                <i className="agenda-subject-dot" />
                <strong>Todas</strong>
                <small>{sortedItems.filter((item) => !item.completed).length}</small>
              </button>
              {subjectStats.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  className={subjectFilter === subject.id ? 'is-active' : ''}
                  style={{ '--agenda-subject-color': subject.color, '--agenda-subject-soft': subject.soft }}
                  onClick={() => setSubjectFilter(subject.id)}
                >
                  <i className="agenda-subject-dot" />
                  <strong>{subject.label}</strong>
                  <small>{subject.count}</small>
                  <em style={{ '--agenda-load': `${Math.min(100, subject.load / 4)}%` }} />
                </button>
              ))}
            </>
          )}
        </section>

        <section className="agenda-calendar-filter-group" aria-label="Estados y filtros">
          <span>Estados</span>
          {STATUS_FILTERS.map((filter) => (
            <button key={filter.id} type="button" className={statusFilter === filter.id ? 'is-active' : ''} onClick={() => setStatusFilter(filter.id)}>
              <strong>{filter.label}</strong>
            </button>
          ))}
        </section>
      </aside>

      <main className="agenda-calendar-main" aria-label="Calendario y tareas">
        <header className="agenda-calendar-header">
          <div>
            <span>Plan de estudio</span>
            <h2>{viewMode === 'today' ? formatDayLabel(todayValue) : viewMode === 'tasks' ? 'Todas las tareas' : formatMonthLabel(calendarCursor)}</h2>
            <p>
              {sortedItems.length === 0
                ? 'Todavia no hay tareas cargadas.'
                : `${sortedItems.filter((item) => !item.completed).length} pendientes - ${formatDuration(getLoadMinutes(sortedItems))} estimados`}
            </p>
          </div>

          <div className="agenda-calendar-actions">
            {onBackToDesktop && (
              <button type="button" onClick={onBackToDesktop}>
                <Home size={16} aria-hidden="true" />
                <span>Escritorio</span>
              </button>
            )}
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => selectDate(todayValue)}>
              Hoy
            </button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            {onClose && (
              <button type="button" className="agenda-calendar-close" onClick={onClose} aria-label="Cerrar agenda">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        <section ref={centerRef} className="agenda-calendar-scroll">
          {viewMode === 'calendar' && (
            <section className="agenda-month-board" aria-label="Calendario mensual">
              <div className="agenda-month-weekdays" aria-hidden="true">
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="agenda-month-grid">
                {calendarDays.map((day) => {
                  const dayItems = tasksByDate[day.value] ?? [];
                  return (
                    <article
                      key={day.value}
                      className={`agenda-month-day${day.isCurrentMonth ? '' : ' is-outside'}${day.value === selectedDate ? ' is-selected' : ''}${day.isToday ? ' is-today' : ''}`}
                    >
                      <button
                        type="button"
                        className="agenda-day-number"
                        onClick={() => selectDate(day.value)}
                        aria-current={day.value === selectedDate ? 'date' : undefined}
                      >
                        <span>{day.day}</span>
                        {dayItems.length > 0 && <small>{dayItems.length}</small>}
                      </button>
                      <div className="agenda-day-task-stack">
                        {dayItems.slice(0, 3).map((item) => (
                          <TaskCard key={item.id} item={item} subjects={subjects} compact selected={selectedItem?.id === item.id} onClick={() => selectItem(item)} />
                        ))}
                        {dayItems.length > 3 && <span className="agenda-more-tasks">+{dayItems.length - 3} mas</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {viewMode === 'today' && (
            <section className="agenda-focus-board" aria-label="Tareas de hoy">
              <div className="agenda-focus-hero">
                <span>Hoy</span>
                <strong>{todayItems.length} tareas pendientes</strong>
                <p>{todayItems.length > 0 ? `Carga estimada: ${formatDuration(getLoadMinutes(todayItems))}` : 'Dia libre o sin tareas cargadas.'}</p>
              </div>
              <div className="agenda-focus-list">
                {todayItems.length === 0 && <EmptyPanel title="Sin tareas para hoy">Agrega una tarea o deja el dia despejado.</EmptyPanel>}
                {todayItems.map((item) => (
                  <TaskCard key={item.id} item={item} subjects={subjects} selected={selectedItem?.id === item.id} onClick={() => selectItem(item)} />
                ))}
              </div>
            </section>
          )}

          {viewMode === 'tasks' && (
            <section className="agenda-all-tasks" aria-label="Tareas por materia">
              {filteredItems.length === 0 && <EmptyPanel title="Sin tareas visibles">Cambia el filtro o crea una tarea nueva.</EmptyPanel>}
              {subjects.map((subject) => {
                const subjectItems = filteredItems.filter((item) => getSubjectMeta(item, subjects).id === subject.id);
                if (subjectItems.length === 0) return null;
                return (
                  <article key={subject.id} className="agenda-subject-column" style={{ '--agenda-subject-color': subject.color, '--agenda-subject-soft': subject.soft }}>
                    <header>
                      <i className="agenda-subject-dot" />
                      <strong>{subject.label}</strong>
                      <small>{subjectItems.length}</small>
                    </header>
                    {subjectItems.map((item) => (
                      <TaskRow key={item.id} item={item} subjects={subjects} selected={selectedItem?.id === item.id} onClick={() => selectItem(item)} />
                    ))}
                  </article>
                );
              })}
            </section>
          )}
        </section>
      </main>

      <aside className="agenda-calendar-right" aria-label="Organizador lateral">
        <button type="button" className="agenda-new-task-button" onClick={() => openComposer(selectedDate)}>
          <Plus size={18} aria-hidden="true" />
          <span>Nueva tarea</span>
        </button>

        {composerOpen && (
          <form className="agenda-task-composer" onSubmit={createTask} aria-label="Crear tarea">
            <label className="agenda-composer-title">
              <span>Tarea</span>
              <input
                ref={titleInputRef}
                type="text"
                value={draft.title}
                maxLength={64}
                placeholder="Ej: resolver guia de integrales"
                onChange={(event) => updateDraft('title', event.target.value)}
              />
            </label>
            <label>
              <span>Materia</span>
              <select value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.label}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="agenda-composer-grid">
              <label>
                <span>Fecha</span>
                <input type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
              </label>
              <label>
                <span>Duracion</span>
                <select value={draft.durationMinutes} onChange={(event) => updateDraft('durationMinutes', event.target.value)}>
                  {DURATIONS.map((duration) => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Prioridad</span>
              <select value={draft.priority} onChange={(event) => updateDraft('priority', event.target.value)}>
                {PRIORITIES.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Notas</span>
              <textarea
                value={draft.detail}
                maxLength={140}
                placeholder="Material, objetivo o recordatorio"
                onChange={(event) => updateDraft('detail', event.target.value)}
              />
            </label>
            {draftError && <p className="agenda-composer-error">{draftError}</p>}
            <div className="agenda-composer-actions">
              <button type="button" onClick={() => updateDraft('date', '')}>
                Sin fecha
              </button>
              <button type="submit" className="is-primary" data-enter-default>
                <Plus size={16} aria-hidden="true" />
                Agregar
              </button>
            </div>
          </form>
        )}

        <TaskDetail
          item={selectedItem}
          subjects={subjects}
          activeSessionId={activeSessionId}
          onStartSession={setActiveSessionId}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
        />

        <section className="agenda-side-section">
          <header>
            <strong>Tareas sin fecha</strong>
            <span>{unscheduledItems.length}</span>
          </header>
            <div className="agenda-side-list">
              {unscheduledItems.length === 0 && <p>No hay tareas sin planificar.</p>}
              {unscheduledItems.slice(0, 5).map((item) => (
              <TaskRow key={item.id} item={item} subjects={subjects} selected={selectedItem?.id === item.id} onClick={() => selectItem(item)} />
            ))}
          </div>
        </section>

        <section className="agenda-side-section">
          <header>
            <strong>Esta semana</strong>
            <span>{weekItems.length}</span>
          </header>
            <div className="agenda-side-list">
              {weekItems.length === 0 && <p>Sin pendientes para esta semana.</p>}
              {weekItems.slice(0, 5).map((item) => (
              <TaskRow key={item.id} item={item} subjects={subjects} selected={selectedItem?.id === item.id} onClick={() => selectItem(item)} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function TaskDetail({ item, subjects, activeSessionId, onStartSession, onUpdateItem, onRemoveItem }) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [item?.id]);

  if (!item) {
    return <EmptyPanel title="Selecciona una tarea">El detalle aparece aca cuando elijas una tarjeta.</EmptyPanel>;
  }

  return (
    <section className={`agenda-task-detail${editing ? ' is-editing' : ''}`} style={getAgendaStyle(item, subjects)} aria-label="Detalle de tarea">
      <header>
        <span>{getStatusLabel(item)}</span>
        <h3>{getItemTitle(item) || 'Tarea sin titulo'}</h3>
        <p>{getSubjectMeta(item, subjects).label} - {formatDuration(getDuration(item))} - {getPriority(item)}</p>
        {item.detail && <p className="agenda-detail-note">{item.detail}</p>}
      </header>

      <div className="agenda-detail-actions-pro">
        <button type="button" className="is-primary" onClick={() => onStartSession(item.id)}>
          <Play size={16} aria-hidden="true" />
          <span>{activeSessionId === item.id ? 'Sesion activa' : 'Empezar sesion'}</span>
        </button>
        <button type="button" onClick={() => onUpdateItem(item.id, { completed: !item.completed })}>
          {item.completed ? <Square size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          <span>{item.completed ? 'Reabrir' : 'Completar'}</span>
        </button>
      </div>

      <button type="button" className="agenda-detail-edit-toggle" onClick={() => setEditing((current) => !current)}>
        {editing ? 'Cerrar edicion' : 'Editar tarea'}
      </button>

      {editing && (
        <div className="agenda-detail-editor-pro">
          <label>
            <span>Titulo</span>
            <input type="text" value={item.title ?? ''} maxLength={64} onChange={(event) => onUpdateItem(item.id, { title: event.target.value })} />
          </label>
          <label>
            <span>Materia</span>
            <select value={getSubjectMeta(item, subjects).label} onChange={(event) => onUpdateItem(item.id, { subject: event.target.value })}>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.label}>
                  {subject.label}
                </option>
              ))}
            </select>
          </label>
          <div className="agenda-composer-grid">
            <label>
              <span>Fecha</span>
              <input type="date" value={getItemDate(item)} onChange={(event) => onUpdateItem(item.id, { date: event.target.value })} />
            </label>
            <label>
              <span>Duracion</span>
              <select value={String(getDuration(item))} onChange={(event) => onUpdateItem(item.id, { durationMinutes: Number(event.target.value) })}>
                {DURATIONS.map((duration) => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span>Prioridad</span>
            <select value={getPriority(item)} onChange={(event) => onUpdateItem(item.id, { priority: event.target.value })}>
              {PRIORITIES.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Notas</span>
            <textarea value={item.detail ?? ''} maxLength={140} onChange={(event) => onUpdateItem(item.id, { detail: event.target.value })} />
          </label>
          <div className="agenda-detail-secondary-actions">
            <button type="button" onClick={() => onUpdateItem(item.id, { date: '' })}>Sin fecha</button>
            <button type="button" className="agenda-delete-task-button" onClick={() => onRemoveItem(item.id)}>
              <Trash2 size={16} aria-hidden="true" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
