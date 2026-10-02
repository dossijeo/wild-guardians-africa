# Límites por unidad del poblado

El cargador asigna `geometry.boundingBox` desde `unit.min/max` y deriva una esfera
envolvente. Cada pieza conserva sus atributos e índices compartidos, drawRange,
escala, material y sombras. Three aplica estos límites separadamente a cada cámara
y a la cámara de luz; no se ocultan casters con el frustum de la cámara de color.
Esta corrección no modifica los centros DEST ni los lotes de sombras de props.

## Verificación de los datos

El test carga los cinco binarios reales a través de `Assets.village` (solo se
sustituye la carga de textura). Comprueba todos los índices referidos por las
46 unidades: Mapungubwe 10, Saheliano 10, Suajili 7, Musgum 10 y Etíope 9.
Cada vértice queda contenido por caja y esfera; la caja coincide con los extremos
indexados a tolerancia 1e-7. Conserva identidad de buffers, drawRange y flags de
sombras. Cuatro cámaras giradas alrededor de cada unidad mantienen visible la
unidad seleccionada y demuestran falsos positivos del antiguo límite global.

## Prueba en navegador

El fixture permite `Ver pieza de poblado` y alternar `Bounds por unidad sí / no`.
La comparación usa Sabana/Mapungubwe, semilla 712, media, ruido fino activado,
1600 × 900 internos, misma cámara y simulación detenida. Intel UHD / ANGLE;
30 frames de calentamiento y 180 consultas GPU válidas por muestra.

| Bounds | Calls/frame | Triángulos/frame | GPU media (ms) |
| --- | --- | --- | --- |
| [Unidad](qa/village-bounds/unit.json) | 82 | 1,337,176 | 44.30 |
| [Poblado completo](qa/village-bounds/whole.json) | 89 | 1,403,884 | 50.84 |
| [Unidad, repetición](qa/village-bounds/unit-repeat.json) | 82 | 1,337,176 | 42.63 |

Las tres muestras conservan estado y cámara, sombras/PCF activos, cero errores
y caché de sombras reutilizada durante los frames medidos. La suite Node corrió
simultáneamente: tiempos observacionales, no garantía de FPS ni medida CPU aislada.

[Captura con límites por unidad](qa/village-bounds/unit.png) y
[captura con límites antiguos](qa/village-bounds/whole.png) mantienen las superficies
visibles y sus sombras en esta vista. La comparación RGB excluye los controles
y el informe: región (0,35)–(1280,680), 825,600 píxeles. Hay 34 píxeles diferentes,
con desviación máxima de 2/255 ([resultado](qa/village-bounds/pixel-comparison.json)).
No se atribuye una causa a esas diferencias ni se afirma identidad exacta.

El test cubre límites geométricos de las cinco culturas; la captura solo esta
vista Mapungubwe. Quedan la envolvente de centros durante colapso y la selección
de lotes contra el volumen de la luz, además de la auditoría completa del plan.

Publicado f604ed1: [suite completa](qa/village-bounds/tests.txt) 633/633,
[test de binarios](qa/village-bounds/targeted.txt) aprobado,
[assets](qa/village-bounds/assets.txt) y [build/paquete web](qa/village-bounds/build.txt)
aprobados: 554 archivos, 379,666,003 bytes, 794 enlaces relativos y 20 GLB runtime.
