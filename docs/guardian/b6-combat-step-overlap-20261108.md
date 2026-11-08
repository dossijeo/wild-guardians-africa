# Solapamiento entre combate y pisadas en una captura real

Reproducir desde la raíz con `.cache/tooling/node20.exe tools/guardian/audit-combat-step-overlap.mjs`. Se reproduce sin modificar la captura `tests/fixtures/sabana712-d6-native-multi-reservation.json.gz` durante 450 ticks de 0,05 s, con autoridad Wild Engine/WASM y observación de movimiento. Los pasos se obtienen con `createLocomotionStepTracker`; se retienen 1,6 s, como en la presentación, y se incluyen solo marcadores en los 12 chunks solicitados por la prueba. La sabana no activa la clasificación de agua del renderizador.

Resultado: 249 ticks con planes temporales de ataque, 249 coincidentes con al menos un paso potencialmente activo; 446 ticks con pasos y 446 marcadores, todos dentro de los chunks solicitados. La presentación rechaza actualmente el intervalo si `steps.size` es distinto de cero, por lo que esa dependencia puede impedir la integración de combate en esta situación.

Es una estimación superior, no un recuento de rechazos gráficos reales: solicitar un chunk no demuestra que su geometría esté visible, y la prueba usa la orientación del estado en vez de las orientaciones visuales del Worker. Tampoco registra otros motivos de rechazo, dibuja WebGPU ni mide tiempo de fotograma. No extrapolar sus cifras a otros biomas o capturas.

La siguiente integración debe mantener el nacimiento, posición, duración, terreno y cancelación de cada pisada bajo el mismo horizonte confirmado, incluidas las ondulaciones de agua, sin eliminar efectos ni introducir partículas prematuras. Hasta entonces la barrera existente sigue protegiendo la sincronización. Esta evidencia no demuestra una mejora de rendimiento.

El cálculo de cruce, posición y tiempo de los marcadores se comparte ahora mediante `locomotionStepsBetween` con el observador de presentación existente, sin asignar una lista adicional por actor. Las pruebas cubren todos los clips medidos de los cuatro perfiles y cinco especies, orientación, posición y huecos largos; 39 casos pasan. La auditoría WASM conserva exactamente los mismos recuentos tras la extracción. La batería antigua `locomotion-vfx.test.js` mantiene cinco fallos de validación de fixture de incursión también reproducidos con la versión anterior.

Esta extracción prepara la futura reproducción histórica: todavía no prevé nacimientos, no incorpora pisadas al horizonte ni retira la barrera. No demuestra una mejora de rendimiento.

El rastreador puede preparar, sin modificar su observación, los contactos de un intervalo con muestras completas y orientación final proporcionada por el llamador. Rechaza estado inicial diferente, listas incompletas, intervalos largos y orientación desconocida cuando hay contacto. En la misma reproducción WASM, las 450 previsiones coinciden con las observaciones posteriores: 446 contactos. La auditoría utiliza la orientación derivada del estado, no el mapa de presentación del Worker; su validez con ese mapa todavía debe demostrarse. Pasan 43 pruebas dirigidas.

La previsión todavía no crea ni anima efectos y el juego no la utiliza para retirar la barrera. Deben resolverse orientación visual, admisión y cancelación, terreno y agua antes de conectarla. No se ha medido su coste.
