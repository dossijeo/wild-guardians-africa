# Pigmento espacial: comparación en una misma escena

Una página,misma escena,geometrías,texturas y buffers. Ambos shaders se compilan antes de medir. Control recupera el pigmento original desde coverageData.z; candidata utiliza campo espacial y atenuación24–36. Los materiales comparten uniforms para mantener iluminación/viento. Intel UHD ANGLE D3D11,media,1280×720,semilla712,cámara fija. A/B/B/A por fase,60 frames de calentamiento por medida.

Auditoría válida:480 muestras GPU,720 frames de cadencia,misma cámara/geometría/instancias y sin errores.180 geometrías y67 texturas en todos los bloques;la auditoría exige igualdad de estos recuentos. No mide memoria física GPU.

| Fase/variante | GPU ms | CPU render ms | Intervalos ms |
|---|---|---|---|
| day base | 29.09 / 21.71 | 3.91 / 3.61 | 36.10 / 32.70 |
| day combined | 24.44 / 23.60 | 3.83 / 3.78 | 31.59 / 32.08 |
| night base | 29.74 / 25.93 | 4.36 / 3.63 | 40.39 / 36.38 |
| night combined | 30.03 / 25.40 | 4.01 / 3.63 | 38.12 / 35.24 |

La variación persiste con residencia igual:control diurno29.09→21.71ms y nocturno29.74→25.93ms. Por tanto,la diferencia de recuentos de recursos de las pruebas anteriores no explica por sí sola la deriva. No se identifica aquí su causa ni se demuestra ventaja causal de la candidata. No presentar el promedio favorable como optimización.

Conservar candidata visual sin promoción por rendimiento. No continuar repitiendo esta misma prueba esperando un resultado favorable:antes de otra decisión de coste hacen falta diagnóstico de carga/scheduling GPU y un diseño con más alternancias breves. El objetivo gráfico global continúa y esta incertidumbre no exige descartar la variante.

Limitaciones:los buffers contienen el campo espacial en ambos modos;se excluye su generación inicial. Cámara fija,sin streaming ni CPU de simulación. GPU y cadencia separadas;intervalos no equivalen a presentación. No se capturó una nueva comparación visual de estos materiales clonados;la equivalencia del control se basa en restaurar la expresión original con su valor conservado,pendiente comprobación de píxeles si se utiliza para una decisión definitiva. [Comparativa visual anterior](../river-patch-fade-20261021/README.md).

```text
node tools/experiments/measure-river-patch-shared-20261021.mjs
python tools/experiments/audit-river-patch-shared-20261021.py
```

Vite5190;archivar salidas antes de repetir. Main y predeterminado intactos.
