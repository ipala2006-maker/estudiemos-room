import { ingenieriaRecursosSource } from '../data/ingenieriaRecursos.js';

const STYLE_ID = 'estudiemos-live-sync-style';
const LIVE_SYNC_FLAG = 'estudiemosLiveSyncActive';
const LIVE_SYNC_URL_FLAG = 'estudiemosLiveSyncUrl';
const LIVE_SITE_URL = ingenieriaRecursosSource.siteUrl ?? 'https://ipala2006-maker.github.io/ingenieria-recursos/';

function buildLiveUrl() {
  const url = new URL(LIVE_SITE_URL);
  url.searchParams.set('roomSync', String(Date.now()));
  return url.toString();
}

function installLiveSyncStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .estudiemos-live-sync-active {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .estudiemos-live-sync-active > .mediahub-context-panel {
      display: none !important;
    }

    .estudiemos-live-sync-active .estudiemos-browser-frame {
      position: relative !important;
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      min-width: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
      background: #050809 !important;
    }

    .estudiemos-live-sync-active .estudiemos-browser-bar {
      position: relative !important;
      z-index: 4 !important;
      grid-template-columns: minmax(0, 1fr) auto auto !important;
      gap: 8px !important;
      min-width: 0 !important;
    }

    .estudiemos-live-sync-active .browser-address {
      min-width: 0 !important;
      min-height: 34px !important;
      overflow: hidden !important;
    }

    .estudiemos-live-sync-active .browser-address span {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .estudiemos-live-sync-active .estudiemos-real-page {
      opacity: 0 !important;
      pointer-events: none !important;
      overflow: hidden !important;
    }

    .estudiemos-live-sync-overlay {
      position: absolute;
      inset: var(--estudiemos-live-bar-height, 42px) 0 0 0;
      z-index: 3;
      min-width: 0;
      min-height: 0;
      display: grid;
      background: #ffffff;
      overflow: hidden;
    }

    .estudiemos-live-sync-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #ffffff;
    }

    .estudiemos-live-sync-status {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 8px;
      padding: 28px;
      color: #f7f1e4;
      text-align: center;
      background:
        radial-gradient(circle at 50% 34%, rgba(224, 196, 122, 0.16), transparent 34%),
        linear-gradient(135deg, #10201e, #050809);
      transition: opacity 160ms ease;
    }

    .estudiemos-live-sync-overlay.is-loaded .estudiemos-live-sync-status {
      opacity: 0;
      pointer-events: none;
    }

    .estudiemos-live-sync-status strong {
      font-size: 1rem;
      font-weight: 900;
    }

    .estudiemos-live-sync-status span {
      max-width: 360px;
      color: rgba(247, 241, 228, 0.72);
      font-size: 0.86rem;
      font-weight: 720;
    }

    .browser-live-sync-button {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 11px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: rgba(247, 241, 228, 0.9);
      background: rgba(255, 255, 255, 0.07);
      font: 800 0.78rem/1 inherit;
      text-decoration: none;
      cursor: pointer;
    }

    .browser-live-sync-button:hover {
      color: #fff9e8;
      border-color: rgba(224, 196, 122, 0.34);
      background: rgba(224, 196, 122, 0.13);
    }

    @media (max-width: 720px) {
      .estudiemos-live-sync-active .estudiemos-browser-bar {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }

      .browser-live-sync-button[data-live-sync-open] {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function findDirectChild(parent, className) {
  return Array.from(parent?.children ?? []).find((child) => child.classList?.contains(className)) ?? null;
}

function setLiveStatus(overlay, message) {
  const status = overlay.querySelector('.estudiemos-live-sync-status span');
  if (status) status.textContent = message;
}

function loadLatestSite(shell, overlay, iframe, reason = 'manual') {
  const liveUrl = buildLiveUrl();
  shell.dataset[LIVE_SYNC_URL_FLAG] = liveUrl;
  overlay.classList.remove('is-loaded');
  setLiveStatus(
    overlay,
    reason === 'initial'
      ? 'Trayendo la version publicada mas reciente de Estudiemos.'
      : 'Actualizando Estudiemos desde GitHub Pages.'
  );
  iframe.src = liveUrl;
}

function ensureLiveControls(shell, browserBar, iframe, overlay) {
  const addressText = browserBar.querySelector('.browser-address span');
  if (addressText) addressText.textContent = LIVE_SITE_URL;

  if (!browserBar.querySelector('[data-live-sync-refresh]')) {
    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'browser-live-sync-button';
    refreshButton.dataset.liveSyncRefresh = 'true';
    refreshButton.title = 'Actualizar Estudiemos';
    refreshButton.innerHTML = '<span aria-hidden="true">R</span><strong>Actualizar</strong>';
    refreshButton.addEventListener('click', () => loadLatestSite(shell, overlay, iframe));
    browserBar.appendChild(refreshButton);
  }

  if (!browserBar.querySelector('[data-live-sync-open]')) {
    const openLink = document.createElement('a');
    openLink.className = 'browser-live-sync-button';
    openLink.dataset.liveSyncOpen = 'true';
    openLink.href = LIVE_SITE_URL;
    openLink.target = '_blank';
    openLink.rel = 'noreferrer';
    openLink.title = 'Abrir Estudiemos en una pestana nueva';
    openLink.innerHTML = '<span aria-hidden="true">EXT</span><strong>Abrir</strong>';
    browserBar.appendChild(openLink);
  }
}

function ensureLiveOverlay(shell) {
  const browserFrame = shell.querySelector('.estudiemos-browser-frame');
  const browserBar = shell.querySelector('.estudiemos-browser-bar');
  if (!browserFrame || !browserBar) return;

  shell.classList.add('estudiemos-live-sync-active');
  browserFrame.style.setProperty('--estudiemos-live-bar-height', `${browserBar.offsetHeight || 42}px`);

  let overlay = findDirectChild(browserFrame, 'estudiemos-live-sync-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'estudiemos-live-sync-overlay';

    const iframe = document.createElement('iframe');
    iframe.className = 'estudiemos-live-sync-frame';
    iframe.title = 'Estudiemos - pagina publicada';
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'fullscreen; clipboard-write; encrypted-media; picture-in-picture';

    const status = document.createElement('div');
    status.className = 'estudiemos-live-sync-status';
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = '<strong>Conectando con Estudiemos</strong><span>Trayendo la version publicada mas reciente de Estudiemos.</span>';

    iframe.addEventListener('load', () => {
      overlay.classList.add('is-loaded');
    });

    overlay.append(iframe, status);
    browserFrame.appendChild(overlay);
    loadLatestSite(shell, overlay, iframe, 'initial');
  }

  const iframe = overlay.querySelector('.estudiemos-live-sync-frame');
  if (!iframe) return;

  ensureLiveControls(shell, browserBar, iframe, overlay);
}

function syncLiveEstudiemosApps() {
  document.querySelectorAll('.os-window-estudiemos .estudiemos-os-shell').forEach((shell) => {
    if (shell.dataset[LIVE_SYNC_FLAG] !== 'true') {
      shell.dataset[LIVE_SYNC_FLAG] = 'true';
      ensureLiveOverlay(shell);
      return;
    }

    ensureLiveOverlay(shell);
  });
}

function installLiveEstudiemosSync() {
  if (typeof window === 'undefined' || window.__estudiemosLiveEstudiemosSyncInstalled) return;
  window.__estudiemosLiveEstudiemosSyncInstalled = true;

  installLiveSyncStyles();

  const observer = new MutationObserver(syncLiveEstudiemosApps);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener('load', syncLiveEstudiemosApps);
  window.addEventListener('pageshow', syncLiveEstudiemosApps);
  window.requestAnimationFrame(syncLiveEstudiemosApps);
}

installLiveEstudiemosSync();
