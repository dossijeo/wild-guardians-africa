# Seis biomas: referencia diurna en calidad baja

Dos ejecuciones consecutivas por bioma sobre e16fbc02c, Intel UHD 0x9A60 / ANGLE
D3D11, Chrome, 1280×720. Selección artística actual, opciones normales de streaming,
pthreads y scheduler. Misma escena guardada y cámara que las referencias medias;
low-medium-state-check.json comprueba cámara/objetivo/elapsed/trabajadores. Los
informes medios antiguos no serializaban visualTime; ambos cargan la misma hora
predeterminada del fixture. No son series intercaladas entre perfiles.

| Bioma | GPU media r1/r2 ms | CPU render media ms | Presentación P95 ms | Máximo presentación ms |
|---|---:|---:|---:|---:|
| sabana | 13.30/13.18 | 5.64/5.84 | 16.83/16.85 | 17.39/33.23 |
| gran-rio | 15.26/14.88 | 5.12/5.02 | 33.12/16.90 | 33.42/33.29 |
| manglares | 18.98/19.05 | 4.42/4.43 | 33.39/33.35 | 34.07/33.67 |
| desierto | 14.14/13.99 | 4.00/3.71 | 16.89/16.85 | 33.34/17.14 |
| volcanes | 15.16/15.24 | 5.14/4.92 | 17.00/16.89 | 33.39/33.35 |
| gran-canon | 14.31/13.23 | 4.52/4.23 | 16.94/16.81 | 33.44/16.97 |

Las doce ejecuciones pasaron el verificador: 125 muestras GPU sin disjoint cada
una, 372 intervalos de presentación, cero nuevos chunks durante la medición,
fondos asentados, residencia estable y solo advertencias X4000 conocidas. GPU
elapsed incluye burbujas de pipeline; CPU render incluye draw. No sumar scopes.
La dispersión de Cañón (14.31 frente a 13.23) se conserva y no justifica afirmar
una mejora pequeña respecto a media. Estos resultados no miden streaming activo.

## Diferencias visuales observadas

Se inspeccionaron los doce PNG a resolución nativa. Baja conserva las fibras de
Sabana y Gran Río, la masa densa de helechos de Manglares, el relieve del Desierto,
la roca/lava de Volcanes y las paredes/agua del Cañón. No se tocaron materiales ni
se redujo manualmente densidad para esta serie.

Baja no es visualmente equivalente a media. Faltan las sombras solares de
edificios y árboles, haciendo más plana su unión al suelo. La configuración de
scene.js habilita esas sombras solo en media/alta; la retención de programas no
significa que las sombras estén visibles. La ribera del Cañón se ve mucho más
clara y pierde la franja marrón dominante del perfil medio. No atribuir toda esa
diferencia a una sola causa sin aislamiento. Las diferencias de LOD/detalle del
perfil tampoco son una optimización de calidad equivalente.

Recomendación: media sigue siendo la referencia artística; baja es una alternativa
explícita para equipos modestos, conservando cobertura y carácter de los biomas
pero con pérdida de sombras e integración. No sustituir las capturas aprobadas
por baja para anunciar una aceleración sin degradación. No se garantiza 60 FPS,
especialmente en Manglares (alrededor de 19 ms GPU incluso con escena quieta).

Quedan la comprobación nocturna baja y el cierre conjunto de las secuencias
activas. El objetivo global permanece abierto. Main, reglas y densidad aprobada
no se modifican. Reproducir mediante run-current-resident-cost.py y
summarize-current-resident-cost.py, con --biome <nombre> --quality baja, Vite5190.
