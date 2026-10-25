# Hojas anchas de dos secciones — descartadas

20/10/2026. Modelo propio de Blender, 20 hojas cerradas, 200 triángulos, un material y cero texturas. GLB 19.636 bytes. Cero bordes abiertos/no manifold. Fuente `grass-broad.blend` y generador `tools/experiments/blender-grass-broad.py`. No modifica modelos originales ni usa recursos externos.

La variante reduce geometría, pero se descarta por forma: las hojas anchas con un solo quiebro parecen listones doblados en el encuadre cercano. No supone una mejora artística suficiente frente a los mockups. Continúa el ensayo en [grass-arched](../grass-arched/README.md).

- [Forma anterior](sabana-base-detail-day.png) / [variante descartada](sabana-candidate-detail-day.png).
- 24 capturas de campaña más ocho de detalle, Sabana/Gran Río, día/noche, semilla 712, calidad media, cámaras comparables. La base de las imágenes es `grass-streaming` con el modelo anterior de 360 triángulos.
- Cuatro vídeos y ABBA de campaña: 16 bloques de 180 muestras tras 30 frames de calentamiento. El benchmark compara las matas visibles/ocultas, con ambos estados conservando assets y selección. No compara directamente los dos modelos.

GPU incremental medido: Sabana +0,176 ms día y +0,109 ms noche; Gran Río +0,227/+0,253 ms. Hay variación entre bloques y rondas; no se declara una aceleración respecto al modelo previo. El rechazo es visual, aunque esta ronda temporal sea favorable.

192 instancias equivalen a 38.400 triángulos frente a 69.120 del modelo anterior. En dos capturas de vista general nocturna los contadores recogidos antes de esperar reflejan una diferencia de 26.560, compatible con 166 instancias dibujadas, en lugar de 30.720. No se usan para afirmar una población estable de 192. El runner se corrigió antes de las capturas finales de la variante arqueada, donde también se observa selección de 166 matas en esas vistas. `comparison.json` conserva los valores observados y las coincidencias de cámara/hora/población declarada. No hubo errores de página/HTTP en las capturas.
