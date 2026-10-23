# Coste aislado de sombras de helechos

A: mismos helechos sin proyectar sombras. B: proyectan sombras. Ambas variantes usan mapa solar 4096, mismas geometrías, instancias, materiales, cámara y semilla. No es una comparación con producción 1024. Intel UHD, campaña pausada, 1280x720, fondo completo, cámara móvil, viento determinista. A/B/A/B; 60 warmup + 90 muestras GPU y otra pasada de cadencia.

| Fase | GPU A / B ms | Deltas de las dos parejas | CPU A / B ms | Cadencia A / B ms |
|---|---|---|---|---|
| day | 24.12 / 23.63 | +0.99 / -1.98 | 8.31 / 8.37 | 31.46 / 30.53 |
| night | 26.45 / 26.20 | +2.64 / -3.13 | 8.57 / 9.67 | 32.51 / 34.53 |

Verificado: misma selección de instancias y trayectoria en todas las repeticiones. Las diferencias de triángulos/draws incluyen la pasada de sombra adicional. Auditoría y percentiles en summary.json. No sumar CPU y GPU. Dos parejas no eliminan deriva térmica ni variación del sistema; la campaña está pausada. Memoria GPU física y overdraw no medidos. La calidad visual sigue pendiente de alcanzar el mockup.

## Decision

Resultado no concluyente por variacion entre parejas: dia +0.99/-1.98 ms GPU; noche +2.64/-3.13 ms. No presentar el promedio como ahorro ni coste demostrado. Las cuatro repeticiones conservan exactamente las secuencias de draws y triangulos; 720 queries validas, sin errores GL ni cambios de simulacion.

La cache registra entradas untracked y redibuja en ambos tratamientos; esta prueba NO mide la perdida de una cache funcional causada por el viento. Ambas usan 4096: tampoco mide el coste total frente a 1024 de produccion. Mantener la opcion artistica, sin promover ni descartar por estos tiempos. Siguiente medicion: ventanas alternadas mas cortas en una misma carga y diagnostico del motivo untracked.
