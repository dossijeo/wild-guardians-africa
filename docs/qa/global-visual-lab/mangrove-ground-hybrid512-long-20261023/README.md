# Manglares: cache512, validacion larga sin tareas concurrentes

Intel UHD0x9A60/ANGLE D3D11, media1280x720,fixture712 pausada,camara normal movil. A/B/A/B original/cache512,dia/noche.180frames de calentamiento y240muestras por ventana. Solo GPU completa y cadencia; sin temporizadores por objeto. Durante la serie no se hicieron inspecciones/generaciones de imagenes, ediciones, compilaciones, tests ni pushes; solo espera y consultas breves de estado.

Auditor estricto: llamadas,triangulos,cobertura,estado y camara identicos por frame en las ocho ejecuciones y ambas ventanas.1920queriesGPU completas validas; sin disjoint,perdidas,errores. Media898214.588triangulos, diferente de la serie corta porque recorre una secuencia mas larga de la misma trayectoria; comparar SOLO dentro de esta serie.

|Variante|Fase|GPU completa ms|CPU render cadencia ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|23.494|8.03|29.549|36|
|base|night|25.154|8.794|32.465|38.2|
|cache512|day|21.096|8.186|27.349|32.6|
|cache512|night|23.561|8.005|27.793|34.1|
|base|day|24.051|8.438|30.672|39.9|
|base|night|26.233|8.099|29.735|36.1|
|cache512|day|21.715|8.145|27.993|34|
|cache512|night|21.883|7.771|27.905|35.3|

Comparaciones por pareja: ahorroGPU2.398/1.593/2.336/4.350ms; intervalo2.200/4.672/2.679/1.830ms; p953.4/4.1/5.9/0.8ms. Mejora en las cuatro parejas y todas esas metricas. GPU candidata21.096–23.561ms, original23.494–26.233ms. Es evidencia a favor de continuar con cache+LOD, NO cierre del objetivo: una noche sigue por encima de23ms, simulacion pausada, calidad media y camara normal solamente.

La implementacion es exactamente la cache fija512 descrita en ../mangrove-ground-hybrid512-20261023: mezcla estatica RGBA8, detalle compartido e iluminacion/sombras dinamicas originales.33.578MiB extra para25chunks sigue siendo demasiado para proponerla tal cual en baja. Las limitaciones visuales de camara cercana siguen vigentes; esta serie no las resuelve. Faltan LOD adaptativo real, eventos/invalidaciones, streaming, baja, camara elevada, simulacion activa y pruebas de liberacion.

Siguiente etapa dentro del mismo objetivo: combinar fidelidad cercana con cache de composicion en planos medios/lejanos, seleccionar128/256/512 por proyeccion y limitar residencia. La variante noise128 mantiene mucho mejor la mezcla fina pero no ha probado por si sola un ahorro suficiente; evaluar como ruta cercana, sin eliminar rasgos aprobados. Mantener original por defecto hasta superar validacion integral. No trabajar en otros biomas.

```powershell
$env:WG_VARIANT_SEQUENCE='base,cache512,base,cache512'
$env:WG_PHASES='day,night'
$env:WG_VIEW='normal'
$env:WG_SAMPLES='240'
$env:WG_WARMUP='180'
$env:WG_MODES='frame,cadence'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-hybrid512-long-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
python tools/experiments/audit-mangrove-ground-long-20261023.py docs/qa/global-visual-lab/mangrove-ground-hybrid512-long-20261023 cache512
```
