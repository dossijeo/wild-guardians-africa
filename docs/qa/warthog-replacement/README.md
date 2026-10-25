# Sustitución del facóquero

Rama `codex/beast-models`, creada desde `origin/main` (`568f3b8ef`). Fuente externa intacta: `C:\Users\PC\Desktop\Wild Guardians New\animales\facóquero.glb`, SHA-256 `4eb0726addd5d15ea9762042b37a74a08123568428c6207e0220c608c1a2a854`.

## Resultado

- Tres aberturas de la melena cerradas con geometría. Cabeza, mandíbula y colmillos tienen pesos rígidos de cabeza para evitar desgarros al mover las extremidades.
- 1.596 vértices geométricos del collar vinculados exclusivamente a `Neck`; 1.458 tenían influencias de extremidades. Se incluye el colgante central.
- Plantas niveladas y orientación de los pies corregida durante el horneado. El pie de apoyo queda a 0,022 unidades del suelo local con el controlador de producción; la variación máxima de altura dentro de una planta es de 0,00101 unidades en 903 poses muestreadas.
- Siete clips transferidos desde el facóquero anterior, conservando nombres, duraciones y eventos lógicos de ataque. Se recalibran huella de navegación y contactos de pasos para la nueva anatomía.
- Cabeza elevada 18° y cuello 5° alrededor del eje lateral animado del torso. La mirada de marcha oscila entre −1,0° y +4,6° respecto al frente de reposo; en carrera, entre +6,1° y +11,8°. Los giros, inclinaciones y anticipaciones de los ataques siguen animados. `restpose` conserva la postura original.
- Normales suaves interpoladas con límite de arista de 55°. Se conservan silueta, aristas mayores y facetas pintadas en el albedo. Se mantiene el renderizador de producción; no se introduce un material Gouraud distinto.
- Ajuste inicial específico del facóquero con reflejo especular reducido y relleno nocturno tenue. Posteriormente se incorpora el [contraste de materiales para las cinco bestias](../beast-lighting/README.md); estas capturas conservan la revisión inicial.

| Recurso | Tamaño |
| --- | ---: |
| Modelo nuevo externo sin preparar | 72.461.032 bytes |
| Fuente reparada y animada de trabajo | 72.728.708 bytes |
| Modelo final de ejecución | **3.957.764 bytes** |
| Modelo anterior de ejecución | 6.927.276 bytes |

Reducción de descarga del 94,54 % respecto al nuevo original y del 42,87 % respecto al modelo anterior optimizado. Geometría Meshopt sin pérdida; 15.711 triángulos frente a 22.447 del anterior. Albedo 8192→2048 y normal 4096→2048, ambos WebP; normal sin pérdida respecto al mapa reducido. El GLB de trabajo conserva PNG originales para revisar y volver a preparar el material. El paquete final incluye solo el GLB comprimido; el donante anterior se conserva en el repositorio como referencia y se excluye del paquete.

Recurso activo: `238fc4b1e01b17b7beb0f2a3e193f11a80d4a4f202fd972d4938531a47ff4d00.glb`. El campo `source` del catálogo conserva la clave histórica de enrutamiento y procedencia de animaciones; `geometrySource` y `replacement` identifican la geometría nueva y su preparación.

## Evidencias

- [Vídeo de todas las animaciones](warthog-animations.mp4): 47,57 s, 1280×720, 30 fps, marcha/carrera y ataques completos de día y de noche, más vista trasera y postura de referencia. [Secuencia y procedencia](video.json). Generador: `tools/render_warthog_video.mjs`, con Playwright y FFmpeg disponibles en el entorno.
- [Reparación de Blender](repair.json).
- [Auditoría de animaciones y pies](animation-audit.json): 129 fases de cada clip, plantas rígidas, apoyo, movimiento de cabeza y pesos de cuello.
- [50 capturas integradas](captures.json): seis biomas, marcha, carrera y cuatro ataques nocturnos; vistas traseras y comparación diurna. Cámara y fase deterministas, semilla 712, 1280×900. Usan `WorldScene` y el controlador de animales de producción con una incursión QA pausada.
- [Incursión real de simulación](native-raid.json): movimiento hasta un objetivo, ataque, primer daño lógico y representación visible. Sin nuevas descargas ni nuevos programas de material del animal en su aparición o ataque. [Captura](native-raid.jpg).
- [Postura anterior](head-before-day.jpg) y [postura corregida con normales suaves](sabana-detail-front-day.jpg).
- [Melena de día](sabana-detail-back-day.jpg), [Sabana nocturna](sabana-front-Walking.jpg), [Manglares](manglares-front-Walking.jpg), [Volcanes](volcanes-front-Walking.jpg), [Gran Río](gran-rio-front-Walking.jpg), [Gran Cañón](gran-canon-front-Walking.jpg), [Desierto](desierto-front-Walking.jpg).

Validación final: 107 pruebas dirigidas aprobadas; compilación Vite y comprobación del paquete aprobadas; integridad de recursos aprobada; glTF validado sin errores y geometría/animaciones byte a byte idénticas tras descomprimir. La comparación de texturas supera 40 dB PSNR. Capturas de Chrome de escritorio; no constituyen una medición de FPS en móviles.

## Reproducción

Desde la raíz de esta rama, con Blender 5.2.2 y las dependencias del proyecto:

```powershell
& $warthogBlender -b -t 6 --python-exit-code 1 --python tools/prepare_warthog.py -- --input 'C:\Users\PC\Desktop\Wild Guardians New\animales\facóquero.glb' --output $warthogOutput --report docs/qa/warthog-replacement/repair.json
node tools/install_warthog.mjs $warthogOutput
# El instalador imprime el nombre SHA-256 del nuevo GLB.
node tools/compress_web_assets.mjs <nombre-impreso.glb>
node tools/calibrate_animal_actions.mjs
node tools/calibrate_footsteps.mjs
node tools/audit_warthog_replacement.mjs
node tools/verify_web_assets.mjs <nombre-impreso.glb>
```

`--blend-dir` permite guardar también `repaired.blend`; `--head-lift` controla la corrección de cabeza, 18° por defecto. La recompresión posterior no altera las animaciones. El instalador elimina únicamente su sustitución generada anterior y mantiene el donante original.

Con Vite iniciado, `tests/browser/warthog-replacement.html?biome=sabana` permite revisar clips, frente, melena y día/noche. `WG_QA_URL` selecciona el servidor para `node tools/capture_warthog_replacement.mjs`. Este comando requiere Playwright accesible al entorno, captura los seis biomas y comprueba después la incursión con movimiento real. `WG_SKIP_VISUAL=1` ejecuta solo esa última comprobación.

El mismo orden de trabajo sirve para los siguientes animales: inspección geométrica y de pesos, reparación específica, retargeting, validación de apoyo, compresión, sustitución de catálogo y calibraciones, y revisión integrada de iluminación. La selección anatómica de esta receta está limitada al facóquero.
