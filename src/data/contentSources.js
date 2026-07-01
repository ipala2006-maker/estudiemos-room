export const contentSources = [
  {
    id: 'youtube',
    name: 'YouTube',
    type: 'youtube',
    status: 'free-curated',
    tabLabel: 'YouTube',
    description:
      'Explorador gratuito con catalogo curado, busqueda local y estructura preparada para conectar una busqueda real mas adelante.'
  },
  {
    id: 'library',
    name: 'Biblioteca',
    type: 'local-library',
    status: 'local-demo',
    tabLabel: 'Biblioteca',
    description: 'Videos demo y presets listos para probar la sala sin salir del entorno.'
  },
  {
    id: 'estudiemos',
    name: 'Estudiemos',
    type: 'future-platform',
    status: 'placeholder',
    tabLabel: 'Estudiemos',
    description: 'Proximamente: biblioteca de videos, materias y recursos de ingenieria.'
  }
];

export const screenContentItems = [
  {
    id: 'yt-calculus-essence',
    sourceId: 'youtube',
    title: 'Essence of calculus',
    creator: '3Blue1Brown',
    category: 'Matematica',
    duration: '17 min',
    preset: 'Clase visual',
    videoId: 'WUvTyaaNkzM',
    tags: ['calculo', 'derivadas', 'matematica', 'visual'],
    description: 'Clase visual para estudiar calculo en pantalla principal.'
  },
  {
    id: 'yt-linear-algebra',
    sourceId: 'youtube',
    title: 'Essence of linear algebra',
    creator: '3Blue1Brown',
    category: 'Matematica',
    duration: '10 min',
    preset: 'Conceptos visuales',
    videoId: 'fNk_zzaMoSs',
    tags: ['algebra lineal', 'vectores', 'matrices', 'visual'],
    description: 'Contenido ideal para una sesion de repaso visual.'
  },
  {
    id: 'yt-neural-network',
    sourceId: 'youtube',
    title: 'But what is a neural network?',
    creator: '3Blue1Brown',
    category: 'Ingenieria',
    duration: '19 min',
    preset: 'IA visual',
    videoId: 'aircAruvnKk',
    tags: ['ia', 'redes neuronales', 'machine learning', 'visual'],
    description: 'Introduccion clara para estudiar IA con apoyo de notas.'
  },
  {
    id: 'yt-python-course',
    sourceId: 'youtube',
    title: 'Python full course',
    creator: 'freeCodeCamp',
    category: 'Programacion',
    duration: '4 h',
    preset: 'Curso largo',
    videoId: 'rfscVS0vtbw',
    tags: ['python', 'programacion', 'curso', 'principiantes'],
    description: 'Curso largo para sesiones de estudio con contenido secundario abajo.'
  },
  {
    id: 'yt-javascript-course',
    sourceId: 'youtube',
    title: 'JavaScript full course',
    creator: 'freeCodeCamp',
    category: 'Programacion',
    duration: '3 h',
    preset: 'Curso largo',
    videoId: 'PkZNo7MFNFg',
    tags: ['javascript', 'web', 'programacion', 'curso'],
    description: 'Base practica para usar la pantalla grande como aula personal.'
  },
  {
    id: 'yt-computer-science',
    sourceId: 'youtube',
    title: 'Computer science basics',
    creator: 'CrashCourse',
    category: 'Computacion',
    duration: '12 min',
    preset: 'Repaso rapido',
    videoId: 'O5nskjZ_GoI',
    tags: ['computacion', 'hardware', 'software', 'repaso'],
    description: 'Resumen tecnico para acompanar apuntes o practica.'
  },
  {
    id: 'yt-study-with-me',
    sourceId: 'youtube',
    title: 'Study with me',
    creator: 'YouTube demo',
    category: 'Foco',
    duration: '50 min',
    preset: 'Pomodoro',
    videoId: 'p60rN9JEapg',
    tags: ['pomodoro', 'foco', 'study with me', 'sesion'],
    description: 'Acompanamiento para sostener ritmo de estudio.'
  },
  {
    id: 'yt-lofi-live',
    sourceId: 'youtube',
    title: 'Focus music stream',
    creator: 'Lofi Girl',
    category: 'Foco',
    duration: 'Live',
    preset: 'Ambiente',
    videoId: 'jfKfPfyJRdk',
    tags: ['lofi', 'musica', 'foco', 'ambiente'],
    description: 'Audio ambiental para la pantalla secundaria.'
  },
  {
    id: 'yt-science-explainer',
    sourceId: 'youtube',
    title: 'Science explainer',
    creator: 'TED-Ed',
    category: 'Ciencia',
    duration: '6 min',
    preset: 'Explicacion corta',
    videoId: '8S0FDjFBj8o',
    tags: ['ciencia', 'explicacion', 'rapido', 'demo'],
    description: 'Video corto para sesiones de repaso o demostracion.'
  },
  {
    id: 'lib-math-focus',
    sourceId: 'library',
    title: 'Matematica visual + foco',
    creator: 'Estudiemos Room demo',
    category: 'Preset local',
    duration: 'Sesion',
    preset: 'Doble pantalla',
    videoId: 'WUvTyaaNkzM',
    tags: ['matematica', 'preset', 'foco', 'calculo'],
    description: 'Punto de partida para estudiar teoria arriba y apoyo abajo.'
  },
  {
    id: 'lib-code-review',
    sourceId: 'library',
    title: 'Programacion guiada',
    creator: 'Estudiemos Room demo',
    category: 'Preset local',
    duration: 'Curso',
    preset: 'Practica',
    videoId: 'rfscVS0vtbw',
    tags: ['python', 'programacion', 'practica', 'curso'],
    description: 'Contenido de programacion para usar como clase principal.'
  },
  {
    id: 'lib-focus-bed',
    sourceId: 'library',
    title: 'Ambiente de foco',
    creator: 'Estudiemos Room demo',
    category: 'Ambiente',
    duration: 'Live',
    preset: 'Secundaria',
    videoId: 'jfKfPfyJRdk',
    tags: ['musica', 'foco', 'ambiente', 'secundaria'],
    description: 'Ideal para mantener abajo como soporte de concentracion.'
  },
  {
    id: 'est-static',
    sourceId: 'estudiemos',
    title: 'Estatica: equilibrio y fuerzas',
    creator: 'Estudiemos preview',
    category: 'Ingenieria',
    duration: 'Modulo demo',
    preset: 'Proximamente',
    videoId: 'fNk_zzaMoSs',
    tags: ['ingenieria', 'estatica', 'fuerzas', 'preview'],
    description: 'Tarjeta demo de una futura materia de ingenieria.'
  },
  {
    id: 'est-calculus',
    sourceId: 'estudiemos',
    title: 'Calculo I: limites y derivadas',
    creator: 'Estudiemos preview',
    category: 'Matematica',
    duration: 'Modulo demo',
    preset: 'Proximamente',
    videoId: 'WUvTyaaNkzM',
    tags: ['calculo', 'limites', 'derivadas', 'preview'],
    description: 'Preview de biblioteca educativa propia dentro de Estudiemos.'
  },
  {
    id: 'est-programming',
    sourceId: 'estudiemos',
    title: 'Programacion: fundamentos',
    creator: 'Estudiemos preview',
    category: 'Programacion',
    duration: 'Modulo demo',
    preset: 'Proximamente',
    videoId: 'O5nskjZ_GoI',
    tags: ['programacion', 'computacion', 'fundamentos', 'preview'],
    description: 'Tarjeta preparada para conectar contenido propio en el futuro.'
  }
];

