# Sabana: coherencia del viento durante LOD

Inspección de qa-continuous-grass.js: geometría refinada se interpola entre18 y24 unidades hasta flatPosition, mientras bend y modificación de normal usan uCoverageRefined sin ese factor. Al pasar al lote lejano uCoverageRefined pasa a0. Hay una discontinuidad de las expresiones de viento en el límite.

Ruta QA multiplica bend y modificación de normal por el lod existente. Hasta18 unidades conserva toda la fuerza8 aprobada; entre18 y24 se atenúa gradualmente; no aumenta distancia48, densidad, instancias, muestras ni triángulos. No modifica modelos originales ni simulación. Es candidata de coherencia temporal, no solución completa de la transición hacia textura lejana.

12 capturas reales,semilla712,media,1280x720,tres cámaras,día150/noche350,viento congelado en tiempo2. Seis parejas con cámara/hora/draws/triángulos iguales,sin errores. [Día normal](day-0-pair.webp), [noche normal](night-0-pair.webp). Control izquierda,candidata derecha. Vista diurna revisada conserva cobertura/calidez; cambia orientación y respuesta en franja intermedia. Diferencia estática no demuestra por sí sola transición temporal mejorada.

Conservar candidata para prueba de cámara que cruce18–24 y vídeo con viento animado. Falta medir coste; dos multiplicaciones añadidas no justifican afirmar coste cero. No se promueve ni se reduce globalmente el viento. El resto del material y el lote lejano permanecen como control.

```text
node tools/experiments/capture-grass-wind-lod-20261021.mjs
python tools/experiments/package-grass-wind-lod-20261021.py
```

Vite5190. PNG locales,parejas/metadatos publicados.
