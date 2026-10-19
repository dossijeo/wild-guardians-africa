# Cojines de hierba cerrada en Blender — no adoptar

Ensayo del 20/10/2026. Autoría propia con 33 hojas de sección triangular, cinco núcleos de altura desigual, 330 triángulos, un material opaco FrontSide, color de vértice y cero texturas. GLB de 31.860 bytes y fuente `.blend` editable. No se usan planos cruzados ni assets externos; no se sustituyen modelos originales.

La integración QA reutiliza la densidad, semilla, exclusiones de cultivos/edificios, suelo y agua del piloto anterior, con escala directa de la mata. 458 instancias en los chunks residentes. Ocho capturas reales, cámara de fixture y baja, día/noche, contra el relleno local sin matas.

Resultado: demasiado sutil a distancia normal; los filamentos se pierden en la frecuencia del tapiz. La vista baja tampoco muestra una mejora global suficiente. No aumentar densidad para ocultar este problema ni declarar que la mera existencia del GLB resuelve la vegetación.

Coste: +1 draw y +151.140 triángulos en ambas cámaras, sin mapas nuevos. El agrupador heredado dibuja todas las instancias residentes sin culling por chunk; no se presenta como arquitectura final. No ejecutar ABBA GPU para promover una variante que ya falla el criterio visual. Coste GPU, carga y VRAM no medidos.

La candidata carga sin errores. La referencia registra un 404 sin URL de consola; no atribuirlo a un asset concreto. Los originales y la simulación permanecen intactos. El instalador es QA, sin observación completa de cambios de ocupación; no validado para campaña dinámica.

Siguiente dirección: resolver conjuntamente escala visual del suelo y agrupaciones de vegetación visibles, con culling por chunk, antes de añadir más geometría fina. Evitar otra ronda de matas minúsculas sobre el mismo tapiz.
