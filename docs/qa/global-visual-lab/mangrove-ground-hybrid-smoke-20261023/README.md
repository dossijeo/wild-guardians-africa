# Primera prueba funcional: cache hibrida 256

Prueba de funcionamiento, NO comparativa de rendimiento A/B/A/B. Intel UHD/ANGLE, media 1280x720, dia, fixture712 pausada y misma camara normal movil. Un registro, sin errores de consola/WebGL.

La cache contiene pesos de mezcla del musgo y del barro, AO final y roughness final en RGBA8. Conserva las texturas originales compartidas de color y normales, y una lectura ARH del barro para su roughness luminosa separada. No almacena luz, sombras ni color final. No altera geometria ni helechos.

25 texturas de 258x258 (256 interiores + borde de un texel), con mipmaps: 8866600 bytes de almacenamiento de pixels estimado (8.456 MiB), sin overhead del driver. Generacion GPU medida: aproximadamente 0.15–0.56ms/chunk, sin queries perdidas/disjoint. Primera llamada CPU con compilacion fria:105.3ms; posteriores0.1–0.6ms. Tiempo total de instalacion1818.3ms incluye esperas de un RAF por chunk y trabajo normal del juego; NO es tiempo GPU ni tiempo de trabajo CPU acumulado. No hay lectura de pixels ni subida de buffers de la cache desde CPU; se genera en targets GPU. No esta integrada en streaming ni invalidaciones.

En esta ejecucion: suelo5.751ms, GPU completa20.646ms, cadencia24.995ms. Son valores exploratorios sin control ABAB contemporaneo: no se declaran ahorro ni cumplimiento del objetivo.

Inspeccion de la captura completa y recorte: color general, sombras, cobertura y normales se mantienen reconocibles, pero algunas mezclas finas se suavizan. El recorte cercano tiene MAE RGB3.698/255 y p95 del maximo canal19/255 frente a la captura original de la ablacion de barro. No es prueba de equivalencia perceptual ni comparacion sincronica pixel exacta. El recorte medio da1.290 y8. Se evaluara512 antes de elegir resolucion o integrar LOD.

Limitaciones: pesos derivados de alturas y fwidth se precalculan a una huella fija, distinta de la huella de pantalla original. Mipmaps no garantizan reproducir operaciones no lineales ni bordes entre chunks. Faltan noche, vistas cercanas/elevadas, baja, movimiento/streaming e invalidaciones reales. Mantener el original por defecto.

```powershell
$env:WG_VARIANT_SEQUENCE='cache256'
$env:WG_PHASES='day'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-hybrid-smoke-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
```
