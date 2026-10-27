# Sombras reales de matas arqueadas

Piloto QA: mismas matas cerradas de Blender, mismas posiciones y mismo material, activando castShadow en Sabana, Gran Rio y Gran Canon. No se agregan mapas, planos, geometria nueva ni entidades de simulacion. La malla de 240 triangulos se vuelve a enviar al pase solar cuando este se actualiza.

## Evidencia visual

36 capturas de campana real, semilla 712, calidad media, dia/noche, camaras overview/low/detail. Las 18 parejas coinciden en camara, objetivo, hora, dia, poblacion e instancias; cero errores de captura. Ver comparison-audit.json. La base incluye grass-biomes, no es el juego sin matas.

- Sabana cercana: [antes](sabana-base-detail-day.png), [despues](sabana-candidate-detail-day.png).
- Gran Rio cercano: [antes](gran-rio-base-detail-day.png), [despues](gran-rio-candidate-detail-day.png).
- Canon cercano: [antes](gran-canon-base-detail-day.png), [despues](gran-canon-candidate-detail-day.png).
- Sabana noche: [antes](sabana-base-detail-night.png), [despues](sabana-candidate-detail-night.png).

Aporte pequeno: sombras finas en algunas hojas, sin un apoyo de raiz claramente mejor a escala de juego. En detalle, diferencia RGB media dia/noche de 0,208/0,084 sobre 255 en Sabana, 0,171/0,042 en Rio y 0,012/0,006 en Canon. Estos valores describen diferencia, no calidad. La resolucion y el sesgo del mapa solar son posibles limitantes para hojas bajas, sin diagnostico causal aislado. No reducir globalmente el sesgo sin investigar acne y otros receptores.

## Rendimiento de campana

ABBA en el bucle real, simulacion pausada y camara fija; 30 cuadros de calentamiento y 180 muestras por bloque. Cache solar desactivada en AMBAS variantes para contabilizar su actualizacion cada frame. Las matas permanecen visibles en los dos estados. 24 bloques, 180 consultas GPU validas por bloque, camara estable y sin errores/disjoint.

| Bioma | Fase | Instancias | Base GPU ms | Con sombras GPU ms | Diferencia |
|---|---|---:|---:|---:|---:|
| sabana | day | 192 | 16.539 | 16.564 | +0.025 |
| sabana | night | 192 | 18.490 | 18.565 | +0.075 |
| gran-rio | day | 192 | 16.139 | 16.560 | +0.421 |
| gran-rio | night | 192 | 17.249 | 17.550 | +0.300 |
| gran-canon | day | 21 | 12.839 | 12.691 | -0.148 |
| gran-canon | night | 21 | 13.352 | 13.475 | +0.123 |

Ver campaign-performance.json y performance-summary.json. La diferencia negativa es variacion de medicion, no aceleracion por proyectar sombras. Es un coste incremental con actualizacion forzada, no presupuesto global ni recorrido largo. No se graban videos en este pase.

Los campos calls/triangles de las capturas y del benchmark representan el ultimo pase del renderer: NO cuentan todos los envios de sombras. Los tiempos GPU si envuelven el renderizado completo. shadow-submissions.json aporta una auditoria separada con autoReset=false y cache desactivada, sin modificar las muestras temporales. No presentar los deltas cero de las capturas estaticas como coste cero. Las diferencias de texturas entre cargas independientes tampoco son ahorro atribuible al piloto.

La auditoria de todos los pases confirma +1 draw y +46.080 triangulos para 192 instancias en Sabana/Rio; +1 draw y +5.040 para 21 en Canon, tanto dia como noche. No crea nuevas mallas, pero vuelve a dibujar las existentes en profundidad.

## Decision

No integrar por ahora: el coste incremental medido queda bajo +0,5 ms en esta ronda, pero el beneficio visual es demasiado discreto y Canon practicamente no mejora. Conservar el mecanismo como candidato para futuras formas de mata. La prioridad es una masa vegetal mas convincente con el mismo presupuesto geometrico, seguida de contacto local; no aumentar simplemente la cantidad de instancias ni abaratar el sesgo global de sombras. Runtime, navegacion, simulacion y balance permanecen intactos.

Reproduccion: capture-campaign-grass.mjs con WG_GRASS_STUDY=grass-contact, WG_GRASS_BASELINE=grass-biomes y WG_GRASS_BIOMES=sabana,gran-rio,gran-canon. WG_GRASS_DETAIL=1 produce la vista cercana. measure-campaign-grass-shadow.mjs con WG_GRASS_VIDEO=0 mide el coste; check-grass-shadow-submissions.mjs audita todos los pases. Ambos aceptan WG_GRASS_OUTPUT.
