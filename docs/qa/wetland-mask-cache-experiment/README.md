# Caché de máscara de Manglares: experimento descartado

Base de runtime: main `2d9e671e2c329dcc46332a7b854631798479cffc`. El experimento sustituye temporalmente `naturalWetlandMask` solo dentro del proceso QA. No se incorpora ninguna caché al juego.

## Escenario y resultados

Manglares/Mapungubwe, seed 712, primera jornada nativa: ocho semillas y dos trabajadores pagados, sin crédito ni riegos artificiales. Se realizan 2.000 pasos de 0,05 s; existe riego inicial completado por trabajadores. La configuración de tutorial y planes del fixture evita otras pausas/acciones durante este intervalo.

Se comparan consultas originales con una caché exacta por coordenadas/seed, limitada a 4.096 entradas por campo, y expulsión FIFO mediante el cursor actual. Dos pares de calentamiento y ocho pares alternados de procesos Node independientes. Todos conservan exactamente el hash de la trayectoria serializada completa, pasos y búsquedas.

| Mediana | Original | Caché |
| --- | ---: | ---: |
| Tiempo de fixture, ms | 1.704,52 | 1.876,44 |
| Mayor tick, ms | 89,94 | 108,67 |
| Consultas | 77.244 | 77.244 |
| Evaluaciones de máscara | 77.244 | 58.835 |
| Expulsiones | 0 | 54.739 |
| Entradas máximas | 0 | 4.096 |

Todas las parejas empeoran tanto tiempo total como máximo tick. Evitar evaluaciones no compensa el coste de consultar/construir claves y mantener esta caché en este escenario. Se descarta la propuesta; no justifica ampliar su memoria ni activarla en runtime.

## Reproducción y límites

`node tools/experiments/wetland-mask-cache.mjs` imprime progreso y JSON. `--child` ejecuta solo original; `--child --cached` ejecuta el candidato. Los hashes de fuentes se adjuntan.

Medición CPU local con las campañas en segundo plano; no son FPS, GPU ni RAM medida. Solo una seed/cultura y primera jornada, no incursiones o cien noches. El resultado rechaza esta implementación/configuración concreta; no demuestra que cualquier caché imaginable resulte peor. La reducción de cálculos aislados no se utiliza como evidencia de mejora del frametime.
