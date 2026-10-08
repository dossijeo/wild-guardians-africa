# Cultivo derivado DoubleSide: piloto rechazado

Fuente congelada 8a2950f4 del subagente, maíz maduro en Sabana/día, reloj1,75, azimut26,25°, elevación32,5°. Una vista TRAINING con cuatro brazos: original DoubleSide, original reindexado DoubleSide, tallo reducido por Blender al75% DoubleSide y el mismo derivado separado en dos grupos DoubleSide. Sin FrontSide ni reversos dibujados. No es un benchmark ni una matriz multivista completa.

Tres controles del original son exactamente iguales. El original reindexado también coincide: alphaIoU1, cero píxeles/color distintos. Ambos derivados fallan con50 píxeles faltantes y224 añadidos:13 y159 respectivamente fuera de la tolerancia espacial de1píxel. IoU0,9987249646 no basta para aceptar; RGB MAE lineal0,0024300843, máximo local0,1440141753 y regiones RGB grandes de1406/1181/1178píxeles. Se mantiene el umbral y se rechaza la propuesta antes de estudiar sidedness. Las hojas/suelo conservados por bits en la auditoría geométrica no prueban por sí solos igualdad de sus atributos derivados o comportamiento shader.

Reporte e imagen comparativa conservados, consola vacía, GPU liberada y pestaña774 cerrada. El subagente recibe el rechazo para investigar alternativas conservadoras; no se promueve ningún modelo ni se extrapola inviabilidad universal.

La etiqueta URL heredada incluye43808 activo; el inventario raíz lo encontró ausente porque Sabana/Etíope terminó. La matriz avanzó a Gran Río/Mapungubwe20024, observado vivo junto con49032/41320/41304. Se conserva el reporte raw sin cambiar esa etiqueta; no se usa para atribuir causa o medir CPU/GPU.

```powershell
node docs/qa/crop-derived-double-rejected/verify.mjs
```

El verificador comprueba coherencia e integridad archivadas, no vuelve a renderizar.
