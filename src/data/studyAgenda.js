export function getAgendaDateValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export const studyAgendaItems = [
  {
    id: 'agenda-fisica-i',
    date: getAgendaDateValue(0),
    time: '09:00',
    title: 'Fisica I',
    detail: 'Mediciones y ejercicios guiados'
  },
  {
    id: 'agenda-analisis-matematico',
    date: getAgendaDateValue(0),
    time: '11:00',
    title: 'Analisis Matematico',
    detail: 'Limites, continuidad y repaso corto'
  },
  {
    id: 'agenda-practica',
    date: getAgendaDateValue(1),
    time: '15:30',
    title: 'Practica',
    detail: 'Enviar un recurso a la pantalla principal'
  },
  {
    id: 'agenda-cierre',
    date: getAgendaDateValue(2),
    time: '18:00',
    title: 'Cierre',
    detail: 'Resumen semanal y pendientes'
  }
];

export function getStudyAgendaBoardLines(limit = 4, items = studyAgendaItems) {
  return items.slice(0, limit).map((item) => `${item.time}  ${item.title}`);
}
