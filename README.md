# Estudiemos Room

Prototipo independiente de una experiencia virtual de estudio. La app permite moverse por un lobby simple, acercarse a una casita, entrar al interior, abrir una computadora y estudiar desde una pantalla overlay con layout 70/30.

## Alcance V0

- Lobby inicial con terreno plano, casita visible y estetica low-poly liviana.
- Movimiento con WASD o flechas.
- Entrada a la casita al acercarse y presionar `E`, `Enter` o tocar el boton.
- Interior con escritorio, computadora, biblioteca y salida al lobby.
- Computadora interactiva con pantalla de estudio overlay.
- Interfaz de estudio 70/30 con area principal, estimulo visual tranquilo, selector de materia y selector de video.
- Datos mock separados en `src/data/mockStudyContent.js`.
- Sin backend, login, multiplayer, chat, amigos, Spotify, Netflix, YouTube libre ni progresion.

## Como correrlo

```bash
npm install
npm run dev
```

Luego abrir la URL local que muestra Vite, normalmente:

```text
http://localhost:5173
```

Importante: no abras `index.html` directamente desde el explorador de archivos. Esta app usa Vite y necesita correr con `npm run dev`.

## Controles

- `WASD` o flechas: moverse.
- `E` o `Enter`: interactuar al estar cerca de la casita o la computadora.
- `R`: reiniciar posicion si te perdes.
- `Esc`: cerrar la pantalla de estudio.

## Estructura

```text
estudiemos-room/
  index.html
  package.json
  README.md
  src/
    main.jsx
    data/
      mockStudyContent.js
    styles/
      app.css
```
