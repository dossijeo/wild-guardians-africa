# Primera medición de la integración (paleta uniforme)

ABBA, dos repeticiones por variante/fase, 180 frames por muestra. La CPU de envío de esta ronda es mayor que en las anteriores; no comparar tiempos absolutos entre rondas como una mejora o regresión del código.

| Caso | Fase | GPU base → integrada | CPU base → integrada |
|---|---|---:|---:|
| 1 | day | 19.912 → 19.799 | 14.140 → 13.055 |
| 1 | night | 19.749 → 20.238 | 13.691 → 12.329 |
| 6 | day | 14.512 → 14.710 | 14.027 → 13.563 |
| 6 | night | 14.363 → 14.825 | 13.116 → 13.356 |
| 21 | day | 12.519 → 13.237 | 9.291 → 10.889 |
| 21 | night | 13.054 → 13.055 | 8.878 → 10.315 |

La referencia diurna de Cañón varía de 10,813 a 14,226 ms entre repeticiones: incertidumbre importante. No se considera aprobación del presupuesto global. La siguiente versión resuelve bioma/paleta al crear el material, como el parche QA, y evita selección por fragmento. Su equivalencia visual y coste requieren comprobación propia.
