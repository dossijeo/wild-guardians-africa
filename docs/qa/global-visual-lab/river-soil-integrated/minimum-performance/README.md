# Gran Río: coste integrado en calidad mínima

ABBA, Intel UHD (0x9A60), Chrome headless, 1280×720, semilla712, cámara normal fija, muy_baja. A usa material anterior; B activa riverSoil=1. Ambos conservan paleta, cobertura C, viento8 y geometría. Simulación/tiempo visual normalizados. 180 frames de calentamiento antes de cada ventana; 120 consultas GPU y 180 frames de cadencia separados. Ocho bloques:960 muestras GPU y1.440frames, sin errores registrados. Cámaras, draws, triángulos y cobertura coinciden; cero overflow.

| Medida | A anterior | B tierra integrada |
|---|---:|---:|
| GPU día | 10,27–12,13 ms | 11,63–11,87 ms |
| GPU noche | 11,87–14,23 ms | 12,43–12,83 ms |
| CPU render día | 3,53–3,75 ms | 3,58–3,76 ms |
| CPU render noche | 3,49–3,64 ms | 3,50–3,50 ms |
| Intervalo día | 16,627–16,628 ms | 16,627–16,628 ms |
| Intervalo noche | 16,629–16,720 ms | 16,627–16,627 ms |

Rangos de medias de dos bloques, no intervalos de confianza. No hay un sobrecoste GPU consistente en esta serie: los rangos se solapan y el signo cambia según repetición. Esto no significa coste cero. La cadencia está cerca del límite de refresco; no convertir estabilidad de FPS en margen GPU demostrado. Máxima consulta individual26,73ms, sin anomalía extrema observada. No mide movimiento, streaming, partida avanzada ni memoria física.

[Doce capturas antes/después](../minimum-original/captures.json), [comparativa diurna](../minimum-original/gran-rio-muy_baja-day-pair.webp), [nocturna](../minimum-original/gran-rio-muy_baja-night-pair.webp). La inspección diurna muestra una separación más clara de caminos y poblado frente al claro verde anterior. Se mantiene la cubierta volumétrica; el contorno circular del claro sigue siendo una limitación artística. Los intentos anteriores de fringe/material-noise ya demostraron que retocar umbrales no resuelve su composición.

**Conservar la receta integrada opcional.** Esta prueba no da motivo para descartarla por rendimiento en cámara fija mínima, pero no aprueba un presupuesto global ni la calidad final de los seis biomas.

Reproducir: Vite5190; node tools/experiments/measure-river-soil-integrated-minimum.mjs; python tools/experiments/audit-river-soil-integrated-minimum.py. Capturas: WG_RIVER_QUALITY=muy_baja, WG_RIVER_ORIGINAL=1 y WG_RIVER_OUT nuevo con capture-river-soil-integrated.mjs/package-river-soil-integrated.py. [Datos](benchmarks.json), [resumen](summary.json).
