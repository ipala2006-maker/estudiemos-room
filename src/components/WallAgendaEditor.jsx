import { CalendarDays, CheckCircle2, Eraser, Plus, Square, Trash2, X } from 'lucide-react';
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

export function WallAgendaEditor({ agendaItems, onAgendaItemsChange, onClose }) {
  const initialDate = agendaItems[0]?.date ?? getTodayDateValue();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDetail, setDraftDetail] = useState('');
  const [draftTime, setDraftTime] = useState(() => getNextAgendaTime(agendaItems, initialDate));
  const titleInputRef = useRef(null);
  const sortedAgendaItems = useMemo(() => sortAgendaItems(agendaItems), [agendaItems]);
  const selectedItems = useMemo(
    () => sortedAgendaItems.filter((item) => item.date === selectedDate),
    [selectedDate, sortedAgendaItems]
  );
  const nextItem = sortedAgendaItems.find((item) => !item.completed) ?? sortedAgendaItems[0] ?? null;

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
    const nextAgendaItem = {
      id: `wall-agenda-${Date.now()}-${agendaItems.length}`,
      date: targetDate,
      time: draftTime || getNextAgendaTime(agendaItems, targetDate),
      title: draftTitle.trim() || 'Nuevo bloque',
      detail: draftDetail.trim() || 'Objetivo de estudio',
      completed: false
    };

    onAgendaItemsChange([...agendaItems, nextAgendaItem]);
    setDraftTitle('');
    setDraftDetail('');
    setDraftTime(addAgendaMinutes(nextAgendaItem.time, 60));
    titleInputRef.current?.focus({ preventScroll: true });
  }

  function clearSelectedDate() {
    if (selectedItems.length === 0) return;
    onAgendaItemsChange(agendaItems.filter((item) => item.date !== selectedDate));
  }

  return (
    <section className="wall-agenda-editor-overlay" role="dialog" aria-modal="true" aria-label="Editar agenda de pared">
      <div className="wall-agenda-editor">
        <header className="wall-agenda-editor-header">
          <div>
            <span>Agenda de pared</span>
            <h2>{formatAgendaDateLabel(selectedDate)}</h2>
            <p>{nextItem ? `${nextItem.time || '--:--'} ${nextItem.title || 'Bloque sin titulo'}` : 'Agenda vacia'}</p>
          </div>
          <button type="button" className="wall-agenda-close" onClick={onClose} aria-label="Cerrar agenda de pared">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <section className="wall-agenda-summary" aria-label="Resumen de agenda">
          <div>
            <span>Total</span>
            <strong>{agendaItems.length}</strong>
          </div>
          <div>
            <span>Dia</span>
            <strong>{selectedItems.length}</strong>
          </div>
          <div>
            <span>Pendientes</span>
            <strong>{agendaItems.filter((item) => !item.completed).length}</strong>
          </div>
        </section>

        <form className="wall-agenda-quick-add" onSubmit={addItem}>
          <label>
            <span>Fecha</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label>
            <span>Hora</span>
            <input type="time" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} />
          </label>
          <label>
            <span>Titulo</span>
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
            <span>Detalle</span>
            <input
              type="text"
              value={draftDetail}
              maxLength={96}
              placeholder="Material, objetivo o recordatorio"
              onChange={(event) => setDraftDetail(event.target.value)}
            />
          </label>
          <button type="submit" className="wall-agenda-primary">
            <Plus size={18} aria-hidden="true" />
            <span>Agregar</span>
          </button>
        </form>

        <section className="wall-agenda-day-tools">
          <div>
            <CalendarDays size={18} aria-hidden="true" />
            <strong>{selectedItems.length === 0 ? 'Sin bloques para este dia' : 'Bloques del dia'}</strong>
          </div>
          <button type="button" onClick={clearSelectedDate} disabled={selectedItems.length === 0}>
            <Eraser size={17} aria-hidden="true" />
            <span>Vaciar dia</span>
          </button>
        </section>

        <div className="wall-agenda-editor-list" aria-label="Bloques editables">
          {selectedItems.length === 0 && (
            <div className="wall-agenda-empty">
              <CalendarDays size={28} aria-hidden="true" />
              <strong>Agenda lista</strong>
              <span>Agrega un bloque para que aparezca en el cartel.</span>
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
                {item.completed ? <CheckCircle2 size={20} aria-hidden="true" /> : <Square size={20} aria-hidden="true" />}
              </button>
              <label>
                <span>Fecha</span>
                <input type="date" value={item.date ?? selectedDate} onChange={(event) => updateItem(item.id, { date: event.target.value })} />
              </label>
              <label>
                <span>Hora</span>
                <input type="time" value={item.time ?? ''} onChange={(event) => updateItem(item.id, { time: event.target.value })} />
              </label>
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
              <label>
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
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
