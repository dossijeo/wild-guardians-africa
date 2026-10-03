# Fin de turno, colas y cobro único

Pruebas `2ce78c1`, 3 de octubre de 2026. Se añaden seis ensayos de integración en [acceptance-worker-chains.test.js](../tests/acceptance-worker-chains.test.js), sin cambios de producción en este bloque.

## Alcance de los ensayos

Las pruebas de cadenas utilizan fincas financiadas con rutas despejadas para aislar trabajadores, colas, reloj, cajas y contabilidad. Los trabajadores se desplazan y reservan tareas mediante `Game.tick`; no se cambia su posición para acercarlos al objetivo. Dos mijos alcanzan la madurez tras cuidado físico real. Se declaran por separado las preparaciones de un checkpoint de plátano y de una planta madura usada como peso sin tarea; no se presentan como crecimiento producido por trabajadores.

La incursión se inicia con `spawnRaid` en una finca de campaña del día 21. Se marca su presupuesto de golpes agotado para ejecutar la salida real y reconstrucción de colas sin destruir los cultivos de referencia. Esto acredita interrupción, retirada y reconstrucción, no daño, selección natural de incursiones ni todas las animaciones de combate.

| Caso | Evidencia |
|---|---|
| QA-058 | Los cuatro perfiles llegan caminando a su fin de turno, 250/300 según sexo. Liberan reserva y pasan a regreso en el límite exacto; la planta distante sigue sin primer cuidado, crecimiento ni cobro. |
| QA-059 | Los cuatro perfiles empiezan físicamente el primer cuidado antes de acabar el turno y lo completan después. Emiten un solo riego y regresan; la segunda tarea queda sin ejecutar. |
| QA-056/057 | Incursión: empleados huyen y abandonan reservas, reparación manual se cancela. Al salir la bestia, solo reaparecen las necesidades reales: primer cuidado, agua pendiente y cosecha expresamente solicitada. Diez reconstrucciones y cargar la partida conservan esas tres tareas sin duplicarlas. El otro mijo maduro no genera cosecha automática. |
| QA-056/057 | Amanecer real: una cosecha solicitada justo antes de terminar el día persiste; reparación manual no reaparece y el otro cultivo maduro sigue sin orden. |
| QA-062 | Agotar la reserva mediante distancia real cambia la carrera urgente a caminar a 0,72 m/s sin mover contratos. Una trabajadora que sigue regresando al amanecer conserva su contrato expirado y recibe la reserva diaria completa; el nuevo contrato también la recibe y utiliza otra persona mientras la anterior está ocupada. |
| QA-063 | Dos centros con tres plantas vivas cada uno y colas de dos/tres tareas reciben un empleado cada uno. El primero camina sin consumir reserva y el segundo corre; la distinta urgencia no modifica cupos ni asignaciones. |
| QA-064/065 | Cosechar un mijo con hombre mayor retira la planta una vez y fija una caja pendiente de 54/5; el saldo todavía no sube. Guardar y cargar durante transporte, entregar físicamente, repetir la transacción por el mismo ID y volver a cargar producen un solo ingreso de 11. La caja entregada no vuelve a generar tarea. |

Estos ensayos no acreditan terreno ni renderizado de las cuatro animaciones en pantalla. Las pruebas existentes de contratos, perfiles, navegación, poses nativas y guardado se mantienen dentro de la validación completa.

## QA-038 en el HUD real

La partida [remembered-hiring-state.json](../tests/browser/remembered-hiring-state.json) se generó mediante `simulateOpening('youngMale', 5, {seed:712, biome:'sabana', culture:'mapungubwe', slotId:'qa-remembered-hiring'})`. Utiliza el terreno original y las órdenes reales desde 1.000 monedas; no modifica saldo, crecimiento, tiempo ni posición de trabajadores. Construye un centro por 800, planta cinco mijos por 25, contrata un joven por 120 y entrega cinco cajas por 55. Resultado: día 2, 110 monedas y selección anterior de 120.

El [lanzador de QA](../tests/browser/remembered-hiring.html) guarda solo su ranura propia y solo permite el origen `127.0.0.1:5176`. Desde el menú original se cargó esa partida en la aplicación real. Se observó la selección recordada, saldo 110, coste 120, resto −10 y botón deshabilitado: [captura](qa/worker-chains/remembered-unaffordable.png), [DOM](qa/worker-chains/remembered-unaffordable.txt).

Cambiar joven a cero y mayor a uno conserva las 110 monedas hasta confirmar; coste 100 y resto 10 habilitan la confirmación: [captura](qa/worker-chains/affordable-draft.png), [DOM](qa/worker-chains/affordable-draft.txt). Confirmar cobra exactamente 100 y deja 10 en el HUD: [captura](qa/worker-chains/confirmed-once.png), [DOM](qa/worker-chains/confirmed-once.txt). La memoria de tutorial generó después su aviso de primera caja, manteniendo el juego pausado; ese aviso no se confunde con una segunda contratación.

La consola no registró errores: [browser-errors.json](qa/worker-chains/browser-errors.json). Se cerraron la pestaña y el servidor de QA. La partida del usuario en el puerto 5173 se conservó. Esta prueba de presupuesto no demuestra rentabilidad de una campaña completa con cinco mijos.

## Validación

**89/89** pruebas dirigidas, sin fallos ni omitidas, 0,92 segundos: [directed.log](qa/worker-chains/directed.log). Incluyen seis ensayos nuevos y los existentes de contratos, juego, locomoción, desplazados y reglas.

La [CI 37093765394](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37093765394) de `2ce78c1` pasó la suite completa de **701/701**, además de verificaciones de recursos/reglas, build y empaquetado web: [ci.json](qa/worker-chains/ci.json), [ci-results.txt](qa/worker-chains/ci-results.txt). La ejecución completa de este bloque se hizo en CI; localmente se ejecutó la cobertura dirigida. El registro conserva los 159 casos originales y la aceptación completa sigue abierta.
