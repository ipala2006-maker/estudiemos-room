const INSTALL_FLAG = '__estudiemosWallAgendaKeyboardPolishInstalled';
const EDITOR_SELECTOR = '.wall-agenda-editor-overlay';
const DAY_SELECTOR = '.wall-agenda-week-day';

function isTextEditingTarget(element) {
  const tagName = element?.tagName?.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select') return true;
  if (tagName !== 'input') return Boolean(element?.isContentEditable);

  const inputType = String(element?.type ?? 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(inputType);
}

function getDateInput(editor) {
  return editor.querySelector('.wall-agenda-sidebar-card input[type="date"], .wall-agenda-new-card input[type="date"]');
}

function getSelectedDayButton(editor) {
  return editor.querySelector(`${DAY_SELECTOR}.is-selected, ${DAY_SELECTOR}[aria-current="date"]`) ?? editor.querySelector(DAY_SELECTOR);
}

function parseDateValue(value) {
  const [year, month, day] = String(value ?? '').split('-').map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

function toDateValue(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString().slice(0, 10);
}

function offsetDateValue(value, offset) {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + offset);
  return toDateValue(date);
}

function setInputValue(input, value) {
  const prototype = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set ? descriptor.set.call(input, value) : (input.value = value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function focusSelectedDay(editor) {
  window.requestAnimationFrame(() => {
    getSelectedDayButton(editor)?.focus({ preventScroll: true });
  });
}

function prepareEditor(editor) {
  if (!editor || editor.dataset.keyboardPolishReady === 'true') return;
  editor.dataset.keyboardPolishReady = 'true';
  focusSelectedDay(editor);
}

function handleKeyDown(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

  const editor = document.querySelector(EDITOR_SELECTOR);
  if (!editor || isTextEditingTarget(event.target)) return;

  const dateInput = getDateInput(editor);
  if (!dateInput) return;

  const direction = event.key === 'ArrowRight' ? 1 : -1;
  event.preventDefault();
  event.stopImmediatePropagation();
  setInputValue(dateInput, offsetDateValue(dateInput.value, direction));
  focusSelectedDay(editor);
}

function installWallAgendaKeyboardPolish() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  window.addEventListener('keydown', handleKeyDown, true);

  function startObserver() {
    if (!document.body) {
      window.addEventListener('DOMContentLoaded', startObserver, { once: true });
      return;
    }

    const observer = new MutationObserver(() => {
      prepareEditor(document.querySelector(EDITOR_SELECTOR));
    });

    observer.observe(document.body, { childList: true, subtree: true });
    prepareEditor(document.querySelector(EDITOR_SELECTOR));
  }

  window.addEventListener('load', () => prepareEditor(document.querySelector(EDITOR_SELECTOR)), { once: true });
  window.requestAnimationFrame(startObserver);
}

installWallAgendaKeyboardPolish();
