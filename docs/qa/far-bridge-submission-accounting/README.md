# Desglose del puente antes del culling por árbol

Fuente 7997ba9; misma semilla712, Sabana/Mapungubwe/media, pose elevada nocturna a220m del baobab que el ABBA negativo75f1fab. Instrumentación sin cambios de shader, packing ni geometría.

El puente envía229.022 triángulos de303.024 totales. 84.056 corresponden a instancias con fade positivo y144.966 a112 filas interiores con fade0. Se envían181 instancias y hay69 activas. Esto identifica geometría innecesaria, sin atribuirle directamente los6ms observados ni medir GPU con esta captura. Las filas parcialmente visibles deben conservarse y no se permite debilitar preparación/identidad para compactar.

La siguiente candidatafe243c0 cachea envolventes de todos los LOD y prueba el frustum por instancia antes de actualizar fade/count, manteniendo matrices y preparación. Veintitrés regresiones pasan, incluido borde visible con centro fuera del frustum, giro y retorno sin nueva preparación. Todavía requiere repetición nativa/coste: el culling por sí solo puede dejar filas interiores ocultas y no constituye compacción total ni aceptación del sistema.
