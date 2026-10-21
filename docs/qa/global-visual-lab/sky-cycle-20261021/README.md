# Cielo: secuencias de amanecer y anochecer

96 capturas reales de Sabana, semilla 712, media, 1280×720. Original izquierda y candidato derecha. Cámara y viento fijos. Cada variante recorre 24 estados de anochecer (día 1, tiempo 299.8 a 302) y amanecer (día 2, tiempo 0 a 2.2). Se ensamblan vídeos de dos segundos a 12 fps a partir de estados asentados; no son capturas de fluidez en tiempo real.

48 parejas coinciden en cámara, objetivo, hora y triángulos. 47 coinciden en draw calls; amanecer, frame 2: 73 original frente a 72 candidato. Causa no determinada; conservar discrepancia en audit.json. Sin errores WebGL/consola registrados. No certificar equivalencia total de esa pareja.

Revisión visual de cuatro estados por secuencia en las hojas WebP: la progresión mantiene azul más limpio y noche menos marrón, sin dominante extraña visible en estos estados. No se ha inspeccionado reproducción continua del vídeo: no afirmar ausencia de parpadeos en todos los frames. La rápida evolución corresponde al reloj original del cielo. Mantener candidata, sin integración por defecto.

El benchmark se aplaza: la comprobación previa sky-cost-20261021/preflight.json detectó otra prueba usando el motor 3D al 80–88 %. No se detuvo ese proceso ni se ejecutó un benchmark contaminado. Scripts ABBA preparados y comprobados sintácticamente; falta ejecución y resultados CPU/GPU. Ninguna mejora de FPS atribuida.

Reproducir: node tools/experiments/capture-sky-cycle-20261021.mjs y python tools/experiments/package-sky-cycle-20261021.py, con Vite 5190 y ffmpeg en C:/ffmpeg/bin. PNG regenerables; metadatos, vídeos y hojas publicados.
