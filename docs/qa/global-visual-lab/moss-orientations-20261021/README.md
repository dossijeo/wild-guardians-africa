# Manglares: dos orientaciones de musgo

Conservar como candidata QA. La mezcla rompe parte de las filas regulares del musgo, manteniendo paleta verde y volumen. Todavía se percibe repetición y no alcanza las agrupaciones naturales del mockup. No sustituye la variante original ni está integrada en producción.

## Evidencia visual

Semilla 712, calidad media, 1280×720, tres cámaras iguales, día (150) y noche (350). Control a la izquierda, candidata a la derecha. Cámaras, objetivo, hora, draw calls y triángulos coinciden; sin errores registrados. Diferencia de píxeles no equivale a mejora artística.

| Vista | Día | Noche |
|---|---|---|
| Normal | [Comparación](day-0-pair.webp) | [Comparación](night-0-pair.webp) |
| Elevada | [Comparación](day-1-pair.webp) | [Comparación](night-1-pair.webp) |
| Inversa | [Comparación](day-2-pair.webp) | [Comparación](night-2-pair.webp) |

## Implementación

Ruta QA del material, solo rama de musgo puro. Reutiliza color, normal y ARH con una segunda orientación a 90 grados y desplazamiento fijo; mezcla ponderada por altura y ruido mundial de baja frecuencia. Rota también derivadas y normal tangente; el eje v de este material es opuesto al bitangente. Ancho de mezcla adaptado por fwidth. Tres lecturas adicionales de textura, sin nuevos mapas, geometría, instancias ni pasadas.

La normal interpolada no es la derivada exacta de la altura compuesta. La rama de musgo puro no utiliza POM: no atribuir la mejora al parallax. El suelo descubierto mantiene su muestreo. Pendientes estabilidad en movimiento, distancia y streaming.

## Coste medido

Intel UHD mediante ANGLE D3D11, cámara normal fija, mundo pausado. A/B/B/A, 60 fotogramas de calentamiento por medición, 480 muestras GPU válidas y 720 fotogramas de cadencia; GPU y cadencia medidos por separado. Dos medias de bloque por variante, no intervalos de confianza.

| Fase/variante | GPU media ms, dos bloques | CPU render media ms | Intervalo de callbacks medio ms |
|---|---|---|---|
| Día original | 15.96 / 17.67 | 3.23 / 3.47 | 18.85 / 18.72 |
| Día candidata | 19.35 / 19.92 | 3.24 / 3.23 | 19.52 / 20.23 |
| Noche original | 17.78 / 17.95 | 3.09 / 3.63 | 18.41 / 22.17 |
| Noche candidata | 18.31 / 18.58 | 3.34 / 3.18 | 21.59 / 21.04 |

GPU p95 diurno original 18.45/20.74 ms y candidata 24.06/26.03 ms. El aumento diurno es relevante; no hay mejora de FPS demostrada. CPU excluye simulación y los intervalos no miden presentación. Draw calls y triángulos iguales en todos los fotogramas comparados. 177 geometrías; texturas residentes varían de 65 a 63 según historial: no es ahorro VRAM ni prueba de residencia idéntica. No se midió memoria GPU física. Datos y percentiles completos en [resumen](performance/summary.json) y [muestras](performance/benchmarks.json).

## Reproducción y decisión

Con Vite en 127.0.0.1:5190, ejecutar desde el worktree:

```text
node tools/experiments/capture-moss-orientations-20261021.mjs
python tools/experiments/package-moss-orientations-20261021.py
node tools/experiments/measure-moss-orientations-20261021.mjs
python tools/experiments/audit-moss-orientations-20261021.py
```

Conservar el resultado visual y el original. Antes de integrar, investigar cómo reducir las tres lecturas adicionales mediante precálculo o tratamiento por distancia, verificando que no reaparezcan filas ni se pierda volumen. El coste no es motivo para borrar una candidata atractiva. No afirmar calidad global lograda ni extender esta receta automáticamente a otros biomas.
