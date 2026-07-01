export const videoLibrary = [
  {
    id: 'math-visual-thinking',
    title: 'Visual thinking for math',
    creator: '3Blue1Brown',
    category: 'Matematica',
    duration: '18 min',
    preset: 'Conceptos visuales',
    videoId: 'aircAruvnKk',
    description: 'Clase visual para usar como contenido principal mientras se toman notas abajo.'
  },
  {
    id: 'calculus-preview',
    title: 'Essence of calculus',
    creator: '3Blue1Brown',
    category: 'Matematica',
    duration: '17 min',
    preset: 'Clase guiada',
    videoId: 'WUvTyaaNkzM',
    description: 'Buen video para una pantalla principal de teoria y apoyo secundario.'
  },
  {
    id: 'focus-music',
    title: 'Focus music stream',
    creator: 'Lofi Girl',
    category: 'Foco',
    duration: 'Live',
    preset: 'Ambiente',
    videoId: 'jfKfPfyJRdk',
    description: 'Audio ambiental para dejar en la zona inferior durante una sesion.'
  },
  {
    id: 'study-session',
    title: 'Study with me',
    creator: 'YouTube demo',
    category: 'Foco',
    duration: '50 min',
    preset: 'Pomodoro',
    videoId: 'p60rN9JEapg',
    description: 'Formato de acompanamiento para sostener ritmo de estudio.'
  },
  {
    id: 'science-demo',
    title: 'Science explainer',
    creator: 'TED-Ed',
    category: 'Ciencia',
    duration: '6 min',
    preset: 'Explicacion corta',
    videoId: '8S0FDjFBj8o',
    description: 'Video corto para probar la pantalla principal con apoyo inferior.'
  },
  {
    id: 'computer-science',
    title: 'Computer science basics',
    creator: 'CrashCourse',
    category: 'Programacion',
    duration: '12 min',
    preset: 'Repaso rapido',
    videoId: 'O5nskjZ_GoI',
    description: 'Contenido tecnico para sesiones de repaso o demostracion.'
  }
];

export const studyPresets = [
  {
    id: 'math-focus',
    name: 'Matematica + foco',
    description: 'Clase visual arriba y ambiente tranquilo abajo.',
    upperVideoId: 'aircAruvnKk',
    lowerVideoId: 'jfKfPfyJRdk'
  },
  {
    id: 'deep-work',
    name: 'Deep work',
    description: 'Sesion de acompanamiento arriba y musica de foco abajo.',
    upperVideoId: 'p60rN9JEapg',
    lowerVideoId: 'jfKfPfyJRdk'
  },
  {
    id: 'quick-review',
    name: 'Repaso rapido',
    description: 'Explicacion corta arriba y material tecnico abajo.',
    upperVideoId: '8S0FDjFBj8o',
    lowerVideoId: 'O5nskjZ_GoI'
  }
];

export function createVideoFromLibraryItem(item) {
  return {
    videoId: item.videoId,
    inputUrl: `library:${item.id}`,
    watchUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${item.videoId}`,
    title: item.title,
    creator: item.creator
  };
}
