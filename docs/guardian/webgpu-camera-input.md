# Cámara de entrada en la presentación WebGPU de QA

Mientras está activo el Worker gráfico de QA, los cambios de `OrbitControls` programan el envío de cámara al terminar la tarea actual. El wrapper de cámara corrige primero la altura y exclusión del terreno; enviar sincrónicamente desde `change` enviaría una pose anterior a esa corrección. Se agrupan los cambios de una tarea y se descarta el envío pendiente si cambia o se desmonta el mundo o el Worker. El cliente gráfico mantiene su propia limitación a un mensaje de cámara en vuelo y sustituye las actualizaciones pendientes por la más reciente.

Se conserva la sincronización del fotograma para cinemáticas y cambios programáticos que no emitan `change`. El dibujo y el resto de dependencias de `WorldScene` no se han migrado con este cambio. No se ha medido todavía la latencia de entrada ni validado con movimiento real de cámara en WebGPU.

Las pruebas dirigidas `tests/webgpu-camera-input.test.js`, `tests/terrain-camera.test.js`, `tests/webgpu-world-client.test.js` y `tests/webgpu-discrete-pick.test.js` comprueban orden respecto a la corrección, agrupación y descarte tras sustitución o desmontaje. Son pruebas de contrato y no sustituyen una prueba visual de cámara.
