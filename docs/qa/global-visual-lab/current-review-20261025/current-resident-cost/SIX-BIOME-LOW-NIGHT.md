# Calidad baja nocturna: seis biomas

Dos ejecuciones por bioma, Chrome/Intel UHD 0x9A60 ANGLE D3D11, 1280×720,
receta actual sobre 11b80e196, pthreads y scheduler. Misma cámara y estado de
simulación que baja diurna; hora visual 350 verificada. No se cambian materiales.

| Bioma | GPU media r1/r2 ms | CPU render media ms | Presentación P95 ms | Máximo presentación ms |
|---|---:|---:|---:|---:|
| sabana | 14.39/13.98 | 5.62/5.53 | 16.87/16.84 | 33.36/33.39 |
| gran-rio | 16.17/15.59 | 4.95/4.75 | 33.23/33.19 | 34.99/33.43 |
| manglares | 20.27/19.96 | 4.51/4.47 | 33.36/33.39 | 49.41/49.75 |
| desierto | 14.98/16.08 | 3.78/3.75 | 16.85/33.23 | 33.36/49.83 |
| volcanes | 15.91/15.54 | 4.94/4.89 | 33.22/17.03 | 33.50/33.52 |
| gran-canon | 14.04/13.90 | 4.29/4.32 | 16.85/16.82 | 33.20/17.21 |

Cada ejecución pasó el verificador: 125 muestras GPU sin disjoint, 372 intervalos
de presentación tras calentamiento, cero chunks nuevos y fondos asentados.
Workers/elapsed/cámara/objetivo coinciden con el día y entre repeticiones.
Residencia estable, sin errores excepto X4000 conocidos. GPU elapsed incluye
burbujas de pipeline; CPU render incluye draw. No es una prueba de streaming
activo ni una comparación intercalada de perfiles. La variación del Desierto
(14.98/16.08 ms) se conserva; no se selecciona una sola repetición favorable.

Se inspeccionaron los doce PNG a resolución nativa. Mantienen cobertura herbácea,
helechos, arena, roca/lava y estratificación/ribera según el bioma. Manglares sigue
alrededor de 20 ms GPU incluso en baja nocturna. No se garantiza 60 FPS.
Las concesiones diurnas de baja se describen en SIX-BIOME-LOW-DAY.md; no se afirma
que ambos perfiles tengan igual calidad.

## Observación pendiente de aislamiento

En ambas capturas de Sabana baja nocturna aparecen pequeños elementos de azul
vivo al pie de las rocas del primer plano. El recorte sabana-low-night-blue-detail.png
los localiza y compara con baja diurna y media nocturna, sin recolorear las fuentes.
No se establece si son geometría decorativa, respuesta de material o un defecto
de cobertura; requiere aislamiento en el renderer antes de cambiar código.
No se declara la imagen libre de defectos solo porque pase el benchmark.

## Matriz cubierta y siguiente paso

Queda cubierta la referencia residente 6 biomas × 2 horas × 2 perfiles, con dos
ejecuciones válidas por combinación (48 válidas; Manglares media noche conserva
además un fallo de red previo). No significa cierre global: faltan el aislamiento
visual indicado y la reconciliación final de los recorridos activos con la receta.
No repetir esta matriz por rutina; reabrir solo por cambios o evidencia nueva.

Reproducir: run-current-resident-cost.py y summarize-current-resident-cost.py,
ambos con --biome <nombre> --quality baja --night, Vite5190. Los informes no se
sobrescriben. Main, reglas y arte aprobado permanecen intactos.
