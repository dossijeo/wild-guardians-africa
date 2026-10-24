# Gran Río: paleta con movimiento y cambios de representación

**Conservar como ajuste cromático candidato, no como optimización.** Las muestras mantienen hojas y volumen con una cubierta algo más clara. El borde lejano sigue siendo visible: esta prueba no lo resuelve con color solamente.

- [Vídeo diurno, calidad media](media-day.mp4)
- [Vídeo nocturno, calidad media](media-night.mp4)
- [Vista oblicua diurna](media-day-0017-pair.webp)
- [Vista inversa nocturna](media-night-0035-pair.webp)

Izquierda paleta anterior; derecha paleta alineada con el suelo. Ambos lados conservan el mismo suavizado por desgaste. Los vídeos tienen 36 frames a 12 fps, 3 segundos, verificados con ffprobe. Son capturas codificadas, no FPS medidos: el paso visual fue 1/30 s y la reproducción está ralentizada. Se inspeccionaron fotogramas representativos, no reproducción continua completa.

## Comparación

288 capturas, 144 parejas: semilla 712, 1280 × 720 por variante, baja/media, día 150/noche 350 y 36 posiciones entre vistas normal, oblicua e inversa. Misma cámara, objetivo, hora, viento, opacidades, llamadas, triángulos y cantidades/buffers de hierba en cada pareja. Sin imágenes vacías, errores registrados ni overflow.

El recorrido ejercita selección y LOD: baja, 0 refinados y 3.400–5.123 ligeros; media, 2.553–4.966 refinados y 2.178–5.187 ligeros. No se añade densidad para favorecer la candidata. El reloj de viento es `2+i/30`, intensidad 8. La simulación permanece pausada y se espera la geometría residente antes de leer cada imagen.

[Auditoría](analysis.json) · [Capturas](captures.json)

## Benchmark móvil separado

Intel UHD 0x9A60, ANGLE D3D11, baja, 1280 × 720. Páginas nuevas A/B/B/A, día/noche, calentamiento 30 frames, 120 muestras GPU y después 180 frames de cadencia por bloque. 960 muestras GPU y 1.440 frames de cadencia. Cámara determinista móvil y dt visual fijo; sin capturas durante medición. Se auditaron trazas de cámara, llamadas y triángulos por frame, estado observado de simulación, geometría de cobertura, consultas resueltas y ausencia de errores/disjoints.

Rangos de medias de dos bloques por variante, ms:

| Medida | Anterior | Paleta suelo |
|---|---:|---:|
| GPU día | 10,90–12,04 | 10,74–10,82 |
| GPU noche | 12,08–12,38 | 11,37–11,75 |
| CPU render día | 5,04–5,10 | 4,55–5,00 |
| CPU render noche | 4,75–4,91 | 4,88–5,22 |
| Intervalo p95 día | 29,3–31,3 | 26,7–28,6 |
| Intervalo p95 noche | 25,2–32,0 | 29,9–34,2 |

La GPU es menor en esta serie, pero cambian solo constantes y la prueba estática anterior no mostraba el mismo patrón. No atribuir una aceleración causal a la paleta ni afirmar ausencia de regresiones de frametime: los picos nocturnos no mejoran uniformemente. Dos bloques por variante no son intervalos de confianza. CPU mide render, intervalo no mide presentación y la calidad media no tiene benchmark móvil en esta serie.

La preparación de lotes mantiene 8,728 actualizaciones registradas por frame en todos los bloques. El reporte de cobertura conserva cero consultas de motor y 1.206.456 bytes de atributos/índices; no representa memoria total GPU.

[Datos](performance/benchmarks.json) · [Resumen](performance/summary.json)

## Decisión y límites

El ajuste es apto para una opción de revisión visual, manteniendo la receta anterior disponible. Quedan el cambio de distancia más allá del recorrido, streaming prolongado y otras semillas; no extrapolar a Sabana u otros biomas. La continuidad geométrica/cromática a distancia necesita una decisión propia, no otra subida indiscriminada de brillo.

```powershell
node tools/experiments/capture-river-cover-palette-motion.mjs
python tools/experiments/package-river-cover-palette-motion.py
node tools/experiments/measure-river-cover-palette-motion.mjs
python tools/experiments/audit-river-cover-palette-motion.py
```

Vite en 5190. Codificar las secuencias media A/B con ffmpeg, dos entradas a 12 fps, `hstack`, 36 frames, libx264 CRF 24, yuv420p. PNG y pares no seleccionados permanecen locales. No se modifica main, simulación ni modelos originales.
