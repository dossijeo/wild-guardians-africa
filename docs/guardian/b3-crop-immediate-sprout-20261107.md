# Feedback provisional de siembra en WebGPU

El roster de cultivos muestra un brote genérico compartido mientras la geometría auténtica de la especie espera su admisión. La representación tiene un único mesh instanciado, limitado a 256 entradas, y se prepara a través de la admisión existente durante el arranque. No requiere cargar todas las especies ni sus texturas. Su apariencia es provisional y debe compararse visualmente en el juego real.

La identidad de la acción se conserva hasta su confirmación, rechazo o cancelación. Un cultivo confirmado puede conservar el brote hasta que se publique su lote auténtico; entonces se retira sin duplicación. Una confirmación y destrucción que llegan antes de la orden visual no pueden resucitarlo. La altura se consulta al terreno residente y el brote permanece oculto mientras este no esté disponible. No participa en selección ni colisiones ni altera el estado de simulación. Los recursos compartidos se liberan al cerrar el roster, después de las compilaciones pendientes.

Si falla la admisión del recurso provisional, el error se comunica y permanece activa la ruta normal de carga del cultivo. No se ha comprobado todavía la apariencia, latencia o coste en GPU real; la cobertura automatizada prueba orden de eventos, sustitución, rechazo, ausencia de selección y liberación de recursos.

Verificación: `node --test tests/webgpu-crop-roster.test.js tests/webgpu-provisional-crops.test.js tests/webgpu-picker.test.js` (48 pruebas aprobadas).
