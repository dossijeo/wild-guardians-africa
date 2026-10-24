# Cache hibrida: seleccion de resolucion desde cerca

Comparacion exploratoria de calidad, NO ABAB. Cuatro cargas independientes: original,128,256,512. Intel UHD/ANGLE, media,1280x720,dia,fixture712 pausada; camara offset(11,8,9) respecto al objetivo y movimiento lateral8m. Auditoria exacta de estado/camaras/calls/triangulos/cobertura en cada ventana,240queries completas validas, sin errores.

|Variante|Suelo ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---:|---:|---:|---:|
|base|6.685|19.91|26.74|38.9|
|cache128|4.636|17.745|23.055|28.3|
|cache256|4.668|20.79|22.937|28.2|
|cache512|4.478|18.293|22.735|26.5|

near-ground-four-variants.png muestra recortes sin retoque (20,475)-(400,710), original arriba izquierda,128 arriba derecha,256 abajo izquierda,512 abajo derecha. Microdetalle y volumen permanecen, pero las fronteras entre escalas de musgo se suavizan incluso a512. En el recorte MAE RGB3.971/3.773/2.958 y p95 maximo canal21/20/15 para128/256/512. La diferencia de calidad entre128 y256 es pequena desde tan cerca; aumentar solo resolucion no elimina el problema.

No aceptar todavia equivalencia cercana. Siguiente prueba arquitectonica: precocinar solo ruido y cobertura de baja frecuencia, conservando la mezcla fina por alturas y sus derivadas de pantalla en tiempo real; evaluar su utilidad como ruta cercana de LOD. No extrapolar los tiempos GPU de estas cargas secuenciales a una ganancia reproducible; cache256 incluso tiene GPU completa mayor que el original en esta ejecucion.

```powershell
$env:WG_VARIANT_SEQUENCE='base,cache128,cache256,cache512'
$env:WG_PHASES='day'
$env:WG_VIEW='near'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-hybrid-near-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
python tools/experiments/audit-mangrove-ground-hybrid-matrix-20261023.py docs/qa/global-visual-lab/mangrove-ground-hybrid-near-20261023
```
