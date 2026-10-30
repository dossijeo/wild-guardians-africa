# Diagnóstico del desplazamiento físico

Reproducir desde la raíz con `node tools/guardian/measure-ragdoll-launch.mjs docs/guardian/phase2/native-directional-cycles/controlled-launch.json`.

Se ejecutaron 27 casos con los cinco rigs instalados y sus colisionadores ajustados a la piel. Cada caso usa suelo plano, pose de enlace, velocidad previa cero, intensidad 1 y seis segundos a 60 pasos/s. Se mantienen la geometría y dirección al comparar la masa de producción con masa 1. Se mide el centro de masa ponderado de los cuerpos y, por separado, el centro del cuerpo de cadera. No se activa el controlador de giro ni recuperación.

| Rinoceronte | Centro de masa máximo, masa 5 | Mismo rig, masa 1 |
| --- | ---: | ---: |
| Horizontal | 0,997 m | 2,010 m |
| Descendente | 0,840 m | 1,905 m |
| Lateral | 1,110 m | 1,909 m |

La resistencia del rinoceronte está presente en este experimento. No hay evidencia suficiente para reducir su impulso de producción basándose en el vídeo previo: los 2,322 m de aquella traza corresponden a otro punto de referencia y a condiciones de pose/escenario distintas. Queda pendiente comparar estas condiciones dentro del juego antes de atribuir la diferencia a una causa concreta.

No todas las distancias decrecen monótonamente con la masa: el león lateral recorre más con masa 1,5 que con masa 1. La trayectoria articulada y los contactos también afectan al resultado; no se presenta el parámetro de masa como garantía de una distancia final determinada. El caso contrafactual de hiena lateral con masa 1 no alcanzó el indicador de reposo en seis segundos; se conserva el resultado nulo en los datos.

Esto es un diagnóstico del solver, no una validación gráfica, de recuperación, de rendimiento o de navegación. Los modelos se leen mediante la fixture geométrica de pruebas, sin evaluar sus clips. No se cambiaron parámetros de producción.
