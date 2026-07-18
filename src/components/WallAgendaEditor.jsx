import { CalendarDays, CheckCircle2, Clock3, Plus, Square, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

function getDateValue(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString().slice(0, 10);
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  weekStart.setHours(12, 0, 0, 0);
  return weekStart;
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

function formatAgendaDateLabel(dateValue) {
  return parseAgendaDate(dateValue).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
}

function formatShortDate(dateValue) {
  return parseAgendaDate(dateValue).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  });
}

function formatWeekday(dateValue) {
  return parseAgendaDate(dateValue).toLocaleDateString('es-AR', {
    weekday: 'short'
  });
}

export function WallAgendaEditor({ agendaItems, onAgendaItemsChange, onClose }) {
  const initialDate = agendaItems[0]?.date ?? getTodayDateValue();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDetail, setDraftDetail] = useState('');
  const [draftTime, setDraftTime] = useState(() => getNextAgendaTime(agendaItems, initialDate));
  const titleInputRef = useRef(null);
  const detailInputRef = useRef(null);
  const sortedAgendaItems = useMemo(() => sortAgendaItems(agendaItems), [agendaItems]);
  const selectedItems = useMemo(
    () => sortedAgendaItems.filter((item) => item.date === selectedDate),
    [selectedDate, sortedAgendaItems]
  );
  const pendingItems = useMemo(() => sortedAgendaItems.filter((item) => !item.completed), [sortedAgendaItems]);
  const nextItem = pendingItems.find((item) => item.date >= getTodayDateValue()) ?? pendingItems[0] ?? null;
  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(parseAgendaDate(selectedDate));
    return Array.from({ length: 7 }, (_, index) => {
      const dateValue = getDateValue(addDays(weekStart, index));
      const dayItems = sortedAgendaItems.filter((item) => item.date === dateValue);
      return {
        value: dateValue,
        label: formatWeekday(dateValue),
        date: formatShortDate(dateValue),
        total: dayItems.length,
        completed: dayItems.filter((item) => item.completed).length
      };
    });
  }, [selectedDate, sortedAgendaItems]);

  useEffect(() => {
    titleInputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setDraftTime(getNextAgendaTime(agendaItems, selectedDate));
  }, [agendaItems, selectedDate]);

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

  function addItem(event) {
    event.preventDefault();
    const targetDate = selectedDate || getTodayDateValue();
    const title = draftTitle.trim();
    const detail = draftDetail.trim();

    if (!title) {
      titleInputRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!detail) {
      detailInputRef.current?.focus({ preventScroll: true });
      return;
    }

    const nextAgendaItem = {
      id: `wall-agenda-${Date.now()}-${agendaItems.length}`,
      date: targetDate,
      time: draftTime || getNextAgendaTime(agendaItems, targetDate),
      title,
      detail,
      completed: false
    };

    onAgendaItemsChange([...agendaItems, nextAgendaItem]);
    setDraftTitle('');
    setDraftDetail('');
    setDraftTime(addAgendaMinutes(nextAgendaItem.time, 60));
    titleInputRef.current?.focus({ preventScroll: true });
  }

  function chooseDate(dateValue) {
    const nextDateValue = dateValue || getTodayDateValue();
    setSelectedDate(nextDateValue);
    setDraftTime(getNextAgendaTime(agendaItems, nextDateValue));
  }

  return (
    <section className="wall-agenda-editor-overlay" role="dialog" aria-modal="true" aria-label="Editar agenda de pared">
      <div className="wall-agenda-editor">
        <header className="wall-agenda-editor-header">
          <div>
            <span>Agenda de pared</span>
            <h2>{formatAgendaDateLabel(selectedDate)}</h2>
            <p>{nextItem ? `${nextItem.time || '--:--'} - ${nextItem.title || 'Bloque sin titulo'}` : 'Agenda vacia'}</p>
          </div>
          <button type="button" className="wall-agenda-close" onClick={onClose} aria-label="Cerrar agenda de pared">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="wall-agenda-workspace">
          <aside className="wall-agenda-sidebar" aria-label="Resumen de agenda">
            <div className="wall-agenda-sidebar-card">
              <span>Fecha</span>
              <input type="date" value={selectedDate} onChange={(event) => chooseDate(event.target.value)} />
            </div>
            <button type="button" className="wall-agenda-today-button" onClick={() => chooseDate(getTodayDateValue())}>
              <CalendarDays size={16} aria-hidden="true" />
              <span>Hoy</span>
            </button>
            <div className="wall-agenda-counts">
              <span>{selectedItems.length} en el dia</span>
              <span>{pendingItems.length} pendientes</span>
            </div>
          </aside>

          <main className="wall-agenda-main" aria-label="Calendario de pared">
            <div className="wall-agenda-week-strip" aria-label="Semana">
              {weekDays.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  className={`wall-agenda-week-day${day.value === selectedDate ? ' is-selected' : ''}`}
                  onClick={() => chooseDate(day.value)}
                >
                  <span>{day.label}</span>
                  <strong>{day.date}</strong>
                  <small>{day.total === 0 ? 'Libre' : `${day.completed}/${day.total}`}</small>
                </button>
              ))}
            </div>

            <section className="wall-agenda-day-panel" aria-label="Bloques del dia seleccionado">
              <div className="wall-agenda-day-title">
                <CalendarDays size={17} aria-hidden="true" />
                <strong>{selectedItems.length === 0 ? 'Sin bloques para este dia' : 'Bloques del dia'}</strong>
              </div>

              <div className="wall-agenda-editor-list" aria-label="Bloques editables">
                {selectedItems.length === 0 && (
                  <div className="wall-agenda-empty">
                    <CalendarDays size={28} aria-hidden="true" />
                    <strong>Dia libre</strong>
                    <span>Agrega un bloque desde el panel de la derecha.</span>
                  </div>
                )}

                {selectedItems.map((item) => (
                  <article className={`wall-agenda-row${item.completed ? ' is-completed' : ''}`} key={item.id}>
                    <button
                      type="button"
                      className="wall-agenda-check"
                      onClick={() => updateItem(item.id, { completed: !item.completed })}
                      aria-label={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
                    >
                      {item.completed ? <CheckCircle2 size={19} aria-hidden="true" /> : <Square size={19} aria-hidden="true" />}
                    </button>
                    <label className="wall-agenda-row-time">
                      <span>Hora</span>
                      <input type="time" value={item.time ?? ''} onChange={(event) => updateItem(item.id, { time: event.target.value })} />
                    </label>
                    <label className="wall-agenda-row-title">
                      <span>Tarea</span>
                      <input
                        type="text"
                        value={item.title ?? ''}
                        maxLength={48}
                        placeholder="Bloque sin titulo"
                        onChange={(event) => updateItem(item.id, { title: event.target.value })}
                      />
                    </label>
                    <label className="wall-agenda-row-detail">
                      <span>Detalle</span>
                      <input
                        type="text"
                        value={item.detail ?? ''}
                        maxLength={96}
                        placeholder="Objetivo o material"
                        onChange={(event) => updateItem(item.id, { detail: event.target.value })}
                      />
                    </label>
                    <button type="button" className="wall-agenda-delete" onClick={() => removeItem(item.id)} aria-label={`Eliminar ${item.title}`}>
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <form className="wall-agenda-new-card" onSubmit={addItem} aria-label="Nuevo bloque">
            <span>Nuevo bloque</span>
            <label>
              <small>Tarea</small>
              <input
                ref={titleInputRef}
                type="text"
                value={draftTitle}
                maxLength={48}
                placeholder="Ej: Practicar integrales"
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </label>
            <label>
              <small>Detalle</small>
              <input
                ref={detailInputRef}
                type="text"
                value={draftDetail}
                maxLength={96}
                placeholder="Material u objetivo"
                onChange={(event) => setDraftDetail(event.target.value)}
              />
            </label>
            <label>
              <small>Fecha</small>
              <input type="date" value={selectedDate} onChange={(event) => chooseDate(event.target.value)} />
            </label>
            <label>
              <small>Hora</small>
              <input type="time" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} />
            </label>
            <button type="submit" className="wall-agenda-primary">
              <Plus size={18} aria-hidden="true" />
              <span>Agregar</span>
            </button>
            <p>
              <Clock3 size={14} aria-hidden="true" />
              Se sincroniza con el cartel de la sala.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
