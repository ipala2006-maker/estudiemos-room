# Migracion al edificio

## Arquitectura elegida

El edificio usa una sesion 3D unica con grupos de escena activables y transiciones hibridas. El lobby y el Piso 1 no montan copias de los controladores de aplicacion. El transporte cambia la zona visible y la posicion del jugador, mientras React mantiene vivos agenda, Spotify, pantalla, monedas, skins y preferencias.

Esta eleccion conserva las coordenadas originales de Casa 1 en el Piso 1. Los sistemas que dependen de posiciones fijas siguen funcionando sin migrar sus datos ni reescribir sus interfaces.

## Inventario y dependencias

- `FirstPersonWorld.jsx`: escena, camara, movimiento, colisiones, Casa 1, pantalla fisica, computadora fisica, agenda fisica y mascota.
- `main.jsx`: estado global de interfaces, contenido de pantalla, Spotify, agenda, monedas y paneles.
- `Casa1.js`: coordenadas historicas de spawn, limites y computadora.
- `installInteractionTargeting.js`: raycast por coordenadas para computadora, agenda, pantalla, parlante y tienda.
- `installRoomSpeakerWorld.js`: representacion y objetivo del parlante en Casa 1.
- `installRoomShopWorld*.js`: representacion de la tienda y vendedor.
- `agendaSync.js`, `useFocusEconomy.js` y `focusEconomy.js`: persistencia independiente de la escena.

Las dependencias de mayor riesgo eran las coordenadas fijas del Piso 1, los limites usados para decidir si un objeto era visible y la Tienda Salchi montada por parches globales.

## Desacople aplicado

- La definicion de pisos y llegadas vive en `BuildingWorld.js`.
- El Piso 1 reutiliza las coordenadas de Casa 1 sin duplicar controladores.
- La tienda elige su ubicacion segun `scene.userData.worldMode`.
- El sistema de objetivos reconoce por separado lobby y sala de estudio.
- Ascensor y escaleras llaman a un unico transporte configurable.

## Navegacion

- Escalera: geometria de escalones con altura de movimiento suavizada. El descanso conecta con el piso opuesto mediante una transicion breve.
- Ascensor: panel de seleccion, cierre visual, transicion y llegada al punto configurado del piso.
- `BUILDING_FLOORS` es la fuente de verdad para el selector del ascensor.

## Respaldo

El codigo del vecindario y Casa 1 permanece intacto. Para cargarlo:

```text
?world=legacy
```

El modo por defecto sigue siendo el edificio. El parametro solo sirve como respaldo durante la validacion.

Para QA local se admiten `?floor=study` y `?spawn=elevator|stairs|shop`. No cambian el recorrido normal y permiten validar zonas concretas sin recorrer manualmente toda la escena.

## Riesgos pendientes

- La escena todavia concentra mucha geometria procedural en `FirstPersonWorld.jsx`; conviene separar cada piso cuando la migracion visual quede aprobada.
- No existe una suite automatizada de colisiones 3D; los recorridos deben seguir verificandose en navegador.
- El ascensor es hibrido y no mueve una cabina fisica entre plantas.
