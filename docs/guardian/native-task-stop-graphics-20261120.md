# Presentación retenida del trabajador en Task25

El roster gráfico prepara la pose detenida sobre el actor que ya presenta la Task. Exige el mismo cuerpo, ruta y asignación. Durante la preparación acepta que avancen la pose y los indicadores de locomoción de ese trabajador. La tarea, el contrato y el resto de la política siguen siendo parte de la comprobación de vigencia.

La confirmación usa la pose recalculada por WASM y la atestación de Task25. El roster reutiliza la preparación de variantes y conserva la reserva de movimiento. La prueba conserva el actor, la geometría, el índice, el atributo de posición y las asignaciones de movimiento existentes. El lector de selección consume los valores de la pose detenida mediante el mismo transporte escalar.

Three.js r180 distingue la actualización de valores de un uniforme de la recreación de un grupo de enlaces. Sólo actualiza el búfer cuando cambia su contenido y considera la generación de una textura al decidir si necesita otro grupo. Wild Guardians aplica ese criterio sobre su propio actor y su asignación de movimiento. Cambia la variante necesaria y conserva los recursos que siguen siendo válidos. [Código de Three.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js#L193-L255).

El recorrido de prueba usa una Task real en WASM, los recursos de personaje del proyecto y un doble del recibo de dibujo. Rechaza un cuerpo distinto, una mezcla de familias y un cambio del contrato mientras espera. Verifica que la selección pueda leer la pose final tras admitir el recibo.

Quedan el flujo de preparación y control entre Surface y Host, la proyección de paradas con motores de puerta y el disparo ordinario desde Game hasta Home. La aceptación en GPU física y C4 siguen abiertas.

En el original, la prueba falló porque el roster desconocía la plantilla Task25. La selección final pasó 243 pruebas en 18 archivos y la compilación de producto terminó correctamente. [Evidencia de validación](performance/native-task-stop-graphics-20261120/manifest.json).
