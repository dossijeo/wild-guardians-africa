# Proyeccion con1024 en primer plano: calidad cercana

Prueba visual A/B, no benchmark GPU completo ni ABAB. Intel UHD/ANGLE,media720p,dia,fixture712 pausada,camara cercana con movimiento lateral8m. Cadencia60frames solo para mantener la misma captura final. Auditoria manual de camara,calls,triangulos,cobertura iguales por muestra y cero errores.

Seleccion inicial congelada:1cache1024+4cache512,10.725MiB de pixels y mipmaps. Iluminacion,sombras,colores y normales originales siguen dinamicos; se precocinan pesos,AO y rugosidad. Primera cache1024 cuesta2.534msGPU al generarse; las512 cuestan0.540–1.208ms. No hay politica de streaming ni transiciones implementada.

Recorte(20,475)-(400,710),original a izquierda: MAE RGB2.020/255,p95 maximo canal9/255, frente a2.958 y15 de512 en la prueba cercana anterior. Mejora pero no equivalencia exacta; persisten variaciones de mezcla. La cache usa anisotropia1 frente a8 de mapas originales. Siguiente comprobacion: igualar filtrado antes de decidir si hace falta otra resolucion/representacion.

```powershell
$env:WG_VARIANT_SEQUENCE='base,projected1024'
$env:WG_PHASES='day'
$env:WG_VIEW='near'
$env:WG_MODES='cadence'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-projected1024-near-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
```
