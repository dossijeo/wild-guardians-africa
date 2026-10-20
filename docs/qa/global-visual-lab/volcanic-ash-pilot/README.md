# Volcanes: depósitos de ceniza y roca expuesta

**Conservar como dirección artística de QA; no integrar todavía.** La variación rompe la uniformidad de roca rugosa y se aprecia desde la cámara normal. Las superficies suaves son amplias y deben revisarse en movimiento; el coste GPU adicional tampoco permite considerarla gratuita.

Original a la izquierda, candidata a la derecha:

- [Día, baja](volcanes-baja-day-pair.webp)
- [Noche, baja](volcanes-baja-night-pair.webp)
- [Día, media](volcanes-media-day-pair.webp)
- [Noche, media](volcanes-media-night-pair.webp)
- Vista oblicua diurna: [original](volcanes-baja-base-oblique-day.webp), [candidata](volcanes-baja-combined-oblique-day.webp).
- Vista oblicua nocturna: [original](volcanes-media-base-oblique-night.webp), [candidata](volcanes-media-combined-oblique-night.webp).

## Material

Solo el suelo volcánico de la receta `global-lighting`. Dos llamadas de ruido procedural existentes determinan depósitos amplios e irregulares, restringidos por la normal geométrica a superficies horizontales. En esas zonas se atenúan conjuntamente el parallax, las normales y la oclusión del mapa rocoso; aumenta la rugosidad y se mezcla un gris cálido de ceniza con el color original. No se añade emisión ni se altera la lava.

Se reutilizan Rock035 y los mapas existentes, sin recursos externos nuevos. Cero texturas nuevas, cero geometría nueva y cero draw calls nuevos por esta modificación. Dos evaluaciones ALU adicionales de ruido por fragmento de suelo volcánico; el máximo de ocho pasos del POM no aumenta. La profundidad aparente disminuye en la ceniza, así que el resultado distingue materiales en lugar de reforzar el relieve universalmente.

La distribución es visual, determinista en coordenadas mundiales y se instala por interceptación QA al compilar cada material; no requiere consultas de navegación ni trabajo nuevo por fotograma en Wild Engine. No altera el comportamiento original por defecto.

## Capturas

24 capturas reales, 12 parejas: semilla 712, 1280 × 720, calidad baja/media, día 150/noche 350, vistas normal/oblicua/inversa. Cámara, objetivo, hora, draw calls y triángulos coinciden en todas las parejas. Sin errores GL o de página registrados. Se inspeccionaron la vista normal diurna baja y las vistas oblicuas diurnas/nocturnas indicadas; no se declara inspección exhaustiva de todas las imágenes ni validación temporal.

[Trazas](captures.json) · [Comparación](comparison.json)

## Rendimiento

Intel UHD 0x9A60, ANGLE D3D11, calidad baja, 1280 × 720. Cámara normal fija, simulación pausada, páginas nuevas en orden A/B/B/A; día y noche en cada página. Calentamiento de 30 frames por bloque, 120 muestras GPU y después 180 frames sin temporizador GPU para CPU/cadencia. Total: 960 muestras GPU y 1.440 frames de cadencia. Auditoría sin disjoints, errores GL, consultas pendientes ni cambios de cámara/geometría. 66 llamadas y 394.440 triángulos por frame en ambas variantes.

Rangos de las medias de los dos bloques de cada variante, en milisegundos:

| Medida | Original | Ceniza |
|---|---:|---:|
| GPU día | 8,75–9,72 | 9,60–10,88 |
| GPU noche | 10,64–11,27 | 10,37–12,23 |
| CPU render día | 3,87–4,51 | 3,79–3,81 |
| CPU render noche | 3,65–4,35 | 3,70–3,73 |
| Intervalo día | 16,63–16,63 | 16,63–16,63 |
| Intervalo noche | 16,72–16,90 | 16,63–16,63 |

La media agregada GPU diurna aumenta aproximadamente 1 ms. Los rangos se solapan y solo hay dos bloques por variante: no son intervalos de confianza. La cadencia cercana a 60 Hz oculta margen GPU; no demuestra coste nulo. CPU mide la llamada de render, no simulación completa; intervalo entre llamadas no es presentación efectiva.

Los contadores de geometrías son 168 en todos los bloques. Texturas: 58 en el primer bloque A, 51 en los restantes, incluido el segundo A. Por tanto, no atribuir esa diferencia a la candidata ni afirmar igualdad de memoria GPU. No se midieron bytes VRAM ni memoria del controlador. La modificación no crea samplers ni buffers adicionales según el código; el conjunto de recursos retenidos del arranque requiere investigación si se desea comparar memoria.

[Datos](performance/benchmarks.json) · [Resumen auditado](performance/summary.json)

## Límites y siguiente paso

Faltan movimiento de cámara, transición de distancia, streaming/reapertura y rendimiento en calidad media. Las manchas amplias pueden parecer suelo demasiado liso en algunas vistas. No se demuestra depósito físico de ceniza ni una mejora de volumen en toda la superficie. Próximo paso: conservar la separación de materiales reduciendo el cálculo por fragmento, y contrastar su estabilidad al mover la cámara antes de promoción.

## Reproducción

```powershell
node tools/experiments/capture-volcanic-ash-pilot.mjs
python tools/experiments/package-volcanic-ash-pilot.py
node tools/experiments/measure-volcanic-ash-pilot.mjs
python tools/experiments/audit-combined-campaign-budget.py --directory docs/qa/global-visual-lab/volcanic-ash-pilot/performance --biomes volcanes
```

Vite en 5190. Ejecutar captura/empaquetado y benchmark por separado. PNG y WebP individuales no seleccionados quedan locales; se publican trazas completas, vistas seleccionadas y comparativas. Main, simulación y modelos originales intactos.
