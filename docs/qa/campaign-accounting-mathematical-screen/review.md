# Revisión del borrador v2 — interpretación retirada

Se conservan los artefactos originales de bb69c697 y sus fuentes para reproducir el diagnóstico. **La separación 526.789 frente a4 monedas no justifica seleccionar el factor47,5% / zarzas3.**

## Insuficiencia artificial

Sin defensa, la tabla v2 termina el día50 sin plantas y con154 monedas. Los días51–55 paga30 cada día sin sembrar ni cosechar:154→124→94→64→34→4. La reserva opcional de100 impide reinvertir. Con un centro intacto, sin cultivos ni cajas, `dawnMinimum` exige35 (jornal30+semilla5), no130. La cuenta permitía una recuperación antes de generar ella misma el agotamiento; no es evidencia de derrota por descuidar defensas.

## Ingresos y estrategia no comparables

El caso sin defensa nunca supera464 monedas y se queda en mijo. El responsable cambia a mezcla el día35. Ese día14 brotes nuevos elevan inmediatamente el precio ponderado de39 entregas sin acreditar su madurez. Se compara también una discontinuidad de productividad/especies, no sólo defensa. La mezcla media de semillas tampoco acredita la compra de una secuencia concreta de especies ni liquidez intradía.

## Protección sin acreditar

Se pagan anillos completos como requisito de inversión y luego se mantiene su protección aunque no se financien todas las reparaciones. El juego permite construcción parcial; además faltan geometría, puertas, rutas, deterioro e impactos estructurales efectivos. El piloto corto anterior no acreditó intercepción:0 impactos sobre428 piezas compradas.

## Uso correcto de la evidencia

- Los tests v2 prueban reproducibilidad y conservación de sus ecuaciones; no validan sus supuestos de madurez, solvencia ni protección. Los indicadores `conditionalCashSeparation` y `conditionalOppositeLateMargins` son salidas históricas del modelo, no criterios de selección.
- [La tabla por cohortes](cohort-estimate.md) elimina el cobro de los brotes del mismo día, la mezcla instantánea de ingresos y los jornales vacíos repetidos. Conserva100 filas y explicita cuándo la recurrencia deja de tener recursos.
- La nueva tabla sigue siendo una estimación contable condicionada. No acredita agua/FIFO, daños individuales, productividad final, eficacia real de murallas ni inactividad<25%. No se elige una candidata ni se cambia producción.
- Antes de campañas nuevas, deben verificarse esos supuestos y un margen de viabilidad bajo productividad y protección plausibles. No se debe modificar una política matemática para fabricar el resultado ganador/perdedor deseado.

Revisión independiente por canyon_activity_audit, lectura únicamente; ninguna nueva campaña nativa ejecutada.
