# Culling por instancia: aplicabilidad en seis biomas

Primera extensión del prototipo QA de Sabana a todos los biomas. Se filtran esferas transformadas de instancias fuera del frustum, ampliadas2.5m, solo pasada de color. Los shadow casters se conservan. Código compartido NativeAssetGroups, sin integración de producción.

72capturas/36parejas, baja1280×720, semilla712, día150/noche350, cámaras normal/oblicua/reversa. Misma cámara, objetivo y tiempo; cobertura de hierba idéntica cuando existe; sin errores. Se igualaron los helpers de materiales entre variantes: el capturador antiguo tenía condiciones adicionales por variante para Río/Cañón/Manglares, inadecuadas para esta comparación. [Capturas](captures.json), [comparación](comparison.json), [resumen](summary.json).

|Bioma|Parejas RGB exactas|Reducción de triángulos enviados|Máximo píxeles distintos|
|---|---|---|---|
|sabana|4/6|57.3–60.9%|274|
|gran-rio|6/6|45.7–60.4%|0|
|gran-canon|4/6|22.8–62.8%|3|
|manglares|6/6|39.8–60.3%|0|
|volcanes|6/6|45.0–53.9%|0|
|desierto|6/6|6.1–11.9%|0|

Son contadores de geometría enviada, no ahorro de tiempo GPU ni FPS. No se elimina densidad o geometría del mundo; la hipótesis es evitar enviar instancias no visibles. Los residuos de Sabana y Cañón aún no tienen causa aislada: no declarar paridad universal. Coincidencia exacta en seis poses tampoco certifica bordes de frustum bajo movimiento, animaciones grandes o todas las semillas.

## Decisión

Sí hay evidencia de aplicabilidad visual inicial en otros biomas y reducción de trabajo enviado. Priorizar medición móvil en Río, Manglares y Volcanes, además de Sabana; Desierto tiene menor potencial geométrico en estas vistas. No activar todavía globalmente.

El benchmark móvil previo de Sabana reducía GPU pero aumentaba CPU/subidas y empeoraba p95. El prototipo invalida el sello de todos los lotes con cada cambio de matriz de cámara. Antes de promoción: separar comprobación de visibilidad de actualización de buffers, subir solo si cambia selección o datos, y comparar CPU/GPU/cadencia en los seis biomas. Mantener sombras y validar entradas/salidas de cámara, streaming y origen. No transferir ahorro GPU de Sabana a otros biomas sin medirlo.

```powershell
node tools/experiments/capture-all-biome-instance-frustum.mjs
python tools/experiments/package-all-biome-instance-frustum.py
```

Vite5190. PNG y pares lossless locales; registros completos publicados. No inspección visual exhaustiva de todas las parejas; auditoría numérica completa. Main, simulación, navegación y modelos intactos.
