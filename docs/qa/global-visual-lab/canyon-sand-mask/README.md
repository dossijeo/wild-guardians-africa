# Gran Cañón: campo de depósitos precalculado

Candidata QA de coste, no integrada. Compara la misma arena y grava con distribución procedural por fragmento frente a distribución en la máscara residente. No cambia modelos, densidad, sombras ni simulación.

[Normal diurna](media-day-0-pair.webp) · [Normal nocturna](media-night-0-pair.webp)

## Método

Copia la máscara nativa 35×35, paso1.5m. Escribe en G el campo combinado de ruido .10/.27 cuantizado a8bits. El shader conserva ese canal antes de sustituir ctx por sus constantes de cañón y aplica smoothstep después de interpolar. Reutiliza la lectura de máscara existente y elimina las dos evaluaciones de ruido por fragmento. El cálculo JS usa doble precisión; no es paridad bit a bit con GLSL. No añade mapas ni samplers. R/B/A y memoria fuente se conservan. G no se reutiliza para otras operaciones en esta ruta de cañón después del reemplazo por constantes.

La prueba sintética verifica entrada intacta, canales RBA iguales y solape exacto de tres columnas en tres orígenes. No sustituye streaming real ni mide coste de carga. El cálculo ocurre al crear la textura del chunk, no por frame. Las dos lecturas de mapas de arena y el POM subyacente permanecen iguales.

## Capturas

24 capturas /12 parejas media/baja, día/noche, seed712,1280×720. Cámara/objetivo/hora/llamadas/triángulos iguales y sin errores. Diferencia media RGB .036–.168/255, no identidad. La candidata normal media diurna inspeccionada conserva la composición y ondulaciones. No se ha revisado cada imagen artísticamente. La elevada heredada continúa obstruida y no valida conjunto.

**Límite de horizonte:** esta versión usa ctx.g también cuando uGroundMapped es cero; allí ctx procede de una constante, no de máscara espacial. No usarla como reemplazo global sin una ruta coherente para materiales lejanos y prueba de transición. Los resultados de coste solo describen los encuadres medidos; no prueban equivalencia global.

```powershell
node tools/experiments/check-canyon-deposit-mask.mjs
node tools/experiments/capture-canyon-sand-mask.mjs
python tools/experiments/package-canyon-sand-mask.py
node tools/experiments/measure-canyon-sand-mask.mjs
python tools/experiments/audit-canyon-sand-mask.py
```

Vite5190. Opción depositMask falsa por defecto. Recursos y fuentes en canyon-sand-maps. Pendiente adaptación lejana, streaming, movimiento y coste de creación. Main intactos.

## ABBA: ahorro no demostrado

Intel UHD0x9A60 ANGLE D3D11, WebGL2, baja1280×720, cámara normal estática, simulación pausada. A/B/B/A con páginas nuevas, día/noche, 30frames de calentamiento por bloque, GPU120 y cadencia180 separados. 960 muestras GPU y1440 frames válidos; cámara/draws/triángulos iguales, sin disjoint, errores ni consultas pendientes. No capturas concurrentes.

| Medias de dos bloques | Procedural | Máscara |
|---|---:|---:|
| GPU día ms | 7.51–7.69 | 8.16–9.60 |
| GPU noche ms | 7.70–8.83 | 8.00–9.30 |
| CPU render día ms | 2.73–3.10 | 3.13–3.35 |
| CPU render noche ms | 2.72–2.87 | 2.84–2.95 |

Cadencia media~16.63ms, p95~17.0–17.2ms: no prueba coste equivalente. Rangos de medias, no intervalos de confianza. Variación amplia, sin control térmico o de carga externa. CPU mide world.render, no simulación ni creación de máscaras. La reducción teórica de ruido no produce ahorro demostrado; no atribuir causalidad a caché o dependencias sin perfilado. **No promover esta variante de optimización.** Mantener la receta procedural para investigación visual, cuyo presupuesto nocturno sigue pendiente. No gastar otra ronda en este mismo cambio sin evidencia nueva.

[Datos completos](performance/benchmarks.json) · [Resumen](performance/summary.json).
