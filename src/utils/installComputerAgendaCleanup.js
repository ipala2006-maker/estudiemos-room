const INSTALL_FLAG = '__estudiemosComputerAgendaCleanupInstalled';
const QUICK_ADD_SELECTOR = '.agenda-quick-add';

function getQuickAddInputs(form) {
  const textInputs = [...form.querySelectorAll('input[type="text"]')];
  const detailInput = form.querySelector('.agenda-quick-detail input[type="text"]') ?? textInputs.at(1);
  const titleInput = form.querySelector('.agenda-quick-title input[type="text"]') ?? textInputs.find((input) => input !== detailInput);
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

function installComputerAgendaCleanup() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  window.addEventListener('submit', preventGenericAgendaSubmit, true);
}

installComputerAgendaCleanup();
