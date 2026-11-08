# Cosecha en el horizonte confirmado

La cosecha real entra en estado `acting` con una tarea y objetivo confirmados. El plan histórico de efectos incluye ahora `harvest` además de plantación y riego, siempre que todas las muestras mantengan trabajador, tarea, objetivo, posición y orientación, con tiempo de acción decreciente. Los cambios de fase o identidad conservan el fallback por publicación confirmada.

El roster exige el certificado de sincronización de trabajo cuando reproduce la animación GPU de cosecha; una recogida de caja no adquiere artificialmente el requisito de un efecto de cosecha. El efecto y la pose usan el mismo horizonte y se invalidan si cambia el objetivo. Las pruebas cubren el reloj, pausa, cambio de objetivo, ausencia del certificado y muestras inconsistentes; usan efectos y reloj reales con roster/renderer simulado.

Esta integración no acredita todavía una partida completa en GPU real, paridad visual, ahorro de CPU ni frametimes. El resto de B y la validación integrada C siguen abiertos.
