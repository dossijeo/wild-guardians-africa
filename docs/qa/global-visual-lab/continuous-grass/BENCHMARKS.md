# Benchmarks de cobertura continua

Intel UHD 0x9A60, ANGLE/D3D11, Chrome headless, 1280×720, DPR 1. Semilla 712. A/B/C/C/B/A por vista y hora, 30 frames de calentamiento + 120 muestras por bloque. GPU incluye todas las pasadas; CPU es envío/render, no tiempo total de simulación. No se suman CPU y GPU. Mediana de 240 muestras por celda; p95 no es garantía de FPS.

| Calidad | Vista | Hora | Variante | GPU mediana / p95 ms | CPU mediana / p95 ms | Draws | Triángulos totales |
|---|---|---|---|---:|---:|---:|---:|
| media | close | day | A | 19.932 / 23.527 | 3.550 / 5.000 | 74 | 1,620,251 |
| media | close | day | B | 21.328 / 24.096 | 3.600 / 4.600 | 75 | 1,717,219 |
| media | close | day | C | 22.477 / 27.343 | 3.700 / 4.900 | 76 | 1,902,703 |
| media | close | night | A | 20.443 / 25.458 | 3.300 / 5.100 | 74 | 1,620,251 |
| media | close | night | B | 21.116 / 25.740 | 3.800 / 5.500 | 75 | 1,717,219 |
| media | close | night | C | 20.144 / 24.999 | 3.700 / 4.800 | 76 | 1,902,703 |
| media | game | day | A | 19.887 / 27.115 | 3.000 / 4.200 | 71 | 1,718,723 |
| media | game | day | B | 20.379 / 23.576 | 2.900 / 3.800 | 72 | 1,804,651 |
| media | game | day | C | 21.143 / 28.076 | 3.000 / 4.500 | 73 | 1,931,427 |
| media | game | night | A | 22.484 / 27.483 | 3.100 / 4.500 | 71 | 1,718,723 |
| media | game | night | B | 22.092 / 28.296 | 3.100 / 4.400 | 72 | 1,804,651 |
| media | game | night | C | 22.633 / 27.602 | 3.000 / 4.100 | 73 | 1,931,427 |
| media | elevated | day | A | 16.698 / 19.138 | 3.100 / 4.200 | 52 | 1,269,889 |
| media | elevated | day | B | 17.299 / 21.206 | 3.000 / 4.000 | 53 | 1,382,929 |
| media | elevated | day | C | 19.002 / 23.334 | 3.200 / 4.200 | 54 | 1,569,869 |
| media | elevated | night | A | 17.479 / 20.944 | 3.000 / 4.100 | 52 | 1,269,889 |
| media | elevated | night | B | 17.738 / 20.722 | 2.900 / 3.900 | 53 | 1,382,929 |
| media | elevated | night | C | 18.281 / 25.110 | 3.000 / 4.100 | 54 | 1,569,869 |
| baja | close | day | A | 14.526 / 16.433 | 3.200 / 4.700 | 73 | 1,227,612 |
| baja | close | day | B | 16.260 / 19.029 | 3.000 / 4.100 | 74 | 1,272,748 |
| baja | close | day | C | 15.697 / 17.743 | 2.900 / 4.100 | 74 | 1,272,748 |
| baja | close | night | A | 15.934 / 19.363 | 3.100 / 4.400 | 73 | 1,227,612 |
| baja | close | night | B | 16.091 / 19.402 | 3.050 / 4.100 | 74 | 1,272,748 |
| baja | close | night | C | 16.250 / 20.485 | 3.200 / 4.600 | 74 | 1,272,748 |
| baja | game | day | A | 16.687 / 20.117 | 3.000 / 4.800 | 71 | 1,251,268 |
| baja | game | day | B | 16.895 / 19.102 | 2.750 / 4.000 | 72 | 1,288,228 |
| baja | game | day | C | 16.756 / 18.049 | 2.700 / 3.700 | 72 | 1,288,228 |
| baja | game | night | A | 16.382 / 20.093 | 2.700 / 4.200 | 71 | 1,251,268 |
| baja | game | night | B | 16.261 / 19.618 | 2.600 / 3.700 | 72 | 1,288,228 |
| baja | game | night | C | 16.267 / 20.569 | 2.700 / 4.300 | 72 | 1,288,228 |
| baja | elevated | day | A | 10.571 / 13.024 | 3.300 / 4.200 | 48 | 878,098 |
| baja | elevated | day | B | 11.154 / 14.131 | 3.400 / 4.000 | 49 | 930,386 |
| baja | elevated | day | C | 11.093 / 14.513 | 3.300 / 4.100 | 49 | 930,386 |
| baja | elevated | night | A | 11.483 / 15.206 | 3.200 / 4.200 | 48 | 878,098 |
| baja | elevated | night | B | 12.313 / 15.024 | 3.200 / 4.100 | 49 | 930,386 |
| baja | elevated | night | C | 12.621 / 14.672 | 3.200 / 4.200 | 49 | 930,386 |

72 bloques, 8.640 muestras GPU válidas. Orden simétrico para reducir deriva; las diferencias pequeñas o negativas se consideran ruido, no una mejora de velocidad. Comparar dentro de esta ejecución, no contra ejecuciones históricas con distinta temperatura/carga.

Los contadores coverage.near/far conservan la última asignación cuando A está oculta: active=false. Para el coste real de A se utilizan los draws/triángulos del renderer, no esos buffers retenidos.
