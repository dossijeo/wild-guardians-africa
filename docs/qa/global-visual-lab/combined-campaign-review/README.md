# Revisión conjunta de seis biomas en campaña

72 capturas reales: seis biomas, tres cámaras, día/noche y dos variantes. Semilla712, Mapungubwe, media, 1280×720, partidas pausadas. 36 parejas coinciden en cámara, objetivo y hora; ningún error HTTP/JS/GL registrado. Esta ronda es revisión artística y contadores, no benchmark CPU/GPU.

A es la rama actual sin visualLab global, no una copia inmutable de main. B combina global-lighting con cobertura C de Sabana/Río (viento8, tiempo visual fijo2), paleta cálida del suelo del Cañón y sandRelief=1 para Desierto. Los demás tratamientos existentes de global-lighting se conservan. No se ejecutan dos backends ni se altera la simulación.

Las cámaras de Sabana/Río usan las regiones representativas anteriores; Cañón enfoca el río, los otros tres parten del poblado. La comparabilidad es entre A/B del mismo bioma, no de contadores entre biomas distintos.

## Evaluación visual

| Bioma | Lectura de la candidata | Pendiente visible |
| --- | --- | --- |
| Sabana | Cubierta corta continua, sombras amplias y paleta cálida | Transición a textura lejana y zonas de exclusión; no aumentar densidad sin medir |
| Gran Río | Cobertura dominante en primer plano, poblado legible | Borde de cobertura reconocible y contraste entre fibras y superficie descubierta |
| Gran Cañón | Pared estratificada cálida y separación sol/sombra | Suelo transitable uniforme y base de pared poco integrada; no repetir tratamiento descartado sin nueva hipótesis |
| Manglares | Musgo volumétrico y sombras conservados | Patrón de bultos muy regular y recortes poligonales de barro; prioridad del siguiente pase |
| Volcanes | Roca más neutra, lava y edificios separados | Microdetalle intenso y bastante uniforme; falta estructura de escala intermedia |
| Desierto | Crestas de arena legibles sin alterar edificios | No confundir su validación individual con aprobación del conjunto |

No se declara equivalencia con los seis mockups. La revisión directa cubrió vistas normales diurnas de Sabana/Río/Cañón/Manglares/Volcanes y nocturna de Sabana, además de las revisiones previas de arena; no implica inspección perceptual individual de todas las72 capturas. Las vistas oblicuas y nocturnas adicionales se entregan para continuar revisión.

## Contadores en vista normal diurna

Contadores renderer.info de la captura, no tiempo GPU ni desglose completo de pasadas. La cobertura añade geometría deliberadamente; no es una optimización a carga idéntica.

| Bioma | Draws A → B | Triángulos A → B |
| --- | ---: | ---: |
| sabana | 70 → 72 | 1711631 → 1927535 |
| gran-rio | 64 → 66 | 579501 → 869817 |
| gran-canon | 39 → 39 | 399675 → 399675 |
| manglares | 64 → 64 | 614104 → 614104 |
| volcanes | 69 → 69 | 502116 → 502116 |
| desierto | 44 → 44 | 221404 → 221404 |

En los otros cuatro biomas las comparativas no añaden geometría: exactamente24 parejas tienen draws/triángulos iguales; las12 de hierba registran su coste adicional. No se usa diferencia de píxeles como prueba de mejora. Los datos completos incluyen selección de cobertura y overflow por captura. [Comparación](comparison.json), [capturas](captures.json).

## Comparativas de revisión

Izquierda A, derecha B. Estas composiciones usan WebP calidad92; las72 imágenes individuales son RGB sin pérdida, verificadas contra PNG.

- sabana: [día](sabana-day-pair.webp), [noche](sabana-night-pair.webp).
- gran-rio: [día](gran-rio-day-pair.webp), [noche](gran-rio-night-pair.webp).
- gran-canon: [día](gran-canon-day-pair.webp), [noche](gran-canon-night-pair.webp).
- manglares: [día](manglares-day-pair.webp), [noche](manglares-night-pair.webp).
- volcanes: [día](volcanes-day-pair.webp), [noche](volcanes-night-pair.webp).
- desierto: [día](desierto-day-pair.webp), [noche](desierto-night-pair.webp).

## Siguiente experimento

Trabajar la transición visual barro/musgo en Manglares sin cambiar la huella autoritativa, navegación ni sonido de pasos. Inspeccionar primero el material de parches y su límite, buscando una frontera orgánica y menos recortada. No volver a oscurecer toda la isla: la candidata damp-moss se descartó por impacto insuficiente. Conservar controles, comparar cámaras normal/oblicua día/noche y medir el cambio específico antes de incluirlo.

Mantener revisión de distancia de cobertura en Río y escala media de suelo en Cañón/Volcanes como pendientes posteriores. Falta presupuesto combinado en calidad baja y movimiento; no sumar los benchmarks individuales para fingir una medición del conjunto.

Reproducción: Vite5190, `node tools/experiments/capture-combined-campaign-review.mjs`, luego `python tools/experiments/package-combined-campaign-review.py` (Pillow/NumPy). La receta de hierba sigue siendo QA y no se activa en producción por este capturador. Main intacto.
