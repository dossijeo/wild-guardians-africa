# Coste de musgo precalculado: resultado mixto

No aprobar presupuesto estable. El promedio agrupado es +0.283ms GPU día y+0.460ms noche, pero las parejas A/B cambian de signo y una nocturna alcanza+1.108ms. Mantener solo QA hasta revisar detalle cercano/juntas y resolver la variación antes de promoción.

Intel UHD0x9A60, ANGLE D3D11, WebGL2, calidad baja1280×720, Manglares seed712, día150/noche350. Control Moss002 original frente a mapas compuestos offline; mismo shader y barro toon-interior QA. A/B/A/B en páginas nuevas,180frames de calentamiento y240muestras GPU por bloque;240frames CPU/cadencia en medición separada. Cámara móvil determinista, simulación pausada, materiales congelados; sin captura/codificación simultánea propia.

| Dos medias de bloque, ms | Original | Compuesto |
|---|---:|---:|
| GPU día | 9.119 / 8.597 | 8.964 / 9.317 |
| GPU noche | 8.892 / 9.333 | 10.000 / 9.145 |
| CPU render día | 4.327 / 4.298 | 4.237 / 4.081 |
| CPU render noche | 4.080 / 4.118 | 4.152 / 4.100 |

Deltas pareados GPU día -0.155/+0.721ms; noche +1.108/-0.188ms. No afirmar aceleración o equivalencia. Dos bloques no son intervalos de confianza y no hay aislamiento térmico/carga externa. Tres lecturas y misma dimensión no prueban coste idéntico: cambian contenido y respuesta de material. No atribuir la variación a causa concreta sin evidencia adicional.

1920 muestras GPU válidas y1920frames de cadencia. Auditoría exige cámara,objetivo,hora,draws,triángulos,dispositivo y estado de simulación coincidentes. Sin errores GL, disjoint, descartes ni consultas pendientes. Uploads assetGroups5.4/frame iguales, no tráfico GPU completo. Cadencia18.64–18.98ms,p95 48.6–51.6ms en ambas: picos existentes, no medición de presentación ni atribuibles exclusivamente al material. CPU excluye simulación. No VRAM medida.

No comparar numéricamente esta serie con mezcla doble anterior como si fuera una medición causal de ahorro: condiciones temporales diferentes. El cambio de arquitectura elimina tres lecturas adicionales por fragmento, pero el efecto en tiempo total requiere comparación directa si se quisiera cuantificar.

## Reproducción

```powershell
node tools/experiments/measure-mangrove-moss-composite.mjs
python tools/experiments/audit-mangrove-moss-composite.py
```

Vite5190. [Muestras](benchmarks.json), [resumen](summary.json). No cambios a main ni activación por defecto. Siguiente revisión: conservar o descartar la composición por detalle cercano y continuidad antes de invertir en más repeticiones de rendimiento.
