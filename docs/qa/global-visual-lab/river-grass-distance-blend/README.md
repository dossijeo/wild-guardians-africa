# Gran Río: transición por distancia

24 capturas reales,12 parejas: semilla712, media/baja, tres cámaras, día/noche; cobertura C viento8 congelado en tiempo2. Original y candidata usan iluminación global. La candidata amplía la reducción geométrica final: comienza entre far−28 y far−18 según el valor existente meso/humedad del módulo y acaba en el mismo far (48m media,40m baja). No añade instancias, mapas, alpha blending ni descarte fragmentario.

Auditoría en comparison.json: cámara/tiempo/draws/triángulos, buffers e instancias cercanas/lejanas iguales en todas las parejas; overflow0 y errores0. Vista normal media:66draws,869817triángulos,4147instancias cercanas y5187lejanas. Los números de píxeles distintos son diagnósticos, no prueba de calidad.

**Resultado:** suaviza parcialmente el cambio lejano, pero reduce volumen medio y deja casi intacto el corte cercano junto al claro/camino. No seleccionada para integración ni benchmark: no resuelve el defecto dominante. El shader contiene ambas curvas para comparar mediante uniforme; no se interpreta como coste definitivo. Investigar el umbral de desgaste por separado.

Izquierda original, derecha candidata en `*-pair.webp`; individuales WebP sin pérdida verificados contraPNG. Reproducir con Vite5190: `node tools/experiments/capture-river-grass-distance-blend.mjs` y `python tools/experiments/package-river-grass-distance-blend.py`. No hay benchmark GPU en este ensayo visual.
