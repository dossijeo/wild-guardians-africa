# Presentación de riego de trabajadores

El banco `Water` se solicita bajo demanda para los cuatro perfiles cuando un trabajador confirmado ejecuta una tarea de riego. La presentación reproduce el esqueleto y las seis mallas rígidas de la regadera con la misma fase; si falla la carga o admisión, conserva el rig CPU. Una respuesta tardía que corresponda a otro objetivo se descarta. Las tareas `initial` y sus cambios de herramienta siguen en CPU.

Fuera de un horizonte certificado la pose permanece en el tiempo confirmado de la publicación. Durante el horizonte, el roster solo instala las muestras de fase de riego cuando recibe también el certificado explícito `wateringSynchronized` del participante VFX. Un cambio de tarea, objetivo, estado o fase invalida el tramo. La simulación sigue siendo la autoridad y el efecto de agua conserva sus reglas propias.

Las pruebas incluyen cancelación, fallo y reintento de admisión, composición con movimiento, selección, shaders generados y campañas preparadas con Wild Engine/WASM que comparan el resultado contra una autoridad de referencia. Estas cubren tanto `WaterSatisfied` como la interrupción por un comando real de Despertar sobre el cultivo, con cambio de tarea y rechazo del tramo anterior. Faltan comparación visual en WebGPU y medición de rendimiento integrado.
