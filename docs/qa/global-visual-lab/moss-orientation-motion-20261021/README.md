# Musgo: cambios de perspectiva

Candidata de dos orientaciones frente al original, semilla 712, media, 1280x720, 24 posiciones desde cámara normal hasta elevada, día y noche. 48 parejas verificadas: cámara, objetivo, hora, draw calls y triángulos iguales; cero errores. No modifica modelos ni simulación.

[Vídeo diurno](media-day.mp4) · [Vídeo nocturno](media-night.mp4). Control izquierda, candidata derecha. Son secuencias de capturas con chunks asentados, codificadas a 12 fps (2 segundos); esa frecuencia no es el rendimiento del juego.

[Contacto diurno](media-day-contact.webp) y [pareja nocturna intermedia](media-night-011-pair.webp) revisados: el volumen y la paleta se conservan al elevar la cámara, con menos filas perceptibles. Todavía hay regularidad y falta agrupación macro natural. No se certifica ausencia de shimmering: faltan una secuencia más densa en tiempo real, desplazamientos de origen y streaming continuo. Tampoco se ha aislado cuantitativamente el aliasing temporal del suelo.

Conservar candidata y original. Este pase amplía la evidencia de perspectiva; no demuestra optimización. Los costes GPU/CPU siguen siendo los del [ABBA estático](../moss-orientations-20261021/README.md), donde el incremento diurno requiere trabajo antes de integrar.

Reproducir con Vite en 5190:

```text
node tools/experiments/capture-moss-orientation-motion-20261021.mjs
python tools/experiments/package-moss-orientation-motion-20261021.py
```

Capturas originales PNG quedan locales; se publican metadatos, seis parejas, hojas de contacto y dos vídeos. El empaquetador verifica correspondencia y 24 frames por vídeo.
