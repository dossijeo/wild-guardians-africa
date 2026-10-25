# Mapungubwe taller: C con UV continua y restauración de fachada

Variante experimental `?visualLab=village-art`, solo `mapu-0`, atlas **2048 × 2048**, sin activación por defecto. El segundo pase corrige el serrado grueso de la banda del arco, restaura los dos soles y limpia la cara de arcilla naranja. Teja, puerta y piedra lateral conservan la mejora del primer pase. El edificio no se considera un acabado integral: toldo, recipientes, dintel interior, franja baja y otros accesorios conservan la pintura original suave.

## Qué cambia y qué permanece

`blender-refine-workshop.py` se ejecuta en Blender 5.2.2 después del primer pintado. La banda dispone ahora de una tira UV continua en el margen derecho: ángulo alrededor de la bóveda y posición axial oblicua. Las líneas se pintan sobre los extremos de las 125 aristas medidas, no sobre una onda idealizada. Al interpolar la UV sobre cada arista, el pigmento coincide con ella. La tira se pinta completa, con margen, para evitar los cortes de filtrado entre centenares de pequeñas islas.

Se mantienen **7.992 triángulos**. Hay 10.355 registros de vértice frente a 10.147 en B: **208 duplicados únicamente por costuras de atributos**. El generador comprueba igualdad exacta de posición y normal en cada esquina indexada. No cambia superficie, silueta, volumen ni normales. El binario C pesa 427.264 bytes, 6.656 más que B. `refinement-audit.json` contiene las selecciones y la verificación; `workshop-refined.blend` empaqueta la pintura y cinco selecciones editables de autoría, aplanadas a un material runtime.

El atlas previo del taller ocupa 1792², un 12,5 % menos de extensión por eje. En los márgenes se reservan cartas continuas para arco, dos pilares y arcilla. Esto evita aumentar resolución o añadir materiales. La reducción de densidad del resto es un compromiso explícito: las capturas mantienen la lectura de teja y puerta. No se cambia el atlas original de producción.

## Restauración artística

`front-source-rectified.png` reconstruye la vista frontal de la pintura fuente. Los dos anillos terracota y sus ocho marcas claras se trazaron usando posiciones elegidas sobre esa referencia, registradas en el generador. La ubicación, distribución y motivo se conservan; el borde y pigmento se redibujan para recuperar lectura. El primer resultado parecía demasiado limpio como icono: se redujo saturación y contraste y se introdujo una irregularidad leve y deliberada del contorno, sin ruido aleatorio. Es una reconstrucción interpretativa del trazo borroso, no recuperación de un original de mayor resolución.

La cara naranja recibe dos pasadas amplias siguiendo la curva y conserva un 18 % del pigmento fuente. Una primera selección por radio dejaba caras antiguas formando triángulos de distinto color; se descartó y corrigió mediante raycast y selección del pigmento. Se respeta la forma tallada. No se añaden relieves, normal maps, grano uniforme ni sharpen.

El primer pase de teja fallido, que superponía retículas, sigue documentado en `rejected-overlay-close-day.webp`. La versión anterior completa queda en commit `7454d82c`; allí se puede comprobar el serrado que motivó este segundo pase. `mapu-0-color-art.png`, `workshop-art.blend` y `art-audit.json` son los intermedios reproducibles del primer pase; **el resultado final es `mapu-0-color-refined.png` / `workshop-refined.blend` / `refinement-audit.json`**.

## Comparación real WebGL

`0-facade-{day,night}.png` y `village-art-facade-{day,night}.png` comparten encuadre frontal oblicuo; se ocultan las otras unidades solo para impedir que tapen el taller. El arco conserva los quiebros físicos y deja de mostrar el serrado repetitivo del atlas fragmentado. Los soles se leen como motivos pintados definidos, no manchas. La arcilla es más limpia, aunque deliberadamente sencilla y de bajo contraste.

Los doce `{0,village-repacked,village-art}-{medium,close}-{day,night}.webp` mantienen el poblado completo, 1280 × 720, semilla 712, calidad media, tiempos verificados 150/350. Media desplaza la cámara (9,6.5,11) respecto al centro; cercana (3.3,2.6,4.1). Teja, banda y soles son legibles a distancia de juego. De noche la piedra y carpintería pierden presencia por iluminación, mientras que los motivos claros siguen destacando. El filtrado a distancia suaviza la banda: eso es esperable y distinto de los cortes de islas que se corrigieron.

## Coste observado

