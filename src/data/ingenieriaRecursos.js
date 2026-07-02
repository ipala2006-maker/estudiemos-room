export const ingenieriaRecursosSource = {
  name: 'Estudiemos',
  repository: 'ipala2006-maker/ingenieria-recursos',
  repositoryUrl: 'https://github.com/ipala2006-maker/ingenieria-recursos'
};

export const ingenieriaRecursosData = {
  carreras: [
    {
      slug: 'ingenieria',
      title: 'Ingenieria',
      description: 'Carrera de ingenieria.',
      materias: [
        {
          slug: 'analisis-matematico-1',
          title: 'Analisis Matematico I',
          description: 'Limites, derivadas e integrales.',
          temas: [
            { slug: 'limites', title: 'Limites', meta: 'Base para calculo' },
            { slug: 'continuidad', title: 'Continuidad', meta: 'Propiedades' },
            { slug: 'derivadas', title: 'Derivadas', meta: 'Tasa de cambio' },
            { slug: 'integrales', title: 'Integrales', meta: 'Acumulacion' },
            { slug: 'sucesiones', title: 'Sucesiones', meta: 'Convergencia' },
            { slug: 'series', title: 'Series', meta: 'Sumatorias' }
          ]
        },
        {
          slug: 'fisica-1',
          title: 'Fisica I',
          description: 'Mecanica y termodinamica.',
          temas: [
            {
              slug: 'mediciones',
              title: 'Mediciones',
              meta: 'Unidades e incertidumbre',
              videos: [
                { title: 'Mediciones - video 1', url: 'https://youtu.be/8moh63kQukE?si=RCZDy6G6HChrroOc' },
                { title: 'Mediciones - video 2', url: 'https://youtu.be/C7cORnM76yI?si=NWiv5QUonj54Vk-5' },
                { title: 'Mediciones - video 3', url: 'https://youtu.be/jg5_NNh9hq4?si=hQDVYFZYDWBEl3Cf' },
                { title: 'Mediciones - video 4', url: 'https://youtu.be/CXOdNH9KMOQ?si=Ug68TQoE-FtcjQyN' }
              ],
              pdfs: [
                {
                  title: 'Apuntes de Mediciones',
                  url: 'https://raw.githubusercontent.com/ipala2006-maker/ingenieria-recursos/main/pdfs/fisica-1/mediciones/apuntefisica.pdf.pdf'
                },
                {
                  title: 'Errores de Medicion e Incertidumbre',
                  url: 'https://raw.githubusercontent.com/ipala2006-maker/ingenieria-recursos/main/pdfs/fisica-1/mediciones/errores.pdf.pdf'
                },
                {
                  title: 'Magnitudes Fisicas',
                  url: 'https://raw.githubusercontent.com/ipala2006-maker/ingenieria-recursos/main/pdfs/fisica-1/mediciones/magnitudes.pdf.pdf'
                }
              ],
              herramientas: [
                {
                  title: 'Micrometro virtual interactivo',
                  type: 'Simulador',
                  url: 'https://www.stefanelli.eng.br/es/micrometro-virtual-centesimas-milimetro-simulador/'
                },
                {
                  title: 'Calibre virtual interactivo',
                  type: 'Simulador',
                  url: 'https://www.stefanelli.eng.br/es/calibre-virtual-simulador-milimetro-05/'
                }
              ]
            },
            { slug: 'estatica', title: 'Estatica', meta: 'Equilibrio de fuerzas' },
            { slug: 'cinematica', title: 'Cinematica', meta: 'Movimiento sin fuerzas' },
            { slug: 'dinamica', title: 'Dinamica', meta: 'Leyes de Newton' },
            { slug: 'trabajo-energia', title: 'Trabajo y energia', meta: 'Energia mecanica' },
            { slug: 'cantidad-movimiento', title: 'Cantidad de movimiento', meta: 'Choques e impulso' },
            { slug: 'rotaciones', title: 'Rotaciones', meta: 'Movimiento angular' },
            { slug: 'moas', title: 'Movimiento oscilatorio', meta: 'Oscilaciones' },
            { slug: 'elasticidad', title: 'Elasticidad', meta: 'Deformaciones' },
            { slug: 'fluidos', title: 'Fluidos', meta: 'Presion y Bernoulli' },
            { slug: 'calorimetria', title: 'Calorimetria', meta: 'Transferencia de calor' },
            { slug: 'termodinamica', title: 'Termodinamica', meta: 'Leyes termicas' },
            { slug: 'ondas', title: 'Ondas', meta: 'Propagacion' },
            { slug: 'sonido', title: 'Sonido', meta: 'Acustica' }
          ]
        }
      ]
    }
  ]
};
