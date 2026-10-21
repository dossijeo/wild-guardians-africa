# Arena seca con un solo mapa adicional

Candidata QA: conserva la normal de Aerial Beach01, depósitos procedurales, rugosidad y corrección de reflexión seca. Sustituye Diffuse por su media RGB cruda (0.56913064,.52422576,.47915630) y pigmento existente. Omite cargar Diffuse y enlaza la única textura de capa como uLayerSandNormal. No cambia la grava subyacente ni su POM.

[Completa / normal-only](media-day-2-pair.webp) · [Noche](media-night-2-pair.webp)

## Comparación visual y recursos

24 capturas,12 parejas cercanas, media/baja,día/noche,seed712,1280×720. Cámara/objetivo/hora/draws/triángulos iguales,sin errores. Cada captura verifica layerTextures.length=2 en completa y1 en candidata. La candidata cercana media diurna inspeccionada conserva ondulaciones pero pierde variación fina de color. Diferencia media imagen1.19–1.54/255: no paridad exacta ni aceptación por métrica. Pendiente revisión normal/elevada específica y temporal.

Una lectura de arena en lugar de dos, sin mapa Diffuse adicional. Ahorro nominal de un1024² RGBA8+mips≈5.33MiB frente a completa, no VRAM medida. No se registra tráfico de red ni caché con instrumentación; la ruta de carga omite el archivo de color. Fuente y hashes existentes en canyon-sand-maps/resources.json. No hay recursos externos nuevos.

**Distinción de controles:** las capturas comparan arena seca completa frente a normal-only. El benchmark moving-performance compara grava de control frente a normal-only completa, para evaluar presupuesto global. No atribuir diferencias entre series anteriores a ahorro causal del mapa eliminado.

```powershell
node tools/experiments/capture-canyon-sand-normal-only.mjs
python tools/experiments/package-canyon-sand-normal-only.py
node tools/experiments/measure-canyon-sand-normal-only.mjs
python tools/experiments/audit-canyon-sand-normal-only.py
```

Vite5190. normalOnly=false por defecto. Sin integración en main, modelos o simulación.

## ABBA móvil frente a grava

Intel UHD0x9A60,ANGLE D3D11,WebGL2,baja1280×720. A/B/B/A,páginas nuevas,día/noche,30frames de calentamiento,120 muestras GPU y180frames de cadencia separados.960 muestras GPU/1440frames válidos. Misma cámara,objetivo,hora,draws y triángulos por fotograma;sin errores,disjoint ni consultas pendientes. Sin capturas concurrentes.

| Medias de dos bloques | Grava | Normal-only |
|---|---:|---:|
| GPU día ms | 5.61–7.51 | 7.05–7.14 |
| GPU noche ms | 6.85–7.06 | 6.89–7.01 |
| CPU render día ms | 3.53–3.67 | 3.55–3.57 |
| CPU render noche ms | 3.57–3.71 | 3.43–3.48 |

La noche no muestra el sobrecoste de series anteriores, pero no es comparación directa con dos mapas. El control diurno deriva1.91ms; promedio agrupado~+.54ms no demuestra un coste estable ni aprueba presupuesto. Rangos son dos medias,no intervalos de confianza. Cadencia~16.63ms,p95~17.0–17.1ms limitada por refresco. CPU excluye simulación. Uploads de assetGroups2.50556/frame, iguales,no representan todo tráfico GPU. Sin control térmico/carga externa.

**Conservar candidata reducida para continuar, sin integrar.** Requiere medición diurna más estable, cámara normal/elevada, revisión temporal y lifecycle de su nueva disposición de textura. No declarar mejora de rendimiento por comparar cifras de ejecuciones diferentes. [Muestras](moving-performance/benchmarks.json) · [Resumen](moving-performance/summary.json).
