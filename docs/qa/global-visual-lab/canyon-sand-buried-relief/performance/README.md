# Parallax de grava atenuado: sin ahorro demostrado

**Descartar esta atenuación como optimización.** Los cuatro pares consecutivos muestran tiempo GPU mayor en candidata. No se justifica aceptar la aproximación visual para ganar rendimiento. Mantener buriedRelief=false; conservar código y capturas como experimento descartado, sin activar por defecto.

Control A: arena seca normal-only con POM residual completo de grava. B: misma receta, atenuando POM según depósito. Ambos cargan el mismo mapa adicional. No es comparación con suelo de grava sin arena.

Intel UHD0x9A60, ANGLE D3D11, WebGL2, baja1280×720, Gran Cañón seed712. A/B/A/B, día150/noche350 en cada página nueva. Recorrido cercano cosenoidal entre los extremos de las capturas anteriores.180 frames de calentamiento por medición;240 muestras GPU y240 frames separados de CPU/cadencia por bloque.

| Medias por bloque, ms | Control | Atenuación |
|---|---:|---:|
| GPU día | 6.805 / 6.840 | 6.833 / 7.269 |
| GPU noche | 6.929 / 7.353 | 7.472 / 7.490 |
| CPU render día | 3.088 / 3.278 | 3.268 / 3.350 |
| CPU render noche | 3.125 / 3.195 | 3.226 / 3.454 |

Deltas GPU A/B: día +0.028/+0.429ms; noche +0.543/+0.137ms. Medias agrupadas +0.228/+0.340ms. Dos bloques por variante no son intervalos de confianza. Sin aislamiento térmico o de carga externa; no atribuir causalmente el empeoramiento a divergencia, planificación del compilador u otro término sin instrumentación adicional. Sí permiten rechazar la afirmación de ahorro demostrado en esta prueba. Reducir potenciales lecturas de altura no implica reducir tiempo total.

Auditoría:1920 muestras GPU y1920 frames de cadencia, cámaras/draws/triángulos/objetivo/hora/dispositivo coincidentes, estado de simulación sin cambios, sin errores GL, disjoint, descartes ni consultas pendientes. Cadencia media16.627–16.630ms limitada por refresco;p95 16.9–18.1ms, no latencia de presentación. CPU excluye simulación. Uploads assetGroups0.341667/frame iguales, no todo tráfico GPU. No VRAM medida. Sin capturas simultáneas propias.

## Reproducción

```powershell
node tools/experiments/measure-canyon-sand-buried-relief.mjs
python tools/experiments/audit-canyon-sand-buried-relief.py
```

Vite5190, Chrome/Playwright. [Datos](benchmarks.json), [resumen](summary.json). No modifica main, renderer de producción ni simulación. No repetir esta misma aproximación esperando un ahorro distinto sin una nueva hipótesis técnica. La arena normal-only sin atenuación sigue siendo candidata separada con sus límites ya documentados.
