# Cosecha en el horizonte confirmado

La cosecha real entra en estado `acting` con una tarea y objetivo confirmados. El plan histórico de efectos incluye ahora `harvest` además de plantación y riego, siempre que todas las muestras mantengan trabajador, tarea, objetivo, posición y orientación, con tiempo de acción decreciente. Los cambios de fase o identidad conservan el fallback por publicación confirmada.

El roster exige el certificado de sincronización de trabajo cuando reproduce la animación GPU de cosecha; una recogida de caja no adquiere artificialmente el requisito de un efecto de cosecha. El efecto y la pose usan el mismo horizonte y se invalidan si cambia el objetivo. Las pruebas cubren el reloj, pausa, cambio de objetivo, ausencia del certificado y muestras inconsistentes; usan efectos y reloj reales con roster/renderer simulado.

Esta integración no acredita todavía una partida completa en GPU real, paridad visual, ahorro de CPU ni frametimes. El resto de B y la validación integrada C siguen abiertos.

La prueba `authority-historical-harvest.test.js` ejecuta Wild Engine/WASM y una autoridad de referencia sobre una captura de campaña, con una cosecha dispuesta para observar tanto un intervalo sin eventos como el límite `CropPicked`. Comprueba la igualdad de snapshots y eventos, que el plan de efecto se admite durante el intervalo y que se rechaza al finalizar la cosecha. La situación inicial está preparada por la prueba; esto no equivale a una campaña completa ni a dibujo WebGPU real.

Se ejecutaron conjuntamente la prueba de autoridad, el horizonte de efectos y `webgpu-worker-baked-harvest.test.js`: 20 pruebas superadas. La última compara para los cuatro perfiles y los modos cosecha/caja las posiciones muestreadas del proxy de selección precocinado con la malla CPU a 60 muestras por segundo; exige un error máximo inferior a 0,02 unidades. El renderer de esta prueba es simulado y el muestreo cubre un subconjunto de vértices, por lo que no acredita paridad de los píxeles, una incursión completa ni rendimiento.
