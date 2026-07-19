import {
  getArrowScrollDelta,
  isKeyboardActionElement,
  isTextEntryElement,
  moveFocusByArrow,
  shouldPreserveNativeArrowKey
} from './keyboardNavigation.js';

const REQUEST_DESKTOP_EVENT = 'estudiemos:computer-request-desktop';

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

function requestComputerDesktop() {
  window.dispatchEvent(new CustomEvent(REQUEST_DESKTOP_EVENT));
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

  if (root.classList.contains('computer-landing-desktop')) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  requestComputerDesktop();
  return true;
}

function canScrollElement(element, left, top) {
  if (!element || element === document || element === window) return false;
  const style = window.getComputedStyle(element);
  const overflowX = `${style.overflowX} ${style.overflow}`;
  const overflowY = `${style.overflowY} ${style.overflow}`;
  const canScrollX = left !== 0 && element.scrollWidth > element.clientWidth + 2 && /(auto|scroll|overlay)/.test(overflowX);
  const canScrollY = top !== 0 && element.scrollHeight > element.clientHeight + 2 && /(auto|scroll|overlay)/.test(overflowY);
  return canScrollX || canScrollY;
}

function findScrollableFromElement(element, boundary, left, top) {
  let current = element;
  while (current && current !== document.body && current !== boundary?.parentElement) {
    if (boundary && !boundary.contains(current)) return null;
    if (canScrollElement(current, left, top)) return current;
    current = current.parentElement;
  }
  return null;
}

function findKeyboardScrollTarget(scope, left, top) {
  if (!scope) return null;

  const activeCandidate = findScrollableFromElement(document.activeElement, scope, left, top);
  if (activeCandidate) return activeCandidate;

  const preferredSelectors = [
    '.estudiemos-real-page',
    '.estudiemos-container',
    '.mediahub-context-panel',
    '.links-card-panel',
    '.settings-app-shell',
    '.focus-profile-app',
    '.agenda-app-shell',
    '.spotify-app-shell',
    '.screen-control-drawer',
    '.os-window-content'
  ];

  for (const selector of preferredSelectors) {
    const candidate = scope.matches?.(selector) ? scope : scope.querySelector?.(selector);
    if (canScrollElement(candidate, left, top)) return candidate;
  }

  const candidates = [scope, ...(scope.querySelectorAll?.('*') ?? [])];
  return candidates.find((candidate) => canScrollElement(candidate, left, top)) ?? null;
}

function scrollElementBy(element, left, top) {
  element?.scrollBy?.({
    left,
    top,
    behavior: 'smooth'
  });
}

function shouldLetAgendaCalendarHandleArrow(scope, event) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
  if (shouldPreserveNativeArrowKey(event.target)) return false;
  return Boolean(scope?.matches?.('.agenda-calendar-planner') || scope?.querySelector?.('.agenda-calendar-planner'));
}

function handleArrow(root, event) {
  if (!event.key.startsWith('Arrow') || shouldPreserveNativeArrowKey(event.target)) return false;

  const scope = getActiveComputerScope(root);
  if (shouldLetAgendaCalendarHandleArrow(scope, event)) return false;

  const scrollDelta = getArrowScrollDelta(event.key);
  if (scrollDelta) {
    const scrollTarget = findKeyboardScrollTarget(scope, scrollDelta[0], scrollDelta[1]);
    if (scrollTarget) {
      scrollElementBy(scrollTarget, scrollDelta[0], scrollDelta[1]);
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  }

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
