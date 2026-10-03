# Agricultura: auditoría de integración y referencias visuales

Pruebas `5dc3e31`, 3 de octubre de 2026. No se cambia código de producción en este bloque: se prueban las funciones reales del juego, plantas, colas, trabajadores, reloj, poderes, cajas, contabilidad y guardado. El registro global conserva los 159 casos originales y distingue los aspectos aún no acreditados.

## Condiciones del ensayo

[acceptance-agriculture.test.js](../tests/acceptance-agriculture.test.js) utiliza una finca financiada de postgame en el día 101, con un centro, las especies y checkpoints canónicos, y rutas rectas sin obstrucciones. Se excluyen ataques y eventos agrícolas para medir cuidado, tiempos y estabilidad sin modificadores. La financiación es una condición inicial del ensayo, no dinero generado por el juego ni una prueba de viabilidad económica desde el tutorial.

Los ensayos de tiempo ideal aplican cuidado manual a las necesidades detectadas; los de cuidado físico, cosecha y riego durante Crecimiento usan trabajadores reales. No se cambia su posición, no se reemplaza la lógica de tareas y no se falsifican entregas. Estos ensayos no prueban terreno, UI, meshes o costes de GPU.

## Evidencias por caso

| Caso | Comprobación |
|---|---|
| QA-009/018 | Mijo: 140 segundos efectivos de luz. Plátano: 570 de luz, 630 reales al cruzar una noche de 60 reales; al primer amanecer tiene exactamente 300 de progreso, termina con 870 simulados y 270 del siguiente día. |
| QA-015 | Paso único de 180 segundos conserva el checkpoint/deuda del plátano. Pasos reales de 1.000 segundos se detienen en amaneceres sucesivos: no cobran automáticamente; confirmar cobra 100 y repetir no vuelve a cobrar. |
| QA-017 | Las ocho órdenes de plantar cobran en total 309, generan plantas vivas de progreso cero y tareas iniciales; rechazan arroz/calabaza/judías sin mutación. **Parcial:** falta ver los ocho brotes instantáneos en el renderer del juego. |
| QA-019 | Un trabajador real atiende cada especie durante los días/noches necesarios: exactamente 2/3/2/3/2/4/2/6 eventos de riego, ninguna tarea duplicada, nada de crecimiento antes del inicial, ningún cobro de agua. Saldo = presupuesto − semilla − jornadas confirmadas. |
| QA-020/021 | Plátano necesita agua en 95; al esperar 23,75 segundos se congela en 118,75, permanece vivo y reanuda tras regar, sin cobro. |
| QA-022 | Margen restante de 10 segundos atraviesa toda la noche intacto; se consume durante los 10 segundos siguientes de luz. |
| QA-023 | Mijo realmente maduro permanece idéntico durante cuatro amaneceres, sin agua ni deterioro ni cosecha automática. |
| QA-024 | El primer cuidado es obligatorio incluso con Crecimiento. Yuca cruza dos noches reales y queda justo antes de madurar con su último riego pendiente y tolerancia aún disponible. Regarlo permite madurar; se conservan sus dos checkpoints. |
| QA-025/026/028 | Grupo de cuatro con dos maduras: dos órdenes generan únicamente dos tareas. Dos trabajadores reservan objetivos distintos a la vez, recogen por separado y entregan exactamente dos cajas; ingreso 22 total, sin duplicados. |
| QA-027 | Orden desde la planta más lejana inserta maduras de cerca a lejos, después de un riego que ya estaba en cola; no altera FIFO. |
| QA-029 | Crecimiento no completa la siembra/riego inicial; tampoco cura la deuda seca previa del maíz. Se mantiene congelado hasta regar. |
| QA-030 | En las ocho especies, un lanzamiento real satisface solo el checkpoint cruzado y deja los posteriores futuros; no quedan tareas de agua atrasadas. |
| QA-031 | Un trabajador alcanza y riega un girasol seco mientras el poder sigue activo. Avanza 24 en 16 segundos (×1,5), el siguiente checkpoint queda satisfecho por magia y solo hay un evento de riego manual. |
| QA-032 | Checkpoint de maíz exactamente al expirar los 30 segundos: estado `magic` único, ningún riego atrasado, futuro conservado. |
| QA-033 | Multiplicar caduca entre orden y recogida: hombre mayor genera valor 10,8 y la entrega cobra 11, sin ×2. |
| QA-034 | Recogida masculina durante Multiplicar fija valor 21,6. Guardar/cargar y caducar no lo cambian; entrega cobra 22 una vez. |

