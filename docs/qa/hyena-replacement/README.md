# Sustitución de la hiena

Rama `codex/beast-models`. Original externo intacto: `C:\Users\PC\Desktop\Wild Guardians New\animales\hiena.glb`, SHA-256 `922af2a4d78eb7447359ae6ac6d1bbd86729ac3ffa2cd29c44f92f0398192321`.

- Siete aberturas de melena cerradas y respaldo interior reducido bajo los mechones inferiores. La melena sigue cabeza, cuello y columna; no las extremidades.
- 1.298 vértices geométricos del collar vinculados exclusivamente a `Neck`; 1.152 tenían influencias de extremidades. Se recupera además su forma desde la pose original suministrada, pues neutralizar aquellos pesos deformaba y estiraba varias piezas.
- Plantas niveladas, orientación horizontal horneada y apoyo recalculado. En 774 poses de producción, variación máxima dentro de una planta de 0,00230 unidades; apoyo mínimo de 0,02198 y separación máxima del pie de apoyo de 0,03786.
- Seis animaciones transferidas desde la hiena anterior, conservando nombres, duraciones y eventos de ataque. Se recalibran huella de navegación y pasos. Se eliminan 40 huesos de dedos sin animación tras consolidar sus pesos en las manos.
- Corrección anatómica de cabeza de 12° y cuello de 3° alrededor del torso animado. Se mantienen giros y anticipaciones. Normales suaves con aristas de 55° y material mate.
- Se aplica el [nuevo contraste de las bestias](../beast-lighting/README.md), sin cambiar las luces globales.

| Recurso | Bytes |
| --- | ---: |
| Nuevo original externo | 71.417.476 |
| Fuente reparada con seis clips | 71.064.552 |
| GLB final de ejecución | **3.978.104** |

Reducción de descarga del 94,43 % frente al nuevo original. Geometría y animaciones Meshopt sin pérdida; albedo 8192→2048 y normal 4096→2048 en WebP. El mapa normal reducido se comprime sin pérdida; albedo con PSNR de 39,35 dB. El GLB de trabajo retiene las texturas originales. El donante anterior permanece en el repositorio y se excluye del paquete final.

Recurso activo: `48f0d965b9e2f135be694163201d3a459da74ca0679d70a884ccdf1116b6fbf0.glb`. El catálogo mantiene la clave histórica `source`; `geometrySource` identifica la nueva geometría.

## Evidencias

- [Vídeo de las seis animaciones](hyena-animations.mp4), día/noche y vista trasera; [secuencia y procedencia](video.json). Captura determinista a 30 fps, no medición de rendimiento.
- [Informe Blender](repair.json), [auditoría de animaciones](animation-audit.json) y [50 capturas](captures.json) en los seis biomas, marcha, carrera y ataques.
- [Melena antes](mane-before.jpg) y [melena reparada](sabana-detail-back-day.jpg).
- [Sabana](sabana-front-Walking.jpg), [Gran Río](gran-rio-front-Walking.jpg), [Manglares](manglares-front-Walking.jpg), [Volcanes](volcanes-front-Walking.jpg), [Gran Cañón](gran-canon-front-Walking.jpg) y [Desierto](desierto-front-Walking.jpg).
- [Incursión real](native-raid.json): desplazamiento, ataque y primer daño 600→575 al centro. Sin nuevas descargas ni programas de material del animal durante aparición/ataque. [Captura](native-raid.jpg).

Validación: 107 pruebas dirigidas, compilación Vite, paquete e integridad aprobados. glTF sin errores y geometría/animaciones idénticas byte a byte tras descomprimir. Revisión en Chrome de escritorio; sin medición de FPS móvil.

## Reproducción

```powershell
& $hyenaBlender -b --python-exit-code 1 --python tools/prepare_hyena.py -- --input 'C:\Users\PC\Desktop\Wild Guardians New\animales\hiena.glb' --output $hyenaOutput --report docs/qa/hyena-replacement/repair.json
node tools/install_beast.mjs hyena $hyenaOutput
node tools/compress_web_assets.mjs <nombre-impreso.glb>
node tools/calibrate_animal_actions.mjs
node tools/calibrate_footsteps.mjs
node tools/audit_beast_replacement.mjs hyena
node tools/verify_web_assets.mjs <nombre-impreso.glb>
```

`--blend-dir` guarda una copia editable; `--head-lift` controla la elevación de cabeza. La receta anatómica está limitada a esta hiena. El instalador admite hiena/facóquero, reemplaza solo su entrada y elimina únicamente su variante generada anterior.

Con Vite iniciado: `tests/browser/beast-replacement.html?species=hyena&biome=sabana` permite revisar clips, melena y día/noche. `node tools/capture_beast_replacement.mjs hyena` captura los seis biomas y valida una incursión real. `node tools/render_beast_video.mjs hyena` genera el vídeo. Estos comandos requieren Playwright, Chrome y FFmpeg disponibles; `WG_QA_URL` selecciona servidor.
