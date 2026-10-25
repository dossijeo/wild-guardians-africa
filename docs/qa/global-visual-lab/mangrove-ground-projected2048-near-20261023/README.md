# Resolucion2048 solo en el chunk cercano

Prueba visual acotada, NO implementacion final ni ABAB de rendimiento. Intel UHD/ANGLE,media720p,dia,fixture712 pausada,camara cercana y recorrido8m. Seleccion congelada:1cache2048+4cache512,26.745MiB de pixels+mipmaps. Se mantienen iluminacion,sombras,colores y normales originales dinamicos; cache de pesos,AO y roughness unicamente.

Recorte(20,475)-(400,710): MAE RGB1.204/255,p95 maximo canal5; mejora frente a1024(2.020/9) y512(2.958/15). Inspeccion visual: recupera buena parte de las fronteras finas, pero no es identidad de pixels ni prueba de equivalencia de todas las vistas. Camara/calls/triangulos/cobertura identicos por frame de cadencia, sin errores.

Coste de generacion del2048:9.200msGPU, inadecuado para ejecutarlo de golpe durante streaming. Los512:0.550–2.308ms en esta instalacion. El presupuesto tambien se rompe si varias regiones cercanas requieren2048 simultaneamente. No promover esta variante directamente.

Decision siguiente: probar una cache de mayor densidad espacial limitada a una region cercana dentro del chunk, con una cache mas pequena para el resto. Por ejemplo1024 sobre24m tiene la densidad de2048 sobre48m, a un cuarto de pixels. Esta equivalencia geometrica NO prueba ahorro de GPU ni equivalencia visual: hay que implementar y medir el limite de region, transicion, memoria temporal y generacion repartida. Conservar original mientras no haya datos listos; eventos de chunk/mask para invalidacion, sin recorridos de entidades.

Pendientes concretos: prototipo de region detallada, comparativa visual cercana/normal/elevada y dia/noche; benchmark largo media/baja; gestor de recursos con presupuesto16–32MiB, histeresis, transiciones, generacion acotada por frame y liberacion; streaming y simulacion activa. Mantener Manglares como unico objetivo. PR159 borrador, original por defecto.

```powershell
$env:WG_VARIANT_SEQUENCE='base,projected2048'
$env:WG_PHASES='day'
$env:WG_VIEW='near'
$env:WG_MODES='cadence'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-projected2048-near-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
```
