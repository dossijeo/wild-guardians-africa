# Rendimiento de paletas constantes y carbón volcánico

ABBA por páginas nuevas, semilla 712, calidad media, 1280×720, 180 muestras tras calentamiento. Código congelado durante toda la medición; la posterior separación de claves de caché por bioma no cambia GLSL ni el caso de un bioma por renderer medido aquí. Las métricas completas están en abba.json.

| Escena | GPU base → opción | Δ GPU | CPU envío base → opción |
|---|---:|---:|---:|
| Sabana day | 18.128 → 18.784 ms | 0.656 ms | 7.212 → 6.574 ms |
| Sabana night | 18.727 → 19.468 ms | 0.742 ms | 5.624 → 6.174 ms |
| Volcanes day | 15.153 → 15.110 ms | -0.043 ms | 6.815 → 7.286 ms |
| Volcanes night | 15.212 → 15.420 ms | 0.208 ms | 6.266 → 6.355 ms |
| Cañón day | 11.729 → 12.476 ms | 0.747 ms | 5.635 → 6.017 ms |
| Cañón night | 13.958 → 13.011 ms | -0.948 ms | 5.923 → 5.766 ms |

Sabana supera +0,5 ms GPU en ambas fases en esta ronda. Cañón diurno también supera el umbral; su referencia nocturna deriva de 13,006 a 14,911 ms, por lo que la media negativa no demuestra aceleración. Volcanes no muestra regresión media superior al umbral. La opción sigue siendo experimental: esta ronda no aprueba un presupuesto global.

Los draws y triángulos enviados por el pass de color permanecen iguales en cada bioma (87/1.267.266 Sabana, 89/744.270 Volcanes, 80/623.210 Cañón). Esto no anula el coste de actualizar sombras del terreno: el benchmark permite su caché y la medición conservadora sin caché está en ../terrain-shadow-volume/README.md. No se midieron VRAM ni latencia de carga. Gran Río, Manglares y Desierto no se midieron en esta ronda.
