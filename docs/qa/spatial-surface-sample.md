# Muestreo de relieve de Wild Engine

## Alcance

En un estado congelado de Sabana/712, día 15, el perfil nativo mostró que las consultas repetidas de `residentSample()` al interpolar alturas consumían una parte importante de la planificación de tareas. `surface()` solicitaba por separado las cuatro esquinas de la misma celda. El cambio resuelve una vez la malla residente y lee sus cuatro valores directamente. Cuando esa malla no contiene todas las esquinas, conserva la ruta anterior por `latticeHeight()`; no cambia reglas de transitabilidad ni decisiones de juego.

Base: commit `2dd4110e2f00725105250299cc0bec52bcef4dd3`, WASM SHA-256 `439cd62a92ea247bd91d0216ac6722623e27c4621253e1f90393dc9b69b24276`. Candidato: WASM SHA-256 `b1c0f1804905c605345ed59e3f73c8b77290803db9c7f28180e10d1f88809be8`. Mismo compilador, script de construcción y configuración de 16 MiB iniciales para todas las ejecuciones del candidato. El binario base es el incluido en ese commit.

## Reproducción

La comparación funcional se ejecuta con:

```sh
node tools/experiments/compare-spatial-surface-sample.mjs baseline.wasm candidate.wasm
```

El script compara valores exactos de superficie, pendiente y agua, transitabilidad y rutas nativas en los seis biomas. Incluye límites de chunks y de halo, cambios de chunk seleccionado, asentamientos y descarga/recarga. En esta ejecución coincidieron 204.984 grupos de consultas de superficie, 6.300 de transitabilidad y 288 rutas. La cobertura es dirigida y aleatoria reproducible, no una prueba formal de todos los estados del mundo.

Para el benchmark de `Game.tick`, usar el estado congelado privado de QA `sabana712-day15-worker-routes.json.gz`, 120 segundos simulados desde el día 15, y ejecutar `tools/experiments/profile-frozen-native-tick.mjs` alternando `WILD_ENGINE_SPATIAL_SERVICES_WASM` entre los dos binarios en orden A/B/B/A/B/A. La muestra incluye 24 trabajadores, 1.646 cultivos vivos y 212 consultas nativas de ruta acumuladas. Todos los pases terminaron con el mismo hash del estado activo `42ec582c962fa6614c825a1cc96dc50ced8648ac42c6d1bf708d5bf7f2b21b67` y el mismo número de consultas.

| Orden | Binario | `Game.tick` 120 s (ms) | `planIfNeeded` (ms) |
| --- | --- | ---: | ---: |
| 1 | Base | 3.493,2 | 2.713,4 |
| 2 | Candidato | 1.912,1 | 1.205,7 |
| 3 | Candidato | 1.969,6 | 1.235,4 |
| 4 | Base | 3.630,0 | 2.848,6 |
| 5 | Candidato | 1.889,3 | 1.178,2 |
| 6 | Base | 3.630,2 | 2.865,0 |

Medianas: `Game.tick` 3.630,0 → 1.912,1 ms (−47,3 %); `planIfNeeded` 2.848,6 → 1.205,7 ms (−57,7 %). La mejora se observó en este intervalo cargado de tareas. No demuestra por sí sola el mismo porcentaje en campañas completas ni en otros biomas. La generación y carga inicial del mundo quedan fuera de estos totales.

`npm run test:playable` pasó 204/204 con el binario candidato y `npm run build` terminó correctamente. El tamaño WASM pasó de 508.623 a 496.676 bytes; no atribuimos toda esa variación de tamaño al cambio de interpolación porque el binario base estaba compilado antes de esta recompilación.

## Riesgos y límite

La ruta rápida depende de que las cuatro esquinas procedan de la misma malla residente. La ruta anterior sigue disponible en bordes o datos ausentes. El test diferencial incluye extremos de halo y cambios de residencia, pero los cambios futuros en generación o asentamientos requieren volver a ejecutar la comparación. El estado congelado de QA no se incorpora al repositorio porque procede de una campaña experimental y es grande.
