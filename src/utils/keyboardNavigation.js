const TEXT_ENTRY_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week'
]);

const NATIVE_ARROW_INPUT_TYPES = new Set([
  ...TEXT_ENTRY_INPUT_TYPES,
  'range'
]);

const KEYBOARD_CANDIDATE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function isTextEntryElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable)) return true;
  if (tagName !== 'input') return false;

  const inputType = String(element.getAttribute?.('type') || element.type || 'text').toLowerCase();
  return TEXT_ENTRY_INPUT_TYPES.has(inputType);
}

export function shouldPreserveNativeArrowKey(element) {
  const tagName = element?.tagName?.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select' || Boolean(element?.isContentEditable)) return true;
  if (tagName !== 'input') return false;

  const inputType = String(element.getAttribute?.('type') || element.type || 'text').toLowerCase();
  return NATIVE_ARROW_INPUT_TYPES.has(inputType);
}

export function isKeyboardActionElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === 'button' || tagName === 'a' || element?.role === 'button';
}

export function getArrowScrollDelta(key) {
  if (key === 'ArrowUp') return [0, -260];
  if (key === 'ArrowDown') return [0, 260];
  if (key === 'ArrowLeft') return [-260, 0];
  if (key === 'ArrowRight') return [260, 0];
  return null;
}

function isElementVisible(element) {
  if (!element || element.closest?.('[hidden], [aria-hidden="true"], [inert]')) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
}

function getKeyboardCandidates(scope) {
  if (!scope) return [];

  return [...scope.querySelectorAll(KEYBOARD_CANDIDATE_SELECTOR)].filter((candidate) => {
    if (candidate.disabled || candidate.getAttribute('aria-disabled') === 'true') return false;
    return isElementVisible(candidate);
  });
}

function getCandidateCenter(element) {
  const rect = element.getBoundingClientRect();
  return {
    element,
    rect,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getReadingOrderScore(item) {
  return item.y * 10000 + item.x;
}

function getDirectionalCandidate(items, currentItem, key) {
  const direction = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0]
  }[key];

  if (!direction || !currentItem) return null;

  const [dirX, dirY] = direction;
  const ranked = items
    .filter((item) => item.element !== currentItem.element)
    .map((item) => {
      const deltaX = item.x - currentItem.x;
      const deltaY = item.y - currentItem.y;
      const primaryDistance = dirX ? deltaX * dirX : deltaY * dirY;
      const secondaryDistance = Math.abs(dirX ? deltaY : deltaX);

      return {
        ...item,
        primaryDistance,
        score: primaryDistance * 8 + secondaryDistance
      };
    })
    .filter((item) => item.primaryDistance > 4)
    .sort((a, b) => a.score - b.score);

  return ranked[0]?.element ?? null;
}

function getWrapCandidate(items, currentItem, key) {
  const ordered = [...items].sort((a, b) => getReadingOrderScore(a) - getReadingOrderScore(b));
  if (!currentItem) return ordered[0]?.element ?? null;

  const currentIndex = ordered.findIndex((item) => item.element === currentItem.element);
  if (currentIndex === -1) return ordered[0]?.element ?? null;

  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return ordered[currentIndex - 1]?.element ?? ordered.at(-1)?.element ?? null;
  }

  return ordered[currentIndex + 1]?.element ?? ordered[0]?.element ?? null;
}

export function moveFocusByArrow(scope, key, currentElement = document.activeElement) {
  const candidates = getKeyboardCandidates(scope);
  if (candidates.length === 0) return false;

  const items = candidates.map(getCandidateCenter);
  const currentItem = scope?.contains(currentElement)
    ? items.find((item) => item.element === currentElement)
    : null;
  const nextElement = getDirectionalCandidate(items, currentItem, key) ?? getWrapCandidate(items, currentItem, key);

  if (!nextElement || nextElement === currentElement) return false;
  nextElement.focus({ preventScroll: true });
  return true;
}
