# Gran Río: transición de hierba con cobertura equivalente

Seis parejas reales día/noche, tres cámaras, semilla712,1280×720,media y viento8 congelado en tiempo2. Izquierda original; derecha viento+normales+pigmento LOD. Misma cámara, objetivo, hora, draw calls, triángulos e instancias near/far. Sin errores observados. Módulos originales intactos; atributo adicional1296bytes nominales, sin nuevas muestras de textura.

Revisión visual de las parejas normales día/noche: se conserva cubierta continua, caminos despejados y color del bioma. La respuesta de fibras a media distancia cambia; de noche persiste una lectura oscura. No se certifica una mejora temporal con imágenes estáticas ni equivalencia con el mockup. Conservar candidata QA para movimiento y benchmark específico de Gran Río; no extrapolar el coste medido en Sabana.

- [Normal diurna](day-0-pair.webp)
- [Elevada diurna](day-1-pair.webp)
- [Inversa diurna](day-2-pair.webp)
- [Normal nocturna](night-0-pair.webp)
- [Elevada nocturna](night-1-pair.webp)
- [Inversa nocturna](night-2-pair.webp)

Dos errores de preparación quedaron detectados y conservados: el primer interceptor apuntaba al shader de Sabana; el segundo reemplazaba el parche de paleta/desgaste de Gran Río. La versión final compone explícitamente los tres cambios. Los directorios river-grass-lod-20261021 y river-grass-lod-corrected-20261021 son rondas inválidas, no controles de esta conclusión.

Los tiempos acumulados de build/selection en captures.json son diagnósticos de preparación, no benchmarks por fotograma ni medidas GPU. summary.json contiene diferencias de imagen, no puntuaciones de calidad. Pendientes movimiento y costes A/B/B/A. No integrado por defecto.

```text
node tools/experiments/capture-river-grass-lod-20261021.mjs
python tools/experiments/package-river-grass-lod-20261021.py
```

Vite5190. Archivar salidas antes de repetir para conservar evidencia.
