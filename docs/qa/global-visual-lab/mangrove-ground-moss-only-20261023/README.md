# Manglares: ablacion de mezcla con barro

Diagnostico, no candidata artistica. Intel UHD / ANGLE D3D11, media, 1280x720, fixture 712 pausada, dia/noche y camara normal con desplazamiento sinusoidal de 8m. A/B/A/B original frente a moss: conserva las dos escalas de musgo; omite composicion del substrato, mascaras de cobertura/ribera y respuesta luminosa separada del barro. Conserva iluminacion y sombras dinamicas del musgo, geometria, overlays y helechos.

|Variante|Fase|Suelo ms|GPU completa ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|
|base|day|8.21|22.217|26.882|32.7|
|base|night|8.07|23.16|29.863|37.5|
|moss|day|5.13|19.436|25.053|30.7|
|moss|night|5.006|20.405|26.752|33|
|base|day|8.429|23.051|31.332|41.4|
|base|night|8.72|23.758|30.653|40.7|
|moss|day|4.91|19.585|24.228|28.1|
|moss|night|4.845|19.872|25.233|31|

La retirada de esta composicion y su respuesta separada reduce el suelo aproximadamente 3ms. No separa muestreo de barro de iluminacion de barro; la ablacion surface anterior ya acota la iluminacion final completa en aproximadamente 1.4–1.7ms. Las diferencias entre ablaciones no son estrictamente aditivas: cambian dependencias y decisiones del compilador. No se promueve porque elimina transiciones artisticas aprobadas.

Equivalencia: estado/camaras/cobertura iguales; todas las ventanas de pasadas y cadencia mantienen llamadas y triangulos identicos por muestra. El auditor estricto completo detecto una diferencia en dos frames de la segunda variante moss diurna, exclusivamente en la ventana GPU completa: frame4 -3calls/-1059triangulos, frame36 +460triangulos. Se conserva en non-ground-drift.json; no se afirma igualdad completa de carga en esa ventana. El auditor diagnostico exige igualdad de carga del suelo por frame y de las otras ventanas. Todas las consultas GPU validas, sin errores WebGL. Un git push breve coincidio con la ejecucion; las cifras CPU/cadencia no se usan como demostracion definitiva de una optimizacion.

```powershell
$env:WG_VARIANT_SEQUENCE='base,moss,base,moss'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-moss-only-20261023'
node tools/experiments/measure-mangrove-ground-ablation-20261023.mjs
python tools/experiments/audit-mangrove-ground-layers-20261023.py docs/qa/global-visual-lab/mangrove-ground-moss-only-20261023 moss
```
