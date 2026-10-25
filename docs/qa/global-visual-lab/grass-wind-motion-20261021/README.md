# Sabana: cámara y viento al atravesar LOD

Control frente a candidata que atenúa bend y su respuesta normal con lod18–24. Semilla712,media,1280x720,día/noche,viento8.36 poses por fase: cámara se desplaza12 unidades horizontalmente, viento avanza desde2 en pasos1/12.72 parejas verificadas con cámara/objetivo/hora/tiempo de viento/draws/triángulos iguales; cero errores.

[Vídeo día](media-day.mp4) · [Vídeo noche](media-night.mp4). Control izquierda,candidata derecha.36 frames a12fps,3 segundos de reproducción; capturas con carga asentada, no FPS real ni vídeo de streaming continuo. Instancias cercanas2438–3186 y lejanas8118–9300 en ambos: el recorrido cambia selección real. No se sigue una hoja identificada individualmente para aislar cada cruce.

[Hoja de contacto](media-day-contact.webp) revisada: cobertura y paleta conservadas. La revisión de imágenes estáticas no certifica suavidad temporal exhaustiva; los vídeos se publican para evaluación. La corrección elimina el término discontinuo del viento al tender lod a0, pero puede quedar diferencia entre normales base de geometrías. No declarar todo el LOD resuelto ni extender automáticamente a Río.

Conservar candidata QA y viento fuerte cercano. Sin nuevas instancias ni distancia adicional. Coste temporal pendiente; contadores iguales no equivalen a tiempos GPU iguales. No integración ni main.

```text
node tools/experiments/capture-grass-wind-motion-20261021.mjs
python tools/experiments/package-grass-wind-motion-20261021.py
```

Vite5190. PNG locales; vídeos,parejas representativas,contactos y metadatos publicados.
