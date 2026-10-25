# Sustitución del rinoceronte

Rama `codex/beast-models`. Original externo intacto: `C:\Users\PC\Desktop\Wild Guardians New\animales\rinoceronte.glb`, SHA-256 `5e47e64934d2bf5f6a47b139d7c9e0af9764350ce46685c885bf917ef2c7479c`.

## Resultado

- Plantas corregidas 19.72° y 19.89°, con transición hacia los tobillos y pesos rígidos de `Foot` en la banda inferior. La orientación horizontal y el apoyo permanecen horneados a 96 fps en las seis animaciones. En 774 poses, desviación máxima dentro de una planta **0.00104327 unidades**, con el apoyo a 0,022 del suelo local.
- Cabeza elevada 22° y cuello 5° respecto al eje lateral del torso animado. Se conservan los giros, asentimientos y duraciones de los seis clips. Esta corrección y el resto de los **1.098 canales de animación originales** son idénticos byte a byte respecto a `da18a4159`.
- Se separan **17 piezas traseras** y **60 caras del panel central** del cuerpo: 276 caras de tela con sus UV originales. Se eliminan todas sus influencias de muslos, pantorrillas y pies. Se conservan las superficies originales bajo la tela; no se añade otra malla de piel.
- Faldón sujeto a `Hips` en su borde superior. Quince huesos propios siguen una rejilla continua de 5×9 masas, con gravedad, inercia, restricciones de estiramiento/flexión, límites de forma y contactos radiales con cápsulas animadas de las piernas. La superficie de reposo se curva alrededor de la cadera para permitir el movimiento lateral de las tiras. Se usan transformaciones óseas rígidas, sin escalas heredadas que deformen la tela.
- Simulación **fuera del juego**, horneada en marcha, carrera y cuatro ataques. Marcha/carrera calientan ocho ciclos, promedian los cuatro últimos y filtran circularmente antes de cerrar las curvas. La variación entre ciclos se registra en `repair.json`; no hay simulación en tiempo real ni respuesta a colisiones del escenario.
- Los **13.906 triángulos conservados del cuerpo** mantienen posición y UV respecto a `da18a4159`, comprobadas a 0,000001 unidades. Las normales originales se conservan salvo la reparación de pies. Los 61 huesos originales permanecen, más 15 de tela: 76 en total. Hay dos mallas, cuerpo y faldón.
- La tela flexible queda excluida del apoyo y de la huella rígida de navegación; se recalibran contactos y huella. Se mantiene la [iluminación de bestias aprobada](../beast-lighting/README.md), sin cambios globales.

| Recurso | Bytes |
| --- | ---: |
| Original externo | 107,821,688 |
| Fuente reparada y animada | 48,413,724 |
| GLB final de ejecución | **7,921,396** |

Reducción de descarga del **92.65 %**. Geometría y animaciones Meshopt sin pérdida; albedo y normal a 2048 en WebP. El albedo de la fuente GLB intermedia se reduce de 8K a 4K para respetar el límite del repositorio; el original externo y el Blender editable conservan las imágenes originales. Normal reducido codificado sin pérdida. PSNR comparado contra el GLB intermedio de 4K.

Recurso activo: `39f566d004a817c13c2109867ffb065eb67808cebefd6bc3bfd356893d1cda9a.glb`. Runtime SHA-256 `cb3b3a915db2c74e2050afb50ec014693512aca84c4f094350d72020c1bab40e`. Donante conservado como procedencia y excluido del paquete final.

## Evidencias

- [Vídeo de los seis clips](rhino-animations.mp4), con vistas delanteras/traseras, cuatro ataques completos, marcha/carrera y día/noche. [Secuencia y modelo](video.json).
- Faldones: [antes](cloth-before.jpg), [original sin animar](cloth-source-back.png), [selección inicial del panel y tiras interiores](cloth-selection.png), [18 primeros planos traseros](secondary-captures.json) y [auditoría](cloth-audit.json). La selección final incluye también las tiras laterales posteriores descritas en `repair.json`.
- [Cabeza de perfil](head-profile.jpg), [pies originales inclinados](feet-before.png), [cuatro perfiles de pies](feet-captures.json), [informe Blender](repair.json), [apoyo y mirada](animation-audit.json), [validación final](validation.json).
- [50 capturas en los seis biomas](captures.json): [Sabana](sabana-front-Walking.jpg), [Gran Río](gran-rio-front-Walking.jpg), [Manglares](manglares-front-Walking.jpg), [Volcanes](volcanes-front-Walking.jpg), [Gran Cañón](gran-canon-front-Walking.jpg), [Desierto](desierto-front-Walking.jpg).
- [Incursión real](native-raid.json) y [captura](native-raid.jpg).
- Evidencia histórica de la corrección de cabeza: [antes](head-before.jpg), [mediciones anteriores](head-before-audit.json) y [auditoría del cambio de postura](head-posture-audit.json), correspondiente a `da18a4159`. La auditoría actual de tela verifica que aquella animación sigue intacta.

La auditoría secundaria evalúa 390 poses y perturba únicamente muslos/rodillas: la tela responde **0 unidades**. Se comprueban estiramiento, suelo y cierre de bucles. El motor compartido conserva sus resultados predeterminados para el león: comparación exacta de ambos paneles durante 404 pasos de integración.

108 pruebas dirigidas, compilación Vite, paquete e integridad aprobados. glTF sin errores; geometría/animación idénticas tras descomprimir y PSNR de albedo 37,55 dB respecto al GLB intermedio. Incursión: movimiento, ataque y primer daño 600→540, sin nuevas descargas ni programas GPU del animal. Vídeo de 67,9 s, 1280×720, 30 fps, decodificado completo sin errores.

Revisión visual en Chrome de escritorio. Vídeo determinista y capturas no miden FPS móvil. El faldón no utiliza física en tiempo real.

## Reproducción

```powershell
& $rhinoBlender -b --python-exit-code 1 --python tools/prepare_rhino.py -- --input 'C:\Users\PC\Desktop\Wild Guardians New\animales\rinoceronte.glb' --output $rhinoOutput --report docs/qa/rhino-replacement/repair.json --blend-dir $rhinoEditable
node tools/install_beast.mjs rhino $rhinoOutput
node tools/compress_web_assets.mjs <nombre-impreso.glb>
node tools/calibrate_animal_actions.mjs
node tools/calibrate_footsteps.mjs
node tools/audit_beast_replacement.mjs rhino
node tools/audit_rhino_cloth.mjs
node tools/verify_web_assets.mjs <nombre-impreso.glb>
```

`rhino_cloth_motion.py` contiene selección y rig específicos. Reutiliza las restricciones del solver del león sin cambiar sus valores predeterminados.

Con Vite iniciado, `tests/browser/beast-replacement.html?species=rhino&biome=sabana` permite revisar los clips. `node tools/capture_beast_replacement.mjs rhino`, `node tools/capture_beast_feet.mjs rhino`, `node tools/capture_rhino_secondary.mjs` y `node tools/render_beast_video.mjs rhino` generan las evidencias con Playwright/Chrome y FFmpeg. `WG_QA_URL` selecciona servidor.
