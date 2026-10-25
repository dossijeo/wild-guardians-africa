# Secuencia de candidata completa de LOD

Original frente a viento+normales+pigmento convergente. Semilla712,media,1280x720,día/noche,fuerza8.36 poses por fase,cámara recorre12 unidades,viento avanza1/12 por pose.72 parejas con cámara/objetivo/hora/tiempo de viento/draws/triángulos iguales,sin errores.

[Vídeo diurno](media-day.mp4) · [Vídeo nocturno](media-night.mp4). Original izquierda,candidata derecha.36 frames a12fps,3segundos; capturas asentadas,no FPS real ni streaming continuo. Se publica para evaluar la combinación final; no afirmar revisión exhaustiva de suavidad temporal por el mero hecho de generar vídeo.

[Diagnóstico de extremo](../grass-pigment-endpoint-20261021/README.md) demuestra reducción parcial del salto. El [benchmark final](../grass-pigment-lod-20261021/performance/README.md) fue rechazado por consulta GPU imposible; no hay aprobación temporal. Conservar candidata y datos, repetir medición antes de integrar.

Reproducir capture-grass-final-motion-20261021.mjs y package-grass-final-motion-20261021.py en tools/experiments,Vite5190. PNG locales;vídeos,parejas,contactos y metadatos publicados. Main intacta.
