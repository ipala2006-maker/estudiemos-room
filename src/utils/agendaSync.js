import { createStudyAgendaItems, getAgendaDateValue } from '../data/studyAgenda.js';

export const AGENDA_STORAGE_KEY = 'estudiemos-room-agenda';
export const AGENDA_SYNC_EVENT = 'estudiemos:agenda-sync';

function createAgendaItemId(item, index) {
  const titleSlug = String(item?.title ?? 'bloque')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);

  return `agenda-${String(item?.date ?? getAgendaDateValue())}-${String(item?.time ?? '00:00')}-${titleSlug || 'bloque'}-${index}`;
}

function normalizeAgendaDate(value, { allowEmpty = false } = {}) {
  const dateValue = String(value ?? '');
  if (allowEmpty && dateValue.trim() === '') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : getAgendaDateValue();
}

export function normalizeAgendaItems(items) {
  if (!Array.isArray(items)) return createStudyAgendaItems();

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item?.id ?? '').trim() || createAgendaItemId(item, index),
      date: normalizeAgendaDate(item?.date, { allowEmpty: true }),
      time: /^\d{2}:\d{2}$/.test(String(item?.time ?? '').slice(0, 5)) ? String(item?.time ?? '').slice(0, 5) : '',
      title: String(item?.title ?? '').trim().slice(0, 48),
      detail: String(item?.detail ?? '').trim().slice(0, 96),
      subject: String(item?.subject ?? '').trim().slice(0, 32),
      durationMinutes: Number.isFinite(Number(item?.durationMinutes)) ? Math.max(15, Math.min(360, Number(item.durationMinutes))) : undefined,
      priority: String(item?.priority ?? '').trim().slice(0, 16),
      type: String(item?.type ?? '').trim().slice(0, 24),
      resourceUrl: String(item?.resourceUrl ?? '').trim().slice(0, 240),
      completed: Boolean(item?.completed)
    }));
}

export function serializeAgendaItems(items) {
  return JSON.stringify(normalizeAgendaItems(items));
}

export function loadStoredAgendaItems() {
  if (typeof window === 'undefined') return createStudyAgendaItems();

  try {
    const rawAgenda = window.localStorage.getItem(AGENDA_STORAGE_KEY);
    return rawAgenda ? normalizeAgendaItems(JSON.parse(rawAgenda)) : createStudyAgendaItems();
  } catch {
    return createStudyAgendaItems();
  }
}

export function saveAgendaItems(items, { notify = true } = {}) {
  const normalizedItems = normalizeAgendaItems(items);
  const serializedItems = JSON.stringify(normalizedItems);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AGENDA_STORAGE_KEY, serializedItems);
    if (notify) {
      window.dispatchEvent(
        new CustomEvent(AGENDA_SYNC_EVENT, {
          detail: {
            items: normalizedItems,
            serializedItems
          }
        })
      );
    }
  }

  return normalizedItems;
}

export function subscribeToAgendaItems(callback) {
  if (typeof window === 'undefined') return () => {};

  function publishFromStorage() {
    callback(loadStoredAgendaItems());
  }

  function onAgendaSync(event) {
    if (Array.isArray(event.detail?.items)) {
      callback(normalizeAgendaItems(event.detail.items));
      return;
    }

    publishFromStorage();
  }

  function onStorage(event) {
    if (event.key !== AGENDA_STORAGE_KEY) return;
    publishFromStorage();
  }

  window.addEventListener(AGENDA_SYNC_EVENT, onAgendaSync);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(AGENDA_SYNC_EVENT, onAgendaSync);
    window.removeEventListener('storage', onStorage);
  };
}
