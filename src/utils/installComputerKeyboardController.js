import {
  isKeyboardActionElement,
  isTextEntryElement,
  moveFocusByArrow,
  shouldPreserveNativeArrowKey
} from './keyboardNavigation.js';

function getComputerRoot() {
  return document.querySelector('.computer-overlay .estudiemos-os-live-desktop');
}

function getActiveComputerScope(root) {
  if (!root) return null;

  const drawer = root.querySelector('.screen-control-drawer');
  if (drawer) return drawer;

  const focusedWindow = root.querySelector('.os-window.is-focused');
  if (focusedWindow) return focusedWindow;

  return root.querySelector('.computer-landing-desktop .virtual-desktop-shell, .os-photo-desktop') ?? root;
}

function clickElement(element) {
  if (!element || element.disabled || element.getAttribute?.('aria-disabled') === 'true') return false;
  element.click();
  return true;
}

function closeDrawer(root) {
  return clickElement(root.querySelector('.screen-control-drawer button[aria-label="Cerrar panel"]'));
}

function closeFocusedWindow(root) {
  const focusedWindow = root.querySelector('.os-window.is-focused');
  return clickElement(focusedWindow?.querySelector('.os-window-actions button[aria-label^="Cerrar"]'));
}

function isEstudiemosAtRoot(windowElement) {
  if (!windowElement?.matches('.os-window-estudiemos')) return false;
  const breadcrumbs = windowElement.querySelector('.estudiemos-breadcrumbs');
  const hasPreparedContent = Boolean(windowElement.querySelector('.content-action-panel:not(.is-empty)'));
  return Boolean(breadcrumbs) && !breadcrumbs.textContent.includes('/') && !hasPreparedContent;
}

function shouldLetComputerHandleBackspace(windowElement) {
  if (!windowElement) return false;

  if (windowElement.matches('.os-window-estudiemos')) {
    return !isEstudiemosAtRoot(windowElement);
  }

  if (windowElement.matches('.os-window-links')) {
    const hasPreparedContent = Boolean(windowElement.querySelector('.content-action-panel:not(.is-empty)'));
    const hasError = Boolean(windowElement.querySelector('.screen-zone-error'));
    const hasDraft = Boolean(windowElement.querySelector('#manual-youtube-link')?.value?.trim());
    return hasPreparedContent || hasError || hasDraft;
  }

  if (windowElement.matches('.os-window-spotify')) {
    const hasError = Boolean(windowElement.querySelector('.screen-zone-error'));
    const hasDraft = Boolean(windowElement.querySelector('#spotify-room-link')?.value?.trim());
    return hasError || hasDraft;
  }

  return false;
}

function handleBackspace(root, event) {
  if (isTextEntryElement(event.target)) return false;

  if (root.querySelector('.screen-control-drawer')) {
    if (!closeDrawer(root)) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }

  const focusedWindow = root.querySelector('.os-window.is-focused');
  if (shouldLetComputerHandleBackspace(focusedWindow)) return false;

  if (closeFocusedWindow(root)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }

  return false;
}

function handleArrow(root, event) {
  if (!event.key.startsWith('Arrow') || shouldPreserveNativeArrowKey(event.target)) return false;

  const scope = getActiveComputerScope(root);
  if (!moveFocusByArrow(scope, event.key)) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

function handleEnter(root, event) {
  if (event.key !== 'Enter' || isTextEntryElement(event.target)) return false;

  const activeElement = document.activeElement;
  if (!root.contains(activeElement) || !isKeyboardActionElement(activeElement)) return false;

  if (!clickElement(activeElement)) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

function installComputerKeyboardController() {
  if (typeof window === 'undefined' || window.__estudiemosComputerKeyboardControllerInstalled) return;
  window.__estudiemosComputerKeyboardControllerInstalled = true;

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      const root = getComputerRoot();
      if (!root) return;

      if (event.key === 'Backspace' && handleBackspace(root, event)) return;
      if (handleArrow(root, event)) return;
      handleEnter(root, event);
    },
    true
  );
}

installComputerKeyboardController();
