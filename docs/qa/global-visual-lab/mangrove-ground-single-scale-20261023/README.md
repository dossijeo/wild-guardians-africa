# Manglares: ablacion de segunda escala de musgo

Intel UHD / ANGLE D3D11, media, 1280x720, fixture 712 pausada, dia/noche, camara normal en movimiento sinusoidal de 8m. A/B/A/B original/single: elimina solo el bloque de muestreo, altura y mezcla de la segunda escala. Conserva substrato/barro, iluminacion, sombras, normales de primera escala y todas las geometrías. No es candidata artistica.

480 queries completas validas. Auditoria confirma camara, estado, llamadas, triangulos y cobertura identicos por fotograma en las tres ventanas.

|Variante|Fase|Suelo ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|7.845|22.393|27.825|39.5|
|base|night|8.005|22.47|28.98|36.7|
|single|day|6.362|23.159|25.752|30.6|
|single|night|6.109|22.279|25.833|30.6|
|base|day|7.745|25.954|26.977|32.1|
|base|night|8.643|23.043|35.368|47.1|
|single|day|6.174|19.902|27.768|36.6|
|single|night|6.16|20.658|29.883|40|

La segunda escala tiene coste sustancial en el suelo; la GPU completa y la cadencia presentan deriva entre ventanas, por lo que no se usa la mejor pareja como ahorro estable. El material cambia de aspecto y no se promueve. La ruta pureMoss de Manglares retorna antes de POM: no ejecuta sus ocho muestras de parallax.

La primera ejecucion quedo incompleta por recarga de desarrollo. Una tentativa de bloquear el cliente Vite completo impidio cargar el menu y no produjo mediciones. La ejecucion completa aqui registrada conserva sus exports y estilos, desactivando solo la conexion HMR. No se mezclan resultados parciales.

```powershell
$env:WG_VARIANT_SEQUENCE='base,single,base,single'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-single-scale-20261023'
node tools/experiments/measure-mangrove-ground-ablation-20261023.mjs
python tools/experiments/audit-mangrove-ground-ablation-20261023.py docs/qa/global-visual-lab/mangrove-ground-single-scale-20261023 single
```
