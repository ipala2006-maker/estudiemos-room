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
  Wifi
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { studyAgendaItems } from '../data/studyAgenda.js';

const AGENDA_VIEWS = [
  { id: 'today', label: 'Hoy', icon: Clock3 },
  { id: 'week', label: 'Semana', icon: CalendarDays },
  { id: 'tasks', label: 'Tareas', icon: FileText }
];

const AGENDA_SUBJECTS = [
  { id: 'fisica', label: 'Fisica I', color: '#91c7ff', soft: 'rgba(145, 199, 255, 0.16)', aliases: ['fisica', 'movimiento', 'medicion', 'guia'] },
  { id: 'matematica', label: 'Matematica', color: '#d6b7ff', soft: 'rgba(214, 183, 255, 0.16)', aliases: ['matematica', 'analisis', 'integral', 'limite', 'parcial'] },
  { id: 'quimica', label: 'Quimica', color: '#8ee0bb', soft: 'rgba(142, 224, 187, 0.16)', aliases: ['quimica', 'molecula', 'estequiometria'] },
  { id: 'programacion', label: 'Programacion', color: '#ffcf8b', soft: 'rgba(255, 207, 139, 0.16)', aliases: ['programacion', 'codigo', 'practica', 'recurso'] }
];

const AGENDA_DEFAULT_SUBJECT = { id: 'estudio', label: 'Estudio', color: '#e0c47a', soft: 'rgba(224, 196, 122, 0.16)', aliases: [] };
const AGENDA_FILTERS = ['Todo', 'Parciales', 'Entregas', 'Repaso', 'Completadas'];

function getTodayDateValue() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function parseAgendaDate(value) {
  const [year, month, day] = String(value ?? getTodayDateValue()).split('-').map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

function getDateValue(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString().slice(0, 10);
}

function addAgendaDays(dateValue, days) {
  const date = parseAgendaDate(dateValue);
  date.setDate(date.getDate() + days);
  return getDateValue(date);
}

function addAgendaMinutes(timeValue, minutes) {
  const [hours, minutesValue] = String(timeValue ?? '09:00').split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutesValue) ? minutesValue : 0, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toTimeString().slice(0, 5);
}

function getRoundedAgendaTime(date = new Date()) {
  const normalizedDate = new Date(date);
  normalizedDate.setMinutes(Math.ceil(normalizedDate.getMinutes() / 30) * 30, 0, 0);
  if (normalizedDate.getMinutes() === 60) normalizedDate.setHours(normalizedDate.getHours() + 1, 0, 0, 0);
  return normalizedDate.toTimeString().slice(0, 5);
}

function sortAgendaItems(items) {
  return [...items].sort((a, b) => `${a.date ?? ''} ${a.time ?? ''}`.localeCompare(`${b.date ?? ''} ${b.time ?? ''}`));
}

function getNextAgendaTime(items, dateValue) {
  const dayItems = sortAgendaItems(items).filter((item) => item.date === dateValue && item.time);
  const lastTime = dayItems.at(-1)?.time;
  return lastTime ? addAgendaMinutes(lastTime, 60) : getRoundedAgendaTime();
}

function getWeekStartDateValue(dateValue) {
  const date = parseAgendaDate(dateValue);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return getDateValue(date);
}

function buildAgendaWeekDays(dateValue) {
  const start = getWeekStartDateValue(dateValue);
  const today = getTodayDateValue();
  return Array.from({ length: 7 }, (_, index) => {
    const value = addAgendaDays(start, index);
    const date = parseAgendaDate(value);
    return { value, label: date.toLocaleDateString('es-AR', { weekday: 'short' }), dayNumber: date.getDate(), isToday: value === today };
  });
}

function getAgendaTitle(item) {
  return String(item?.title ?? '').trim() || 'Bloque sin titulo';
}

function getAgendaSubjectMeta(item) {
  const storedSubject = String(item?.subject ?? '').trim();
  const text = `${storedSubject} ${item?.title ?? ''} ${item?.detail ?? ''}`.toLowerCase();
  return (
    AGENDA_SUBJECTS.find((subject) => subject.label.toLowerCase() === storedSubject.toLowerCase()) ??
    AGENDA_SUBJECTS.find((subject) => subject.aliases.some((alias) => text.includes(alias))) ??
    AGENDA_DEFAULT_SUBJECT
  );
}

