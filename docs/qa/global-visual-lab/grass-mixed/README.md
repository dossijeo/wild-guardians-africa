# grass-mixed: densidad a presupuesto acotado

Descartado: recupera parte de la curvatura exterior, pero no ofrece una cobertura o masa claramente mejor que el modelo original.

Modelo original de este experimento preparado con Blender 5.2.2, sin recursos externos. 19 hojas, 238 triangulos, 157 vertices, GLB 8240 bytes. Una malla cerrada, un material con color de vertices y cero texturas. Auditoria: cero bordes abiertos/no manifold; glTF Validator sin errores ni avisos. Fuente .blend y generador Python conservados. No modifica los modelos originales del juego.

Radio maximo 0.515980 m; a escala maxima 1,15 permanece bajo el margen de exclusiones de 0,65 m. No se cambiaron distribucion, capacidad de 192 instancias, mascara nativa ni eventos de ocupacion. Son pruebas QA, no integracion runtime.

## Capturas

Ocho capturas cercanas de campana real, Sabana/Gran Rio, semilla 712, calidad media, dia 150/noche 350. Cuatro parejas con identicas camara, objetivo, hora, entidades e instancias. La base es grass-biomes con grass-arched.glb. Cero errores de captura; comparison-audit.json registra contadores y verificaciones. No se extrapola a los otros cuatro biomas ni se declara mejora en vista general.

[Sabana antes](sabana-base-detail-day.png), [despues](sabana-candidate-detail-day.png), [noche](sabana-candidate-detail-night.png). [Rio antes](gran-rio-base-detail-day.png), [despues](gran-rio-candidate-detail-day.png), [noche](gran-rio-candidate-detail-night.png).

Ocho hojas exteriores de 16 triangulos y once cortas de 10: 238 triangulos, 157 vertices.

## Comparacion temporal directa

ABBA de geometria en la misma pagina, ambas variantes visibles con las mismas instancias. Ambos assets permanecen residentes; los bounds del material siguen la geometria para conservar su sombreado por altura. 30 cuadros de calentamiento y 180 muestras por bloque, 16 bloques en el bucle real de campana pausada. No es un benchmark de visibilidad ni un recorrido en movimiento.

| Bioma | Fase | Original GPU ms | Combinado GPU ms | Diferencia |
|---|---|---:|---:|---:|
| sabana | day | 14.325 | 14.292 | -0.033 |
| sabana | night | 15.209 | 15.124 | -0.085 |
| gran-rio | day | 13.540 | 13.833 | +0.293 |
| gran-rio | night | 14.262 | 14.332 | +0.070 |

Los datos completos estan en campaign-performance.json. Hay variacion entre bloques; diferencias negativas no demuestran ahorro estable. Los contadores de calls/triangles son del ultimo pase, los tiempos GPU engloban el renderizado completo. Sin nuevas sombras proyectadas ni videos en este ensayo.

## Decision y siguiente paso

Conservar grass-arched como candidato de forma. Mas hojas no equivalen a mejor cobertura. Ambos ensayos mantienen el problema de grupos aislados y no justifican sustituir el modelo. No tocar simulacion, navegacion ni siluetas para compensarlo. Antes de otro barrido de cantidades, evaluar la lectura del material y las normales de la vegetacion existente a escala de juego; mantener la arquitectura de instancing ya validada. Calidad global pendiente.
