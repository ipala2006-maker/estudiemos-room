export function getAgendaDateValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function createStudyAgendaItems() {
  return [
    {
      id: `agenda-fisica-i-${getAgendaDateValue(0)}`,
      date: getAgendaDateValue(0),
      time: '09:00',
      title: 'Resolver guia 4',
      detail: 'Movimiento circular y ejercicios guiados',
      subject: 'Fisica I',
      durationMinutes: 90,
      priority: 'Alta',
      type: 'Repaso',
      completed: false
    },
    {
      id: `agenda-analisis-matematico-${getAgendaDateValue(0)}`,
      date: getAgendaDateValue(0),
      time: '11:00',
      title: 'Repasar integrales',
      detail: 'Limites, continuidad y repaso corto',
      subject: 'Matematica',
      durationMinutes: 75,
      priority: 'Media',
      type: 'Parcial',
      completed: false
    },
    {
      id: `agenda-practica-${getAgendaDateValue(1)}`,
      date: getAgendaDateValue(1),
      time: '15:30',
      title: 'Ver recurso guardado',
      detail: 'Enviar un recurso a la pantalla principal',
      subject: 'Programacion',
      durationMinutes: 45,
      priority: 'Baja',
      type: 'Entrega',
      completed: false
    },
    {
      id: `agenda-cierre-${getAgendaDateValue(2)}`,
      date: getAgendaDateValue(2),
      time: '18:00',
      title: 'Resumen semanal',
      detail: 'Resumen semanal y pendientes',
      subject: 'Quimica',
      durationMinutes: 60,
      priority: 'Media',
      type: 'Repaso',
      completed: false
    }
  ];
}

export const studyAgendaItems = createStudyAgendaItems();

export function getStudyAgendaBoardLines(limit = 4, items = studyAgendaItems) {
  return items.slice(0, limit).map((item) => `${item.time}  ${item.title}`);
}
