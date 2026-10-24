# Musgo: omitir muestras sin contribución

Control (`base`): mezcla de dos orientaciones ya conservada. Candidata (`combined`): misma mezcla, omitiendo color y normal de la segunda orientación cuando qaMix es exactamente 1. La altura/ARH de ambas orientaciones sigue siendo necesaria. No se reduce resolución, densidad ni distancia visual.

Las seis parejas de tres cámaras día/noche son idénticas píxel a píxel, semilla712, calidad media,1280x720. Cámaras, horas, draw calls y triángulos coinciden, sin errores. [Día normal](day-0-pair.webp), [noche normal](night-0-pair.webp); resumen completo en summary.json.

Se calculan derivadas y fwidth antes de la condición, y las muestras condicionales usan textureGrad con derivadas explícitas. Se conserva la normalización incluso cuando se omiten las muestras. Ahorro máximo de dos lecturas por fragmento elegible; no se ha medido la proporción ni la ejecución efectiva por grupos de GPU. La rama divergente puede reducir el beneficio.

## Intel UHD ANGLE D3D11

A/B/B/A, mundo pausado, cámara normal, calentamiento60,480 muestras GPU válidas y720 frames de cadencia. Dos medias por variante/fase, no intervalos de confianza. GPU y cadencia se miden por separado.

| Fase/variante | GPU ms | CPU render ms | Intervalo callbacks ms |
|---|---|---|---|
| day base | 17.00 / 19.46 | 3.21 / 3.13 | 20.81 / 19.15 |
| day combined | 16.67 / 17.70 | 3.36 / 3.26 | 20.62 / 20.36 |
| night base | 20.56 / 18.70 | 3.11 / 3.16 | 20.59 / 21.35 |
| night combined | 18.46 / 20.20 | 3.18 / 3.43 | 20.33 / 23.68 |

La media GPU diurna favorece a la candidata, pero el control cambia de17.00 a19.46ms; no hay ganancia de cadencia consistente. Noche y CPU tampoco justifican prometer FPS. Conservar como candidata de optimización visualmente equivalente, pendiente repetición dentro de la misma página y cámaras móviles. No integrar aún ni sustituir el control de dos orientaciones. CPU excluye simulación; callbacks no son presentación; residencia de texturas puede variar por historial. Datos íntegros en performance/benchmarks.json y performance/summary.json.

No se modifican texturas, geometría, modelos ni simulación. Este es un paso para preservar la mejora artística con menor coste potencial, no evidencia de que se haya alcanzado el objetivo global.

```text
node tools/experiments/capture-moss-sample-gate-20261021.mjs
python tools/experiments/package-moss-sample-gate-20261021.py
node tools/experiments/measure-moss-sample-gate-20261021.mjs
python tools/experiments/audit-moss-sample-gate-20261021.py
```

Vite127.0.0.1:5190. PNG originales locales; parejas WebP, metadatos y muestras publicados.
