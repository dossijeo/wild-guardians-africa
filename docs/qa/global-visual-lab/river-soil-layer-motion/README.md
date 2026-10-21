# Capa de tierra de Gran Río: cámara, streaming y liberación

Conservar la receta V2 como candidata QA. La muestra de regreso mantiene el emplazamiento del material tras cambios de origen, y las tres texturas nuevas se liberan al cerrar el mundo. No es aprobación de rendimiento ni prueba exhaustiva de fugas; sigue pendiente repetir el benchmark con menor variabilidad.

[Vídeo diurno](media-day.mp4) · [Vídeo nocturno](media-night.mp4) · [Vista oblicua diurna](media-day-0017-pair.webp) · [Vista inversa nocturna](media-night-0035-pair.webp) · [Regreso, calidad media](media-return-pair.webp)

En vídeos y comparativas de cámara: izquierda control, derecha capa de tierra V2. En la comparación de regreso: candidata antes/después de streaming. Videos de 36 capturas a 12 fps (3 s), con paso visual original 1/30: reproducción ralentizada, no FPS de ejecución medidos. Se inspeccionaron fotogramas seleccionados, no reproducción completa.

## Movimiento comparable

288 capturas, 144 parejas: Gran Río semilla 712, 1280×720, baja/media, día 150/noche 350, 36 poses entre normal, oblicua e inversa. Simulación pausada, render automático suspendido durante captura, viento 8 y tiempo 2+i/30. Cámara, objetivo, hora, tiempo de viento, opacidades de obstrucción, llamadas, triángulos y buffers de cobertura coincidentes por pareja. Sin errores registrados ni imágenes vacías; overflow cero.

Instancias cercanas/lejanías: baja 0 / 3.400–5.123; media 2.553–4.966 / 2.178–5.187. La capa no modifica su selección. [Trazas](captures.json), [auditoría](analysis.json), [metadatos de vídeo](video-metadata.json).

## Streaming y recursos

Una vuelta de cinco posiciones por variante y calidad, con desplazamientos de objetivo (0,0), (192,0), (192,192), (0,192), (0,0). Cambios de origen: (0,0), (288,0), (288,192), (96,192), (96,0). Cámara, objetivo y chunks del regreso coinciden con inicio; llamadas y triángulos también coinciden en las trazas. No se mueven entidades simuladas. Se reutiliza el helper visual de vuelta, pese a su nombre histórico volcánico.

Píxeles RGB distintos al regresar: baja control 9.614 / candidata 9.421; media 8.799 / 8.594. Diferencia máxima 39/255 en todos, media de candidata 0,00585/255 baja y 0,00694/255 media. No son capturas exactas ni prueba causal de estabilidad perfecta. La muestra media inspeccionada no muestra desplazamiento amplio de la tierra.

Contadores de candidata durante vuelta: geometrías baja 168→92→91→99→96, media 187→111→113→121→116; texturas baja 54→49→49→52→53, media 56→51→51→54→55. Son objetos, no bytes de VRAM. El control de primera página retiene más texturas al inicio: no inferir ahorro de memoria de esa diferencia.

Después de la vuelta se cierra el mundo mediante su dispose real. En ambas calidades se observan tres texturas de capa, un evento dispose por textura, array de capas vacío y BiomeGround marcado disposed. Prueba una descarga por página; no acredita ausencia de fugas tras muchos ciclos o en el driver. No se mide latencia de streaming ni GPU durante esta captura.

[Resultados del regreso y descarga](streaming-analysis.json). Trazas y eventos individuales en las carpetas `stream-*`.

## Recomendación

Mantener como candidata, sin cambiar valores predeterminados. Siguiente puerta: repetición de coste y evaluación de la forma del desgaste, que sigue siendo amplia. Los seis biomas y la calidad global aún no están acreditados. [Receta, licencia y benchmark previo](../river-soil-layer-v2/README.md).

## Reproducción

Con Vite 5190:

```powershell
node tools/experiments/capture-river-soil-layer-motion.mjs
python tools/experiments/package-river-soil-layer-motion.py
python tools/experiments/audit-river-soil-layer-streaming.py
python tools/experiments/encode-river-soil-layer-motion.py
```

PNG fuente locales; vídeos, tres pares seleccionados, trazas y auditorías publicados. No cambios de producción, navegación, reglas o main.
