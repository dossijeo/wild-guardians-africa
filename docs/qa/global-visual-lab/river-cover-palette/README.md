# Gran Río: paleta compartida entre suelo y cubierta

**Conservar como candidata visual.** La cubierta pierde parte de su borde oscuro y mantiene hojas reconocibles en la muestra de calidad media. No resuelve por sí sola toda la transición a suelo plano: orientación, sombras internas y retirada por distancia siguen influyendo.

- [Media, día](gran-rio-media-day-pair.webp)
- [Baja, día](gran-rio-baja-day-pair.webp)
- [Media, noche](gran-rio-media-night-pair.webp)
- [Baja, noche](gran-rio-baja-night-pair.webp)

Izquierda: paleta anterior. Derecha: pigmento y luz diurna alineados con el suelo de Gran Río. Ambas variantes conservan el suavizado de altura por desgaste ya estudiado; ninguna aumenta densidad, distancia, geometría o sombras.

## Cambio concreto

Tres constantes del shader de hojas: multiplicador de pigmento `.93,1.08,.84` → `1.14,1.18,1.05`; sombra diurna `.17,.28,.34` → `.14,.26,.32`; sol diurno `1.55,1.42,1.02` → `1.77,1.79,1.42`. Los valores proceden de la receta existente del suelo de Gran Río. Se conservan el gradiente raíz/punta, orientación, viento de intensidad 8 y respuesta nocturna, aunque el nuevo pigmento también aclara las hojas de noche.

No se añaden evaluaciones, texturas ni buffers. La prueba modifica únicamente el helper experimental de cobertura de Gran Río mediante ruta QA. No cambia el suelo para que coincida artificialmente con las hojas, ni modifica otros biomas.

## Evidencia visual

24 capturas, 12 parejas, semilla 712, 1280 × 720, baja/media, día 150/noche 350 y tres cámaras. Cámara, hora, llamadas y triángulos coincidentes; instancias/buffers de hierba iguales, overflow cero y sin errores registrados. Se inspeccionaron la candidata diurna baja, el par diurno medio y la vista oblicua nocturna media. Las diferencias de píxeles no se usan como criterio de calidad por sí solas.

[Trazas](captures.json) · [Comparación](comparison.json)

## Rendimiento

Intel UHD 0x9A60/ANGLE D3D11, baja, cámara normal fija, simulación pausada. Páginas nuevas A/B/B/A, calentamiento 30 frames, GPU 120 muestras y cadencia independiente 180 frames por fase/bloque. 960 muestras GPU y 1.440 frames válidos: sin disjoints, errores, consultas pendientes o cambios de geometría/cámara.

63 llamadas y 504.137 triángulos por frame en ambas variantes. Hierba: 5.123 módulos, 40.984 triángulos, 1.206.456 bytes de atributos/índices según auditoría; no mide VRAM del controlador.

Rangos de medias de dos bloques, ms:

| Medida | Anterior | Paleta suelo |
|---|---:|---:|
| GPU día | 10,43–12,12 | 10,06–12,28 |
| GPU noche | 10,21–12,51 | 11,27–13,02 |
| CPU render día | 3,83–3,89 | 3,71–3,77 |
| CPU render noche | 3,71–4,22 | 3,58–3,61 |

Los rangos se solapan y la media nocturna candidata es mayor: no afirmar aceleración ni ausencia demostrada de regresión temporal. Solo cambian constantes y el trabajo geométrico coincide; la variabilidad exige cautela al atribuir causalidad. Cadencia candidata ~16,63 ms, p95 17,1–17,3 ms. CPU mide render, no simulación; cadencia no equivale a presentación.

Los recursos retenidos del primer arranque difieren (62 texturas A frente a 53 en el primer B); esos contadores no permiten atribuir ahorro de memoria a la paleta. [Datos](performance/benchmarks.json) · [Resumen](performance/summary.json).

## Límites y siguiente paso

Comparar movimiento y transición de distancia antes de sustituir la receta anterior. No confundir la mejora de continuidad cromática con un nuevo volumen geométrico. La candidata no altera main ni el inicio normal del juego; no acredita calidad global comparable a los seis mockups.

```powershell
node tools/experiments/capture-river-cover-palette.mjs
python tools/experiments/package-river-cover-palette.py
node tools/experiments/measure-river-cover-palette.mjs
python tools/experiments/audit-combined-campaign-budget.py --directory docs/qa/global-visual-lab/river-cover-palette/performance --biomes gran-rio
```

Vite en 5190. Separar capturas y benchmark. PNG/WebP individuales locales; trazas y pares seleccionados publicados.