export const studyPresets = [
  {
    id: 'math-focus',
    name: 'Matematica + foco',
    description: 'Clase visual arriba y ambiente tranquilo abajo.',
    upperItemId: 'yt-calculus-essence',
    lowerItemId: 'yt-lofi-live'
  },
  {
    id: 'deep-work',
    name: 'Deep work',
    description: 'Sesion de acompanamiento arriba y musica de foco abajo.',
    upperItemId: 'yt-study-with-me',
    lowerItemId: 'yt-lofi-live'
  },
  {
    id: 'programming-lab',
    name: 'Laboratorio de programacion',
    description: 'Curso principal arriba y apoyo conceptual abajo.',
    upperItemId: 'yt-python-course',
    lowerItemId: 'yt-computer-science'
  }
];

export function createScreenContentFromItem(item) {
  return {
    videoId: item.videoId,
    inputUrl: `${item.sourceId}:${item.id}`,
    watchUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${item.videoId}`,
    title: item.title,
    creator: item.creator,
    sourceId: item.sourceId
  };
}

export function getContentItemsBySource(sourceId) {
  return screenContentItems.filter((item) => item.sourceId === sourceId);
}

export function findContentItem(itemId) {
  return screenContentItems.find((item) => item.id === itemId);
}

export function filterContentItems(sourceId, query) {
  const normalizedQuery = query.trim().toLowerCase();
  const sourceItems = getContentItemsBySource(sourceId);
  if (!normalizedQuery) return sourceItems;

  return sourceItems.filter((item) =>
    [item.title, item.creator, item.category, item.preset, item.description, ...(item.tags ?? [])]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function createYouTubeSearchUrl(query) {
  const params = new URLSearchParams({ search_query: query.trim() });
  return `https://www.youtube.com/results?${params.toString()}`;
}
