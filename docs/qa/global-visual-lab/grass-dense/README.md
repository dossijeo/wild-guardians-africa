# grass-dense: densidad a presupuesto acotado

Descartado: las hojas con dos segmentos se leen como tiras rigidas; no mejora la forma de la mata arqueada.

Modelo original de este experimento preparado con Blender 5.2.2, sin recursos externos. 24 hojas, 240 triangulos, 168 vertices, GLB 8644 bytes. Una malla cerrada, un material con color de vertices y cero texturas. Auditoria: cero bordes abiertos/no manifold; glTF Validator sin errores ni avisos. Fuente .blend y generador Python conservados. No modifica los modelos originales del juego.

Radio maximo 0.497711 m; a escala maxima 1,15 permanece bajo el margen de exclusiones de 0,65 m. No se cambiaron distribucion, capacidad de 192 instancias, mascara nativa ni eventos de ocupacion. Son pruebas QA, no integracion runtime.

## Capturas

Ocho capturas cercanas de campana real, Sabana/Gran Rio, semilla 712, calidad media, dia 150/noche 350. Cuatro parejas con identicas camara, objetivo, hora, entidades e instancias. La base es grass-biomes con grass-arched.glb. Cero errores de captura; comparison-audit.json registra contadores y verificaciones. No se extrapola a los otros cuatro biomas ni se declara mejora en vista general.

[Sabana antes](sabana-base-detail-day.png), [despues](sabana-candidate-detail-day.png), [noche](sabana-candidate-detail-night.png). [Rio antes](gran-rio-base-detail-day.png), [despues](gran-rio-candidate-detail-day.png), [noche](gran-rio-candidate-detail-night.png).

24 hojas con 10 triangulos cada una, frente a 15 hojas de 16 triangulos. Mantiene 240 triangulos por instancia pero sube de 150 a 168 vertices. No se mide tiempo GPU: descartado por forma antes de esa puerta; no afirmar ahorro de rendimiento.

## Decision y siguiente paso

Conservar grass-arched como candidato de forma. Mas hojas no equivalen a mejor cobertura. Ambos ensayos mantienen el problema de grupos aislados y no justifican sustituir el modelo. No tocar simulacion, navegacion ni siluetas para compensarlo. Antes de otro barrido de cantidades, evaluar la lectura del material y las normales de la vegetacion existente a escala de juego; mantener la arquitectura de instancing ya validada. Calidad global pendiente.
