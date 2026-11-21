# Colisiones durante la recuperación

Los cuerpos articulados ya no desaparecen al empezar a levantarse. Se retiran sus restricciones y pasan a control cinemático, siguiendo la pose de recuperación; conservan geometría y grupo de colisión. Un ragdoll dinámico vecino puede contactar con ellos. Al terminar se eliminan, y un nuevo golpe reconstruye el estado dinámico desde la pose visible en el mismo mundo.

`physicalSnapshot` invierte el offset original entre hueso y colisionador: conserva el giro axial, no solo la dirección de los extremos del hueso. La pose de recuperación se evalúa una vez por actualización. Los pasos físicos intermedios interpolan posiciones y cuaterniones normalizados por el arco corto; usan buffers reutilizados. No se recalculan los vértices de contacto de piel en cada subpaso.

## Evidencia

- Veinte pruebas del solver/rig/controlador pasan; también pasó la prueba independiente de entorno (21 en total antes del ajuste final de interpolación). Tras ese ajuste pasaron nuevamente las veinte y las tres pruebas afectadas por normalización/seguimiento.
- Contactos con cuerpo cinemático, conservación de giro axial y recuperación frente a un vecino con velocidades acotadas. Los golpes durante distintas fases de levantarse mantienen continuidad de pose y los 14 cuerpos de cada actor hasta su liberación.
- Escena gráfica: una hiena cayendo y otra recuperándose, 28 cuerpos y un actor cinemático. [Captura](recovery-collider-contact.png), [estado pausado](recovery-collider-contact.json). La ejecución pausada no es válida para rendimiento.
- Ejecución continua optimizada: 8,0485 s simulados, 209 fotogramas, cero errores registrados, cero derribos y cero cuerpos al finalizar. [Resultado visual](recovery-follow-finished.png), [datos](recovery-follow-after.json).

## Coste observado

Dos ejecuciones diagnósticas con dos hienas, mismo encuadre y resolución, sin compilación simultánea: [evaluación por subpaso](recovery-follow-before.json) y [evaluación por actualización](recovery-follow-after.json). Seguimiento de colisionadores p95 3,2 → 2,1 ms; p99 4,7 → 2,6 ms. El frametime p99 fue 66,6 → 83,2 ms: estos datos no demuestran una mejora global de fluidez. No son una serie A/B intercalada de incursiones representativas.

## Límites pendientes

La recuperación es cinemática: puede empujar a un cuerpo dinámico, pero no recibe fuerza a cambio. La pose no evita por sí sola una muralla ni otra recuperación cinemática. Las caídas horneadas y los animales con locomoción normal siguen fuera de estos contactos. Falta probar masas distintas, tres cuerpos en contacto sostenido, obstáculos y todos los ángulos, además del coste y naturalidad en una incursión completa. No se declara cerrada la validación artística ni de rendimiento.
