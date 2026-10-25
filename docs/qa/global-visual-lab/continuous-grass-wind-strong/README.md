# Viento de cobertura C: amplitud 8×

20/10/2026 · Sabana · rama `codex/global-visual-lab`.

Se multiplica por **ocho** la amplitud de flexión del viento de C, incluida su corrección de normales. Se conservan las frecuencias y fases: es una oscilación mucho más amplia, no una animación acelerada. El factor cuadrático de altura mantiene las raíces ancladas. A y B conservan su comportamiento; no se añaden geometría, draw calls, texturas ni pasadas. El juego predeterminado no activa esta herramienta QA.

## Vídeos reales

- [Comparación simultánea: izquierda 1×, derecha 8×](wind-comparison.mp4).
- [Viento nuevo 8×, resolución completa](wind-8x.mp4).
- [Viento anterior 1×](wind-original.mp4).
- [Movimiento de cámara cercana a normal con viento 8×](camera-wind-8x.mp4).

La pareja fija usa semilla 712, cámara `[138,11.400129699707032,49]`, objetivo `[135,9.400129699707032,45]`, hora 150, calidad media y 1280×720. Son 150 fotogramas reales del renderizador a tiempos de shader `i/30`, codificados offline: **no demuestran 30 FPS de ejecución**. El recorrido tiene 120 fotogramas. Metadatos: [wind-video.json](wind-video.json). La composición lateral no altera el contenido de las vistas.

| Intensidad | Instante 0 s | Instante 2,5 s |
|---|---|---|
| Original | [Ver](wind-1-frame-0.webp) | [Ver](wind-1-frame-75.webp) |
| 8× | [Ver](wind-8-frame-0.webp) | [Ver](wind-8-frame-75.webp) |

## Rendimiento

Intel UHD 0x9A60, ANGLE D3D11, Chrome WebGL2, 1280×720. Misma escena y cámara por comparación; secuencia 1/8/8/1 en cada combinación, 30 fotogramas de calentamiento y 120 muestras por bloque. El reloj del viento avanza de forma determinista durante cada bloque. GPU incluye todas las pasadas; CPU mide envío de render, no todo Wild Engine. Medianas agrupadas de los dos bloques por intensidad. Las diferencias negativas no prueban una aceleración: existe variación térmica y temporal.

| Calidad | Cámara | Luz | GPU 1× ms | GPU 8× ms | Diferencia ms | CPU 1× / 8× ms |
|---|---|---|---:|---:|---:|---:|
| media | close | day | 19.165 | 19.838 | +0.673 | 3.20 / 3.20 |
| media | close | night | 20.325 | 20.288 | -0.037 | 3.40 / 3.40 |
| media | game | day | 21.412 | 22.014 | +0.601 | 3.30 / 3.50 |
| media | game | night | 22.786 | 21.791 | -0.996 | 2.90 / 2.90 |
| baja | close | day | 15.089 | 14.415 | -0.674 | 3.00 / 3.00 |
| baja | close | night | 15.519 | 15.076 | -0.442 | 2.85 / 2.90 |
| baja | game | day | 15.337 | 14.773 | -0.564 | 3.10 / 3.10 |
| baja | game | night | 15.322 | 15.774 | +0.452 | 2.95 / 2.90 |

3840 muestras GPU válidas, sin errores WebGL, pérdidas de contexto ni eventos disjoint. Draw calls y triángulos idénticos entre intensidades en todas las combinaciones. Datos completos: [media](benchmarks-media.json), [baja](benchmarks-baja.json). No se ha vuelto a medir overdraw ni VRAM: la flexión puede alterar la cobertura de píxeles, aunque los recursos y la topología son los mismos.

## Evaluación y uso

La excursión lateral y el cambio de orientación son claramente más amplios entre fotogramas. Se retiene 8× como nueva intensidad del prototipo solicitado. Es un viento deliberadamente exagerado: el desplazamiento lateral puede estirar visualmente las hojas y extender sus puntas sobre bordes de exclusión; las raíces siguen respetando las máscaras. No es una simulación elástica que conserve la longitud de cada hoja. Los edificios y las plantas originales no reciben este cambio.

`world.qaContinuousGrass.uniforms.uCoverageWindStrength.value = 8` controla la amplitud (`1` recupera la prueba anterior). Para una sesión interactiva, `world.qaContinuousGrass.timeOverride = null` usa el reloj del mundo; las capturas QA mantienen un reloj explícito reproducible. Solo C habilita viento.

Reproducir: `node tools/experiments/video-continuous-grass-wind-strong.mjs` y `node tools/experiments/measure-continuous-grass-wind-strong.mjs`, con el servidor del worktree en el puerto 5190. Verificados sintaxis JS, diff y compilación real del shader en Intel UHD. Sin integración en main.
