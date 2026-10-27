# Sustitución del búfalo

Rama `codex/beast-models`. Original externo intacto: `C:\Users\PC\Desktop\Wild Guardians New\animales\búfalo.glb`, SHA-256 `a6d9f553c5f96c5ec566fc2e335ae97b9f9a99a4b1e752db9b6c4def8ff4a4cb`.

## Resultado

- Plantas originales ya planas, inclinadas 38,88° y 39,05°. Se rotan los pies alrededor de sus tobillos con transición en la parte superior, corrigiendo también sus normales y fijando las plantas a sus respectivos huesos `Foot`. No se reconstruye la forma de las pezuñas.
- Orientación horizontal y apoyo horneados en las seis animaciones. Se exportan a 96 fps para reducir el error de interpolación, conservando las duraciones originales. En 774 poses comprobadas con el controlador de producción, la diferencia máxima de altura dentro de una planta es de **0,000951 unidades**; pie de apoyo entre 0,022 y 0,02988 sobre el suelo local.
- Transferencia desde el búfalo anterior, compensando su ligadura en pose A frente a la pose T del nuevo. Se trasladan las direcciones animadas de brazos y manos conservando las longitudes del nuevo esqueleto. Se mantienen sus 61 huesos y la jerarquía de dedos. Cabeza y cuello conservan el movimiento nativo, sin corrección anatómica adicional.
- En la revisión se detectó un punto corrupto de muñeca, duplicado en dos lanes UV, con pesos de pierna y mano contraria que producía un pico largo. Se reconstruye con el anillo inmediato de la muñeca y pesos medios de `RightHand`/`RightForeArm`. [Antes](wrist-before.jpg) y [después](sabana-detail-front-day.jpg).
- Topología original conservada: 11.459 vértices importados y 15.743 caras. Fuera de los pies y de ese único punto de muñeca, las posiciones originales permanecen idénticas antes de la normalización uniforme. UV y parámetros de material conservados; normales originales salvo las zonas reparadas. Se aplica el límite de cuatro influencias por vértice del renderizador al exportar.
- Se recalibran huella y contactos de pasos. El material recibe la [iluminación de bestias aprobada](../beast-lighting/README.md); no hay nuevos cambios de iluminación global.

| Recurso | Bytes |
| --- | ---: |
| Nuevo original externo | 72.214.136 |
| Fuente reparada y animada | 74.392.252 |
| GLB final de ejecución | **4.928.152** |

Reducción de descarga del **93,18 %** frente al nuevo original. Geometría y animaciones Meshopt sin pérdida; albedo 8192→2048 y normal 4096→2048 en WebP. Normal reducido sin pérdida, albedo con PSNR de 40,13 dB. La fuente de trabajo conserva las imágenes originales. El donante permanece en el repositorio como procedencia y se excluye del paquete final.

Recurso activo: `3e2578a28b4005dc4a25f0cfecc8e2ee3aafb8eee75bfc2ccb9c2216c714b36d.glb`. La clave histórica `source` del catálogo se conserva; `geometrySource` apunta a la nueva geometría.

## Evidencias

- [Vídeo de las seis animaciones](buffalo-animations.mp4): 46,07 s, 1280×720, 30 fps; marcha, carrera, cuatro ataques completos, día/noche y vistas traseras. [Secuencia y procedencia](video.json).
- [Pies originales inclinados](feet-before.png), [perfil izquierdo](feet-left-0.2.jpg), [perfil derecho](feet-right-0.7.jpg) y [datos de los cuatro primeros planos](feet-captures.json).
- [Informe Blender](repair.json), [auditoría de apoyo y animación](animation-audit.json), [validación final](validation.json) y [50 capturas integradas](captures.json).
- [Sabana](sabana-front-Walking.jpg), [Gran Río](gran-rio-front-Walking.jpg), [Manglares](manglares-front-Walking.jpg), [Volcanes](volcanes-front-Walking.jpg), [Gran Cañón](gran-canon-front-Walking.jpg) y [Desierto](desierto-front-Walking.jpg).
- [Incursión real](native-raid.json): movimiento, ataque y primer daño al centro de 600→565, sin nuevas descargas ni programas GPU del animal durante aparición/ataque. [Captura](native-raid.jpg).

107 pruebas dirigidas, compilación Vite, paquete e integridad aprobados. glTF sin errores, geometría y animaciones idénticas byte a byte después de descomprimir. Revisión en Chrome de escritorio; las capturas y el vídeo determinista no son una medición de FPS móvil.

## Reproducción

```powershell
& $buffaloBlender -b --python-exit-code 1 --python tools/prepare_buffalo.py -- --input 'C:\Users\PC\Desktop\Wild Guardians New\animales\búfalo.glb' --output $buffaloOutput --report docs/qa/buffalo-replacement/repair.json
node tools/install_beast.mjs buffalo $buffaloOutput
node tools/compress_web_assets.mjs <nombre-impreso.glb>
node tools/calibrate_animal_actions.mjs
node tools/calibrate_footsteps.mjs
node tools/audit_beast_replacement.mjs buffalo
node tools/verify_web_assets.mjs <nombre-impreso.glb>
```

`--blend-dir` guarda también una copia editable. La receta anatómica se limita a este modelo. El instalador conserva otros animales y elimina únicamente la sustitución generada anterior.

Con Vite iniciado, `tests/browser/beast-replacement.html?species=buffalo&biome=sabana` permite revisar los clips. Los comandos `node tools/capture_beast_replacement.mjs buffalo`, `node tools/capture_beast_feet.mjs buffalo` y `node tools/render_beast_video.mjs buffalo` generan las evidencias, con Playwright/Chrome y FFmpeg disponibles. `WG_QA_URL` permite seleccionar servidor.
