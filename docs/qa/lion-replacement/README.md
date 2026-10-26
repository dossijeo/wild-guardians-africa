# Sustitución del león

Rama `codex/beast-models`. Original externo intacto: `C:\Users\PC\Desktop\Wild Guardians New\animales\león.glb`, SHA-256 `b985b5b21b23f41866598635adb0a580b8698f53eb4100a8742b9f89891daf75`.

## Reparación y animación

- Se cierran las dos aberturas posteriores de la melena. Se conservan los pesos originales del torso, los hombros y la cabeza para evitar estiramientos al levantar los brazos. Suavizado de normales a 55°.
- Se corrigen las plantas inclinadas unos 26°, con transición hacia los tobillos, y se hornea su orientación horizontal en las seis animaciones a 96 fps. Se conservan sus duraciones y las proporciones del nuevo esqueleto; la transferencia de brazos compensa las poses A/T.
- Marcha y carrera usan IK de dos segmentos con longitudes originales, rodillas hacia delante y trayectorias laterales propias para cada pie en el espacio de la pelvis. Se conserva el avance y la elevación de la zancada, reduciendo al 15 % la oscilación lateral del donante que estrechaba y cruzaba las piernas.
- Los faldones se separan de la superficie fusionada de los muslos. Se reconstruye la piel de debajo con UV y pesos de las superficies cercanas. Los dos paneles se dividen en la línea central y se sujetan a la cintura; doce huesos propios siguen una simulación de dos rejillas con gravedad, inercia, restricciones de tejido y colisiones con las piernas. Una restricción de forma propia de cuero corto limita el desplazamiento a 9 cm en unidades del original y el pliegue hacia arriba a 4 cm, evitando que las colisiones inviertan los paneles. Las transformaciones óseas son rígidas para evitar cizallamiento por escalas heredadas.
- La cola recibe cinco huesos propios, raíz fijada a la pelvis, oscilación con retardo e inercia y corrección de contacto del penacho con el suelo. Ningún vértice de cola o faldón conserva influencias de los muslos.
- Movimiento secundario simulado **fuera del juego** y horneado en los seis clips; no responde en tiempo real a giros o colisiones del escenario. Los bucles promedian las últimas cuatro vueltas simuladas y aplican un filtro circular, con cierre de las transformaciones. La variación física sin filtrar se registra en `repair.json`; no se presenta como convergencia exacta.
- Cola y tela se excluyen del cálculo de apoyo y de la huella corporal de navegación. El material usa la iluminación de bestias previamente aprobada, sin modificar luces globales.

## Tamaño y comprobaciones numéricas

| Recurso | Bytes |
| --- | ---: |
| Original externo | 105.334.576 |
| Fuente reparada y animada | 45,698,076 |
| GLB final de ejecución | **7,163,740** |

Reducción de descarga del **93.20 %**. Recurso activo `a34a6f6146279bf889cb07275ddfda07e7bed2779cdeed82e7d295342b4f8baf.glb`; runtime SHA-256 `a9ab4b03b5fe9ca032952ed9942b05d84a45d1cacc1328b232fbbab7dbe329f4`.

En 774 poses del controlador de producción, diferencia máxima de altura dentro de una planta **0.0003214** y separación mínima entre tobillos **0.289 al caminar / 0.272 al correr**, en unidades del juego. La comprobación de 390 poses adicionales confirma independencia de las piernas: al perturbar únicamente los muslos y las rodillas, la respuesta de cola y faldones es cero. Los extremos de los bucles secundarios coinciden dentro de la precisión de exportación.

## Evidencias

- [Vídeo de las seis animaciones](lion-animations.mp4), con marcha, carrera, cuatro ataques, día/noche y vistas traseras. [Secuencia y modelo](video.json).
- [Informe Blender](repair.json), [apoyo de plantas](animation-audit.json), [auditoría de tela, cola, separación de pies y estiramiento](secondary-audit.json), [validación](validation.json).
- [50 capturas en los seis biomas](captures.json), [cuatro perfiles de pies](feet-captures.json) y [18 vistas posteriores](secondary-captures.json).
- [Sabana](sabana-front-Walking.jpg), [Gran Río](gran-rio-front-Walking.jpg), [Manglares](manglares-front-Walking.jpg), [Volcanes](volcanes-front-Walking.jpg), [Gran Cañón](gran-canon-front-Walking.jpg) y [Desierto](desierto-front-Walking.jpg).
- [Incursión nativa](native-raid.json) y [captura](native-raid.jpg).

La fuente GLB intermedia reduce el albedo de 8K a 4K para respetar el límite de recursos del repositorio; el original externo y la copia Blender editable conservan las texturas originales. El paquete de ejecución utiliza albedo y normales a 2K en WebP y geometría/animaciones Meshopt sin pérdida. La verificación PSNR toma como referencia la fuente GLB intermedia. El donante permanece en el repositorio como procedencia y se excluye del paquete final.

108 pruebas dirigidas, compilación Vite, paquete e integridad aprobados. glTF sin errores; geometría y animaciones idénticas byte a byte tras descomprimir, PSNR de albedo 37,04 dB respecto a la fuente intermedia. Incursión nativa: primer daño 600→560, sin descargas ni programas GPU nuevos del animal. Vídeo de 67,9 s, 1280×720, 30 fps, decodificado completo sin errores.

Las capturas proceden de `WorldScene` y del controlador de animaciones de producción en Chrome de escritorio. El vídeo determinista no mide FPS en móviles.

## Reproducción

```powershell
& $lionBlender -b --python-exit-code 1 --python tools/prepare_lion.py -- --input 'C:\Users\PC\Desktop\Wild Guardians New\animales\león.glb' --output $lionOutput --report docs/qa/lion-replacement/repair.json --blend-dir $lionEditable
node tools/install_beast.mjs lion $lionOutput
node tools/compress_web_assets.mjs <nombre-impreso.glb>
node tools/calibrate_animal_actions.mjs
node tools/calibrate_footsteps.mjs
node tools/audit_beast_replacement.mjs lion
node tools/audit_lion_secondary.mjs
node tools/verify_web_assets.mjs <nombre-impreso.glb>
```

Con Vite iniciado, `tests/browser/beast-replacement.html?species=lion&biome=sabana` permite revisar los clips. Los comandos `node tools/capture_beast_replacement.mjs lion`, `node tools/capture_beast_feet.mjs lion`, `node tools/capture_lion_secondary.mjs` y `node tools/render_beast_video.mjs lion` generan las evidencias con Playwright/Chrome y FFmpeg. `WG_QA_URL` selecciona servidor.
