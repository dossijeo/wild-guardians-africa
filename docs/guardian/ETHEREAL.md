# Iteración de viento y flotación

## Cambios

- 37 huesos frente a los 25 anteriores: cuatro plumas con raíz y punta flexibles, cuatro fragmentos de madera rígidos independientes.
- Ciclos de 12 s con ondas de distinta frecuencia y fase. El borde de la túnica responde con retraso respecto a su parte superior. Las plumas tienen flexión retardada, y la madera conserva su forma mientras deriva y gira lentamente.
- Float aplica deriva vertical/lateral y balanceo sin que los gestos de diálogo lo sustituyan. Idle aporta movimiento suave a torso, cabeza, hombros, brazos, antebrazos y manos. Las voces y los nueve visemas no cambian.
- La simulación física original sigue siendo un estudio de amplitud; el movimiento final mezcla esa referencia con ondas dirigidas artísticamente y horneadas. No es física en tiempo real.

## Iteraciones y correcciones

1. Separación de los adornos y primera amplitud visible. La inspección numérica detectó estiramiento excesivo en la unión frontal/trasera del manto (ratio máximo de arista ~4,75 en Idle). No se aceptó esa versión.
2. Mezcla frontal/trasera: quedó una discontinuidad entre izquierda/derecha (máximo ~2,55). Se corrigió también esa transición.
3. Mezcla espacial final: máximo Idle ~1,41 y percentil 99 ~1,06; clips de magia ~1,60 de máximo. Son métricas de longitud de arista, no certificación de ausencia de toda colisión. Se revisaron imágenes de frente y tres cuartos en cuatro fases del ciclo; no se observaron los estiramientos extremos iniciales.
4. La prueba de bucle detectó el desplazamiento de un fotograma del exportador y signos equivalentes alternos en cuaterniones. Se normalizan tiempos y hemisferios. Las posiciones finales y velocidades a ambos lados del reinicio pasan la prueba.

## Evidencias

- `ethereal/`: renders Blender en 0, 3, 6 y 9 segundos, frontal y tres cuartos.
- `ethereal-motion.json`: piezas asignadas, número de huesos y amplitud física medida.
- `deformation-checks.json`: 25 muestras por clip a lo largo de 12 segundos, pesos normalizados con máximo de cuatro influencias.
- `ethereal-browser-checks.json`: 84 comprobaciones reales, incluyendo movimiento de plumas, fragmentos y Root, junto con ojos, boca, manto y voces.
- `ethereal-tests.txt`: 34 pruebas dirigidas aprobadas; `ethereal-build.txt`: compilación aprobada.
- `videos/guardian-idle.mp4`: unos dos ciclos desde tres cuartos, sin voz. Vídeos ES/EN actualizados con el modelo refinado.

## Coste y límites

El GLB pasa de 2.286.052 a aproximadamente 2.659.184 bytes. Geometría y draw calls permanecen en 17.025 triángulos y 6 llamadas. En esta sesión sobre Intel UHD, el laboratorio midió actualización CPU mediana de 0,2 ms, p95 de 0,4 ms; no equivale a tiempo GPU ni a una comparación aislada con la sesión anterior. No hay dependencias ni física adicionales en ejecución.

El movimiento está dirigido para una brisa suave, no una tormenta. El ciclo base de 12 segundos sigue siendo periódico. La evaluación visual y la grabación aportan evidencia de las poses revisadas, no una garantía universal de naturalidad ni de ausencia de intersecciones en futuros gestos.