24 mediciones A–B–C–C–B–A, dos por cámara/fase, 30 fotogramas de calentamiento y 180 muestras por medición. La primera corrida coincidió con una suite global en otro checkout: se excluyó y se conserva como `capture-report-contended.json`. La tabla usa la repetición posterior, tras terminar ese proceso, sin builds ni otras capturas simultáneas de este trabajo.

| Cámara/fase | GPU A / B / C, ms | CPU A / B / C, ms |
| --- | --- | --- |
| Media día | 14,51 / 13,41 / 13,77 | 5,99 / 5,61 / 5,68 |
| Media noche | 13,82 / 14,20 / 14,49 | 5,23 / 5,19 / 5,36 |
| Cercana día | 14,21 / 14,30 / 14,38 | 5,24 / 5,20 / 5,13 |
| Cercana noche | 14,84 / 14,55 / 15,48 | 4,95 / 5,06 / 5,03 |

No se demuestra una ganancia de rendimiento. C cercana nocturna promedia **0,64 ms GPU más que A**, con sus dos ejecuciones en 14,74 y 16,22 ms; dos repeticiones no bastan para atribuir una diferencia estable al material. El shader y la resolución no cambian. A/B/C tienen **62 draw calls / 580.971 triángulos** en media y **65 / 669.724** en cercana. Un material por edificio; B/C tienen 206 materiales de escena frente a 205 de A, y una textura adicional. Las 24 mediciones no registraron errores de página y sus cámaras son idénticas por vista.

Atlas C: **676.132 bytes** frente a 782.534 de B. Binario C: **427.264 bytes** frente a 420.608. Total experimental añadido frente a A: **1.103.396 bytes de recursos**, 99.746 menos que B. No es ahorro frente al juego original, porque el atlas original de 1.279.936 bytes todavía se descarga para las otras unidades.

B/C retienen el atlas compartido para otras unidades. La textura adicional RGBA8 2048² con mipmaps representa **21,33 MiB estimados frente a A**, cero frente a B. Es almacenamiento teórico, no VRAM/RSS medida. La cantidad de geometrías y texturas reportada se registra por fase; no hay perfil móvil ni afirmación de mejora de rendimiento. Diferencias de píxeles en `summary.json` son diferencias, no una puntuación de calidad.

## Ruta para compartir el atlas

`audit-workshop-sharing.py` mide cobertura de triángulos UV del atlas original a 512², sin margen de mipmaps: **10 unidades, 70,02 % ocupado**, taller 7,45 %, de los que 6,11 % son exclusivos y 1,34 % se solapan con otras unidades. Es una aproximación rasterizada, no prueba de que exista un rectángulo libre utilizable. Pintar encima de las UV originales afectaría a otras unidades en las zonas compartidas.

La ruta plausible es reempaquetar las islas útiles del atlas de Mapungubwe, reservar cartas de fachada y una tira de materiales repetibles, y cargar esa textura como **sustitución** del atlas compartido. Un solo material puede seguir atendiendo a todas las unidades; el loader debe evitar descargar primero el atlas fuente y luego otro atlas para el taller. Eso eliminaría el coste del atlas adicional. Hay espacio aparente suficiente para investigarlo, pero el margen de filtrado, la densidad final y los solapamientos deben validarse en un ensayo específico. **No se ha implantado ni se ha extendido la modificación artística a otros edificios.**

## Reproducción y pruebas

Con Vite en 127.0.0.1:5189:

```powershell
python tools/experiments/audit-workshop-arch.py
python tools/experiments/audit-workshop-front.py
python tools/experiments/audit-workshop-sharing.py
& 'C:\Users\PC\tools\blender\blender-5.2.2-windows-x64\blender.exe' -b --python tools/experiments/blender-paint-mapu-workshop.py
& 'C:\Users\PC\tools\blender\blender-5.2.2-windows-x64\blender.exe' -b --python tools/experiments/blender-refine-workshop.py
$env:WG_ART_VARIANTS='0,village-repacked,village-art,village-art,village-repacked,0'
node tools/experiments/capture-workshop-art.mjs
node tools/experiments/summarize-workshop-art.mjs
$env:WG_ART_VARIANT='0'
node tools/experiments/inspect-workshop-surfaces.mjs
$env:WG_ART_VARIANT='village-art'
node tools/experiments/inspect-workshop-surfaces.mjs
node --test tests/assets-lifecycle.test.js tests/village-bounds.test.js tests/village-art-variant.test.js
npm run build
```

Pasaron los **12 tests** de recursos/límites de poblado y de la nueva variante: comparación de cada posición/normal indexada, UV dentro del atlas y hashes de producción. También pasaron build Vite y comprobación de diff. Avisos existentes de bundle grande e importación dinámica/estática no cambian.
