# Registro de materiales del mundo

3 de octubre de 2026. Publicado en **9083014**. Se sustituyen los dos recorridos
por fotograma dedicados a aplicar African Toon y actualizar relojes de agua.
El renderer conserva sus demás recorridos de escena; esto no elimina la
actualización de navegación, LOD, obstrucciones, sombras o matrices.

`SceneMaterialRegistry` escucha `childadded`/`childremoved` en el árbol de color.
Registra únicamente subárboles entrantes y cuenta referencias de materiales
compartidos. Los materiales se prestan: salir del registro no los destruye.
Al retirar un árbol o cerrar el mundo también retira sus listeners. Los proxies
temporales del pase de sombras se excluyen expresamente; no son materiales de
color ni agua y entran/salen incluso en fotogramas que reutilizan la sombra.

Three no emite un evento cuando se asigna directamente `mesh.material`.
Esos cambios deben llamar a `refresh(mesh)`: las sustituciones de calidad del
terreno residente y del horizonte notifican ahora al registro. Las construcciones
que cambian hijos, los modelos que llegan asíncronamente, nuevas capacidades de
cultivos y el streaming usan los eventos normales del árbol. El reloj se actualiza
una vez por material de agua activo, cuando cambia el tiempo o su colección;
la pausa estable no reescribe uniformes.

[Pruebas dirigidas](qa/material-registry/targeted.txt): 18/18, incluyendo seis
pruebas del registro: agua compartida y tardía, ausencia de recorridos en update,
actores anidados/reparentados, propiedad de recursos y retirada de listeners,
arrays/sustituciones/metadatos, calidad del terreno/horizonte, fallback QA y
exclusión de proxies. [Suite completa de la versión final](qa/material-registry/tests.txt):
**651/651**. [Build y paquete](qa/material-registry/build.txt) aprobados: 554 archivos,
379,671,304 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales.

## Medición estática

Sabana/Mapungubwe/712, media, shader completo, 1600×900 internos, Intel UHD/ANGLE,
misma cámara y reloj simulado fijo. A–B–B–A, 30 frames de calentamiento y 180
consultas GPU válidas por muestra. La suite Node se ejecutó simultáneamente.

| Muestra | Registro | CPU media (ms) | GPU media (ms) |
| --- | --- | --- | --- |
| [A1](qa/material-registry/on1.json) | Sí | 14.87 | 42.62 |
| [B1](qa/material-registry/off1.json) | No | 14.31 | 48.79 |
| [B2](qa/material-registry/off2.json) | No | 13.67 | 42.96 |
| [A2](qa/material-registry/on2.json) | Sí | 12.94 | 40.07 |

Todas conservan 111 calls y 1,560,185 triángulos/frame, 1,784 nodos activos,
203 materiales y siete materiales de agua, estado lógico sin cambios, visibilidad
de pestaña y cero errores. En cada ensayo con registro hay cero descubrimientos,
refrescos, recorridos legacy y escrituras de agua durante los 210 frames. Cada
ensayo legacy realiza **420 recorridos completos y 1,470 escrituras**. La caché
de sombra mantiene 209 hits/una regeneración de calentamiento en A1; 210 hits y
cero regeneraciones en las otras tres.

Promedios CPU combinados: 13.90 frente a 13.99 ms. **No se demuestra una mejora
de CPU/FPS** con esta escena y variación. Los tiempos GPU tampoco se atribuyen a
una optimización que no cambia el trabajo gráfico. El trabajo evitado sí se
acredita mediante contadores y pruebas. Los informes preliminares conservados
explican la exclusión de proxies: antes de corregirla se redescubrían 4,830 nodos
temporales por ensayo; no se utilizan para evaluar la versión final.

[Comparación de imágenes](qa/material-registry/comparison.json), excluyendo controles
e informe: 825,600 píxeles. ON–OFF: 1,554 diferentes, máximo 59/255. OFF–OFF
repetido: 1,512 diferentes, mismo máximo. Se conservan las variaciones sin
atribuir su causa ni afirmar identidad global. [Vista con registro](qa/material-registry/on.png).

## Mutaciones comprobadas en navegador

En cañones se cambió media→muy baja→media sin reconstruir el suelo; 26 refrescos
por cambio (25 chunks y horizonte), reloj de agua 0→0.065 tras +0.1 s. Se viajó
un chunk, llegando nuevos subárboles y retirándose los antiguos. Se mostraron
personajes, ocho cultivos con morph, defensas/puertas y centro dañado. Los informes
`canyon-*.json` comparan el registro con los materiales reales del árbol: ningún
material sin registrar, referencia obsoleta o material elegible sin African Toon;
todos los relojes de agua coinciden con el esperado, incluso después del viaje.
En desierto se comprobó también Basic→Standard y el horizonte, con el mismo
resultado; este caso no contiene agua.

Consola estática sin avisos. La consola de cañones conserva warnings ANGLE de
`f_environment4` potencialmente no inicializada, ya observados en la QA de
resolución. No hubo errores WebGL/excepciones; sigue pendiente investigar el
shader traducido. Estos casos no acreditan las 30 combinaciones visuales, móvil,
incursión completa o la aceptación integral del Plan Maestro.
