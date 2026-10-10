# Desbloqueo de cantidades de incursión

Autorización del jugador: retirar el límite de animales para calibrar el balance mediante hordas reales.

La revisión explícita `unlock_raid_animal_limits` elimina el máximo global de cinco y los máximos por especie. `null` significa sin tope adicional: el presupuesto de amenaza y los costes positivos de cada especie siguen limitando cada composición. Se conserva la enumeración determinista de grupos únicos, especies desbloqueadas, RNG, daño, golpes, introducciones y postgame. Los presupuestos actuales permiten hasta 14 animales, sin garantizar que se sortee ese grupo.

Se conserva la auditoría anterior en `capacity-before-unlock.json/md`; `capacity.json/md` refleja las nuevas reglas. La capacidad máxima teórica sube de 24 a 56 golpes, pero no equivale a destrucción realizada. Sigue insuficiente para el objetivo orientativo de 110 plantas sanas de una finca de 400: requiere calibrar presupuestos/composición mediante campañas.

La formación física exterior y la preparación de chunks para grupos grandes se validan por separado antes de aceptar campañas. La prueba de composición de 32 facóqueros comprueba ausencia de topes, no una incursión física ni rendimiento GPU.
