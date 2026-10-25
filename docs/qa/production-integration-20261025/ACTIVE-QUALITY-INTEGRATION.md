# Integración: cambios de calidad con simulación activa

Head 11d1965f1. Manglares poblado, calidad inicial media, mismo fixture/protocolo de 240 frames y 144 m; secuencia A/B/A/B. A usa frameScheduler=0 y mudEdgeWorker=0 explícitos; B ambos=1. Ambos tienen el perfil artístico revisado, pthreads y streamingOptions normales. No es comparación contra main ni una medida aislada del scheduler.

| Corrida | Cámara + asentamiento (s) | Máximo presentación baja/media/baja (ms) | Frames avanzando | Nuevos chunks |
|---|---:|---|---|---:|
| a1 | 16.061 | 6844.61 / 80.05 / 78.50 | 240/240 | 15 |
| b1 | 8.899 | 89.72 / 106.38 / 91.77 | 240/240 | 15 |
| a2 | 15.162 | 6926.73 / 86.60 / 72.66 | 240/240 | 15 |
| b2 | 8.583 | 64.25 / 85.69 / 71.61 | 240/240 | 15 |

En las cuatro pruebas: 0 frames pausados, 0 fallos de streaming, colas vacías al terminar. La primera transición de A vuelve a mostrar un intervalo de ~6,9 s, ausente en B. Es consistente con la evidencia anterior; no supone ausencia de cualquier tirón ni ganancia de FPS general. Se conservan los resultados completos, incluidos avisos de shaders y diagnósticos.

Limitaciones: sin atribución GPU/CPU de las transiciones; los tiempos incluyen diagnósticos de correctitud del protocolo. Durante esta serie se consultó CI y se ejecutó una prueba Node corta (18 tests, ~0,77 s). La serie sirve como comprobación diagnóstica; repetir sin actividad concurrente antes de usarla para cerrar rendimiento. Aún faltan otros biomas, carga inicial, memoria/colas sostenidas, ciclo de vida y paquete publicado.

Repetir con check-spatial-thread-game.mjs: WG_THREAD_PORT=5190, WG_THREAD_BIOME=manglares, WG_THREAD_QUALITY=media, WG_CURRENT_REVIEW=1, WG_THREAD_DEFAULT_STREAMING=1, WG_THREAD_ACTIVE=1, WG_THREAD_QUALITY_CYCLE=1, WG_THREAD_QUALITY_MENU_PROTOCOL=1, WG_THREAD_QUALITY_ACTIVE=1; WG_FRAME_SCHEDULER/WG_MUD_EDGE_WORKER=0 para A y 1 para B. Guardar cada WG_THREAD_REPORT por separado. No ejecutar builds o tests mientras se mide.

## CI

Run40189380447 (head907c399f6) terminó con 8 fallos. Se repararon los fixtures de calidad/residencia/contexto para usar los métodos actuales de retención y actualización de programas; la prueba de restauración además exige una actualización de programas. Se mantiene la comprobación de geometría, simulación, culling, intensidad y materiales. 18 tests pasan. Se regeneró el inventario SFX porque cambiaron líneas y hashes de los consumidores gráficos; 3 tests de auditoría pasan, sin cambiar rutas de audio ni sonidos. No se ha debilitado el verificador de vigencia. CI global del nuevo head continúa pendiente.

## Repetición sin tareas locales concurrentes

Head1c7a508ea, mismos controles y protocolo, corridas isolated-quality-*.json. Durante las cuatro pasadas no se ejecutaron builds, pruebas ni otros comandos locales de investigación.

| Corrida | Cámara + asentamiento (s) | Máximo baja/media/baja (ms) | Frames avanzando | Nuevos chunks |
|---|---:|---|---|---:|
| a1 | 15.802 | 6772.75 / 90.67 / 93.08 | 240/240 | 15 |
| b1 | 8.908 | 81.73 / 99.38 / 73.30 | 240/240 | 15 |
| a2 | 15.207 | 6692.75 / 98.96 / 77.57 | 240/240 | 15 |
| b2 | 8.612 | 63.25 / 87.95 / 72.54 | 240/240 | 15 |

El tiempo total baja un 43,6 % y 43,4 % en las dos parejas; la primera transición vuelve a perder su bloqueo de ~6,7 s. Todas terminan con 240 frames avanzando, 15 chunks nuevos, 0 fallos y 0 pendientes. Esto confirma el beneficio de este conjunto en este escenario, no un aumento universal de FPS. Los tiempos incluyen los diagnósticos del protocolo; siguen sin separar GPU/CPU. Las otras condiciones de aceptación permanecen abiertas.
