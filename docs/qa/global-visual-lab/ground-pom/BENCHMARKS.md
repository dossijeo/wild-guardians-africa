# GPU / CPU: milisegundos por frame

Intel UHD / ANGLE D3D11; medias de 2 bloques de 120 muestras. CPU de envío, no tiempo total de simulación.

| Perfil | Cámara | Hora | A GPU / CPU | B GPU / CPU | C GPU / CPU | D GPU / CPU | F GPU / CPU |
|---|---|---|---:|---:|---:|---:|---:|
| media | close | day | 14.332 / 3.940 | 14.743 / 4.035 | 16.340 / 3.940 | 15.692 / 3.439 | 15.966 / 3.511 |
| media | close | night | 14.954 / 3.966 | 15.091 / 3.648 | 15.685 / 3.322 | 16.383 / 3.015 | 16.775 / 2.972 |
| media | game | day | 14.312 / 3.666 | 14.294 / 3.586 | 15.246 / 3.373 | 16.331 / 3.250 | 15.716 / 3.161 |
| media | game | night | 14.909 / 3.370 | 15.029 / 3.310 | 15.136 / 3.265 | 15.801 / 2.918 | 16.093 / 2.985 |
| baja | close | day | 10.719 / 3.874 | 10.316 / 3.760 | 11.204 / 3.766 | 12.541 / 3.593 | 13.020 / 3.489 |
| baja | close | night | 11.483 / 3.699 | 10.723 / 3.643 | 12.440 / 3.555 | 13.258 / 3.529 | 14.386 / 3.428 |
| baja | game | day | 9.999 / 3.667 | 9.762 / 3.574 | 9.633 / 3.496 | 10.347 / 3.550 | 10.148 / 3.487 |
| baja | game | night | 10.816 / 3.508 | 10.191 / 3.708 | 10.577 / 3.771 | 12.586 / 3.411 | 11.157 / 3.646 |

P95 y medias de cada bloque en comparison-audit.json. A/B son matemáticamente idénticos: sus diferencias temporales estiman ruido/deriva, no una mejora de B. Los resultados no justifican un ranking preciso entre C y D en todos los escenarios. E se descarta visualmente y no tiene benchmark independiente.