Un efecto canónico de Crecimiento recorre como máximo 45 segundos de progreso, mientras el menor intervalo entre checkpoints es 60. El ensayo integrado no inventa umbrales para forzar dos cruces en el mismo lanzamiento. Las pruebas del kernel agrícola en `tests/core.test.js` comprueban por separado el cruce de varios checkpoints en una actualización larga y que solo los alcanzados se satisfagan.

Las comparaciones temporales toleran menos de `1e-7` segundos, para no confundir errores de coma flotante con fallos de gameplay. Los cobros y cantidades de tareas, checkpoints, cajas y eventos se comparan exactamente.

## Biblioteca y cuarenta referencias

Se navegó desde el menú original a Biblioteca → Cultivos → Ver etapas. El laboratorio cargó y se pudo cambiar entre las ocho especies. Se inspeccionaron las capturas de sus cinco etapas y la consola no registró errores: [reference-stages.json](qa/acceptance-agriculture/reference-stages.json), [library-errors.json](qa/acceptance-agriculture/library-errors.json).

Capturas: [Maíz](qa/acceptance-agriculture/reference-1.png), [Algodón](qa/acceptance-agriculture/reference-2.png), [Girasol](qa/acceptance-agriculture/reference-3.png), [Plátano](qa/acceptance-agriculture/reference-4.png), [Sorgo](qa/acceptance-agriculture/reference-5.png), [Mijo](qa/acceptance-agriculture/reference-6.png), [Yuca](qa/acceptance-agriculture/reference-7.png), [Batata](qa/acceptance-agriculture/reference-8.png).

Los tiempos mostrados en ese laboratorio siguen siendo los de demostración original; no son los tiempos de la campaña. La comprobación acredita que el enlace de biblioteca carga y proporciona la referencia visual. QA-036 sigue parcial hasta comparar el renderer y los morphs del juego, sus puentes opacos y UVs contra estas cuarenta geometrías. QA-035, carga de una planta a mitad de morph con su malla correcta, todavía necesita ese ensayo visual integrado. Se cerraron la pestaña y el servidor de QA; la pestaña del usuario en 5173 se conservó.

## Resultados

92/92 pruebas dirigidas de agricultura, reloj, juego, reglas y contratos: [directed.log](qa/acceptance-agriculture/directed.log), 4,26 s. Son 17 pruebas nuevas de agricultura, incluidas matrices por especie dentro de varios ensayos; no se presentan como 92 pruebas nuevas ni como toda la aceptación del juego.

Suite completa local de `5dc3e31`: 675/675, sin fallos ni omitidas, 466,35 s: [full.log](qa/acceptance-agriculture/full.log). Incluye las campañas activas, contratos, reglas y navegación que ya estaban en el proyecto, además de las nuevas pruebas. No se modifica el renderer en este bloque.

CI de `5dc3e31`: [ejecución 37090340843](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37090340843), finalizada correctamente con 675/675 pruebas, 23 fuentes/484 recursos/126 coincidencias exactas de SFX, 48 acciones de trabajadores con procedencia, verificación de GLB y texturas, build y paquete web. Evidencia guardada: [ci.json](qa/acceptance-agriculture/ci.json), [ci-results.txt](qa/acceptance-agriculture/ci-results.txt). El paquete conserva 554 archivos, 379.673.206 bytes, 794 enlaces relativos y 20 GLB de runtime. Estas comprobaciones tampoco sustituyen los casos visuales pendientes.
