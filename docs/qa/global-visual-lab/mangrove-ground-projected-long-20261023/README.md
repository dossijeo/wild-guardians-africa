# Seleccion proyectada congelada: ABAB largo

QA, sin integracion dinamica. Misma escena y protocolo largo: UHD0x9A60/ANGLE, media720p,fixture712 pausada,camara normal movil,180warmup+240muestras, ventanas GPU completa/cadencia. A/B/A/B dia/noche. Auditor estricto correcto: estado,camaras,calls,triangulos,cobertura identicos;1920queries validas y cero errores.

Seleccion al instalar:9materiales,1noise128+1weights128+7weights512;9.573MiB de pixels+mipmaps adicionales. No se recalcula mientras la camara recorre8m: esta prueba aisla el compromiso entre rutas antes de introducir streaming/LOD dinamico. Chunks no seleccionados siguen usando el original.

|Variante|Fase|GPU ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|
|base|day|23.254|29.061|35.1|
|base|night|24.147|30.002|36.1|
|projected|day|23.075|27.449|33.1|
|projected|night|22.919|29.161|38.9|
|base|day|23.372|29.121|34.3|
|base|night|24.62|31.071|35.6|
|projected|day|21.633|27.428|35.4|
|projected|night|24.162|29.692|38.9|

GPU mejora0.179/1.228/1.739/.458ms, cadencia1.612/.841/1.693/1.379ms. P95 mejora2ms en primera pareja diurna pero empeora2.8/1.1/3.3ms en las otras. Resultado insuficiente para cerrar objetivo: memoria reducida y primer plano mas fiel, pero ahorro menor que pesos512 y estabilidad temporal no demostrada. Se preservan todos los datos desfavorables.

Captura diurna completa revisada: conserva mezcla cercana y cobertura de helechos; pendiente cuantificacion por regiones. Antes de implementar gestor complejo, probar1024 solo en chunk(s) cercano(s), para determinar si se puede mantener composicion precocinada con fidelidad y memoria razonables. Si no, valorar otra representacion dentro del mismo objetivo. No cambios nativos.

```powershell
$env:WG_VARIANT_SEQUENCE='base,projected,base,projected'
$env:WG_PHASES='day,night'
$env:WG_VIEW='normal'
$env:WG_SAMPLES='240'
$env:WG_WARMUP='180'
$env:WG_MODES='frame,cadence'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-projected-long-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
python tools/experiments/audit-mangrove-ground-long-20261023.py docs/qa/global-visual-lab/mangrove-ground-projected-long-20261023 projected
```
