# Contratación y reparto de trabajadores

Auditoría del 3 de octubre de 2026, implementación `12c521a`. Se revisan los casos QA-037–063 del Plan Maestro; el registro de aceptación distingue la cobertura comprobada de los ensayos pendientes.

## Defecto corregido

Con 100/20/0 plantas y doce empleados, los cupos correctos son 9/2/1. Al contratar tres personas de cada perfil, el reparto anterior por turnos producía en el centro grande una mezcla 1/2/3/3: llenaba antes los centros pequeños y concentraba los perfiles posteriores en el grande.

Ahora cada perfil se distribuye proporcionalmente entre las plazas que quedan disponibles, mediante cocientes enteros y restos mayores con desempate estable. La mezcla del centro grande pasa a 2/2/2/3. Se mantienen los cupos, los totales por perfil y el único cobro diario; no se consideran tareas, sexo, velocidad ni bonificaciones para favorecer un destino.

## Ensayos y alcance

[acceptance-workforce.test.js](../tests/acceptance-workforce.test.js) añade diez pruebas de integración con las órdenes reales de construir, plantar y contratar. Las fincas tienen presupuesto inicial de ensayo, están en postgame y utilizan rutas rectas sin obstáculos. Esto aísla las reglas de plantilla; no acredita rentabilidad, terreno real ni presentación visual.

| Casos | Evidencia |
|---|---|
| QA-037 | Los cuatro perfiles cobran 100/120 según edad, dos contratos por perfil, sin segundo cobro ni mutación al repetir. |
| QA-039 | Confirmar cero permite avanzar 120 segundos; la planta sin primer cuidado no crece, no genera cajas ni cobra dinero. |
| QA-040/041 | Plantas colocadas mediante órdenes reales: 100/20/0 con seis empleados → 4/1/1; 1/100/20 con dos → 0/1/1. |
| QA-042 | Empate de cinco plantas en tres centros: el más antiguo recibe el único empleado aunque se invierta el array. Falta el desempate artificial de antigüedad idéntica por ID. |
| QA-043 | Tres centros vacíos reciben 3/3/2 de ocho empleados; no aparecen tareas, plantas ni cajas ficticias. |
| QA-044 | Igual número de mijo, algodón y plátano, con distinto cuidado/progreso: mismo cupo 2/2/2. |
| QA-045 | Dos poblados con tamaños de ensayo distintos: reparto global por plantas, sin cupo previo por poblado. La población gráfica no se valida aquí. |
| QA-046 | Cupos 9/2/1 con los cuatro perfiles: mezcla equilibrada en el grande, perfiles distintos en el de dos plazas, totales exactos y guardado idéntico. |
| QA-049/050/051 | Construir un centro y plantar doce cultivos durante el día conserva contratos y asignación de la planta antigua; los nuevos cultivos pertenecen al nuevo centro, sin empleados y sin cuidado ficticio. Falta comprobar en este escenario la reasociación al amanecer. |

La ejecución dirigida también incluye las pruebas existentes de reglas, contratos, desplazados, inactividad y locomoción. Se han leído sus aserciones: comprueban reservas FIFO atómicas, regreso físico y transporte tras finalizar el contrato, recuperación local tras destrucción sin segundo salario, exclusión de personal incapacitado/expirado/de otro poblado, paseos interrumpibles y consumo de reserva por distancia real. No se presentan como nuevas pruebas ni como revisión visual completa de animaciones.

Resultados dirigidos: **78/78**, sin fallos ni omitidas, 8,05 segundos: [directed.log](qa/acceptance-workforce/directed.log). Los dos errores iniciales del nuevo ensayo fueron una comparación temporal exacta y un cupo esperado calculado incorrectamente; se corrigieron antes de confirmar el defecto real de mezcla.

La suite completa local de `12c521a` termina con **685/685**, sin fallos ni omitidas, en 329,94 segundos: [full.log](qa/acceptance-workforce/full.log). Además, un barrido dirigido de 2.500 combinaciones de cantidades y cupos conservó plazas, totales por perfil y determinismo; la verificación del plan pasó sus 123.048 aserciones y 5.000 escenarios originales de reparto.

GitHub Actions también terminó correctamente para ese commit: [ejecución 37091358556](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37091358556), con la suite completa, verificaciones de recursos/reglas, build y empaquetado web. Evidencias: [ci.json](qa/acceptance-workforce/ci.json), [ci-results.txt](qa/acceptance-workforce/ci-results.txt).

Pendiente: selección recordada impagable en una jornada siguiente, cambio territorial con regreso al poblado de origen, desempate por ID, reasociación al amanecer del escenario de centro nuevo y verificación visual de inactividad. Estos resultados no completan los 159 casos de aceptación del juego.
