# Recorrido de cubierta y LOD de Manglares

72 parejas reales (36 poses día y 36 noche), semilla712, calidad media,1280×720. Control: borde por desgaste. Candidata: además convergencia LOD de geometría/normales/pigmento/viento. Trayectoria de cámara cercana a normal, viento 2→4.9167 segundos. No cambia distribución entre variantes.

[Vídeo día](comparison-day.mp4), [vídeo noche](comparison-night.mp4), [lámina día](contact-day.jpg), [lámina noche](contact-night.jpg). Vídeos a12fps,3segundos,1280×382; ffprobe confirma36frames en ambos. Montaje de poses con chunks asentados, NO captura de cadencia real ni medida FPS/streaming.

Auditoría: cámara,target,hora,tiempo de viento,draw calls,triángulos y near/far iguales por pareja. Near489–2429,far4067–5469: el recorrido ejercita selección de ambos LOD. Cero overflow y errores de página/WebGL. Esto no demuestra por sí solo ausencia de popping o shimmering. Revisión de las láminas: cubierta sigue visible, pierde detalle con distancia y conserva transición de desgaste. No se certifica revisión temporal exhaustiva del vídeo ni equivalencia visual de cada fotograma.

Mantener candidata. Pendientes: streaming real y eventos del mundo, perfil bajo, viento con cámara fija y costeGPU/CPU. El overlay continúa siendo estático, no una integración final. No se atribuye una mejora de FPS a estos vídeos.

Reproducción con Vite5190: node tools/experiments/capture-mangrove-leaf-motion-20261021.mjs; python tools/experiments/package-mangrove-leaf-motion-20261021.py. PNG completos y parejas intermedias regenerables localmente; vídeos,láminas,metadata y auditoría publicados. No cambios en main.
