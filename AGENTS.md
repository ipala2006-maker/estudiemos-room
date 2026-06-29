# AGENTS.md - Estudiemos Room

## Rol del agente

Sos un agente tecnico trabajando sobre el proyecto Estudiemos Room.

Tu tarea es ayudar a construir una primera version funcional, simple, navegable y presentable de una experiencia web de estudio en formato mini entorno virtual.

No estas construyendo un videojuego completo, una red social ni una plataforma educativa completa.

## Definicion del producto

Estudiemos Room es una experiencia web independiente donde el usuario entra a un entorno virtual simple, accede a una habitacion/casita de estudio e interactua con una computadora para abrir una pantalla de estudio.

El flujo principal del producto es:

Pantalla inicial -> lobby -> casita -> computadora -> pantalla de estudio 70/30 -> volver.

La pantalla 70/30 significa:

- 70% de la interfaz para contenido principal de estudio.
- 30% para estimulo secundario controlado.

## Filosofia del proyecto

Prioridades:

1. Simplicidad antes que complejidad.
2. Funcionalidad antes que perfeccion visual.
3. Claridad antes que cantidad de features.
4. Experiencia navegable antes que arquitectura ambiciosa.
5. Codigo mantenible antes que soluciones sofisticadas.
6. Prototipo presentable antes que producto final.

No agregar complejidad si no mejora directamente el flujo principal.

## Alcance actual

El alcance actual es una primera version funcional y presentable.

Debe incluir:

- pantalla inicial clara;
- lobby simple;
- casita visible;
- movimiento basico;
- entrada a la casita;
- interior de estudio;
- computadora interactiva;
- pantalla de estudio 70/30;
- datos mock de materias y clases;
- estimulo visual secundario simple;
- botones de salida/volver;
- build funcional;
- deploy compatible con GitHub Pages.

## Fuera de alcance

No implementar por ahora:

- login;
- usuarios;
- backend;
- base de datos;
- multiplayer;
- estudiar con amigos;
- chat;
- Spotify;
- Netflix;
- YouTube libre;
- integracion real con Estudiemos;
- APIs externas;
- mundo infinito;
- skins;
- monedas;
- misiones;
- inventario;
- sistema de progreso;
- IA;
- analytics;
- pagos;
- assets pesados.

Si alguna de estas cosas parece necesaria, primero explica por que y pedi confirmacion antes de implementarla.

## Reglas tecnicas

- Mantener el proyecto como frontend independiente.
- No agregar backend.
- No agregar base de datos.
- No agregar dependencias pesadas sin justificar.
- Antes de instalar una dependencia nueva, explicar:
  - que dependencia es;
  - para que sirve;
  - por que conviene;
  - que alternativa mas simple existe.
- Mantener los datos mock separados en archivos faciles de editar.
- Mantener componentes separados y entendibles.
- No romper el deploy de GitHub Pages.
- Verificar siempre con:
  npm run build

## Criterios de aceptacion

Una tarea esta completa si:

1. La app corre localmente.
2. El build funciona.
3. No se rompe el flujo principal.
4. No se agregan features fuera de alcance.
5. La experiencia sigue siendo simple.
6. El usuario puede completar este recorrido:
   pantalla inicial -> lobby -> casita -> computadora -> pantalla 70/30 -> volver.

## Estilo visual

El estilo debe ser:

- simple;
- liviano;
- low-poly o basico;
- claro;
- tranquilo;
- no realista;
- no saturado.

El objetivo visual es comunicar un espacio de estudio virtual, no competir con videojuegos reales.

## Regla de oro

Si una mejora no ayuda a que el usuario entienda o complete mejor el flujo "entrar a estudiar dentro de una habitacion virtual", no la implementes todavia.
