# Cache de baja frecuencia128: preservar mezcla fina

Prototipo QA alternativo. Precocina qaRegion y cobertura antes de mezclar alturas en RGBA8; conserva las alturas, fwidth, mapas ARH, normales y colores compartidos en el shader original. Iluminacion/sombras sin cambios. Intel UHD/ANGLE, media,720p,dia/noche,fixture712 pausada y camara normal movil. A/B/A/B,60warmup+60muestras por ventana. Auditor estricto verifica estado/camaras/calls/triangulos/cobertura identicos.480queries completas validas; sin errores.

|Variante|Fase|Suelo ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|7.682|21.265|26.852|33.2|
|base|night|8.148|23.004|29.76|36|
|noise128|day|7.229|21.367|26.012|32.4|
|noise128|night|7.088|21.926|27.628|37.1|
|base|day|7.774|22.172|30.853|37.1|
|base|night|8.165|25.075|31.26|41.4|
|noise128|day|8.55|22.019|30.08|41.6|
|noise128|night|7.224|24.104|28.388|33.8|

Ahorro pequeno/variable: no constituye por si solo la optimizacion estructural buscada. Una de las ventanas de pasadas incluso mide mas tiempo de suelo; se conserva el dato. Las ventanas son cortas y hubo inspeccion de capturas durante parte de esta serie y la serie512, posible interferencia de composicion de interfaz en la misma GPU. No se atribuye la variacion a esa causa sin medirla. Antes de adoptar, repetir con ventanas mas largas y sin inspeccion/generacion de imagenes ni otras tareas durante el benchmark.

Calidad: en recorte normal(140,480)-(440,660), MAE RGB0.0263 dia/0.0115 noche, p95 maximo canal1/0. La inspeccion diurna conserva la mezcla fina mucho mejor que la cache de pesos512. No extrapolar a toda la escena o todas las camaras: faltan cercana/elevada y fronteras de chunk. Es candidata a ruta cercana de un LOD material, no una mejora global demostrada.

25targets130² con mipmaps: canales usadosR/G, BA constantes; no hay texturas de luz. La version experimental conservaRGBA8 para comparar; un formatoRG8 podria reducir memoria si se valida compatibilidad. Se usan mascaras existentes del motor, sin consultas nuevas a entidades/navegacion.

```powershell
$env:WG_VARIANT_SEQUENCE='base,noise128,base,noise128'
$env:WG_PHASES='day,night'
$env:WG_VIEW='normal'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-noise128-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
python tools/experiments/audit-mangrove-ground-ablation-20261023.py docs/qa/global-visual-lab/mangrove-ground-noise128-20261023 noise128
```
