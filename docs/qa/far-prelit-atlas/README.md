# Atlas de acacia precocinado — día/noche

Experimento solicitado el 6 de octubre. Ocho vistas por fase, 256×256, transparencia, base y encuadre idénticos al atlas original. Baker: `tests/browser/far-vegetation-atlas.html?bake=day` y `?bake=night`. Usa material original y AfricanToon, luz en [-30,55,25], orientación del árbol 0, uNight 0/1. No hornea sombras de otros objetos ni genera texturas durante gameplay.

Visor: `tests/browser/far-vegetation-transition.html?lighting=real&prelit=1`. El brazo precocinado omite artLighting y normales; conserva selección/mezcla angular, dithering, instancing y fog. Solo lee la fase necesaria en extremos; en transición mezcla ambas texturas en espacio lineal. La receta artística calculada sigue disponible mediante botón para A/B. No se ha integrado en gameplay.

WebP sin pérdida en píxeles visibles y alpha: día 268104 bytes, noche 227358 bytes, total 495462 bytes (484 KiB). No confundir peso comprimido con memoria GPU: dos RGBA 2048×256 con mipmaps rondan 5.33 MiB, sin contar texturas del modelo ni atlas de comparación. Alpha de ambas fases idéntico. Bakers GL 0 y consola vacía.

Capturas `day-model`, `day-impostor`, `night-model`, `night-impostor`: un árbol yaw 0, cámara [0,14,50]. `twilight-rotated`: 1008 árboles con giros diferentes, fase atardecer uNight 0.5, cámara girada 22.5°. Reportes adjuntos: GL 0, sin normales cargadas. No prueban identidad pixel a pixel ni ausencia de saltos en toda trayectoria.

GPU nativa: 8 lotes alternados, 1008 impostores, cámara fija, mediodía, 1280×720 DPR1, 45 warmup + 180 frames/lote, 2 calls y 2018 triángulos. `summary.json` y datos completos adjuntos. Todas las medianas precocinadas son menores que las calculadas en este ensayo; hay picos y deriva importantes. No extrapolar porcentaje a FPS del juego ni a móvil. No se midió coste GPU de crepúsculo (doble fase) ni RAM física.

Limitaciones: luz horneada se rota con orientación procedural y no sigue exactamente sol global; perspectiva y elevación difieren del atlas ortográfico horizontal; mezcla entre extremos no reproduce necesariamente grading intermedio no lineal. Revisar esas diferencias en la banda 3D/2D y con bruma antes de elegir ruta definitiva. Un shader básico sigue siendo necesario para proyectar billboard, leer texturas y aplicar fog/fade; no ejecuta cel shading por fragmento en el brazo precocinado.

28 pruebas de matemáticas, región, worker y streaming pasaron (2625.76 ms). No son prueba visual ni compilación completa del juego. Fuentes comprimidas/hashes adjuntos corresponden al ensayo GPU; no hubo cambios ni builds durante sus lotes.
