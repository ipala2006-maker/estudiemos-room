# Estudiemos Room

Entorno 3D inmersivo de estudio construido con React, Three.js y Vite.

## Mundo actual

La experiencia principal usa un edificio compacto:

- Planta baja: lobby, recepcion, Tienda Salchi, ascensor y escaleras.
- Piso 1: sala de estudio con computadora, agenda, pantalla y parlante.
- El cambio de piso conserva las interfaces, el audio y el estado persistente porque ambos pisos viven dentro de la misma sesion de React.

El vecindario anterior no fue eliminado. Puede abrirse temporalmente agregando `?world=legacy` a la URL. Para pruebas directas del primer piso puede usarse `?floor=study`.

## Como correrlo

```bash
npm install
npm run dev
```

Abrir la URL que muestra Vite, normalmente `http://localhost:5173/estudiemos-room/`.

No abras `index.html` directamente: el proyecto necesita el servidor de Vite.

## Controles

- `WASD` o flechas: moverse.
- Mouse: mirar.
- `E`: interactuar, usar escaleras y abrir el ascensor.
- `Q`: abrir los controles de pantalla o parlante al apuntarlos.
- `Enter`: confirmar una seleccion en el ascensor y las interfaces compatibles.
- `Backspace` o `Esc`: volver o cerrar paneles.
- `R`: volver al punto inicial del lobby.

## Agregar un piso

1. Agregar el piso a `BUILDING_FLOORS` en `src/maps/BuildingWorld.js`.
2. Definir sus puntos de llegada para ascensor y escaleras.
3. Crear su grupo 3D y colliders en `FirstPersonWorld.jsx`.
4. Activar el grupo desde `applyFloor` y conservar los controladores globales en `main.jsx`.

No se deben duplicar los estados de agenda, audio, monedas, skins ni pantalla dentro de un piso.

## Verificacion

```bash
npm run build
```

No hay scripts de lint o test automatizado configurados actualmente.
