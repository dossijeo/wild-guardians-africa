# Espera antes de la recuperación móvil: experimento

La rama parte de `main` `44da3cac`. No cambia el comportamiento del juego: los ajustes temporales a `walkTo()` se revirtieron después de medirlos. Las herramientas de sondeo se conservaron para reproducir la observación. La alternativa anterior que desactivaba por completo la fase móvil tampoco era integrable: reducía las entregas y los cultivos supervivientes.

En Sabana/Mapungubwe/712, estrategia `good`, ocho noches, se observaron 38 activaciones de `ActorMobileCollisionRecovery`, todas en trabajadores. Sus destinos eran 18 puntos de riego, 11 cultivos, siete regresos y dos entregas. El trabajador más cercano en la captura previa estaba caminando en 23 casos, actuando en siete, transportando en tres, huyendo en cuatro y regresando en uno. Estas categorías describen al vecino más cercano entre los cuerpos registrados tras el tick; no prueban que fuera el único obstáculo del segmento. En seis episodios, la distancia previa a ese vecino era inferior a la suma habitual de los radios (0,56 m). El primer episodio, día 1 a los 67 s, encontró dos trabajadores a 0,61 m antes del tick; el vecino caminaba alejándose, pero `walkTo()` autorizó la fase móvil antes de su movimiento en ese tick.

Se probaron, de forma aislada, umbrales de 6 y 12 segundos de atasco, y después 30 segundos tanto para el atasco como para la falta de progreso. El brazo de 3 segundos es el comportamiento de `main`; los demás brazos se ejecutaron con el mismo código, WASM, semilla, política y escenario, cambiando solo esos umbrales. El sondeo cuenta pares de trabajadores vivos con distancia menor que la suma de sus radios tras cada tick. Se excluye el estado `home`; el recuento tardío excluye los primeros tres segundos de la jornada. Cada brazo se ejecutó una sola vez, en momentos distintos, por lo que los tiempos de CPU no forman un benchmark ABBA.

| Espera | Solapamientos tardíos (ticks) | Recuperaciones móviles | Entregas | Cultivos vivos | Trabajadores | Monedas |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 s (`main`) | 53 | 97 | 1.464 | 126 | 23 | 949 |
| 6 s | 47 | 95 | 1.559 | 120 | 23 | 1.079 |
| 12 s | 41 | 85 | 1.546 | 122 | 22 | 989 |
| 30 s | 16 | 64 | 1.511 | 98 | 19 | 984 |

Todos los brazos completaron 14 noches, sin victoria ni derrota registrada. Los solapamientos al principio de la jornada también incluyen trabajadores recién contratados en la entrada compartida del poblado; no se interpretan como prueba de recuperación durante el trabajo. Los resultados económicos divergen porque los movimientos alteran el orden y el resultado de las tareas; una cifra de monedas mayor no demuestra que un umbral sea globalmente mejor. El umbral de 30 segundos reduce cruces, pero deja 16 ticks tardíos y menos cultivos y trabajadores. La espera por sí sola no resuelve la falta de cesión física.

No se propone integrar ninguno de estos umbrales. El siguiente cambio funcional deberá encontrar una posición de cesión físicamente válida o una cola de acceso para puntos de servicio y pasillos, conservar la productividad y medir con varias semillas y campañas. No se debe ocultar una colisión cruzando cuerpos ni atribuir la pérdida de cultivos a un único parámetro sin localizar su primera divergencia.

Reproducción sobre la revisión de interés, con la configuración ordinaria de `walkTo()`:

```sh
node tools/experiments/probe-worker-recovery-context.mjs 8 712
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe
```
