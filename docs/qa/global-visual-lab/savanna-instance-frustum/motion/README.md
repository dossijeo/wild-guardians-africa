# Frustum por instancia: movimiento y coste de actualización

**No integrar todavía.** La selección conserva la cobertura y reduce trabajo GPU, pero invalidar todos los lotes ante cualquier cambio de cámara aumenta subidas y CPU. Los picos de cadencia no mejoran. Siguiente cambio: separar comprobación de visibilidad de subida de matrices, actualizando buffers solo si cambia la selección o sus matrices de origen.

## Comparación visual

144 capturas reales,72 parejas:36 posiciones interpoladas entre cámara normal, oblicua e inversa, día/noche, Sabana baja, semilla712,1280×720. Cobertura C viento8, tiempo2+i/12. Cada pose espera chunks/horizonte y se renderiza antes de capturar. Cámara, objetivo, hora, viento e instancias de hierba coinciden A/B; sin errores registrados.

70 parejas RGB exactas. Día, pose9:560 píxeles diferentes, máximo183 niveles; pose17:6 píxeles, máximo25. Todas las parejas nocturnas son exactas. El residuo principal se localiza en x1074–1274/y511–719, en la esquina inferior derecha con vegetación y tramado de transparencia de cámara. [Recorte original A/B](day-0009-difference-region.png). La inspección no prueba su causa: no declarar paridad universal ni atribuirlo automáticamente al culling. No aparece una pérdida extensa de modelos en las poses comparadas.

[Vídeo diurno](day-comparison.mp4), [nocturno](night-comparison.mp4). Izquierda original; derecha candidata.36 frames codificados a12fps,3s: **no son FPS de rendimiento**, sino una secuencia de capturas deterministas. La comparación numérica cubre todos los frames; la inspección visual se hizo sobre muestras y el recorte residual.

[Inicio diurno](day-0000-pair.webp), [oblicua](day-0017-pair.webp), [final nocturno](night-0035-pair.webp), [datos de diferencias](comparison.json).

## Benchmark de movimiento independiente

Intel UHD, Chrome headless,WebGL2,1280×720,baja. Ocho bloques ABBA en páginas nuevas, día/noche. Cada bloque mide30 calentamientos +120 muestras GPU y, por separado,30 calentamientos +180 frames sin consultas GPU. Cámara por índice: t=0,5−0,5cos(2πi/180), sobre el mismo recorrido; incluye ida y vuelta. El viento avanza i/30. No hay captura/compresión concurrente.

960 muestras GPU válidas y1.440 frames de cadencia. Auditoría: mismas cámaras por índice y más de60 posiciones distintas, cobertura coincidente, contadores repetibles por variante, sin errores GL ni cambios del subconjunto de estado registrado. Esta serie incluye movimiento continuo entre frames; las capturas anteriores esperan estabilización en cada pose y no sustituyen esta medición.

Rangos de las medias de dos bloques; no intervalos de confianza:

| Medida (ms salvo indicación) | Original | Candidata |
| --- | ---: | ---: |
| GPU día | 15,97–16,87 | 12,30–15,94 |
| GPU noche | 16,29–17,17 | 12,16–13,08 |
| CPU render día | 4,92–5,48 | 5,98–6,84 |
| CPU render noche | 4,78–4,95 | 5,93–6,20 |
| CPU NativeAssetGroups.update día | 1,00–1,15 | 1,36–1,63 |
| CPU NativeAssetGroups.update noche | 0,98–1,04 | 1,38–1,50 |
| Grupos subidos por frame | 11,29–11,40 | 48,19–48,22 |
| Intervalo medio día | 20,69–21,32 | 20,05–20,23 |
| Intervalo medio noche | 20,57–20,64 | 19,25–20,51 |
| p95 intervalo día | 29,3–31,9 | 34,3–35,2 |
| p95 intervalo noche | 30,9–31,7 | 32,8–39,6 |

El tiempo del agrupador forma parte de la CPU de render: no sumarlos. El contador uploads cuenta actualizaciones de grupos, no bytes transferidos ni llamadas GL directas. La reducción GPU no garantiza mejor frame completo; aquí empeoran los p95. Medición de CPU incluye un wrapper de temporización idéntico en A/B.

Limitaciones: dos bloques por condición, frecuencias/cargas externas sin controlar; intervalo entre llamadas no equivale a presentación. No se certifica streaming prolongado ni seis biomas. Estado comprobado: día/hora/elapsed/estructuras/trabajadores/plantas, no todo el mundo. Sin medición fiable de VRAM.

[Resultados completos](../motion-performance/benchmarks.json), [resumen](../motion-performance/summary.json).

## Reproducción

Vite5190; ejecutar en serie:

```powershell
node tools/experiments/capture-savanna-instance-frustum-motion.mjs
python tools/experiments/package-savanna-instance-frustum-motion.py
node tools/experiments/measure-savanna-instance-frustum-motion.mjs
python tools/experiments/audit-savanna-instance-frustum-motion.py
```

Los PNG locales permiten reconstruir vídeos con ffmpeg, patrón day-%04d-pair.png o night-%04d-pair.png, framerate12,libx264,crf18,yuv420p. No codificar mientras se mide. Prototipo solo QA, modelos y reglas intactos.
