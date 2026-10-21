# Arena seca completa: coste con cámara móvil

**No aprobar presupuesto todavía.** Compara grava .08 de control contra receta completa de arena con respuesta especular seca, no solamente el cambio de reflexión. Intel UHD0x9A60 ANGLE D3D11, Chrome headless, WebGL2, calidad baja1280×720, seed712. Simulación pausada; trayectoria determinista normal/oblicua/reversa en torno al mismo objetivo. No captura concurrente.

Páginas nuevas A/B/B/A, día/noche en cada una.30frames de calentamiento por fase;120 muestras GPU y180 de cadencia en bloques separados.960 muestras GPU y1440frames válidos. Cámara, objetivo, hora, llamadas y triángulos coinciden fotograma a fotograma. Sin errores, cambios de estado, disjoint ni consultas pendientes. El movimiento usa dt1/30 fijo y restaura opacidad inicial de obstrucciones.

| Medias de dos bloques | Grava | Arena seca |
|---|---:|---:|
| GPU día ms | 6.04–6.63 | 7.29–7.70 |
| GPU noche ms | 6.79–7.21 | 7.38–8.09 |
| CPU render día ms | 3.38–3.47 | 3.52–4.05 |
| CPU render noche ms | 3.13–3.32 | 3.68–3.80 |

Diferencia de medias agrupadas GPU~+1.16ms de día y~+.74ms de noche. Rangos de dos medias, no intervalos de confianza. Hay deriva y no se controla temperatura/carga externa. No atribuir todo el aumento CPU al material ni concluir causalidad fina. CPU mide world.render, excluye simulación. Cadencia media~16.63ms,p95~17.0–17.2ms: límite de refresco no demuestra coste nulo. Uploads de assetGroups2.50556/frame en todos los bloques, no equivalen a todo el tráfico GPU.

Esta prueba valida costes y conteos en movimiento; no incluye vídeo ni inspección temporal, streaming largo, calidad media o VRAM. La trayectoria puede aproximarse a geometría del terreno y aplica el límite de altura del helper; no es recorrido de jugador. No extrapolar al total del juego ni a todos los biomas.

La corrección de reflejo es útil visualmente, pero conserva dos lecturas de arena, ruidos y POM de grava. La ablación previa de color permite investigar una receta con normal de arena y color subyacente conservado, siempre comparando calidad antes de atribuir ahorro. No seguir repitiendo la misma máscara precalculada descartada.

```powershell
node tools/experiments/measure-canyon-sand-dry-moving.mjs
python tools/experiments/audit-canyon-sand-dry-moving.py
```

Vite5190. benchmarks.json conserva muestras completas; summary.json deriva resultados. Sin integración en main; calidad global pendiente.
