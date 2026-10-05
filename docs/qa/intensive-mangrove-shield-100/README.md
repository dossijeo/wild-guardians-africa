# Manglares/Saheliana — campaña responsable de 100 noches tras corregir escudos

Ensayo terminal, exit code 0, sobre copia fija de `7a14cb9781d52b038ec83429b26a4b49b9df9905`, sin cambios de archivos seguidos al inicio. Misma estrategia de `check_intensive_case.mjs`: terreno nativo, ocho especies, cultivo según saldo, reserva salarial/mantenimiento, trabajadoras ancianas, tareas físicas FIFO, magia y recarga/guardado ordinarios. No se altera el estado para producir victoria.

Resultado: victoria tras 100 noches, saldo 1.103, máximo de 310 plantas vivas y ocho especies observadas. El punto que fallaba al inicio del día 65 ya no interrumpe la campaña. El snapshot se valida y se reconcilian independientemente salarios, semillas, reparaciones, riegos obligatorios y entregas físicas de cajas. El resumen recalculado coincide exactamente con el registrado. El gzip conserva los 7.084.255 bytes del estado con round trip y hashes comprobados.

## Limitación importante del ritmo de juego

Hay 17.450 segundos simulados sin acciones disponibles sobre 30.000 segundos de luz (58,17 %). El registro atribuye 15.455 a falta de presupuesto y 1.995 al final del turno; no a falta de espacio. Máximo intervalo sin acción: 129 segundos; percentil 90: 89 segundos. Son oportunidades de acción de esta estrategia, no actividad observada de un jugador físico.

La cosecha ingresa 135.973 monedas, frente a 75.881 de semillas, 58.680 de salarios y 1.009 de reparaciones. El flujo operativo neto es solo 403 monedas en la campaña, además del centro inicial de 800. Esto prueba supervivencia, pero **no** acredita la meta del usuario de crecimiento rápido de grandes plantaciones y poco tiempo sin nada que hacer. Queda pendiente revisar el margen económico/ritmo junto con pruebas de mala gestión; no se cambia el ensayo para ocultar esta limitación.

`status.json`, `report.json`, `summary.json`, `state.json.gz` y `proof.json` preservan resultados, fuentes y estado. Esta campaña pertenece a `7a14cb9`, no valida la integración Opus, el render, móvil físico ni todas las combinaciones de bioma/cultura. Las otras campañas siguen separadas.
