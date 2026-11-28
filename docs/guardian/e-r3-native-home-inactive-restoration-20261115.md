# Restauración de Home ya inactivo

Continúa la [retirada Home preparada](e-r3-native-home-absence-consumer-20261115.md) y la [restauración semántica de acciones](e-r3-native-action-restoration-20261115.md). Una partida con trabajadores que ya están dentro de su aldea puede declarar esa ausencia en el registro nativo nuevo. No se restaura la ruta anterior, ni se necesita crear un cuerpo o un recurso gráfico para representar su ausencia. Home todavía en movimiento continúa rechazándose hasta implementar su petición y admisión nuevas.

## Referencia y decisión

Se consultó el código de [DetourCrowd v1.6.0, `addAgent`, `removeAgent` y `getActiveAgents`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L635): la participación se guarda en el registro existente; inicializar un agente reinicia corredor y objetivo, y sólo una petición posterior solicita movimiento. Se adapta esa separación entre declaración inicial, participación y permiso ejecutable. Se conservan los propietarios de Wild Guardians; no se añade biblioteca, controlador, cola o registro de terminaciones. Tampoco se aplica el ajuste de posición al navmesh de Detour: la posición guardada se conserva y debe coincidir exactamente con la entrada real de la aldea.

## Implementación

`resetFromState` declara los trabajadores semánticamente `home` después de cargar las filas, antes de admitir cuerpos o reloj. La comprobación común exige la entrada original, ausencia de tarea, caja, marcador de movimiento/acción/transporte, recuperación y espera de puerta, además de `running=false`. La declaración sólo se intenta si el registro físico completo está vacío. Un core reutilizado con cuerpos conserva el comportamiento anterior y no obtiene esa certificación por haber reiniciado únicamente el índice de intenciones.

La operación nativa vuelve a comprobar que no hay cuerpos, ejecución, reloj, propuesta, reserva, suspensión o intención del actor. Emite una transición terminal en el protocolo existente y guarda su secuencia en el mismo `Worker.inactiveSequence` utilizado por la retirada preparada. No instala un `ActiveIntent`, corredor o binding. Una nueva vinculación física invalida esa marca; retirarla después no la recupera. Las actualizaciones de fila sólo la conservan si siguen siendo coherentes con la misma posición y ausencia.

La consulta de inactividad comparte el predicado semántico entre carga y `Game.tick`. No se serializa la marca nativa. El reloj vacío ya existente permite avanzar una cohorte enteramente en casa; no ha sido necesario alterar el ejecutor ni fabricar una ruta de longitud cero. En una cohorte mixta, la admisión nueva del compañero sigue usando su mecanismo normal.

## Validación y alcance

La [evidencia reproducible](performance/native-home-inactive-restoration-validation-20261115.json) registra las comprobaciones y los límites. Las pruebas nuevas guardan una llegada Home real a través de WASM, publicación de control, puerto de preparación y consumidor existentes; la cola gráfica es el doble determinista utilizado por las pruebas de protocolo. Después cargan una autoridad nueva y comprueban:

- Ausencia de cuerpo, ruta, permiso Home anterior y nuevo cobro; el compañero restaurado sigue avanzando.
- Cohorte completamente inactiva, tiempo y reloj coherentes, sin cuerpo ni ruta ficticia.
- Reset con cuerpo retenido rechazado como certificación de inactividad, sin eliminarlo ni moverlo.
- Revocación al vincular un cuerpo y rechazo de redeclaración después de admitir el reloj.
- Rechazo de posición, movimiento, tarea o recuperación incompatibles, y mismo comportamiento en el módulo threaded.

Pasan **673/673 pruebas en 64 archivos**, sin omisiones, en 376,252 s; las **6/6 dirigidas** están incluidas. Ambos módulos nativos compilan y la declaración se ejercita en standalone y threaded. La compilación de producto pasa en **44,77 s**, con los avisos existentes; los 16 archivos originales protegidos conservan sus hashes después de compilar.

El control de sólo lectura carga el puente de `1e92955d2` con el resto del código actual: reproduce un fallo en la carga Home y deja cinco casos fuera de selección. No es un benchmark integral del padre. Una comprobación adicional de los puentes de intenciones pasa 33/36 casos; los tres fallos también se reproducen con ese puente anterior (layout simulado antiguo, comparación de eventos de ataque y contador de identidad de una fixture). Se conservan sus resultados como limitación; no se declara verde la suite completa.

No se modifica Surface, roster, creación de recursos o recuperación gráfica. Esta comprobación de carga y autoridad no añade una medición GPU de reutilización ni sustituye la validación integrada. La restauración de Home aún en movimiento, Idle inicial/fin de contrato, otras clases finales, puertas, productor ordinario y recuperación incremental integral siguen pendientes. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.
