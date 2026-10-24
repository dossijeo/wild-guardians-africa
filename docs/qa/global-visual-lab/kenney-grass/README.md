# Hierba CC0 Kenney: descartada para integración

La adaptación ofrece hojas cerradas y volumen real, pero las puntas cuadradas y la lectura de pequeños arbustos no alcanzan las masas finas de los mockups. No se incorpora al renderer. No aumentar densidad para compensar una forma inadecuada.

## Comparación reproducible

WorldScene real, fixture caso 1, semilla 712, calidad media, 1280 × 720, DPR 1. Ocho capturas: referencia global-lighting y candidato, cámara de juego y baja, día 150 y noche 350. Cámara, objetivo y contadores completos en captures.json. La prueba añade únicamente mallas visuales.

| Vista | Matas visibles | Draw calls adicionales | Triángulos adicionales |
| --- | ---: | ---: | ---: |
| Juego, día/noche | 103 | 1 | 52.736 |
| Baja, día/noche | 128 | 1 | 65.536 |

Una geometría adicional, cero texturas adicionales; buffers declarados: 47.864 bytes de geometría y 8.192 de matrices. No son medidas de VRAM física. Sin benchmark temporal CPU/GPU: el candidato se descarta visualmente antes de aprobar rendimiento. Estos contadores no prueban coste despreciable.

- [Antes, cámara baja de día](savanna-global-lighting-low-day.png)
- [Después, cámara baja de día](savanna-kenney-grass-low-day.png)
- [Antes, juego de noche](savanna-global-lighting-game-night.png)
- [Después, juego de noche](savanna-kenney-grass-game-night.png)

## Fuente y límites

[Fuente y licencia CC0](SOURCE.md), original conservado en source/. Blender normaliza, suelda vértices, recalcula normales, añade espesor y gradiente de color. Resultado: 512 triángulos, cero bordes abiertos/no manifold (mesh-audit.json), una superficie no metálica. No se alteran siluetas de modelos originales del juego. Fuente editable kenney-dry-grass.blend y generador tools/experiments/blender-kenney-grass.py.

Culling QA limitado a 128 instancias sobre 2.267 candidatos residentes. No implementa streaming ni actualización de ocupación; distancia de corte abrupta. La referencia registró un 404 sin URL identificada, conservado en captures.json; candidato sin errores registrados. No declarar la sesión completa libre de errores ni extrapolar a otros biomas.

Reproducción: WG_MATERIAL_STUDY=kenney-grass con node tools/experiments/capture-material-study.mjs y servidor de desarrollo en 5190. El asset publicado es solo de investigación, no se carga en la partida normal.
