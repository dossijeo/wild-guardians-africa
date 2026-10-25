# Manglares: cache hibrida 512, primera comparativa ABAB

Prototipo QA, no integrado ni promovido. Intel UHD 0x9A60/ANGLE D3D11, media, 1280x720, fixture712 pausada, camara normal en movimiento sinusoidal8m. A/B/A/B original/cache512, dia/noche. 60warmup+60muestras en cada ventana independiente de GPU completa, GPU por pasada y cadencia. Misma geometria, sombras, helechos, fondo2D y estado. Auditor estricto verifica llamadas, triangulos, cobertura y camaras identicos por muestra.480queries completas validas, sin disjoint/perdidas/errores.

|Variante|Fase|Suelo ms|GPU completa ms|CPU render cadencia ms|Intervalo ms|p95 ms|
|---|---|---:|---:|---:|---:|---:|
|base|day|7.767|21.208|8.433|26.937|31.7|
|base|night|8.014|23.318|7.93|29.092|34.2|
|cache512|day|5.705|19.913|8.052|26.165|33|
|cache512|night|6.032|23.237|7.853|26.573|31|
|base|day|8.499|21.542|9.007|30.135|36.7|
|base|night|8.17|23.318|8.538|30.088|38.1|
|cache512|day|5.788|23.882|8.602|27.315|38.4|
|cache512|night|5.889|20.969|7.897|25.475|30.7|

El suelo ahorra1.982â€“2.711ms por pareja. La cadencia media mejora0.772/2.519/2.820/4.613ms; p95 empeora1.3/1.7ms en dia y mejora3.2/7.4ms en noche. GPU completa: -1.295/-0.081/+2.340/-2.349ms. La segunda pareja diurna contradice una mejora GPU global consistente: NO se declara cerrado el objetivo20â€“23ms ni una ganancia estable de FPS. Se necesitan ventanas mas largas, LOD real, escenas activas y validacion de streaming. No se descarta el dato discrepante ni se usa solo el mejor par.

Material: RGBA8 almacena dos pesos de mezcla, AO y rugosidad. Sigue muestreando color y normales originales compartidos, mas roughness del barro para su iluminacion separada. La iluminacion, recepcion de sombras, desaturacion aprobada y respuesta dinamica de normales permanecen originales. No hay iluminacion precocinada.

Memoria:25targets514Â² con mipmaps,35209000bytes estimados de pixels (33.578MiB), sin overhead del driver. Supera el objetivo bajo si se retienen todos a512; esta variante fija NO se propone como configuracion final. Solo una resolucion por chunk. No hay buffers CPU con pixels ni readback de cache. Shader temporal compartido entre25bakes. Se libera al terminar esta instalacion QA; integracion futura debe retenerlo/precalentarlo para evitar recompilar durante streaming.

Generacion medida en4instalaciones:13.436â€“16.845msGPU sumados,0.446â€“2.775ms/chunk;25queries validas por instalacion. Primera llamada CPU36.3â€“91.3ms (compilacion fria), posteriores<=0.4ms. La generacion se reparte un chunk por RAF; no se ha validado todavia esa politica en streaming activo. La instalacion total incluye renders del juego y esperas, no debe confundirse con GPU/CPU acumulada.

Revision visual: captura completa diurna y recortes dia/noche conservan volumen y color general;512 aproxima mejor la mezcla fina que256. Recorte (140,480)-(440,660): MAE RGB2.303/255 diurno,1.108 nocturno; p95 maximo canal12/6. Las diferencias no son cero y no prueban por si mismas equivalencia artistica. Side-by-side originales sin retoque en day-side-by-side.png y night-side-by-side.png. Pendientes camara cercana/elevada, baja, transiciones, ribera a distintas distancias, bordes de chunk y eventos.

Limitacion estructural: altura/fwidth originales dependen de la huella de pantalla; la cache usa huella de texel fija y luego mipmaps. Por ello variar resolucion puede cambiar las mezclas. Es un riesgo a validar antes de seleccionar LOD.

```powershell
$env:WG_VARIANT_SEQUENCE='base,cache512,base,cache512'
$env:WG_PHASES='day,night'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-hybrid512-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
python tools/experiments/audit-mangrove-ground-ablation-20261023.py docs/qa/global-visual-lab/mangrove-ground-hybrid512-20261023 cache512
```

Nota de protocolo: hubo inspeccion y generacion de capturas durante parte de la serie. Puede interferir con el benchmark a traves de CPU o composicion de la interfaz en la misma GPU; no se atribuye automaticamente a ello el dato discrepante. La validacion decisiva debe usar ventanas mas largas sin otras tareas concurrentes.
