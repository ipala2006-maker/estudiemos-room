import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eraser,
  FileText,
  FolderOpen,
  Home,
  ListChecks,
  PencilLine,
  Plus,
  Square,
  Tag,
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

const EXTRACURRICULAR_SUBJECT = {
  id: 'extracurricular',
  label: 'Extracurricular',
  color: '#9dd8c8',
  soft: 'rgba(157, 216, 200, 0.18)',
  aliases: ['extracurricular', 'personal', 'club', 'actividad']
};

const SUBJECT_PALETTE = [
  { color: '#ead58f', soft: 'rgba(234, 213, 143, 0.18)' },
  { color: '#a9c7ff', soft: 'rgba(169, 199, 255, 0.18)' },
  { color: '#88d8c5', soft: 'rgba(136, 216, 197, 0.18)' },
  { color: '#f2b6d0', soft: 'rgba(242, 182, 208, 0.18)' },
  { color: '#f8bc7d', soft: 'rgba(248, 188, 125, 0.18)' },
  { color: '#c6b4ff', soft: 'rgba(198, 180, 255, 0.18)' }
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
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Completadas' },
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
  const availableSubjects = [...subjects, EXTRACURRICULAR_SUBJECT];
  const storedSubject = normalizeForSearch(item?.subject);
  const searchableText = normalizeForSearch(`${item?.subject ?? ''} ${item?.title ?? ''} ${item?.detail ?? ''}`);
  return (
    availableSubjects.find((subject) => normalizeForSearch(subject.label) === storedSubject || subject.id === storedSubject) ??
    availableSubjects.find((subject) => subject.aliases.some((alias) => searchableText.includes(alias))) ??
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

function getTags(item) {
  if (Array.isArray(item?.tags)) {
    return item.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean).slice(0, 6);
  }

  return String(item?.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function parseTagsInput(value) {
  return String(value ?? '')
    .split(',')
    .map((tag) => tag.replace(/\s+/g, ' ').trim().slice(0, 18))
    .filter(Boolean)
    .slice(0, 6);
}

function getStatusLabel(item) {
  if (item?.completed) return 'Completada';
  if (!getItemDate(item)) return 'Sin fecha';
  if (getItemDate(item) < getTodayDateValue()) return 'Atrasada';
  return 'Pendiente';
}

function getSimpleStatusLabel(item) {
  return item?.completed ? 'Completada' : 'Pendiente';
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
  if (statusFilter === 'all') return true;
  if (statusFilter === 'completed') return Boolean(item.completed);
  if (statusFilter === 'unscheduled') return !getItemDate(item) && !item.completed;
  return !item.completed;
}

function TaskCard({ item, subjects, selected, compact = false, onClick, onToggleComplete, onEdit, onRemove }) {
  const title = getItemTitle(item);

  function runAction(event, callback) {
    event.stopPropagation();
    callback?.(item);
  }

  return (
    <article
      className={`agenda-task-card${compact ? ' is-compact' : ''}${selected ? ' is-selected' : ''}${item.completed ? ' is-completed' : ''}`}
      style={getAgendaStyle(item, subjects)}
    >
      <button type="button" className="agenda-task-card-main" onClick={onClick}>
        <span className="agenda-task-subject">{getSubjectMeta(item, subjects).label}</span>
        <strong>{title || 'Tarea sin titulo'}</strong>
        <small>
          {getPriority(item)} - {formatDuration(getDuration(item))} - {getStatusLabel(item)}
        </small>
      </button>
      <div className="agenda-task-card-actions" aria-label={`Acciones para ${title || 'tarea'}`}>
        <button type="button" onClick={(event) => runAction(event, onToggleComplete)} aria-label={item.completed ? 'Marcar pendiente' : 'Completar tarea'}>
          {item.completed ? <Square size={12} aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}
        </button>
        <button type="button" onClick={(event) => runAction(event, onEdit)} aria-label="Editar tarea">
          <PencilLine size={12} aria-hidden="true" />
        </button>
        <button type="button" onClick={(event) => runAction(event, onRemove)} aria-label="Eliminar tarea">
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>
    </article>
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
  const dateInputRef = useRef(null);
  const feedbackTimerRef = useRef(0);
  const todayValue = getTodayDateValue();
  const safeItems = Array.isArray(agendaItems) ? agendaItems : [];
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(todayValue);
  const [calendarCursor, setCalendarCursor] = useState(() => parseDateValue(todayValue));
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [panelMode, setPanelMode] = useState(safeItems.length === 0 ? 'create' : 'summary');
  const [composerOpen, setComposerOpen] = useState(safeItems.length === 0);
  const [draftError, setDraftError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [subjects, setSubjects] = useState(loadStoredSubjects);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    detail: '',
    subject: subjects[0]?.label ?? DEFAULT_SUBJECTS[0].label,
    date: '',
    durationMinutes: '45',
    priority: 'Media',
    tags: ''
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
  const taskSubjects = useMemo(() => [...subjects, EXTRACURRICULAR_SUBJECT], [subjects]);
  const selectedItem = sortedItems.find((item) => item.id === selectedItemId) ?? null;
  const pendingCount = sortedItems.filter((item) => !item.completed).length;
  const currentWeekItems = sortedItems.filter((item) => isThisWeek(getItemDate(item), selectedDate));

  useEffect(() => {
    saveStoredSubjects(subjects);
    if (!subjects.some((subject) => subject.id === subjectFilter)) {
      setSubjectFilter('all');
    }
    if (!taskSubjects.some((subject) => subject.label === draft.subject)) {
      setDraft((current) => ({ ...current, subject: subjects[0]?.label ?? EXTRACURRICULAR_SUBJECT.label }));
    }
  }, [subjects]);

  useEffect(() => {
    if (!active) return;
    if (!isTextEntryElement(document.activeElement)) {
      shellRef.current?.focus({ preventScroll: true });
    }
  }, [active]);

  useEffect(() => {
    if (selectedItemId && !sortedItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId('');
      setPanelMode('summary');
    }
  }, [selectedItemId, sortedItems]);

  useEffect(() => () => window.clearTimeout(feedbackTimerRef.current), []);

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

      if (event.key === 'Escape') {
        event.preventDefault();
        clearPanelSelection();
        return;
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openComposer(panelMode === 'day' ? selectedDate : '');
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
  }, [active, composerOpen, onBackToDesktop, panelMode, selectedDate, selectedItemId]);

  function commitItems(nextItemsOrUpdater) {
    const nextItems = typeof nextItemsOrUpdater === 'function' ? nextItemsOrUpdater(safeItems) : nextItemsOrUpdater;
    onAgendaItemsChange(nextItems);
  }

  function flashSaved(message = 'Guardado') {
    setSavedNotice(message);
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setSavedNotice(''), 1300);
  }

  function clearPanelSelection() {
    setComposerOpen(false);
    setDraftError('');
    setSelectedItemId('');
    setPanelMode('summary');
  }

  function selectDate(dateValue, { openPanel = true } = {}) {
    if (!isValidDateValue(dateValue)) return;
    setSelectedDate(dateValue);
    setCalendarCursor(parseDateValue(dateValue));
    setViewMode((current) => (current === 'tasks' ? current : 'calendar'));
    if (openPanel) {
      setComposerOpen(false);
      setSelectedItemId('');
      setPanelMode('day');
    }
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

  function updateSubjectColor(subjectId, paletteEntry) {
    setSubjects((currentSubjects) =>
      currentSubjects.map((subject) =>
        subject.id === subjectId
          ? { ...subject, color: paletteEntry.color, soft: paletteEntry.soft }
          : subject
      )
    );
  }

  function addSubject() {
    const fallback = DEFAULT_SUBJECTS[subjects.length % DEFAULT_SUBJECTS.length] ?? DEFAULT_SUBJECTS[0];
    setSubjects((currentSubjects) => [
      ...currentSubjects,
      {
        id: `materia-${Date.now()}`,
        label: `Materia ${currentSubjects.length + 1}`,
        color: fallback.color,
        soft: fallback.soft,
        aliases: []
      }
    ]);
    setEditingSubjects(true);
  }

  function removeSubject(subjectId) {
    if (subjects.length <= 1) return;
    const subjectToRemove = subjects.find((subject) => subject.id === subjectId);
    const nextSubjects = subjects.filter((subject) => subject.id !== subjectId);
    setSubjects(nextSubjects);

    if (subjectToRemove) {
      commitItems((items) =>
        items.map((item) =>
          normalizeForSearch(item.subject) === normalizeForSearch(subjectToRemove.label)
            ? { ...item, subject: nextSubjects[0]?.label ?? DEFAULT_SUBJECTS[0].label }
            : item
        )
      );
    }
  }

  function openComposer(dateValue = '') {
    const targetDate = isValidDateValue(dateValue) ? dateValue : panelMode === 'day' ? selectedDate : '';
    setComposerOpen(true);
    setPanelMode('create');
    setSelectedItemId('');
    setDraftError('');
    setDraft((current) => ({
      ...current,
      date: targetDate
    }));
    window.requestAnimationFrame(() => titleInputRef.current?.focus({ preventScroll: true }));
  }

  function openNativeDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus({ preventScroll: true });
    input.click();
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
      durationMinutes: Math.max(15, Math.min(360, Number(draft.durationMinutes) || 45)),
      priority: PRIORITIES.some((entry) => entry.id === draft.priority) ? draft.priority : 'Media',
      tags: parseTagsInput(draft.tags),
      type: 'tarea',
      completed: false
    };

    commitItems([...safeItems, nextItem]);
    setSelectedItemId(nextItem.id);
    if (date) selectDate(date, { openPanel: false });
    setComposerOpen(false);
    setPanelMode('task');
    setDraft((current) => ({ ...current, title: '', detail: '', date: '', tags: '' }));
    flashSaved('Tarea creada');
  }

  function updateItem(itemId, patch) {
    commitItems((items) => items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
    if (itemId === selectedItemId && Object.prototype.hasOwnProperty.call(patch, 'date') && isValidDateValue(patch.date)) {
      setSelectedDate(patch.date);
      setCalendarCursor(parseDateValue(patch.date));
    }
    flashSaved('Guardado');
  }

  function removeItem(itemId) {
    commitItems((items) => items.filter((item) => item.id !== itemId));
    if (itemId === selectedItemId) {
      setSelectedItemId('');
      setPanelMode('summary');
    }
    flashSaved('Tarea eliminada');
  }

  function duplicateItem(item) {
    if (!item) return;
    const nextItem = {
      ...item,
      id: `agenda-task-${Date.now()}-${safeItems.length}`,
      title: `${getItemTitle(item) || 'Tarea'} copia`,
      completed: false
    };
    commitItems([...safeItems, nextItem]);
    setSelectedItemId(nextItem.id);
    setPanelMode('task');
    setComposerOpen(false);
    if (getItemDate(nextItem)) selectDate(getItemDate(nextItem), { openPanel: false });
    flashSaved('Tarea duplicada');
  }

  function toggleItemComplete(item) {
    if (!item) return;
    updateItem(item.id, { completed: !item.completed });
  }

  function selectItem(item) {
    setSelectedItemId(item.id);
    setComposerOpen(false);
    setPanelMode('task');
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
                <div key={subject.id} className="agenda-subject-edit-row" style={{ '--agenda-subject-color': subject.color, '--agenda-subject-soft': subject.soft }}>
                  <label className="agenda-subject-edit-main">
                    <i className="agenda-subject-dot" aria-hidden="true" />
                    <input
                      type="text"
                      value={subject.label}
                      maxLength={28}
                      aria-label={`Editar materia ${subject.label}`}
                      onChange={(event) => updateSubjectLabel(subject.id, event.target.value)}
                    />
                  </label>
                  <div className="agenda-subject-color-list" aria-label={`Color de ${subject.label}`}>
                    {SUBJECT_PALETTE.map((paletteEntry) => (
                      <button
                        key={paletteEntry.color}
                        type="button"
                        className={`agenda-subject-color-button${paletteEntry.color === subject.color ? ' is-selected' : ''}`}
                        style={{ '--agenda-color-choice': paletteEntry.color }}
                        aria-label={`Usar color ${paletteEntry.color}`}
                        onClick={() => updateSubjectColor(subject.id, paletteEntry)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="agenda-remove-subject-button"
                    onClick={() => removeSubject(subject.id)}
                    disabled={subjects.length <= 1}
                    aria-label={`Eliminar materia ${subject.label}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button type="button" className="agenda-add-subject-button" onClick={addSubject}>
                <Plus size={14} aria-hidden="true" />
                <span>Nueva materia</span>
              </button>
            </div>
          ) : (
            <>
              <button type="button" className={subjectFilter === 'all' && statusFilter === 'all' ? 'is-active' : ''} onClick={() => { setSubjectFilter('all'); setStatusFilter('all'); }}>
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
                      onClick={() => selectDate(day.value)}
                      onDoubleClick={() => openComposer(day.value)}
                    >
                      <button
                        type="button"
                        className="agenda-day-number"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectDate(day.value);
                        }}
                        aria-current={day.value === selectedDate ? 'date' : undefined}
                      >
                        <span>{day.day}</span>
                        {dayItems.length > 0 && <small>{dayItems.length}</small>}
                      </button>
                      <button
                        type="button"
                        className="agenda-day-add-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openComposer(day.value);
                        }}
                        aria-label={`Agregar tarea el ${formatDayLabel(day.value)}`}
                      >
                        <Plus size={13} aria-hidden="true" />
                      </button>
                      <div className="agenda-day-task-stack">
                        {dayItems.slice(0, 3).map((item) => (
                          <TaskCard
                            key={item.id}
                            item={item}
                            subjects={subjects}
                            compact
                            selected={selectedItem?.id === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectItem(item);
                            }}
                            onToggleComplete={toggleItemComplete}
                            onEdit={selectItem}
                            onRemove={(targetItem) => removeItem(targetItem.id)}
                          />
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
                  <TaskCard
                    key={item.id}
                    item={item}
                    subjects={subjects}
                    selected={selectedItem?.id === item.id}
                    onClick={() => selectItem(item)}
                    onToggleComplete={toggleItemComplete}
                    onEdit={selectItem}
                    onRemove={(targetItem) => removeItem(targetItem.id)}
                  />
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
        <button type="button" className="agenda-new-task-button" onClick={() => (composerOpen ? clearPanelSelection() : openComposer())}>
          <Plus size={18} aria-hidden="true" />
          <span>{composerOpen ? 'Cerrar' : 'Nueva tarea'}</span>
        </button>

        {panelMode === 'create' && composerOpen && (
          <form className="agenda-task-composer agenda-task-composer-simple" onSubmit={createTask} aria-label="Crear tarea">
            <div className="agenda-composer-header">
              <span>Nueva tarea</span>
              <strong>Que tenes que estudiar?</strong>
            </div>
            <div className="agenda-composer-grid">
              <label>
                <span>Materia</span>
                <select value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)}>
                  {taskSubjects.map((subject) => (
                    <option key={subject.id} value={subject.label}>
                      {subject.label}
                    </option>
                  ))}
                </select>
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
            <label className="agenda-date-picker-row">
              <span>Fecha</span>
              <button type="button" className="agenda-date-picker-button" onClick={openNativeDatePicker}>
                <CalendarDays size={16} aria-hidden="true" />
                <strong>{draft.date ? formatShortDate(draft.date) : 'Elegir fecha'}</strong>
              </button>
              <input
                ref={dateInputRef}
                className="agenda-date-native-input"
                type="date"
                value={draft.date}
                aria-label="Fecha de la tarea"
                onChange={(event) => updateDraft('date', event.target.value)}
              />
            </label>
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
            <label className="agenda-composer-title">
              <span>Titulo</span>
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
              <span>Etiquetas</span>
              <input
                type="text"
                value={draft.tags}
                maxLength={80}
                placeholder="ej: parcial, lectura"
                onChange={(event) => updateDraft('tags', event.target.value)}
              />
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
              <button type="submit" className="is-primary" data-enter-default>
                <Plus size={16} aria-hidden="true" />
                Agregar
              </button>
            </div>
          </form>
        )}

        {panelMode === 'task' && selectedItem && (
          <TaskDetail
            item={selectedItem}
            subjects={subjects}
            savedNotice={savedNotice}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onDuplicateItem={duplicateItem}
            onClearSelection={clearPanelSelection}
          />
        )}

        {panelMode === 'day' && (
          <DayDetailPanel
            dateValue={selectedDate}
            items={selectedDateItems}
            subjects={subjects}
            onAddTask={openComposer}
            onSelectTask={selectItem}
            onToggleTask={toggleItemComplete}
            onRemoveTask={(item) => removeItem(item.id)}
            onClearSelection={clearPanelSelection}
          />
        )}

        {panelMode === 'summary' && (
          <AgendaSummaryPanel
            todayItems={todayItems}
            unscheduledItems={unscheduledItems}
            weekItems={weekItems}
            completedCount={completedCount}
            pendingCount={pendingCount}
            currentWeekItems={currentWeekItems}
            subjects={subjects}
            selectedItemId={selectedItemId}
            onSelectTask={selectItem}
            onAddTask={openComposer}
          />
        )}
      </aside>
    </div>
  );
}

function AgendaSummaryPanel({
  todayItems,
  unscheduledItems,
  weekItems,
  completedCount,
  pendingCount,
  currentWeekItems,
  subjects,
  selectedItemId,
  onSelectTask,
  onAddTask
}) {
  const weeklyLoad = getLoadMinutes(currentWeekItems);

  return (
    <section className="agenda-right-summary" aria-label="Resumen de agenda">
      <div className="agenda-summary-hero">
        <ListChecks size={18} aria-hidden="true" />
        <div>
          <span>Resumen</span>
          <strong>{pendingCount} pendientes</strong>
          <p>{completedCount} completadas - {formatDuration(weeklyLoad)} esta semana</p>
        </div>
      </div>

      <AgendaSideSection title="Hoy" count={todayItems.length}>
        {todayItems.length === 0 && <p>Sin tareas para hoy.</p>}
        {todayItems.slice(0, 4).map((item) => (
          <TaskRow key={item.id} item={item} subjects={subjects} selected={selectedItemId === item.id} onClick={() => onSelectTask(item)} />
        ))}
      </AgendaSideSection>

      <AgendaSideSection title="Sin fecha" count={unscheduledItems.length} actionLabel="Crear sin fecha" onAction={() => onAddTask('')}>
        {unscheduledItems.length === 0 && <p>No hay tareas sin planificar.</p>}
        {unscheduledItems.slice(0, 4).map((item) => (
          <TaskRow key={item.id} item={item} subjects={subjects} selected={selectedItemId === item.id} onClick={() => onSelectTask(item)} />
        ))}
      </AgendaSideSection>

      <AgendaSideSection title="Esta semana" count={weekItems.length}>
        {weekItems.length === 0 && <p>Sin pendientes para esta semana.</p>}
        {weekItems.slice(0, 5).map((item) => (
          <TaskRow key={item.id} item={item} subjects={subjects} selected={selectedItemId === item.id} onClick={() => onSelectTask(item)} />
        ))}
      </AgendaSideSection>
    </section>
  );
}

function AgendaSideSection({ title, count, actionLabel, onAction, children }) {
  return (
    <details className="agenda-side-section agenda-side-section-collapsible" open>
      <summary>
        <strong>{title}</strong>
        <span>{count}</span>
        {actionLabel && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAction?.();
            }}
          >
            {actionLabel}
          </button>
        )}
      </summary>
      <div className="agenda-side-list">
        {children}
      </div>
    </details>
  );
}

function DayDetailPanel({ dateValue, items, subjects, onAddTask, onSelectTask, onToggleTask, onRemoveTask, onClearSelection }) {
  const openItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  return (
    <section className="agenda-day-detail-panel" aria-label="Detalle del dia">
      <header>
        <span>Dia seleccionado</span>
        <h3>{formatDayLabel(dateValue)}</h3>
        <p>{openItems.length} pendientes - {completedItems.length} completadas - {formatDuration(getLoadMinutes(items))}</p>
      </header>

      <div className="agenda-day-detail-actions">
        <button type="button" className="is-primary" onClick={() => onAddTask(dateValue)} data-enter-default>
          <Plus size={15} aria-hidden="true" />
          <span>Agregar a este dia</span>
        </button>
        <button type="button" onClick={onClearSelection}>
          <Eraser size={15} aria-hidden="true" />
          <span>Limpiar seleccion</span>
        </button>
      </div>

      <div className="agenda-side-list">
        {items.length === 0 && <p>Este dia esta libre. Doble click en el dia o usa el boton para agregar una tarea.</p>}
        {items.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            subjects={subjects}
            selected={false}
            compact={false}
            onClick={() => onSelectTask(item)}
            onToggleComplete={onToggleTask}
            onEdit={onSelectTask}
            onRemove={onRemoveTask}
          />
        ))}
      </div>
    </section>
  );
}

function TaskDetail({ item, subjects, savedNotice, onUpdateItem, onRemoveItem, onDuplicateItem, onClearSelection }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const detailSubjects = useMemo(() => [...subjects, EXTRACURRICULAR_SUBJECT], [subjects]);
  const itemTags = getTags(item);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [item?.id]);

  if (!item) {
    return <EmptyPanel title="Selecciona una tarea">El detalle aparece aca cuando elijas una tarjeta.</EmptyPanel>;
  }

  function removeSelectedItem() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setConfirmingDelete(false);
    onRemoveItem(item.id);
  }

  return (
    <section className="agenda-task-detail is-editing" style={getAgendaStyle(item, subjects)} aria-label="Detalle de tarea">
      <header>
        <div className="agenda-detail-title-row">
          <span>{getSimpleStatusLabel(item)}</span>
          <button type="button" onClick={onClearSelection} aria-label="Cerrar detalle">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <label className="agenda-detail-title-field">
          <span>Titulo</span>
          <input
            type="text"
            value={item.title ?? ''}
            maxLength={64}
            placeholder="Tarea sin titulo"
            onChange={(event) => onUpdateItem(item.id, { title: event.target.value })}
          />
        </label>
      </header>

      <div className="agenda-detail-actions-pro">
        <button type="button" className="is-primary" onClick={() => onUpdateItem(item.id, { completed: !item.completed })}>
          {item.completed ? <Square size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          <span>{item.completed ? 'Pendiente' : 'Completada'}</span>
        </button>
        <button type="button" onClick={() => onDuplicateItem(item)}>
          <Copy size={16} aria-hidden="true" />
          <span>Duplicar</span>
        </button>
        {getItemDate(item) && (
          <button type="button" onClick={() => onUpdateItem(item.id, { date: '' })}>
            <CalendarDays size={16} aria-hidden="true" />
            <span>Sin fecha</span>
          </button>
        )}
        <button type="button" className="agenda-delete-task-button" onClick={removeSelectedItem}>
          <Trash2 size={16} aria-hidden="true" />
          <span>{confirmingDelete ? 'Confirmar' : 'Eliminar'}</span>
        </button>
      </div>

      <div className="agenda-detail-editor-pro">
        <div className="agenda-detail-grid">
          <label>
            <span>Estado</span>
            <select value={item.completed ? 'completed' : 'pending'} onChange={(event) => onUpdateItem(item.id, { completed: event.target.value === 'completed' })}>
              <option value="pending">Pendiente</option>
              <option value="completed">Completada</option>
            </select>
          </label>
          <label>
            <span>Materia</span>
            <select value={getSubjectMeta(item, subjects).label} onChange={(event) => onUpdateItem(item.id, { subject: event.target.value })}>
              {detailSubjects.map((subject) => (
                <option key={subject.id} value={subject.label}>
                  {subject.label}
                </option>
              ))}
            </select>
          </label>
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
        </div>

        <label>
          <span>Etiquetas</span>
          <div className="agenda-tags-input-shell">
            <Tag size={14} aria-hidden="true" />
            <input
              type="text"
              value={itemTags.join(', ')}
              maxLength={80}
              placeholder="parcial, lectura"
              onChange={(event) => onUpdateItem(item.id, { tags: parseTagsInput(event.target.value) })}
            />
          </div>
        </label>

        <label>
          <span>Notas</span>
          <textarea value={item.detail ?? ''} maxLength={180} placeholder="Material, objetivo o recordatorio" onChange={(event) => onUpdateItem(item.id, { detail: event.target.value })} />
        </label>

        {itemTags.length > 0 && (
          <div className="agenda-tag-list">
            {itemTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        <p className={`agenda-save-feedback${savedNotice ? ' is-visible' : ''}`}>
          {savedNotice || ' '}
        </p>
      </div>
    </section>
  );
}
