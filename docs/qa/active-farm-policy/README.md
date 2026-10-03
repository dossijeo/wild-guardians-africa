# Estrategia del diagnóstico de campaña activa

La estrategia anterior reservaba el escudo para cultivos mientras el centro conservaba más de la mitad de su vida. En el terreno actual, Sabana/Mapungubwe/712 con una mujer mayor perdió el último centro en la noche 17, con 810 monedas; ninguna reparación había terminado. La derrota es válida conforme a las reglas del juego.

El diagnóstico ahora intenta proteger primero un centro amenazado, sin omitir la validación de terreno, cooldown, solapamiento de áreas ni volumen del animal. Se mantiene el fallback a cultivos cuando ese lanzamiento no es posible. No cambia la elección de objetivos de las bestias, el balance económico, el orden FIFO de los trabajadores ni el resultado de la partida.

Una ejecución independiente de 20 noches con comandos legales termina en el día 21, con 1.351 monedas, 136 entregas, cuatro incursiones físicamente terminadas y una reparación solicitada y completada. El centro conserva sus 600 puntos de vida. Los informes diarios están en `twenty-nights.jsonl`. Este recorrido parcial no acredita todavía una victoria de 100 noches.

## Campañas completas

`node --test tests/active-farm.test.js`: **2/2 aprobadas**, 405.561,9393 ms. Tanto girasoles como la finca mixta de ocho cultivos alcanzan victoria tras 100 noches. Conservan las aserciones originales: entregas en cada jornada de trabajo, 96 salarios de 100 monedas y cuatro contrataciones de cero, todas las incursiones físicamente terminadas y recargadas, cosechas con cada riego obligatorio satisfecho, dinero entero y snapshot estable. La finca mixta entrega las ocho especies. Resultado completo en `campaign-tests.txt`.

Las pruebas relacionadas de reloj, núcleo, reparaciones y escudo pasan **60/60**, 1.280,9522 ms (`related-tests.txt`). Los cuatro tests de comparación con el Bioma Lab V4.1.10.3 también pasan. Ninguna de estas pruebas sustituye la comprobación perceptual de audio ni los casos de aceptación que siguen pendientes.
