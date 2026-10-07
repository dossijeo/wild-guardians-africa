# Contactos de locomoción independientes del renderizado

Los cálculos puros `movingPose` y `crossedFootsteps` se trasladan sin modificar sus cuerpos desde `locomotion-vfx.js` a `locomotion-contact.js`. El módulo VFX conserva sus exportaciones públicas y utiliza las mismas funciones. MovementAudio importa directamente el módulo puro: ya no necesita cargar StepRipples ni Three mediante esta ruta.

El grafo estático desde AudioSystem pasa de 43 módulos locales / 370334 bytes de fuentes a 41 / 312437. No quedan dependencias externas en ese grafo. `graph.json` conserva los inventarios y hashes; `measure-source-graph.mjs` compara el baseline completo de Git `bfb65e6` con el árbol actual. Su parser cubre imports/reexports estáticos de una línea, incluidos JSON; no es un análisis de dependencias dinámicas.

Esto no acredita reducción del bundle de producción, RAM, descarga, CPU o frametime. El juego sigue utilizando Three por las rutas de renderizado.

- 97 pruebas dirigidas aprobadas de movimiento, contactos, ondas, ambiente del río, routing y ciclo de vida de audio; salida completa en `tests.log.gz`.
- Build correcto en 11,64 s; conserva el aviso de chunk grande. Salida en `build.log.gz`.
- Paquete verificado después de terminar el build: 641 archivos / 382701814 bytes, 859 enlaces relativos, 20 GLB de runtime y sin duplicados originales.
- Auditoría vigente: 126 SFX, 94 asignados / 32 pendientes, 126 originales exactos por hash.

Las pruebas dirigidas no acreditan escucha física ni la finalización natural de las fixtures de voces y fragmentos que siguen pendientes. `sources.json` identifica las fuentes probadas.
