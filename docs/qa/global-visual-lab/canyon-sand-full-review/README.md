# Cañón: recuperar la comparación artística de la arena completa

Comparación directa de dos recetas conservadas. Izquierda/original: arena normal-only, color medio constante. Derecha/candidate: arena completa con mapa de color y normales. Ambas tienen corrección especular seca, misma distribución, grava.08, modelos y geometría. No es comparación contra grava sin arena ni contra main.

## Resultado visual

Inspeccionadas parejas de primer plano final en calidad media, día y noche: el mapa de color aporta variación superficial fina y menos uniformidad. Las ondulaciones principales siguen presentes en ambas porque comparten normales. No atribuir a la receta completa nuevas siluetas o volumen geométrico. La preferencia desde cámara normal/elevada aún requiere revisión: esta aproximación es cercana.

Conservar la receta completa como alternativa artística válida para optimizar y revisar. La versión económica no se considera un sustituto visual idéntico ni se elige automáticamente por coste. Esto no significa aprobación del usuario de esta variante ni activación por defecto.

[Primer plano día](media-day-035-pair.webp) · [primer plano noche](media-night-035-pair.webp).

Vídeos: [media día](media-day.mp4), [media noche](media-night.mp4), [baja día](baja-day.mp4), [baja noche](baja-night.mp4).36capturas por vídeo,12fps,3segundos,1920×540; fuentes1280×720. Capturas de pasos fijos render1/30, reproducción ralentizada, no FPS reales. Vídeos generados y verificados por metadatos; inspección visual realizada en los fotogramas indicados, no reproducción completa.

## Evidencia y límites

288capturas/144parejas, semilla712, día150/noche350, media/baja. Cámara, objetivo, hora, draw calls y triángulos coinciden en cada pareja; sin errores GL o de página. Una textura de capa en normal-only, dos en completa, comprobado durante cada captura. [Registros](captures.json), [auditoría](comparison.json), [metadatos](video-metadata.json).

No hay benchmark nuevo entre estas dos recetas. El [coste histórico de arena completa](../canyon-sand-dry/moving-performance/README.md) se midió contra grava, no contra normal-only: no usarlo como coste incremental del mapa de color ni restarlo de otra serie. La lectura adicional y la textura son trabajo pendiente de medir; no razón para borrar esta referencia visual.

Próxima revisión: cámara normal/elevada y comparación de costes directa si se propone sustituir la variante integrada. Preservar ambas recetas y las capturas. Main, navegación, simulación y modelos intactos. Calidad global de seis biomas pendiente.

```powershell
node tools/experiments/capture-canyon-sand-full-review.mjs
python tools/experiments/package-canyon-sand-full-review.py
```

Vite5190. Recursos Aerial Beach01 existentes, procedencia CC0 documentada en ensayos anteriores; sin nuevos assets. PNG locales, parejas y vídeos publicados.
