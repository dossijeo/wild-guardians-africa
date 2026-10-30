# Seguimiento de fluidez y contacto del centro

El usuario solicita investigar tanto el z-fighting interior del centro de trabajo como el rendimiento de los últimos vídeos. Esta petición amplía la prioridad de rendimiento, anteriormente delegada a otra investigación.

Se repitió el ciclo lateral del león sin MediaRecorder, en WorldScene/spatial-WASM, con `nativeRaid&lightingReview&characterLod=auto&recoveryClose&recoveryDay`, mediante «Medir ciclo físico real». Datos completos en `lion-side-no-recording.json`.

| Métrica | Vídeo anterior | Sin grabación |
| --- | ---: | ---: |
| Media de fotograma | 177,16 ms | 176,36 ms |
| P95 | 481,97 ms | 482,22 ms |
| P99 | 532,19 ms | 548,89 ms |
| Bloque world.render, media | 64,99 ms | 65,34 ms |
| Física total, media | 3,13 ms | 2,61 ms |

El ciclo sin grabación completó 12,05 segundos simulados en 42,36 segundos de reloj, sin errores. El delta de simulación de esta herramienta está limitado a 50 ms; por eso los segundos simulados no reflejan tiempo real cuando cae el framerate. No se ha alterado ese límite para disfrazar la fluidez.

Es una repetición diagnóstica, no un benchmark ABBA: no permite cuantificar pequeñas diferencias de captura. Sí contradice la hipótesis de que eliminar la grabación resuelva por sí solo la lentitud. `renderMs` rodea world.render e incluye actualizaciones; no es tiempo GPU. Faltan medidas separadas de Game.tick, trabajo diagnóstico, espera de scheduler y etapas de renderizado. No atribuir el tiempo restante a GPU sin temporizadores válidos.

Respecto al anclaje, scene.js coloca el centro en `field.surface(e.x,e.z)+0.025`. El muestreo visual del terreno triangulado existe en terrain-surface.js, pero no se utiliza para ese anclaje. Además, una altura central no comprueba todo el suelo interior. Son hipótesis pendientes de reproducción visual y medición del área: aún no se ha demostrado cuál causa el z-fighting y no se ha aplicado un desplazamiento arbitrario.

Pendiente: reproducir el parpadeo interior con cámara en movimiento, medir suelo/modelo en esa zona, corregir la causa y volver a grabar; perfilar etapas sin alterar mecánicas y validar cualquier optimización con condiciones comparables. Ninguno de estos problemas se considera resuelto por esta medición.

## Desglose adicional

Añadiendo `profileStages` a la misma URL se mide cada avance del generador de actualización, el dibujo, Game.tick y el endFrame del scheduler anterior. Se conservan los datos completos en `lion-side-stage-profile.json`. El ciclo terminó sin errores: media de fotograma 172,56 ms, P95 449,13 ms, P99 515,54 ms. Es otra muestra diagnóstica, no una mejora.

Game.tick: media 17,59 ms, P95 53,17 ms, máximo 115,30 ms. Scheduler anterior: media 0,12 ms, máximo 2,86 ms. La etapa 9 (`drawRenderFrame`) cuesta 54,63 ms de media, P95 67,31 ms y máximo 120,71 ms. Se mide duración síncrona de la llamada, no tiempo GPU: puede incluir esperas del controlador.

Mapa de etapas: 0 cámara/chunks; 1 LOD y sync de entidades; 2 obstrucciones; 3 vegetación lejana; 4 agrupación de assets; 5 efectos y Guardián; 6 uniformes; 7 preparación de recursos; 8 cierre del generador; 9 dibujo. Las medias de 1 y 5 son 3,92 y 4,91 ms respectivamente. No se pueden sumar percentiles de etapas para construir un percentil total.

La siguiente investigación debe desglosar las pasadas de dibujo y la simulación. El intervalo total incluye también trabajo de diagnóstico, audio, navegador y esperas no cubiertas; no atribuir ese resto automáticamente a GPU. No hay cambios de producción en esta instrumentación.
