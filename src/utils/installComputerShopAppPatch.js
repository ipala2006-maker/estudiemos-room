const PATCH_FLAG = '__estudiemosComputerShopAppPatchV2';
let activeComputerRoot = null;

const textOf = (node) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const labelMatches = (node, label) => textOf(node).includes(label.toLowerCase());

const findButtonByLabel = (root, selector, label) => {
  const buttons = Array.from(root.querySelectorAll(selector));
  return buttons.find((button) => labelMatches(button, label)) ?? null;
};

const createIcon = () => [
  '<span class="salchi-shop-floating-icon" aria-hidden="true">',
  '<svg viewBox="0 0 24 24" width="26" height="26">',
  '<path d="M6.5 9.5h11l-.8 9.1a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8l-.8-9.1Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  '<path d="M9 10V8.1a3 3 0 0 1 6 0V10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  '<path d="M8.4 14.2h7.2M9.6 17h4.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  '</svg>',
  '</span>'
].join('');

const getShopButton = () => {
  let button = document.querySelector('.salchi-shop-floating-app');
  if (button) return button;

  button = document.createElement('button');
  button.type = 'button';
  button.className = 'salchi-shop-floating-app';
  button.setAttribute('aria-label', 'Tienda');
  button.title = 'Abrir la misma tienda Salchi de Casa 1.';
  button.innerHTML = `${createIcon()}<strong>Tienda</strong><span>Tienda Salchi</span>`;
  button.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const root = button.__salchiShopRoot ?? activeComputerRoot ?? document.querySelector('.estudiemos-os-live-desktop');
    if (root) openShop(root);
  });
  document.body.appendChild(button);
  return button;
};

const clickOverviewTab = (root) => {
  const overviewTab = findButtonByLabel(root, '.focus-profile-tabs button', 'resumen');
  if (overviewTab) overviewTab.click();
};

const updateWindowTitle = (root) => {
  const title = root.querySelector('.os-window-title strong');
  const subtitle = root.querySelector('.os-window-title span');
  if (!title) return;

  if (root.classList.contains('salchi-shop-mode') && (labelMatches(title, 'perfil') || labelMatches(title, 'tienda'))) {
    title.textContent = 'Tienda';
    if (subtitle) subtitle.textContent = 'Tienda Salchi';
    return;
  }

  if (!root.classList.contains('salchi-shop-mode') && labelMatches(title, 'tienda')) {
    title.textContent = 'Perfil';
    if (subtitle) subtitle.textContent = 'Monedas y skins';
  }
};

const schedule = (callback) => {
  window.requestAnimationFrame(() => {
    callback();
    window.setTimeout(callback, 80);
    window.setTimeout(callback, 240);
  });
};

const openShop = (root) => {
  root.classList.remove('salchi-shop-mode');
  window.dispatchEvent(new CustomEvent('estudiemos-room-open-shop', {
    detail: {
      source: 'computer',
      surface: 'salchi-shop'
    }
  }));
  schedule(() => {
    updateWindowTitle(root);
  });
};

const openCleanProfile = (root) => {
  root.classList.remove('salchi-shop-mode');
  schedule(() => {
    clickOverviewTab(root);
    updateWindowTitle(root);
  });
};

const wireProfileButtons = (root) => {
  const buttons = Array.from(root.querySelectorAll('.os-desktop-icon, .os-running-apps button'))
    .filter((button) => labelMatches(button, 'perfil'));

  buttons.forEach((button) => {
    if (button.dataset.salchiProfileWired === 'true') return;
    button.dataset.salchiProfileWired = 'true';
    button.addEventListener('click', () => openCleanProfile(root), true);
  });
};

const positionShopButton = (root) => {
  const button = getShopButton();
  const rootRect = root.getBoundingClientRect();
  const desktop = root.querySelector('.os-desktop-icons');
  const profileButton = desktop ? findButtonByLabel(desktop, '.os-desktop-icon', 'perfil') : null;
  const profileRect = profileButton?.getBoundingClientRect();
  const hasWindowOpen = Boolean(root.querySelector('.os-window'));
  const rootVisible = rootRect.width > 120 && rootRect.height > 120 && rootRect.bottom > 0 && rootRect.right > 0;
  activeComputerRoot = root;
  button.__salchiShopRoot = root;

  button.classList.toggle('is-visible', rootVisible && !hasWindowOpen);
  button.classList.toggle('is-active', root.classList.contains('salchi-shop-mode'));
  if (!rootVisible || hasWindowOpen) return;

  const left = profileRect ? profileRect.left : rootRect.left + 32;
  const top = profileRect ? profileRect.bottom + 22 : rootRect.top + 330;
  button.style.left = `${Math.max(rootRect.left + 16, Math.min(left, rootRect.right - 104))}px`;
  button.style.top = `${Math.max(rootRect.top + 86, Math.min(top, rootRect.bottom - 104))}px`;
};

const patchRoot = (root) => {
  wireProfileButtons(root);
  positionShopButton(root);
  updateWindowTitle(root);
};

const install = () => {
  if (window[PATCH_FLAG]) return;
  window[PATCH_FLAG] = true;

  let frame = 0;
  const run = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const roots = document.querySelectorAll('.estudiemos-os-live-desktop');
      if (!roots.length) {
        document.querySelector('.salchi-shop-floating-app')?.classList.remove('is-visible');
        return;
      }
      roots.forEach(patchRoot);
    });
  };

  run();
  window.addEventListener('resize', run);
  window.addEventListener('scroll', run, true);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
}
