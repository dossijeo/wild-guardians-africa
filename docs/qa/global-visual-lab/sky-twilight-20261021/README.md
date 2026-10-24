# Cielo durante la transición nocturna

30 capturas reales de Sabana, semilla 712, media, 1280×720. Original a la izquierda y candidato sky-horizon-cloud-mask a la derecha. Tres cámaras bajas, cinco niveles de mezcla: 0, 0.25, 0.5, 0.75 y 1. Los tiempos intermedios invierten la fórmula skyNight del renderer: 300-log(1-alpha)/2.4. Día y noche usan 150 y 350.

Las quince parejas coinciden en cámara, objetivo, hora, triángulos y draw calls. No se capturaron errores WebGL ni de consola. La pareja nocturna de pose 2 coincide ahora en 68 calls en ambos lados; la discrepancia del pase de seis biomas no se reproduce, pero esta repetición no identifica su causa.

Inspección de comparison-1.webp: el azul se oscurece sin una dominante extraña en los niveles muestreados. Mantiene la calidez del escenario; las nubes se desvanecen conforme entra el panorama nocturno. Conservar la candidata. Esto verifica cinco estados discretos, no continuidad temporal mediante vídeo, ni amanecer, ni todos los ángulos. Tampoco es una medición de rendimiento. La apariencia celeste sigue compartida entre biomas y no constituye todavía un rediseño completo de nubes y atmósfera.

Reproducir con Vite 5190: node tools/experiments/capture-sky-twilight-20261021.mjs y python tools/experiments/package-sky-twilight-20261021.py. No cambia valores predeterminados ni main. Próximo paso: evaluar coste GPU y decidir incorporación optativa al laboratorio global.
