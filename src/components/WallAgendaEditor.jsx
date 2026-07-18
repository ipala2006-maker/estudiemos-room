import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eraser,
  Plus,
  Square,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createStudyAgendaItems } from '../data/studyAgenda.js';

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

function sortAgendaItems(items) {
  return [...items].sort((a, b) => `${a.date ?? ''} ${a.time ?? ''}`.localeCompare(`${b.date ?? ''} ${b.time ?? ''}`));
}

function getNextAgendaTime(items, dateValue) {
  const dayItems = sortAgendaItems(items).filter((item) => item.date === dateValue && item.time);
  const lastTime = dayItems.at(-1)?.time;
  return lastTime ? addAgendaMinutes(lastTime, 60) : getRoundedAgendaTime();
}

function getAgendaDisplayTitle(item) {
  return String(item?.title ?? '').trim() || 'Bloque sin titulo';
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

function isTextEntryElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable);
}

function getArrowScrollDelta(key) {
  if (key === 'ArrowUp') return [0, -220];
  if (key === 'ArrowDown') return [0, 220];
  if (key === 'ArrowLeft') return [-220, 0];
  if (key === 'ArrowRight') return [220, 0];
  return null;
}

function scrollPanelBy(targetRef, left, top) {
  const element = targetRef.current;
  if (!element) return;
  element.scrollBy({ left, top, behavior: 'smooth' });
}

function useArrowKeyScroll(active, targetRef) {
  useEffect(() => {
    if (!active) return undefined;

    function onKeyDown(event) {
      const delta = getArrowScrollDelta(event.key);
      if (!delta || isTextEntryElement(event.target)) return;

      event.preventDefault();
      scrollPanelBy(targetRef, delta[0], delta[1]);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, targetRef]);
}

function ScrollPad({ targetRef, label = 'Mover agenda' }) {
  return (
    <div className="os-scroll-pad is-light" aria-label={label}>
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

export function WallAgendaEditor({ agendaItems, onAgendaItemsChange, onClose }) {
  const shellRef = useRef(null);
  const quickTitleRef = useRef(null);
  const quickDetailRef = useRef(null);
  const initialDate = agendaItems[0]?.date ?? getTodayDateValue();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calendarCursor, setCalendarCursor] = useState(() => parseAgendaDate(initialDate));
  const [quickDate, setQuickDate] = useState(initialDate);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState(() => getNextAgendaTime(agendaItems, initialDate));
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

  useArrowKeyScroll(true, shellRef);

  useEffect(() => {
    if (!isTextEntryElement(document.activeElement)) {
      shellRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    setQuickDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setQuickTime(getNextAgendaTime(agendaItems, quickDate));
  }, [agendaItems, quickDate]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function updateItem(itemId, patch) {
    onAgendaItemsChange(agendaItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function removeItem(itemId) {
    onAgendaItemsChange(agendaItems.filter((item) => item.id !== itemId));
  }

  function selectAgendaDate(dateValue) {
    setSelectedDate(dateValue);
    setCalendarCursor(parseAgendaDate(dateValue));
  }

  function shiftCalendarMonth(offset) {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  function focusMissingInput(title, detail) {
    if (!title) {
      quickTitleRef.current?.focus({ preventScroll: true });
      return true;
    }

    if (!detail) {
      quickDetailRef.current?.focus({ preventScroll: true });
      return true;
    }

    return false;
  }

  function addItemForSelectedDate() {
    const targetDate = quickDate || selectedDate || getTodayDateValue();
    const title = quickTitle.trim();
    const detail = quickDetail.trim();
    if (focusMissingInput(title, detail)) return null;

    const time = quickTime || getNextAgendaTime(agendaItems, targetDate);
    const nextAgendaItem = {
      id: `wall-agenda-${Date.now()}-${agendaItems.length}`,
      date: targetDate,
      time,
      title,
      detail,
      completed: false
    };

    onAgendaItemsChange([...agendaItems, nextAgendaItem]);
    setQuickTitle('');
    setQuickDetail('');
    selectAgendaDate(targetDate);
    setQuickTime(addAgendaMinutes(time, 60));
    quickTitleRef.current?.focus({ preventScroll: true });
    return nextAgendaItem;
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
      onAgendaItemsChange(agendaItems.filter((item) => item.date !== selectedDate));
    }
  }

  function clearAllAgenda() {
    if (agendaItems.length === 0) return;
    if (window.confirm('Vaciar toda la agenda?')) {
      onAgendaItemsChange([]);
    }
  }

  function restoreInitialAgenda() {
    if (window.confirm('Restaurar la agenda inicial? Se reemplaza la agenda actual.')) {
      const restoredItems = createStudyAgendaItems();
      const nextDate = restoredItems[0]?.date ?? getTodayDateValue();
      onAgendaItemsChange(restoredItems);
      selectAgendaDate(nextDate);
      setQuickDate(nextDate);
    }
  }

  return (
    <section className="wall-agenda-editor-overlay" role="dialog" aria-modal="true" aria-label="Editar agenda">
      <div className="wall-agenda-editor wall-agenda-pc-design estudiemos-os-live-desktop">
        <div className="os-fullscreen-app agenda-app-shell" ref={shellRef} tabIndex={0}>
          <header className="agenda-app-header">
            <div>
              <span>Agenda sincronizada</span>
              <h2>Plan de estudio de la sala</h2>
              <p>Los cambios se reflejan en el cartel de pared y en la computadora.</p>
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
              <button type="button" className="agenda-close-button" onClick={onClose} aria-label="Cerrar agenda">
                <X size={18} aria-hidden="true" />
              </button>
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
                <label className="agenda-quick-title">
                  <span>Titulo rapido</span>
                  <input
                    ref={quickTitleRef}
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
                    ref={quickDetailRef}
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
                      onClick={() => updateItem(item.id, { completed: !item.completed })}
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
                          onChange={(event) => updateItem(item.id, { date: event.target.value })}
                        />
                      </label>

                      <label>
                        <span>Hora</span>
                        <input
                          type="time"
                          value={item.time ?? ''}
                          onChange={(event) => updateItem(item.id, { time: event.target.value })}
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
                          onChange={(event) => updateItem(item.id, { title: event.target.value })}
                        />
                      </label>

                      <label className="agenda-detail-field">
                        <span>Detalle</span>
                        <textarea
                          value={item.detail ?? ''}
                          maxLength={96}
                          placeholder="Objetivo, guia o material"
                          onChange={(event) => updateItem(item.id, { detail: event.target.value })}
                        />
                      </label>
                    </div>

                    <button type="button" className="agenda-remove-button" onClick={() => removeItem(item.id)} aria-label={`Eliminar ${item.title}`}>
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </div>
    </section>
  );
}
