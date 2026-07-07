export const studyAgendaItems = [
  {
    time: '09:00',
    title: 'Fisica I',
    detail: 'Mediciones y ejercicios guiados'
  },
  {
    time: '11:00',
    title: 'Analisis Matematico',
    detail: 'Limites, continuidad y repaso corto'
  },
  {
    time: '15:30',
    title: 'Practica',
    detail: 'Enviar un recurso a la pantalla principal'
  },
  {
    time: '18:00',
    title: 'Cierre',
    detail: 'Resumen semanal y pendientes'
  }
];

export function getStudyAgendaBoardLines(limit = 4, items = studyAgendaItems) {
  return items.slice(0, limit).map((item) => `${item.time}  ${item.title}`);
}
