# Evaluación del conjunto frente al musgo puro

Esta comparación reúne la propuesta completa: tres mapas de barro adicionales, máscara contextual, mezcla por altura normalizada, multiplicador de color en luz lineal aproximada, iluminación del barro basada en los parches y omisión de iluminación sin contribución. El control es Moss002 puro, manteniendo la misma mezcla QA de los parches geométricos en ambos lados. No es comparación con una versión sin todas las demás mejoras globales del laboratorio.

[Elevada diurna](manglares-media-day-1-pair.webp) · [Normal nocturna](manglares-media-night-0-pair.webp). Izquierda control, derecha conjunto experimental. Inspeccionadas imágenes completas de la candidata en estas dos vistas.

La distribución es más variada que la alfombra de musgo puro, pero aparecen zonas grandes de barro y bordes muy fragmentados. El material no ofrece todavía el volumen colectivo de la referencia. La iluminación del barro se acerca mejor a los parches que las primeras mezclas, sin demostrar equivalencia completa. Esta comparación no permite atribuir toda diferencia a una única técnica: evalúa el conjunto acumulado.

## Capturas

24 capturas/12 parejas, media/baja, día150/noche350, cámaras normal/elevada/inversa, seed712,1280×720. Cámaras, objetivo, hora, draw calls y triángulos coinciden; sin errores registrados. Conversiones individuales lossless comprobadas contra PNG, pares reducidos publicados. [Registros](captures.json) · [Comparación](comparison.json).

No cambia modelos ni terreno autoritativo. Los mapas de barro son recursos existentes; no se añaden fuentes/licencias externas. La carga crea clones adicionales, cuyo coste de memoria real no se midió aquí. Horizonte, recursos a largo plazo y estabilidad temporal siguen pendientes.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-mangrove-substrate-full.mjs
python tools/experiments/package-mangrove-substrate-full.py
node tools/experiments/measure-mangrove-substrate-full.mjs
python tools/experiments/audit-mangrove-substrate-full.py
```

Variantes exclusivamente QA. Simulación, navegación, reglas y main intactos.

## Decisión: descartar el conjunto para integración

El resultado no justifica el coste en Intel UHD. No seguir afinando umbrales o pequeñas ramas de esta implementación como vía de integración. Se conservan código y evidencia para investigación, sin activar por defecto. Esta decisión sustituye las recomendaciones provisionales de conservar la receta visual/optimización como candidata a integración; sus hallazgos aislados siguen siendo válidos.

Intel UHD0x9A60/ANGLE D3D11, baja,1280×720, ABAB por fase,180 frames de calentamiento y240 muestras por bloque.1.920 consultas GPU válidas y1.920 frames de cadencia; sin disjoint, descartes, pendientes o errores. Geometría y cámara coincidentes por índice. [Datos completos](performance/benchmarks.json) · [Resumen](performance/summary.json).

| Fase | GPU control(ms) | GPU conjunto(ms) | Diferencias B−A(ms) |
|---|---|---|---|
| Día |8.897 /8.654|13.632 /12.323|+4.735 /+3.669|
| Noche |8.961 /9.822|13.583 /13.685|+4.622 /+3.862|

Promedios de bloques: día8.776→12.978ms (+47.9%); noche9.392→13.634ms (+45.2%). Los cuatro pares son desfavorables. No son intervalos de confianza ni prueba en todos los dispositivos, pero constituyen evidencia suficiente para rechazar este coste frente al beneficio observado.

CPU de render: día control4.269/4.441ms y candidata4.335/4.199; noche4.188/4.194 frente4.338/4.607. Subidas de buffers5.4/frame en todos los bloques. Cadencia media18.64–19.58ms y p95 48.9–52.2ms; no demuestra60fps estables. CPU excluye simulación; intervalos no son presentación. No confundir cadencia parecida con coste GPU equivalente.

La evaluación no identifica qué fracción del sobrecoste corresponde a texturas, iluminación, ruido o divergencia. El ahorro nocturno frente al prototipo previo no compensa el coste total frente al original. No comparar medias de distintas series como sustituto de este ABAB directo.

## Lo que se conserva y prioridad siguiente

Conservar el diagnóstico de máscaras nativas, los rangos distintos de altura y la coherencia cromática al compartir iluminación. La transición por altura aporta separación, pero no volumen geométrico. Para reconsiderar esta dirección haría falta una representación sustancialmente más barata y una mejora artística mayor, no otra pequeña calibración de la misma mezcla.

El experimento global continúa: volver a las prioridades de volumen/sombras y cobertura de Sabana, Gran Río y Gran Cañón antes de dedicar más iteraciones a este sustrato de Manglares. No se declara alcanzada la calidad de ninguno de los seis mockups con este ensayo.
