# Ablación del desplazamiento POM

Ambas variantes mantienen Rock035 ampliada, normales, ceniza por altura e iluminación. A:relief0,44;B:0. La marcha del shader sigue ejecutándose en B con rayo cero: se anula desplazamiento, no se mide ahorro de eliminar el algoritmo.

Doce capturas con cámara/hora/draws/triángulos iguales, sin erroresGL/página. La vista cercana sin desplazamiento reduce franjas escalonadas, pero pierde profundidad aparente. Líneas del material continúan presentes, por lo que no se atribuye todo el patrón al POM. Mantener esta ablación como diagnóstico, no sustituir la candidata por una versión plana.

[Vista cercana](day-1-pair.webp), [datos](captures.json), [diferencias](comparison.json). Reproducir capture-volcanic-pom-ablation.mjs, Vite5190. Siguiente ensayo: refinamiento de intersección conservando ocho lecturas máximas.
