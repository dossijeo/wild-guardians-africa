# Gran Río: LOD por distancia real a cámara

Variante QA independiente, derivada de aa9073c28. No sustituye el piloto ni modifica Sabana o el viento 8×.

La selección de geometría refinada y la interpolación de hojas usan distancia 3D a cámara. El radio de cobertura y su desvanecimiento conservan distancia horizontal. No cambia la distribución, máscaras, ocupación o exclusión de agua.

## Evidencia visual

12 capturas reales, dos variantes, tres cámaras, día/noche; media, semilla 712, 1280×720. Cada variante arranca en una página nueva. Cámara/objetivo/hora y número total de módulos coinciden en los seis pares. Sin errores WebGL ni overflow. WebP sin pérdida verificado contra PNG.

| Cámara | Triángulos originales | Distancia 3D | Módulos en ambas |
|---|---:|---:|---:|
| Cercana | 199580 | 198332 | 9146 |
| Normal | 258388 | 170508 | 8528 |
| Elevada | 341656 | 91640 | 11455 |

[Normal](game-comparison.png) · [Elevada](elevated-comparison.png) · [Cercana](close-comparison.png) · [Datos](captures-media.json).

Inspección visual: se conserva la cubierta continua en normal y elevada; el patrón de fibras cambia ligeramente. La imagen elevada nocturna mantiene la integración de sombra. No se declara equivalencia perceptual ni ausencia de popping con imágenes estáticas.

## Decisión y límites

Conservar como candidata independiente. Pendientes: GPU/CPU aislados, vídeo con ascenso/descenso de cámara y viento, validación baja y streaming. La reducción de triángulos no demuestra por sí sola aceleración. La revisión interactiva estaba abierta durante las capturas; no se usan sus tiempos como benchmark. El objetivo global sigue abierto.

La primera ejecución del comparador desmontaba/reutilizaba un helper con referencias residuales y produjo cobertura vacía. Esas capturas fueron invalidadas y reemplazadas; el comparador final usa páginas independientes y falla si falta cobertura. No se atribuye ese fallo al LOD ni se afirma haber reparado el ciclo de vida general del helper.

Reproducir: `node tools/experiments/capture-continuous-grass-river-distance.mjs` con Vite del worktree en 5190. El script genera PNG y manifiesto; los WebP publicados se convierten sin pérdida posteriormente.
