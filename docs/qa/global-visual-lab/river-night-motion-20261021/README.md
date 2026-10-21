# Gran Río: recorrido con viento e iluminación nocturna

72 parejas reales,36 poses por fase día/noche,semilla712,media,1280×720. Cámara se aleja del objetivo fijo; viento avanza de2 a4.92. Control LOD coherente frente ambiente nocturno fuerte. Vídeos comparison-day.mp4 y comparison-night.mp4: tres segundos a12fps,1280×382. Poses asentadas con espera de chunks; no captura de fluidez en tiempo real.

[Contacto nocturno](contact-night.jpg): la mayor lectura de fibras persiste en cuatro posiciones representativas sin borde luminoso evidente. Conserva cubierta y sombras. No se certifica ausencia de artefactos temporales por haber inspeccionado solo estas poses; vídeos disponibles para revisión completa.

Las72 parejas mantienen cámara,objetivo,hora,viento,llamadas ytriángulos. Near1074–4786,far4685–9810;sin overflow ni errores WebGL. No benchmark en esta secuencia; coste estático documentado en river-night-cost-20261021. Conservar candidata para próxima revisión global, no integrar por defecto aún.

Reproducir capture-river-night-motion-20261021.mjs y package-river-night-motion-20261021.py con Vite5190 yffmpeg. Metadatos de vídeo verificados con ffprobe. PNG regenerables. Objetivo global pendiente.
