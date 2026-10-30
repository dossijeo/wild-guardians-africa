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