function getAgendaDuration(item) {
  const explicitDuration = Number(item?.durationMinutes);
  if (Number.isFinite(explicitDuration) && explicitDuration > 0) return explicitDuration;
  const text = `${item?.title ?? ''} ${item?.detail ?? ''}`.toLowerCase();
  if (text.includes('parcial')) return 120;
  if (text.includes('guia')) return 90;
  if (text.includes('repaso')) return 60;
  return 45;
}

function formatAgendaDuration(minutes) {
  const safeMinutes = Math.max(15, Number(minutes) || 45);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${safeMinutes}m`;
}

function getAgendaPriority(item) {
  const storedPriority = String(item?.priority ?? '').trim();
  if (/^(alta|media|baja)$/i.test(storedPriority)) return storedPriority[0].toUpperCase() + storedPriority.slice(1).toLowerCase();
  const text = `${item?.title ?? ''} ${item?.detail ?? ''} ${item?.type ?? ''}`.toLowerCase();
  if (text.includes('parcial') || text.includes('entrega')) return 'Alta';
  if (text.includes('repaso') || text.includes('guia')) return 'Media';
  return 'Baja';
}

function getAgendaType(item) {
  const text = `${item?.type ?? ''} ${item?.title ?? ''} ${item?.detail ?? ''}`.toLowerCase();
  if (text.includes('parcial') || text.includes('examen')) return 'parciales';
  if (text.includes('entrega') || text.includes('deadline')) return 'entregas';
  return 'repaso';
}

function isAgendaItemOverdue(item) {
  return !item?.completed && String(item?.date ?? '') < getTodayDateValue();
}

function getAgendaStatus(item) {
  if (item?.completed) return 'Completada';
  if (isAgendaItemOverdue(item)) return 'Vencida';
  return 'Pendiente';
}

function formatAgendaDateCompact(dateValue) {
  return parseAgendaDate(dateValue).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatAgendaWeekRange(weekDays) {
  const firstDate = parseAgendaDate(weekDays[0]?.value ?? getTodayDateValue());
  const lastDate = parseAgendaDate(weekDays.at(-1)?.value ?? getTodayDateValue());
  const first = firstDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  const last = lastDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${first} - ${last}`;
}

function formatAgendaTimeRange(item) {
  const startTime = item?.time || '';
  if (!startTime) return 'Sin hora';
  return `${startTime} - ${addAgendaMinutes(startTime, getAgendaDuration(item))}`;
}

function getAgendaStyle(item) {
  const subject = getAgendaSubjectMeta(item);
  return { '--agenda-subject-color': subject.color, '--agenda-subject-soft': subject.soft };
}

function itemMatchesAgendaFilter(item, filterLabel) {
  const filterId = filterLabel.toLowerCase();
  if (filterId === 'completadas') return Boolean(item.completed);
  if (filterId === 'todo') return true;
  return getAgendaType(item) === filterId && !item.completed;
}

function groupAgendaItemsBySubject(items) {
  return AGENDA_SUBJECTS.map((subject) => ({ ...subject, items: items.filter((item) => getAgendaSubjectMeta(item).id === subject.id) })).filter(
    (group) => group.items.length > 0
  );
}

function getAgendaLoadMinutes(items) {
  return items.reduce((total, item) => total + (item.completed ? 0 : getAgendaDuration(item)), 0);
}

