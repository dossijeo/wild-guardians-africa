# Vídeos deterministas de ocultación cercana

[Vídeo diurno](day-comparison.mp4) · [Vídeo nocturno](night-comparison.mp4)

Izquierda: tramado original. Derecha: fundido de superficie cercana con profundidad estándar.90 fotogramas a30fps,3s por vídeo, verificados con ffprobe. Son capturas del juego codificadas con ese ritmo: **no representan FPS medidos de ejecución**. Coste medido previamente en [profundidad auxiliar](../obstruction-depth-only/README.md) y [fundido frente a original](../obstruction-surface-blend/README.md).

## Comparación controlada

Sabana baja,semilla712,1280×720 por variante, día150/noche350. Cámara entre vistas normal/oblicua/inversa, cobertura C viento8, reloj de viento2+i/30. Simulación pausada. Al inicio se fija el mismo estado de ocultación; durante la secuencia evoluciona con dt1/30. El render automático del mundo se suspende durante captura y se restaura al acabar cada fase; cada frame se dibuja manualmente una vez y se lee sin esperar después del draw.

360 capturas,180 parejas. Auditoría de cámara/objetivo/hora/viento, instancias de hierba y **lista completa de IDs/valores de opacidad de instancias afectadas**, coincidentes A/B por frame. No se exige igualdad de draws porque la candidata añade profundidad auxiliar. Sin errores GL registrados ni imágenes vacías.119 pares RGB exactos; los otros61 contienen diferencias de representación. Máximo3 instancias parcialmente ocultas y4 draws adicionales en este recorrido.

La diferencia de color no prueba por sí sola suavidad ni calidad. En las muestras inspeccionadas, el fundido elimina la cuadrícula y conserva legibilidad del fondo; permanece una silueta translúcida en fases intermedias. No se declara aprobación global ni ausencia de artefactos temporales en todas las situaciones. La inspección visual del agente se hizo sobre fotogramas, no reproducción continua del vídeo.

[Fase intermedia diurna](day-0030-pair.webp), [desaparición](day-0045-pair.webp), [salida](day-0060-pair.webp), [noche](night-0030-pair.webp). [Trazas de pose/opacidad](captures.json), [comparación](comparison.json).

## Corrección del capturador

El primer intento esperaba una importación asíncrona de diagnóstico después de dibujar y antes de leer el canvas. Se detectaron148 imágenes vacías sin error GL: la ausencia de errores de API no basta para validar una captura. Se movió esa importación antes del draw, dejando dibujo/lectura síncronos, y se añadió una comprobación de contenido para cada PNG. La serie final no contiene ese fallo.

[Metadatos del piloto](pilot-async-readback/captures.json), [índices vacíos](pilot-async-readback/empty-frames.json) y [comparación inválida](pilot-async-readback/comparison.json) quedan excluidos de los resultados. Los vídeos publicados se reconstruyeron exclusivamente con la serie corregida.

## Recomendación y límites

**Recomendación sustituida: no integrar esta variante.** La [prueba posterior de transparencias](../obstruction-transparent-probe/README.md) demuestra que su profundidad auxiliar bloquea elementos que deberían verse a través del objeto. Conservar los vídeos como evidencia del prototipo descartado. El fundido usa la profundidad de la superficie parcial más cercana y no resuelve composición general de capas transparentes. Priorizar una escena con agua/partículas y varios objetos parcialmente ocultos, además de descargar/recrear lotes. Impostores desactivados: no extrapolar esta prueba a su transición con modelos3D. No se cambian modelos ni simulación; main intacto.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-obstruction-fade-motion.mjs
python tools/experiments/package-obstruction-fade-motion.py
```

Codificar las secuencias originales base/combined con ffmpeg: ambas entradas a30fps, filtro hstack=inputs=2,90 frames,libx264,crf20,yuv420p. Ejecutar de día y de noche. No mezclar captura/codificación con benchmarks. Los PNG individuales permanecen locales; se publican vídeos, diez pares WebP y trazas completas.
