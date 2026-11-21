# Reloj y picking del cuerpo Farm detenido

Continúa los [canales de preparación Farm24](e-r3-native-farm-arrival-stop-ports-20261117.md), según el [plan principal](integrated-gpu-migration-plan-20261104.md). El reloj detenido, el decodificador de picking y el kernel TSL existente admiten el selector Farm24 conservando su familia. El cliente remoto exige capacidades Farm propias; Host/Surface/roster y su validación hardware siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código consultado y decisión

Antes de implementar se inspecciona [Three r180, `NodeUtils.getCacheKey` y `getNodeChildren`](https://github.com/mrdoob/three.js/blob/r180/src/nodes/core/NodeUtils.js#L85), contrastando el archivo oficial con el instalado y sus hashes. El recorrido usa propiedades con nombre; la metadata del transporte permanece en el Symbol existente, fuera de ese grafo. No se cambia Three ni se añade dependencia, programa de movimiento, reloj o registro de recursos.

Se reutilizan los dos codecs de parada y el kernel detenido de Idle. El selector conserva la familia de la parada y puede identificar un propietario afectado de su colección; copiarlo no acredita una suspensión ni un frame. El espejo de Game sigue siendo la proyección nativa ya implementada, con estado `arriving`, sin Idle privado ni ruta JS.

## Kernel y recursos

La preparación detenida puede partir de la tabla Farm23 original. Comprueba actor, handle, secuencia, cuerpo Farm, pose finita y frontera anterior a su endpoint. La suspensión genérica de Farm permanece cerrada: sólo se añade la preparación tipada de parada. Llegada cero, cuerpo ajeno y endpoint original no crean soporte retenido.

El nuevo soporte comparte el mismo objeto de textura, bytes y versión con el movimiento original. Conserva la época preparada para el transporte y obtiene edad/pose finales del testimonio instalado de la parada, sin reconstruir la pose con el reloj global. El giro inicial genuino de Farm permite probar la diferencia entre el preview anterior y el yaw nativo adquirido después de revalidar. Disponer el recurso móvil no invalida al retenido mientras siga referenciado.

La compilación TSL de vértices detenidos produce el mismo código que la móvil, tanto directa como retimada. Marcar los nodos conserva sus propiedades con nombre, clave forzada de caché y buffer escalar existente. Estas pruebas no miden compilaciones, asignaciones o continuidad en un dispositivo GPU real.

## Frame presentado y capacidades

El decodificador copia la familia correcta, comprueba la referencia del cuerpo suspendido y conserva separadas la frontera preparada y la adquirida. La clave de picking contiene el selector completo: cambiarlo a Idle no recupera los valores de Farm. Se rechazan aliases de reloj activo, campos desconocidos, edades imposibles y testigos temporales incompletos.

Si el frame trae tiempo relativo y elapsed, ambos deben estar presentes y ser coherentes. Su tiempo no puede preceder a la suspensión física, usando el mismo suelo Float32 del Host; la edad tampoco puede superar el máximo desde la época preparada. La edad exacta desde el origen adquirido procede de la lease nativa de control. No se infiere ese origen del reloj global ni se usa el preview como pose final.

El cliente distingue `nativeFarmArrivalStopClockVersion` y `nativeFarmArrivalStopVersion` de las capacidades Idle. Ambas siguen ausentes en el draw Worker: una capacidad Idle de valor1 no abre Farm24. Instalar el selector en el kernel de componente no autoriza todavía el recorrido gráfico completo.

## Validación y continuación

La [evidencia](performance/native-farm-arrival-stop-clock-validation-20261117.json) recoge 18 casos nuevos y 64 dirigidos: cuatro perfiles Walk/Run, retiming real antes de adquirir, preparación anterior al giro y parada posterior, fases/posición/yaw nativos, textura compartida, liberación del movimiento, clip detenido, código TSL, metadata/buffer, picking y rechazos de aliases/cuerpos/endpoints/capacidades. Los commits confiados de ABI/control y el testimonio de frame son fixtures; el cliente/Host usa dispositivo simulado para el caso de capacidad. No se acredita render Farm24.

Dos loaders ESM de sólo lectura eliminan por separado la cota temporal del frame y la capacidad Farm distinta. Cada prueba falla por aceptar el caso prohibido. Árbol y WASM intactos; esos fallos intencionados se excluyen de la regresión final. Se verifican 370 entradas de validación, 64 inputs/artefactos nativos sin recompilar, los 16 archivos locales ajenos y el worker pthread sin seguimiento.

Continúan el consumidor cliente/Host/Surface y el actor original para24, hardware y los relevos Task/Home desde Farm retenido. Siguen finales Idle/Task/Home, cohort y mecánicas restantes, productor integral, guardado UI, planificación de preparación y continuidad A/A6/B/C. Los huecos históricos Farm23 y la recuperación incremental de los 3.123 recursos permanecen abiertos.
