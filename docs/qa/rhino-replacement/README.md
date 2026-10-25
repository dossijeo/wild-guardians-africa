# Sustitución del rinoceronte

Rama `codex/beast-models`. Original externo intacto: `C:\Users\PC\Desktop\Wild Guardians New\animales\rinoceronte.glb`, SHA-256 `5e47e64934d2bf5f6a47b139d7c9e0af9764350ce46685c885bf917ef2c7479c`.

## Resultado

- Corrección de las plantas inclinadas 19.72° y 19.89°, rotando cada pie alrededor de su tobillo con transición hacia la parte superior. La banda inferior de talón y dedos se aplana y queda ligada únicamente a su hueso `Foot`; así se eliminan las influencias residuales de pantorrilla que doblaban el apoyo durante la marcha.
- Orientación horizontal y contacto horneados en las seis animaciones a 96 fps, conservando sus duraciones. En 774 poses del controlador de producción, la diferencia máxima de altura dentro de una planta es **0.00104327 unidades** y el pie de apoyo permanece a 0,022 del suelo local, dentro de la precisión numérica del controlador.
- Animaciones transferidas desde el rinoceronte anterior, con compensación A/T en brazos y manos. Se conservan las longitudes del nuevo esqueleto y la jerarquía de sus 61 huesos. Cabeza y cuello mantienen el movimiento nativo, sin corrección anatómica adicional.
- Topología, UV y materiales conservados: 17.125 vértices importados, 14.182 caras. Las posiciones fuera de los pies permanecen idénticas antes de la normalización uniforme a la altura de 3 unidades utilizada por el rinoceronte anterior. Las normales originales se rotan con la reparación de los pies y se conservan en el resto del cuerpo.
- Se recalibran la huella y los contactos de pasos. Se mantiene la [iluminación de bestias aprobada](../beast-lighting/README.md), sin cambios de luces globales.

| Recurso | Bytes |
| --- | ---: |
| Original externo | 107,821,688 |
| Fuente reparada y animada | 47,833,372 |
| GLB final de ejecución | **7,407,908** |

Reducción de descarga del **93.13 %**. Geometría y animaciones Meshopt sin pérdida; texturas finales de albedo y normal a 2048 en WebP. El albedo de la fuente GLB intermedia se reduce de 8K a 4K para respetar el límite de recursos del repositorio; el original externo y el Blender editable conservan las imágenes originales. La normal reducida se codifica sin pérdida. La comprobación PSNR compara contra la fuente GLB intermedia de 4K.

Recurso activo: `7800dcc879caf848db0b22c48c2e2f89cba937642ec3ea0fab60c88a8ab6d093.glb`. Runtime SHA-256 `803395f39559f40332ad5103559c0ef58276143e5646a9ce0f3dfe270a732f4a`. El donante queda en el repositorio como procedencia y se excluye del paquete final.

## Evidencias

- [Vídeo de las seis animaciones](rhino-animations.mp4), con marcha, carrera, cuatro ataques, día/noche y vistas traseras. [Secuencia y procedencia](video.json).
- [Pies originales inclinados](feet-before.png), [perfil izquierdo](feet-left-0.2.jpg), [perfil derecho](feet-right-0.7.jpg) y [datos de los cuatro primeros planos](feet-captures.json).
- [Informe Blender](repair.json), [auditoría de apoyo](animation-audit.json), [validación final](validation.json) y [50 capturas integradas](captures.json).
- [Sabana](sabana-front-Walking.jpg), [Gran Río](gran-rio-front-Walking.jpg), [Manglares](manglares-front-Walking.jpg), [Volcanes](volcanes-front-Walking.jpg), [Gran Cañón](gran-canon-front-Walking.jpg) y [Desierto](desierto-front-Walking.jpg).
- [Incursión nativa](native-raid.json) y [captura](native-raid.jpg).

108 pruebas dirigidas, compilación Vite, paquete e integridad aprobados. glTF sin errores, geometría y animaciones idénticas byte a byte tras descomprimir; PSNR de albedo 37,55 dB respecto a la fuente intermedia. Incursión nativa: movimiento, ataque y primer daño 600→540, sin descargas ni programas GPU nuevos del animal. Vídeo de 46,07 s, 1280×720, 30 fps, decodificado completo sin errores.

Revisión en Chrome de escritorio; las capturas y el vídeo determinista no son una medición de FPS móvil.

## Reproducción

```powershell
& $rhinoBlender -b --python-exit-code 1 --python tools/prepare_rhino.py -- --input 'C:\Users\PC\Desktop\Wild Guardians New\animales\rinoceronte.glb' --output $rhinoOutput --report docs/qa/rhino-replacement/repair.json --blend-dir $rhinoEditable
node tools/install_beast.mjs rhino $rhinoOutput
node tools/compress_web_assets.mjs <nombre-impreso.glb>
node tools/calibrate_animal_actions.mjs
node tools/calibrate_footsteps.mjs
node tools/audit_beast_replacement.mjs rhino
node tools/verify_web_assets.mjs <nombre-impreso.glb>
```

Con Vite iniciado, `tests/browser/beast-replacement.html?species=rhino&biome=sabana` permite revisar los clips. `node tools/capture_beast_replacement.mjs rhino`, `node tools/capture_beast_feet.mjs rhino` y `node tools/render_beast_video.mjs rhino` generan las evidencias con Playwright/Chrome y FFmpeg. `WG_QA_URL` selecciona servidor.
