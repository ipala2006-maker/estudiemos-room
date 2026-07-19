import { AgendaCalendarPlanner } from './AgendaCalendarPlanner.jsx';

export function WallAgendaEditor({ agendaItems, onAgendaItemsChange, onClose }) {
  return (
    <section className="wall-agenda-editor-overlay" role="dialog" aria-modal="true" aria-label="Editar agenda">
      <div className="wall-agenda-editor wall-agenda-pc-design agenda-wall-planner-frame estudiemos-os-live-desktop">
        <AgendaCalendarPlanner
          agendaItems={agendaItems}
          onAgendaItemsChange={onAgendaItemsChange}
          onClose={onClose}
          active
          context="wall"
        />
      </div>
    </section>
  );
}
