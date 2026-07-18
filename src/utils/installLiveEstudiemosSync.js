import { ingenieriaRecursosData, ingenieriaRecursosSource } from '../data/ingenieriaRecursos.js';

const LIVE_DATA_FILE = 'data/data.js';
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

function getLiveDataUrl() {
  const siteUrl = new URL(ingenieriaRecursosSource.siteUrl ?? 'https://ipala2006-maker.github.io/ingenieria-recursos/');
  const dataUrl = new URL(LIVE_DATA_FILE, siteUrl);
  dataUrl.searchParams.set('roomSync', String(Date.now()));
  return dataUrl.toString();
}

function readPublishedData(source) {
  const data = new Function(`const window = {};\n${source}\n; return window.DATA ?? DATA;`)();
  if (!Array.isArray(data?.carreras)) {
    throw new Error('El data.js publicado no tiene carreras validas.');
  }

  return {
    carreras: data.carreras
      .filter((carrera) => carrera && typeof carrera === 'object')
      .map((carrera) => ({
        ...carrera,
        slug: String(carrera.slug ?? '').trim(),
        title: String(carrera.title ?? 'Carrera').trim() || 'Carrera',
        description: String(carrera.description ?? '').trim(),
        materias: Array.isArray(carrera.materias)
          ? carrera.materias
              .filter((materia) => materia && typeof materia === 'object')
              .map((materia) => ({
                ...materia,
                slug: String(materia.slug ?? '').trim(),
                title: String(materia.title ?? 'Materia').trim() || 'Materia',
                description: String(materia.description ?? '').trim(),
                temas: Array.isArray(materia.temas)
                  ? materia.temas
                      .filter((tema) => tema && typeof tema === 'object')
                      .map((tema) => ({
                        ...tema,
                        slug: String(tema.slug ?? '').trim(),
                        title: String(tema.title ?? 'Tema').trim() || 'Tema',
                        meta: String(tema.meta ?? '').trim(),
                        videos: Array.isArray(tema.videos) ? tema.videos : [],
                        pdfs: Array.isArray(tema.pdfs) ? tema.pdfs : [],
                        herramientas: Array.isArray(tema.herramientas) ? tema.herramientas : []
                      }))
                  : []
              }))
          : []
      }))
      .filter((carrera) => carrera.slug && carrera.materias.length > 0)
  };
}

function applyPublishedData(data) {
  if (!data.carreras.length) return false;
  ingenieriaRecursosData.carreras.splice(0, ingenieriaRecursosData.carreras.length, ...data.carreras);
  document.documentElement.dataset.estudiemosPublishedDataSync = String(Date.now());
  return true;
}

async function syncPublishedEstudiemosData() {
  if (typeof fetch !== 'function') return;

  try {
    const response = await fetch(getLiveDataUrl(), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = readPublishedData(await response.text());
    applyPublishedData(data);
  } catch (error) {
    document.documentElement.dataset.estudiemosPublishedDataSyncError =
      error instanceof Error ? error.message : 'No se pudo sincronizar Estudiemos.';
  }
}

function installLiveEstudiemosSync() {
  if (typeof window === 'undefined' || window.__estudiemosPublishedDataSyncInstalled) return;
  window.__estudiemosPublishedDataSyncInstalled = true;

  syncPublishedEstudiemosData();
  window.addEventListener('focus', syncPublishedEstudiemosData);
  window.setInterval(syncPublishedEstudiemosData, SYNC_INTERVAL_MS);
}

installLiveEstudiemosSync();
