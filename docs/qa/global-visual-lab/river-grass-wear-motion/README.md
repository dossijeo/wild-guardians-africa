# Gran Río: recorrido con viento y frontera de desgaste

144 capturas reales,72 parejas A/B: calidad media, semilla712,1280×720,36 posiciones entre cámara normal y oblicua, día/noche. Viento8 con tiempo2+i/12 idéntico por índice. Todas las parejas conservan cámara, objetivo, hora, tiempo de viento, llamadas, triángulos, instancias cercanas/lejanas y bytes nominales de buffers. Overflow0, errores0.

[Día](day.mp4) / [noche](night.mp4), izquierda original y derecha candidata.36 fotogramas a12fps,3s. Es una secuencia determinista capturada esperando chunks, no una medición de FPS en tiempo real ni una validación de cadencia a60fps. Las vistas `*-pair.webp` permiten revisar inicio, centro y final.

La transición de altura reduce la pared de hojas junto al camino en las poses revisadas, conservando volumen interior y viento. No elimina el contraste cromático entre cobertura y suelo desnudo. El tramado de árboles cercanos aparece en ambos controles; no atribuirlo a este ensayo de hierba.

## Preparación

La receta compartida `river-wear-qa-route.mjs` reemplaza los arrays/map/spread por offsets constantes y un máximo incremental. Interrumpe las ocho muestras cuando ya sabe que el módulo queda excluido; para los aceptados calcula el mismo máximo y altura. Sigue leyendo exclusivamente el terreno visual residente. No modifica navegación, reglas, máscaras ni umbrales de exclusión.

El primer encuadre diurno de candidata coincide exactamente RGB con la preparación anterior. El nocturno presenta407 píxeles diferentes, máximo110 niveles; causa no aislada. No es prueba de equivalencia exacta general. Los deltas y metadata quedan en preparation-parity.json y captures.json. No se ha medido ahorro CPU/GPU de este bucle; no deducirlo de haber eliminado asignaciones.

Reproducir con Vite5190: `node tools/experiments/capture-river-grass-wear-motion.mjs`, después `python tools/experiments/package-river-grass-wear-motion.py`. La captura acepta WG_COVER_QUALITY; el empaquetador actual audita media. FFmpeg: entradas original/candidate `gran-rio-media-<variant>-<phase>/%04d.png`, framerate12, filtro hstack y escala1920:540, H.264CRF18 yuv420p.

**Estado:** candidata QA conservada, no integrada. Siguiente puerta es benchmark intercalado con preparación/selección separadas del render y control de área rasterizada; no presentar una menor altura como optimización a calidad idéntica. El coste combinado de todos los biomas sigue pendiente.
