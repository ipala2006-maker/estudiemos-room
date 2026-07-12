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
      title: 'Fisica I',
      detail: 'Mediciones y ejercicios guiados',
      completed: false
    },
    {
      id: `agenda-analisis-matematico-${getAgendaDateValue(0)}`,
      date: getAgendaDateValue(0),
      time: '11:00',
      title: 'Analisis Matematico',
      detail: 'Limites, continuidad y repaso corto',
      completed: false
    },
    {
      id: `agenda-practica-${getAgendaDateValue(1)}`,
      date: getAgendaDateValue(1),
      time: '15:30',
      title: 'Practica',
      detail: 'Enviar un recurso a la pantalla principal',
      completed: false
    },
    {
      id: `agenda-cierre-${getAgendaDateValue(2)}`,
      date: getAgendaDateValue(2),
      time: '18:00',
      title: 'Cierre',
      detail: 'Resumen semanal y pendientes',
      completed: false
    }
  ];
}

export const studyAgendaItems = createStudyAgendaItems();

export function getStudyAgendaBoardLines(limit = 4, items = studyAgendaItems) {
  return items.slice(0, limit).map((item) => `${item.time}  ${item.title}`);
}
