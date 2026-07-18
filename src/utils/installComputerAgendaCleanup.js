const INSTALL_FLAG = '__estudiemosComputerAgendaCleanupInstalled';
const AGENDA_SHELL_SELECTOR = '.agenda-app-shell';
const QUICK_ADD_SELECTOR = '.agenda-quick-add';

function getQuickAddInputs(form) {
  const titleInput = form.querySelector('.agenda-quick-title input[type="text"]');
  const detailInput = form.querySelector('.agenda-quick-detail input[type="text"]');
  return { titleInput, detailInput };
}

function showMissingInputFeedback(form, input) {
  form.dataset.needsStudentInput = 'true';
  input?.focus({ preventScroll: true });
  window.setTimeout(() => {
    if (form.dataset.needsStudentInput === 'true') {
      delete form.dataset.needsStudentInput;
    }
  }, 900);
}

function preventGenericAgendaSubmit(event) {
  const form = event.target?.closest?.(QUICK_ADD_SELECTOR);
  if (!form) return;

  const { titleInput, detailInput } = getQuickAddInputs(form);
  const missingInput = !titleInput?.value.trim() ? titleInput : !detailInput?.value.trim() ? detailInput : null;
  if (!missingInput) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  showMissingInputFeedback(form, missingInput);
}

function cleanupAgendaShell(shell) {
  if (!shell || shell.dataset.agendaCleanupReady === 'true') return;
  shell.dataset.agendaCleanupReady = 'true';

  shell.querySelectorAll('.agenda-app-actions button').forEach((button) => {
    if (!/restaurar/i.test(button.textContent ?? '')) return;
    button.hidden = true;
    button.disabled = true;
    button.setAttribute('aria-hidden', 'true');
  });
}

function installComputerAgendaCleanup() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  window.addEventListener('submit', preventGenericAgendaSubmit, true);

  function startObserver() {
    if (!document.body) {
      window.addEventListener('DOMContentLoaded', startObserver, { once: true });
      return;
    }

    const observer = new MutationObserver(() => {
      document.querySelectorAll(AGENDA_SHELL_SELECTOR).forEach(cleanupAgendaShell);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(AGENDA_SHELL_SELECTOR).forEach(cleanupAgendaShell);
  }

  window.requestAnimationFrame(startObserver);
}

installComputerAgendaCleanup();
