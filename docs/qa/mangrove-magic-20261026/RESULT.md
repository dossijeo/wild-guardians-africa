# Manglares y activación de magias: resultado verificado

Rama: `codex/global-visual-lab`. Sin fusión a main. Informe de cierre del objetivo de generación estuarina y bloqueo multisegundo al activar magia; no es una certificación general de rendimiento o distribución.

## Implementación adoptada

- Wild Engine produce una red estuarina distribuida con meandros, ramificaciones y márgenes húmedos (`mangroveNetwork`). La versión antigua permanece reproducible para guardados existentes.
- Las partidas nuevas usan `mangroveSettlementVersion=2`: reservas secas por edificio y centro, margen hidráulico de 1 m independiente del halo de nivelación/vegetación. Evita que el rectángulo del poblado y su halo de 6 m corten cauces fuera de los edificios. Las reservas se publican en lote, con una única invalidación. Partidas sin versión y versión1 conservan sus recetas.
- Snapshot nativo, réplica lejana y trabajos pthread conservan las reservas y su margen. Se rechazan resultados preparados con revisión obsoleta.
- Las luces VFX tienen cuatro slots persistentes desde la carga. Activar escudo no cambia el número de luces ni provoca variantes globales de shaders. Se conserva la iluminación del efecto aislado y la propiedad/liberación de recursos. Con más de cuatro fuentes se seleccionan las más relevantes con histéresis; no se prometen luces ilimitadas.
- No se modificaron costes, cooldowns, impactos, duración ni permisos de magia para obtener las cifras.

## Auditoría de requisitos

| Requisito | Evidencia inspeccionada |
|---|---|
| Red distribuida, sin bioma seco ni lago regional continuo | `network-v8-meanders/report.json` y mapas de cuatro semillas; `mangrove-channels.test.js` comprueba 100 semillas en dos regiones. Límites amplios de agua detectan regresiones, no prueban por sí solos calidad artística. |
| Aspecto real, varias semillas | `hydraulic-v2-seeds/{1,37,712}/{world,elevated}.png`, `building-pad-hydraulic-v2/elevated.png` (4096). Inspeccionadas. 712 tiene cauces más anchos; 1 conserva brazos cortos cerca de construcciones. No se afirma identidad con el mockup. |
| Activación normal del juego | `hydraulic-v2-production-default/validation.json` y `elevated.png`: nueva partida4096, versión2 sin inyección QA, pthreads, cero errores. |
| Continuidad y equivalencia nativa | `mangrove-building-pads.test.js`: cuatro poblados reales, perímetros secos, nueve chunks tras recarga y tres vecinos preparados en pthread por semilla; agua, posiciones, instancias y props coinciden. `mangrove-channels.test.js` amplía cobertura espacial y regeneración. |
| Guardados y expansión | `mangrove-expansion-reload.test.js`: recetas legacy/1/2, expansión pagada, alturas/agua idénticas tras recargar; versiones inválidas rechazadas. |
| Navegación y colisiones | `mangrove-water-traversal.test.js`: todos los radios de actores, agua transitable y barreras sólidas. `worker-crossing/reload-fixed/renderer.json`: trabajador real,61 muestras sobre agua y riego completado. Esa captura es anterior al margen hidráulico2; la receta2 se cubre además con las pruebas nativas y la incursión siguiente. |
| Incursión real actual | `hydraulic-v2-raid/render/summary.json`, captura y vídeo local: cinco especies, escudo al primer clic, cero errores. Rinoceronte espera por contención y finalmente camina; no se afirma ausencia de esperas de reservas. |
| Causa y antes/después del bloqueo | `shield-abab/summary.json`: cuatro ejecuciones del mismo guardado, diez actores, media720p. El cambio de luces disparaba36 consultas de programa con esperas de4,94/5,20s. Slots estables eliminan esa cascada. |
| Primer uso y repetición con simulación/streaming | `hydraulic-v2-shield-stream/summary.json`: dos escudos legales separados por cooldown90s, movimiento144m/40s cadauno,4cultivos conservados, comandos5,765/3,985ms, cero consultas tardías de programa. Control sin magia en `hydraulic-v2-stream-control`. |
| Otras magias y noche | `hydraulic-v2-agriculture/{day,night}/summary.json`: crecimiento/multiplicación repetidos, efectos visibles y persistentes al alcanzar uNight1. El intento `full-night/policy-rejection.json` fue rechazado correctamente: estas dos magias solo se pueden lanzar antes de time300; no se alteró la regla. |
| Arte conservado | Capturas agrícolas y `hydraulic-v2-shield-stream/shield-0.png`: helechos holly y suelo aprobados. Caché512 y perfiles visuales conservados. |

## Rendimiento y límites

El A/B/A/B original registra máximos de **5154,925/5454,19 ms** con luces dinámicas frente a **166,2/166,35 ms** con slots estables. La mediana ronda50ms en ambas configuraciones: elimina la congelación evitable, no demuestra mayor FPS sostenido.

Con la receta2 actual: incursión/UI máximo182,79ms; escudos repetidos/streaming166,18ms frente149,79ms sin magia; agrícola día116,135ms y anochecer/noche133,04ms. No son medidas GPU aisladas. La pareja de streaming actual no es ABAB y tiene distinta residencia de chunks; no atribuir toda diferencia al escudo ni afirmar coste nulo. Los perfiles incluyen muestreo CPU y algunas capturas/vídeo.

Persisten picos de renderizado/streaming. El lote de reservas evita11 regeneraciones repetidas, pero su reconstrucción única aún es síncrona. No se declara eliminado todo trabajo CPU costoso ni certificada toda configuración de hardware.

## Reproducción y comprobaciones finales

En el worktree, ejecutar:

```text
node --test tests/mangrove-building-pads.test.js tests/mangrove-channels.test.js
node --test tests/mangrove-expansion-reload.test.js tests/spatial-settlement-batch.test.js tests/mangrove-water-traversal.test.js tests/raid-contention-turns.test.js
node --test tests/shield-vfx.test.js tests/shield-expiry.test.js tests/shield-placement-collision.test.js tests/spell-placement.test.js tests/agricultural-magic-policy.test.js tests/manual-magic-activity.test.js tests/vfx-preload.test.js
npm run build
```

Las suites correspondientes pasaron en las comprobaciones finales; no sumar ejecuciones repetidas como tests únicos. Build Vite pasada, con avisos de tamaño de chunk e importación mixta ya existentes.

Renderer real: servidor aislado5220, Chrome, media1280x720. Los scripts `check-beast-raid-ui.mjs`, `check-shield-repeat-render.mjs`, `check-agriculture-render.mjs` y `check-mangrove-water-authority.mjs` usan las fixtures y parámetros registrados en `PROGRESS.md`. Cada corrida de rendimiento se ejecutó sin otro renderer concurrente. Perfiles y vídeos completos permanecen locales; resúmenes/capturas decisivas están versionados.

La build no equivale a aprobación para publicar: sigue documentado por separado el exceso del límite de tamaño de distribución debido a los atlas nuevos (`../tree-atlas-refresh-20261026/APPLIED.md`). No se ha elevado ese límite, construido instalador Tauri ni fusionado a main como parte de este cierre.