function useAgendaKeyboardScroll(targetRef) {
  useEffect(() => {
    function onKeyDown(event) {
      if (!event.key.startsWith('Arrow')) return;
      const targetName = event.target?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea'].includes(targetName)) return;
      const top = event.key === 'ArrowUp' ? -240 : event.key === 'ArrowDown' ? 240 : 0;
      const left = event.key === 'ArrowLeft' ? -240 : event.key === 'ArrowRight' ? 240 : 0;
      targetRef.current?.scrollBy({ top, left, behavior: 'smooth' });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [targetRef]);
}

export function AgendaPlannerApp({ agendaItems = studyAgendaItems, onAgendaItemsChange = () => {}, onBackToDesktop, onClose }) {
  const shellRef = useRef(null);
  const titleInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('week');
  const [weekCursor, setWeekCursor] = useState(getTodayDateValue);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('Todo');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [quickSubject, setQuickSubject] = useState(AGENDA_SUBJECTS[0].label);
  const [quickDate, setQuickDate] = useState(getTodayDateValue);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState(() => getNextAgendaTime(agendaItems, getTodayDateValue()));
  const [quickDuration, setQuickDuration] = useState('60');
  const [selectedItemId, setSelectedItemId] = useState(() => {
    const initialItems = sortAgendaItems(agendaItems);
    return initialItems.find((item) => !item.completed)?.id ?? initialItems[0]?.id ?? '';
  });

  const sortedAgendaItems = useMemo(() => sortAgendaItems(agendaItems), [agendaItems]);
  const activeAgendaItems = useMemo(() => sortedAgendaItems.filter((item) => !item.completed), [sortedAgendaItems]);
  const weekDays = useMemo(() => buildAgendaWeekDays(weekCursor), [weekCursor]);
  const visibleAgendaItems = useMemo(
    () =>
      sortedAgendaItems.filter((item) => {
        const subjectMatch = subjectFilter === 'all' || getAgendaSubjectMeta(item).id === subjectFilter;
        return subjectMatch && itemMatchesAgendaFilter(item, typeFilter);
      }),
    [sortedAgendaItems, subjectFilter, typeFilter]
  );
  const selectedItem = visibleAgendaItems.find((item) => item.id === selectedItemId) ?? visibleAgendaItems[0] ?? null;
  const todayItems = visibleAgendaItems.filter((item) => item.date === getTodayDateValue());
  const weekStart = weekDays[0]?.value ?? getTodayDateValue();
  const weekEnd = weekDays.at(-1)?.value ?? getTodayDateValue();
  const weekItems = visibleAgendaItems.filter((item) => String(item.date ?? '') >= weekStart && String(item.date ?? '') <= weekEnd);
  const taskGroups = groupAgendaItemsBySubject(visibleAgendaItems.filter((item) => !item.completed));
  const completedCount = sortedAgendaItems.filter((item) => item.completed).length;
  const completionPercent = sortedAgendaItems.length === 0 ? 0 : Math.round((completedCount / sortedAgendaItems.length) * 100);
  const nextAgendaItem = activeAgendaItems.find((item) => (item.date ?? '') >= getTodayDateValue()) ?? activeAgendaItems[0] ?? null;
  const mainPriority = todayItems.find((item) => getAgendaPriority(item) === 'Alta') ?? todayItems[0] ?? nextAgendaItem;

  useAgendaKeyboardScroll(shellRef);

  useEffect(() => {
    shellRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setQuickTime(getNextAgendaTime(agendaItems, quickDate));
  }, [agendaItems, quickDate]);

  useEffect(() => {
    if (selectedItemId && visibleAgendaItems.some((item) => item.id === selectedItemId)) return;
    setSelectedItemId(visibleAgendaItems[0]?.id ?? '');
  }, [selectedItemId, visibleAgendaItems]);

  function updateItem(itemId, patch) {
    onAgendaItemsChange(agendaItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function removeItem(itemId) {
    onAgendaItemsChange(agendaItems.filter((item) => item.id !== itemId));
  }

  function createQuickItem(event) {
    event.preventDefault();
    const targetDate = quickDate || getTodayDateValue();
    const nextItem = {
      id: `agenda-${Date.now()}-${agendaItems.length}`,
      date: targetDate,
      time: quickTime || getNextAgendaTime(agendaItems, targetDate),
      title: quickTitle.trim() || 'Nuevo bloque',
      detail: 'Objetivo de estudio',
      subject: quickSubject,
      durationMinutes: Number(quickDuration) || 60,
      priority: 'Media',
      type: 'Repaso',
      completed: false
    };

    onAgendaItemsChange([...agendaItems, nextItem]);
    setQuickTitle('');
    setSelectedItemId(nextItem.id);
    setWeekCursor(nextItem.date);
    setQuickTime(addAgendaMinutes(nextItem.time, 60));
  }

  function selectItem(item) {
    setSelectedItemId(item.id);
    setWeekCursor(item.date ?? getTodayDateValue());
  }

  function openToday() {
    setViewMode('today');
    setWeekCursor(getTodayDateValue());
    setQuickDate(getTodayDateValue());
  }

  function shiftWeek(offset) {
    setWeekCursor((current) => addAgendaDays(current, offset * 7));
  }

  return (
    <section ref={shellRef} className="computer-overlay mediahub-boot-overlay agenda-planner-overlay" data-computer-shell-state="agenda" tabIndex={-1} aria-label="Agenda de Estudiemos OS">
      <div className="computer-window computer-window-wide mediahub-window game-computer-window estudiemos-os-live-desktop agenda-planner-window">
        <main className="agenda-pro-shell">
          <aside className="agenda-pro-sidebar" aria-label="Navegacion de agenda">
            <div className="agenda-sidebar-brand">
              <CalendarDays size={20} aria-hidden="true" />
              <div><span>Agenda</span><strong>Estudio semanal</strong></div>
            </div>
            <nav className="agenda-sidebar-section" aria-label="Vistas">
              <span>Vista</span>
              {AGENDA_VIEWS.map((view) => {
                const Icon = view.icon;
                return <button key={view.id} type="button" className={viewMode === view.id ? 'is-active' : ''} onClick={() => setViewMode(view.id)}><Icon size={16} aria-hidden="true" /><span>{view.label}</span></button>;
              })}
            </nav>
            <section className="agenda-sidebar-section" aria-label="Materias">
              <span>Materias</span>
              <button type="button" className={subjectFilter === 'all' ? 'is-active' : ''} onClick={() => setSubjectFilter('all')}><span className="agenda-subject-dot" /><span>Todas</span></button>
              {AGENDA_SUBJECTS.map((subject) => (
                <button key={subject.id} type="button" className={subjectFilter === subject.id ? 'is-active' : ''} onClick={() => setSubjectFilter(subject.id)} style={{ '--agenda-subject-color': subject.color }}><span className="agenda-subject-dot" /><span>{subject.label}</span></button>
              ))}
            </section>
            <section className="agenda-sidebar-section" aria-label="Filtros">
              <span>Filtros</span>
              {AGENDA_FILTERS.map((filter) => <button key={filter} type="button" className={typeFilter === filter ? 'is-active' : ''} onClick={() => setTypeFilter(filter)}><span>{filter}</span></button>)}
            </section>
            <button type="button" className="agenda-sidebar-new" onClick={() => titleInputRef.current?.focus({ preventScroll: true })}><Plus size={16} aria-hidden="true" /><span>Nueva tarea</span></button>
          </aside>

          <section className="agenda-pro-main" aria-label="Calendario de estudio">
            <header className="agenda-pro-header">
              <div>
                <span>Planificacion</span>
                <h2>{viewMode === 'today' ? 'Plan de hoy' : viewMode === 'tasks' ? 'Tareas pendientes' : formatAgendaWeekRange(weekDays)}</h2>
                <p>{nextAgendaItem ? `Proximo: ${formatAgendaTimeRange(nextAgendaItem)} - ${getAgendaTitle(nextAgendaItem)}` : 'Tu agenda esta limpia.'}</p>
              </div>
              <div className="agenda-pro-toolbar">
                <button type="button" onClick={onBackToDesktop}><Home size={16} aria-hidden="true" /><span>Escritorio</span></button>
                <button type="button" onClick={() => shiftWeek(-1)} aria-label="Semana anterior"><ChevronLeft size={17} aria-hidden="true" /></button>
                <button type="button" onClick={openToday}>Hoy</button>
                <button type="button" onClick={() => shiftWeek(1)} aria-label="Semana siguiente"><ChevronRight size={17} aria-hidden="true" /></button>
                <button type="button" onClick={onClose}>Cerrar</button>
              </div>
            </header>

            <section className="agenda-pro-stats" aria-label="Resumen">
              <div><span>Carga de hoy</span><strong>{formatAgendaDuration(getAgendaLoadMinutes(todayItems))}</strong></div>
              <div><span>Prioridad</span><strong>{mainPriority ? getAgendaSubjectMeta(mainPriority).label : 'Libre'}</strong></div>
              <div><span>Progreso</span><strong>{completionPercent}%</strong><i style={{ '--agenda-progress': `${completionPercent}%` }} /></div>
            </section>

            <form className="agenda-pro-create" onSubmit={createQuickItem} aria-label="Crear bloque rapido">
              <select value={quickSubject} onChange={(event) => setQuickSubject(event.target.value)} aria-label="Materia">{AGENDA_SUBJECTS.map((subject) => <option key={subject.id} value={subject.label}>{subject.label}</option>)}</select>
              <input ref={titleInputRef} type="text" value={quickTitle} maxLength={48} placeholder="Agregar tarea de estudio..." onChange={(event) => setQuickTitle(event.target.value)} />
              <input type="date" value={quickDate} onChange={(event) => setQuickDate(event.target.value)} aria-label="Fecha" />
              <input type="time" value={quickTime} onChange={(event) => setQuickTime(event.target.value)} aria-label="Hora" />
              <select value={quickDuration} onChange={(event) => setQuickDuration(event.target.value)} aria-label="Duracion"><option value="45">45m</option><option value="60">1h</option><option value="90">1h 30m</option><option value="120">2h</option></select>
              <button type="submit" data-enter-default><Plus size={17} aria-hidden="true" /><span>Agregar</span></button>
            </form>

            {viewMode === 'week' && <WeekBoard weekDays={weekDays} weekItems={weekItems} selectedItem={selectedItem} onSelectItem={selectItem} onPlanDay={(date) => { setQuickDate(date); titleInputRef.current?.focus({ preventScroll: true }); }} />}
            {viewMode === 'today' && <TodayBoard items={todayItems} mainPriority={mainPriority} selectedItem={selectedItem} onSelectItem={selectItem} />}
            {viewMode === 'tasks' && <TaskBoard groups={taskGroups} selectedItem={selectedItem} onSelectItem={selectItem} />}
          </section>

          <DetailPanel selectedItem={selectedItem} activeSessionId={activeSessionId} onStartSession={setActiveSessionId} onUpdateItem={updateItem} onRemoveItem={removeItem} />
        </main>

        <footer className="virtual-windows-taskbar agenda-planner-taskbar" aria-label="Barra de tareas">
          <button type="button" className="virtual-start-button" onClick={onBackToDesktop}><Home size={18} aria-hidden="true" /><span>Escritorio</span></button>
          <div className="virtual-taskbar-tray" aria-label="Estado"><span><Wifi size={14} aria-hidden="true" />Sincronizada</span><strong>Agenda</strong></div>
        </footer>
      </div>
    </section>
  );
}

function WeekBoard({ weekDays, weekItems, selectedItem, onSelectItem, onPlanDay }) {
  return (
    <section className="agenda-week-board" aria-label="Semana de estudio">
      {weekDays.map((day) => {
        const dayItems = weekItems.filter((item) => item.date === day.value);
        return (
          <article className={`agenda-week-column${day.isToday ? ' is-today' : ''}`} key={day.value}>
            <button type="button" className="agenda-week-day-head" onClick={() => onPlanDay(day.value)}><span>{day.label}</span><strong>{day.dayNumber}</strong><small>{dayItems.length} bloque{dayItems.length === 1 ? '' : 's'}</small></button>
            <div className="agenda-week-stack">
              {dayItems.length === 0 && <button type="button" className="agenda-week-empty" onClick={() => onPlanDay(day.value)}>Planificar</button>}
              {dayItems.map((item) => <AgendaBlock key={item.id} item={item} selected={selectedItem?.id === item.id} onClick={() => onSelectItem(item)} />)}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function AgendaBlock({ item, selected, onClick }) {
  return (
    <button type="button" className={`agenda-study-block priority-${getAgendaPriority(item).toLowerCase()}${item.completed ? ' is-completed' : ''}${isAgendaItemOverdue(item) ? ' is-overdue' : ''}${selected ? ' is-selected' : ''}`} style={getAgendaStyle(item)} onClick={onClick}>
      <span>{getAgendaSubjectMeta(item).label} · {getAgendaTitle(item)}</span>
      <strong>{formatAgendaTimeRange(item)}</strong>
      <small>{getAgendaStatus(item)}</small>
    </button>
  );
}

function TodayBoard({ items, mainPriority, selectedItem, onSelectItem }) {
  return (
    <section className="agenda-today-board" aria-label="Plan de hoy">
      <div><span>Plan de hoy</span><strong>Carga estimada: {formatAgendaDuration(getAgendaLoadMinutes(items))}</strong><p>Prioridad: {mainPriority ? `${getAgendaSubjectMeta(mainPriority).label} - ${getAgendaTitle(mainPriority)}` : 'sin pendientes urgentes'}</p></div>
      <div className="agenda-today-list">
        {items.length === 0 && <p>No hay bloques para hoy. Agrega uno desde la barra superior.</p>}
        {items.map((item) => <button key={item.id} type="button" className={`agenda-today-row${selectedItem?.id === item.id ? ' is-selected' : ''}${item.completed ? ' is-completed' : ''}`} style={getAgendaStyle(item)} onClick={() => onSelectItem(item)}><time>{item.time || '--:--'}</time><span>{getAgendaSubjectMeta(item).label} · {getAgendaTitle(item)}</span><small>{formatAgendaDuration(getAgendaDuration(item))}</small></button>)}
      </div>
    </section>
  );
}

function TaskBoard({ groups, selectedItem, onSelectItem }) {
  return (
    <section className="agenda-task-board" aria-label="Tareas agrupadas por materia">
      {groups.length === 0 && <p className="agenda-task-empty">No hay tareas pendientes con estos filtros.</p>}
      {groups.map((group) => <article key={group.id} className="agenda-task-group" style={{ '--agenda-subject-color': group.color, '--agenda-subject-soft': group.soft }}><header><span className="agenda-subject-dot" /><strong>{group.label}</strong><small>{group.items.length}</small></header>{group.items.map((item) => <button key={item.id} type="button" className={`agenda-task-row${selectedItem?.id === item.id ? ' is-selected' : ''}${isAgendaItemOverdue(item) ? ' is-overdue' : ''}`} onClick={() => onSelectItem(item)}><span>{getAgendaTitle(item)}</span><small>{formatAgendaDuration(getAgendaDuration(item))} · {getAgendaPriority(item)} · {formatAgendaDateCompact(item.date)}</small></button>)}</article>)}
    </section>
  );
}

function DetailPanel({ selectedItem, activeSessionId, onStartSession, onUpdateItem, onRemoveItem }) {
  if (!selectedItem) {
    return <aside className="agenda-detail-panel" aria-label="Detalle de tarea"><div className="agenda-detail-empty"><FolderOpen size={24} aria-hidden="true" /><strong>Selecciona una tarea</strong><p>El detalle aparecera aca sin abrir modales.</p></div></aside>;
  }

  return (
    <aside className="agenda-detail-panel" aria-label="Detalle de tarea">
      <div className="agenda-detail-top" style={getAgendaStyle(selectedItem)}><span>{getAgendaStatus(selectedItem)}</span><h3>{getAgendaTitle(selectedItem)}</h3><p>{getAgendaSubjectMeta(selectedItem).label} · {formatAgendaTimeRange(selectedItem)}</p></div>
      <div className="agenda-detail-meta"><span>Duracion <strong>{formatAgendaDuration(getAgendaDuration(selectedItem))}</strong></span><span>Prioridad <strong>{getAgendaPriority(selectedItem)}</strong></span><span>Fecha <strong>{formatAgendaDateCompact(selectedItem.date)}</strong></span></div>
      <div className="agenda-detail-actions"><button type="button" className="is-primary" onClick={() => onStartSession(selectedItem.id)}><Play size={16} aria-hidden="true" /><span>{activeSessionId === selectedItem.id ? 'Sesion activa' : 'Empezar sesion'}</span></button><button type="button" onClick={() => onUpdateItem(selectedItem.id, { completed: !selectedItem.completed })}>{selectedItem.completed ? <Square size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}<span>{selectedItem.completed ? 'Reabrir' : 'Completar'}</span></button></div>
      <div className="agenda-detail-editor">
        <label><span>Titulo</span><input type="text" value={selectedItem.title ?? ''} maxLength={48} onChange={(event) => onUpdateItem(selectedItem.id, { title: event.target.value })} /></label>
        <label><span>Materia</span><select value={getAgendaSubjectMeta(selectedItem).label} onChange={(event) => onUpdateItem(selectedItem.id, { subject: event.target.value })}>{AGENDA_SUBJECTS.map((subject) => <option key={subject.id} value={subject.label}>{subject.label}</option>)}</select></label>
        <div className="agenda-detail-two"><label><span>Fecha</span><input type="date" value={selectedItem.date ?? getTodayDateValue()} onChange={(event) => onUpdateItem(selectedItem.id, { date: event.target.value })} /></label><label><span>Hora</span><input type="time" value={selectedItem.time ?? ''} onChange={(event) => onUpdateItem(selectedItem.id, { time: event.target.value })} /></label></div>
        <div className="agenda-detail-two"><label><span>Duracion</span><select value={String(getAgendaDuration(selectedItem))} onChange={(event) => onUpdateItem(selectedItem.id, { durationMinutes: Number(event.target.value) })}><option value="45">45m</option><option value="60">1h</option><option value="90">1h 30m</option><option value="120">2h</option></select></label><label><span>Prioridad</span><select value={getAgendaPriority(selectedItem)} onChange={(event) => onUpdateItem(selectedItem.id, { priority: event.target.value })}><option>Alta</option><option>Media</option><option>Baja</option></select></label></div>
        <label><span>Notas</span><textarea value={selectedItem.detail ?? ''} maxLength={96} placeholder="Notas, recurso o criterio de cierre" onChange={(event) => onUpdateItem(selectedItem.id, { detail: event.target.value })} /></label>
      </div>
      <button type="button" className="agenda-detail-remove" onClick={() => onRemoveItem(selectedItem.id)}><Trash2 size={16} aria-hidden="true" /><span>Eliminar tarea</span></button>
    </aside>
  );
}
