# Volcanes: ambiente frente a oclusión

Tres variantes independientes: original, ambiente nocturno del suelo x1.65, y reducción a la mitad de la atenuación por AO de material en ambiente/reflejos. Ninguna incluye el aumento direccional de la prueba anterior. El término directo y las sombras de contacto se conservan. La receta de ceniza ya suaviza el AO de material.

18 capturas reales, semilla712, media,1280x720, cámaras normal/elevada/inversa y día150/noche350. Cada variante coincide en cámara, objetivo, hora, draw calls y triángulos con el original; sin errores. Las seis comparaciones diurnas son idénticas píxel a píxel.

[Normal nocturna](night-0-triple.webp) · [Elevada nocturna](night-1-triple.webp) · [Inversa nocturna](night-2-triple.webp). Izquierda original, centro ambiente, derecha AO.

La comparación normal revisada favorece el ambiente: se separan mejor depósitos y roca conservando el carácter oscuro. Reducir AO tiene una contribución perceptiva pequeña; no resuelve la lectura por sí solo. Esto no prueba ausencia de oclusión duplicada en otros términos ni autoriza eliminarla. Conservar ambiente x1.65 como candidata para medir y revisar en ciclo completo; mantener original. AO queda como diagnóstico, sin promoción.

| Vista nocturna | Variante | Diferencia media RGB8 |
|---|---|---|
| 0 | ambient | 3.037 |
| 0 | ao | 0.142 |
| 1 | ambient | 4.194 |
| 1 | ao | 0.132 |
| 2 | ambient | 2.082 |
| 2 | ao | 0.124 |

Las diferencias no miden calidad artística. No se añaden muestras de textura, geometría, pasadas ni targets. No hay benchmark temporal de estas variantes todavía: igualdad de draws no prueba igualdad de tiempo GPU. Pendientes coste, transición día/noche, movimiento y consistencia del horizonte. No integrar aún ni declarar objetivo global alcanzado.

```text
node tools/experiments/capture-volcanic-night-components-20261021.mjs
python tools/experiments/package-volcanic-night-components-20261021.py
```

Vite5190. PNG locales; triples WebP y metadatos publicados. Solo modificaciones QA interceptadas en navegador, sin cambios de simulación o modelos.
