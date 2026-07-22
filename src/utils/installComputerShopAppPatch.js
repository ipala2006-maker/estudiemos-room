const PATCH_FLAG = '__estudiemosComputerShopAppPatch';

const textOf = (node) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const labelMatches = (node, label) => textOf(node).includes(label.toLowerCase());

const findButtonByLabel = (root, selector, label) => {
  const buttons = Array.from(root.querySelectorAll(selector));
  return buttons.find((button) => labelMatches(button, label)) ?? null;
};

const createShopSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '26');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = [
    '<path d="M6.5 9.5h11l-.8 9.1a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8l-.8-9.1Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    '<path d="M9 10V8.1a3 3 0 0 1 6 0V10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    '<path d="M8.4 14.2h7.2M9.6 17h4.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'
  ].join('');
  return svg;
};

const setCopy = (button, title, subtitle, state) => {
  const strong = button.querySelector('.os-icon-copy strong');
  const small = button.querySelector('.os-icon-copy small');
  const status = button.querySelector('.os-icon-state');
  const span = button.querySelector('span:last-child');
  if (strong) strong.textContent = title;
  if (small) small.textContent = subtitle;
  if (status) status.textContent = state;
  if (!strong && span) span.textContent = title;
  button.title = 'Abrir la misma tienda Salchi de Casa 1.';
  button.setAttribute('aria-label', title);
};

const clickShopTab = (root) => {
  const shopTab = findButtonByLabel(root, '.focus-profile-tabs button', 'tienda');
  if (shopTab) {
    shopTab.click();
  }
};

const clickOverviewTab = (root) => {
  const overviewTab = findButtonByLabel(root, '.focus-profile-tabs button', 'resumen');
  if (overviewTab) {
    overviewTab.click();
  }
};

const updateWindowTitle = (root) => {
  const title = root.querySelector('.os-window-title strong');
  const subtitle = root.querySelector('.os-window-title span');
  if (!title || (!labelMatches(title, 'perfil') && !labelMatches(title, 'tienda'))) return;

  if (root.classList.contains('salchi-shop-mode')) {
    title.textContent = 'Tienda';
    if (subtitle) subtitle.textContent = 'Tienda Salchi';
    return;
  }

  title.textContent = 'Perfil';
  if (subtitle) subtitle.textContent = 'Monedas y skins';
};

const openProfile = (root) => {
  const profileButton =
    findButtonByLabel(root, '.os-desktop-icon:not(.salchi-shop-shortcut)', 'perfil') ??
    findButtonByLabel(root, '.os-running-apps button:not(.salchi-shop-taskbar-button)', 'perfil');
  if (profileButton) {
    profileButton.click();
  }
};

const schedule = (callback) => {
  window.requestAnimationFrame(() => {
    callback();
    window.setTimeout(callback, 60);
    window.setTimeout(callback, 180);
  });
};

const openShop = (root) => {
  root.classList.add('salchi-shop-mode');
  openProfile(root);
  schedule(() => {
    clickShopTab(root);
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
  const profileButtons = Array.from(root.querySelectorAll('.os-desktop-icon, .os-running-apps button'))
    .filter((button) => !button.classList.contains('salchi-shop-shortcut'))
    .filter((button) => !button.classList.contains('salchi-shop-taskbar-button'))
    .filter((button) => labelMatches(button, 'perfil'));

  profileButtons.forEach((button) => {
    if (button.dataset.salchiProfileWired === 'true') return;
    button.dataset.salchiProfileWired = 'true';
    button.addEventListener('click', () => openCleanProfile(root), true);
  });
};

const installDesktopShortcut = (root) => {
  const desktop = root.querySelector('.os-desktop-icons');
  if (!desktop) return;
  if (findButtonByLabel(desktop, '.os-desktop-icon:not(.salchi-shop-shortcut)', 'tienda')) return;
  if (desktop.querySelector('.salchi-shop-shortcut')) return;

  const source = findButtonByLabel(desktop, '.os-desktop-icon', 'perfil') ?? desktop.querySelector('.os-desktop-icon');
  if (!source) return;

  const button = source.cloneNode(true);
  button.classList.remove('is-open', 'is-quiet');
  button.classList.add('salchi-shop-shortcut');
  button.dataset.salchiShopShortcut = 'true';
  button.querySelector('.os-icon-tile')?.replaceChildren(createShopSvg());
  setCopy(button, 'Tienda', 'Tienda Salchi', 'Skins y rangos');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openShop(root);
  });
  source.insertAdjacentElement('afterend', button);
};

const installTaskbarShortcut = (root) => {
  const taskbar = root.querySelector('.os-running-apps');
  if (!taskbar) return;
  if (findButtonByLabel(taskbar, 'button:not(.salchi-shop-taskbar-button)', 'tienda')) return;
  if (taskbar.querySelector('.salchi-shop-taskbar-button')) return;

  const source = findButtonByLabel(taskbar, 'button', 'perfil') ?? taskbar.querySelector('button');
  if (!source) return;

  const button = source.cloneNode(true);
  button.className = 'salchi-shop-taskbar-button';
  button.removeAttribute('aria-pressed');
  button.querySelector('svg')?.replaceWith(createShopSvg());
  setCopy(button, 'Tienda', 'Tienda Salchi', 'Listo');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openShop(root);
  });
  source.insertAdjacentElement('afterend', button);
};

const patchRoot = (root) => {
  wireProfileButtons(root);
  installDesktopShortcut(root);
  installTaskbarShortcut(root);
  updateWindowTitle(root);
};

const install = () => {
  if (window[PATCH_FLAG]) return;
  window[PATCH_FLAG] = true;

  const run = () => {
    document.querySelectorAll('.estudiemos-os-live-desktop').forEach(patchRoot);
  };

  run();
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
