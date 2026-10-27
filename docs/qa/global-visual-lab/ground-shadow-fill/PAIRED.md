# Relleno: repetición dentro de la misma página

ABBA BAAB por fase, cuatro muestras de 180 frames por variante; se alternan los programas originales/candidatos sin recargar assets. No se usa un shader candidato desactivado como sustituto de la referencia.

| Caso | Fase | GPU base → candidata (ms) | Delta | CPU base → candidata (ms) |
|---|---|---:|---:|---:|
| 1 | day | 19.154 → 18.948 | -0.206 | 6.266 → 6.107 |
| 1 | night | 19.319 → 19.671 | 0.352 | 5.853 → 5.975 |
| 6 | day | 14.266 → 14.612 | 0.346 | 6.661 → 6.627 |
| 6 | night | 15.028 → 14.639 | -0.389 | 6.450 → 6.239 |
| 21 | day | 12.134 → 11.707 | -0.426 | 5.544 → 5.385 |
| 21 | night | 13.870 → 14.431 | 0.561 | 6.158 → 6.409 |

Conservar ambas rondas: la primera tiene una repetición lenta en Sabana y esta repetición no elimina la variabilidad del equipo. Valores negativos no prueban aceleración. Los informes incluyen GPU, dispositivo, estado de simulación, caché y errores. El 404 de la primera carga de Sabana no incluye URL en este log; no se atribuye sin evidencia a un recurso concreto.
