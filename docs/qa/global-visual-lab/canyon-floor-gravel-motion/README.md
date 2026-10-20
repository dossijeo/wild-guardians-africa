# Grava del Cañón: aproximación sobre suelo visible

288 capturas finales,144 parejas A/B, media/baja y día/noche.36 posiciones desde altura5m a2m sobre el objetivo; ambos usan escala original0,20 frente candidata0,08, iluminación global y suelo cálido. Semilla712,1280×720. Cámara, objetivo, hora, draw calls y triángulos coinciden en todas las parejas; cero errores JS/WebGL.

Vídeos [media día](media-day.mp4), [media noche](media-night.mp4), [baja día](baja-day.mp4), [baja noche](baja-night.mp4): izquierda original, derecha candidata.36frames a12fps,3s. Son recorridos por pasos con espera de chunks; no miden FPS real, frametime ni estabilidad temporal a60fps. Las vistas `*-pair.webp` muestran inicio/centro/final.

## Corrección del encuadre

El primer piloto usó posiciones de objetos renderizados y acabó con un edificio delante del suelo. Se excluye como evidencia de primer plano; sus JSON se conservan en pilot-occluded. La captura final consulta las huellas existentes de obstáculos solo para colocar la cámara QA: candidatos secos, baja pendiente y puntos de objetivo/cámara alejados9m de sus vértices. La captura final inspeccionada sí muestra suelo cercano y orilla sin edificio bloqueando. No se modifican navegación, edificios ni terreno.

## Lectura artística

Las piedras mayores son legibles en sol y sombra y conservan la paleta cálida. La cámara cercana muestra también el límite: la silueta sigue plana y el material ampliado puede parecer grava impresa, especialmente en baja nocturna. El cambio de escala no crea acumulaciones ni relieve mesoscópico. Las poses revisadas no muestran nuevas costuras grandes; no certifican ausencia de aliasing fino o repetición durante juego a60fps.

**Estado:** mantener como candidata de legibilidad, sin integrar ni aumentar más la escala. Falta coste en presupuesto combinado. El siguiente pase global debe contrastarla con los otros biomas y priorizar estructura mayor del suelo donde sea visible, en vez de sumar más rondas equivalentes de capturas de esta textura.

Reproducir con Vite5190: `node tools/experiments/capture-canyon-floor-gravel-motion.mjs`, `python tools/experiments/package-canyon-floor-gravel-motion.py`. El empaquetador exige ambos perfiles y genera los vídeos con FFmpeg. Las rutas PNG quedan en captures.json y se regeneran con el capturador; las comparativas y vídeos están versionados.
