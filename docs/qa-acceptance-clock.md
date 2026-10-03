# Reloj e inicio temporal de incursiones

Corrección `6d8ff88`, 3 de octubre de 2026. Se usan las funciones reales `Game.advanceReal`, `tick`, generación/actualización de incursiones y plantas, con navegación recta sin obstrucciones para aislar el reloj. No son pruebas de GPU, geometría del terreno ni interacción del navegador.

## Regresión reproducida

Con el reloj en 399,95, una incursión programada en 400 y un avance real de 20 ms, el código anterior aplicaba ×5 a todo el paso: reloj 400,05, 100 ms simulados y movimiento del animal por tiempo previo a su aparición. El mismo avance dividido en dos pasos daba otro resultado. Un paso que cruzaba día/noche tampoco repartía su tiempo según la velocidad de cada periodo.

Las cuatro pruebas iniciales fallaron en tres casos: [before.log](qa/acceptance-clock/before.log). La prueba de aparición exacta observó 0,19 m ya recorridos al llegar al instante de spawn, cuando debían ser cero. La prueba de un solo paso observó 400,05 frente a 400,01; día/noche dio 300,01 frente a 300,05.

El avance real corta ahora en los límites del reloj y en los ataques programados. La simulación también corta en esos ataques y genera los animales al terminar el intervalo anterior, sin moverlos retroactivamente. Recalcula la velocidad antes del tramo siguiente. En el ejemplo, avanza 10 ms reales a ×5 hasta 400, aparece el animal sin movimiento y los 10 ms restantes avanzan a ×1 hasta 400,01. Un paso completo coincide con dos pasos separados en reloj, tiempo acumulado, posiciones y eventos.

## Alcance de las pruebas

[acceptance-clock.test.js](../tests/acceptance-clock.test.js) comprueba:

- Día de 300 segundos reales y noche tranquila de 60 segundos reales; reloj 07:05 → 19:05 → 07:05, un solo amanecer y pausa de contratación que descarta el resto del gran avance.
- Cruce fraccionario entre día y noche.
- Aparición de incursión y equivalencia entre un paso y dos pasos partidos en ese instante.
- Retirada del primer animal sin terminar la incursión y retirada del último con un solo evento de cierre; después vuelve ×5.
- Crecimiento y tolerancia hídrica de un plátano idénticos tras toda una noche tranquila.
- Estado entero idéntico tras 1.800 segundos de avance bloqueado por menú y pestaña oculta, también después de retirar solo una causa.

Los casos existentes de `tests/game.test.js` comprueban la incursión que atraviesa amanecer y la prioridad de derrota en la noche 100. Se revisó además el orden de `closeNight`: evento agrícola, comprobación económica y después victoria/contratación. QA-010–013 y QA-016 quedan acreditados para este comportamiento de la simulación integrada.

QA-009 sigue parcial: falta medir explícitamente el crecimiento de una planta atendida a lo largo del día/noche completo. QA-014 sigue parcial: el ensayo de pausa de dominio no demuestra la ocultación/restauración real de una pestaña ni el ajuste de `lastFrame`. QA-015 sigue parcial: se comprobó el gran paso hasta contratación, pero falta su variante de checkpoint y continuación con cobro.

## Resultados

- 54/54 pruebas dirigidas de reloj, juego, contratos y tutorial: [directed.log](qa/acceptance-clock/directed.log), 7,10 s.
- 658/658 pruebas completas: [full.log](qa/acceptance-clock/full.log), 330,55 s, incluyendo las campañas activas de 100 noches y la matriz canónica anterior. Esta ejecución valida el cambio del reloj `6d8ff88`; el ajuste posterior de CSS se comprobó visualmente y con las pruebas de idiomas en su propio bloque.
- Build correcto: [build.log](qa/acceptance-clock/build.log), 16,87 s. Paquete correcto: [package.log](qa/acceptance-clock/package.log), 554 archivos, 379.673.075 bytes, 794 enlaces relativos y 20 GLB de runtime.
- CI de `6d8ff88`: ejecución `37088807080`, resultado correcto observado tras finalizar.
