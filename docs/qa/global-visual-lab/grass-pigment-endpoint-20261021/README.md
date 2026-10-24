# Pigmento coherente en el extremo LOD

Control viento+normales frente a candidata que sustituye (root.xz+pos.xz) por (root.xz+pos.xz*lod) al muestrear pigmento. lod1 conserva detalle cercano; lod0 usa raíz del módulo compartida por ambas geometrías. Misma lectura textureLod, sin nuevas instancias o triángulos. Puede reducir variación cromática dentro del módulo lejano: compensación artística a revisar.

Diagnóstico cámara fija,lod0 forzado,radio28,población3153 en cercano y lejano,día/noche.8 capturas,sin errores. MAE entre representaciones pasa0.16458→0.08102 día y0.13081→0.04540 noche: reducciones50.8%/65.3%. Píxeles delta>10 pasan6465→4228 y4086→1529. No es equivalencia exacta ni prueba de calidad global o FPS; topologías y posiciones aún difieren.

[Comparación día](combined-day-pair.webp): cercano aplanado izquierda,lejano derecha. [Cámaras normales](../grass-pigment-lod-20261021/README.md) comprueban otra condición. Conservar candidata; faltan animación y coste del conjunto final.

Reproducir con capture-grass-pigment-endpoint-20261021.mjs y audit-grass-pigment-endpoint-20261021.py en tools/experiments,Vite5190. PNG locales;parejas y metadatos publicados. Solo QA.
