# Campañas intensivas en treinta mundos

`node tools/check_intensive_matrix.mjs` recorre los seis biomas y cinco culturas con la estrategia responsable de reinversión, reserva salarial creciente, mantenimiento, contratación diaria, incursiones y colocaciones en terreno nativo. La política mixta introduce especies adicionales cuando cumple sus condiciones económicas ordinarias. No modifica dinero, tiempos de cultivo, salarios, daño, RNG ni recorridos.

La duración predeterminada es cien noches por combinación. Para investigar la apertura puede ejecutarse `node tools/check_intensive_matrix.mjs 1`: ese diagnóstico nunca acredita una campaña de cien noches. Cada ejecución crea su propio directorio fechado en `test-results`, sin sobrescribir campañas independientes ni sus snapshots.

Se registra cada combinación antes de empezar. Al finalizar conserva informe y estado antes de la auditoría, incluso si hubo derrota. La auditoría comprueba dinero entero, cobro de semillas, cajas, riegos y entregas físicas; para cien noches exige también victoria, día 101, fin de incursión y un único evento de victoria. Una estrategia responsable debe completar las noches solicitadas y tener trabajadores contratados y entregas en cada jornada. Un fallo se conserva y se continúa con las demás combinaciones; el proceso termina con código distinto de cero si hubo algún fallo.

Los resúmenes incluyen especies reales, caja e inactividad. `campaign100` solo pasa a verified con treinta combinaciones aprobadas de cien noches. Ni una apertura de un día, ni un resultado individual, ni la existencia del directorio satisfacen ese requisito. El ensayo es de simulación; no acredita apariencia visual, dispositivo móvil, FPS ni almacenamiento nativo del navegador.

## Primera matriz de apertura completada

La ejecución de una noche terminó con código 0 y treinta casos passed. Se conservan `matrix.json` y los treinta informes, estados y resúmenes en `docs/qa/intensive-opening-matrix/`. Los picos de cultivos vivos van de 50 a 72 y los saldos finales de 299 a 363 monedas; todas las jornadas tuvieron contratación y entregas. Solo se observó mijo: la diversificación de esta política empieza después de la apertura. `campaign100` permanece unverified.

La cabecera registra los módulos de dominio cargados sobre `1674768`, incluida la optimización de reserva de tareas. El script de matriz todavía no estaba en Git en ese momento y la cabecera original no incluye su propio hash; no se rellena ese dato retrospectivamente. Las ejecuciones siguientes sí incluyen los hashes de la matriz y el analizador de resultados, además del código de dominio.
