export function getAgendaDateValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function createStudyAgendaItems() {
  return [];
}

export const studyAgendaItems = createStudyAgendaItems();

export function getStudyAgendaBoardLines(limit = 4, items = studyAgendaItems) {
  return items.slice(0, limit).map((item) => `${item.time}  ${item.title}`);
}
