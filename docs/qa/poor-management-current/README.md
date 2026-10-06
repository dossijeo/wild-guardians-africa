# Derrota por mala gestión con las incursiones actuales

Simulación nueva con seed 712, Sabana/Mapungubwe y código de navegación de `a28c843` (HEAD documental al iniciar: `bfa37e0`). El informe conserva hashes de las fuentes y los argumentos. Las incursiones usan la posición nativa de cámara y no el modo histórico de spawn.

La estrategia reinvierte en cultivos sin ampliar la reserva laboral ni reservar reparaciones. Se conservan los comandos ordinarios, dinero inicial de 1500, salarios, crecimiento, riego, tareas FIFO, desplazamiento, entregas, animales y daño originales. No se modifica el balance ni se provoca derrota mediante overrides.

Resultado: **derrota tras la noche 7**, saldo de 12 monedas. Hubo hasta 208 plantas vivas y 115 entregas físicas. Se terminaron las incursiones; un atasco no se considera una derrota económica.

El ledger reconcilia exactamente: 1500 iniciales + 1342 de cosechas - 1610 de semillas - 420 de jornales - 800 del centro = 12. La auditoría comprueba riegos completos, recogidas físicas, cobro sólo al entregar, unicidad de cajas y roundtrip del guardado.

Se registran 1986 segundos simulados sin una acción de esta estrategia durante 2100 segundos de jornada (94,57 %), con un tramo máximo de 208 segundos. El desglose conserva también 196 segundos de incursiones y 1910 nocturnos por separado. Es actividad de la estrategia simulada, no un estudio con jugadores físicos ni FPS.

La regresión añadida comprueba derrota, entregas, final de incursiones, ausencia de victoria y métricas de inactividad. Esto prueba que **es posible perder por mala gestión** con la política actual; no demuestra el balance de una estrategia responsable ni de todos los biomas/culturas. La campaña responsable de 100 noches sigue en ejecución sobre el worktree fijo `a28c843`.

Las cinco pruebas de política intensiva pasan en esta versión (36,59 s). El CI de navegación `a28c843` también completó 2337 pruebas sin fallos y build de 7,30 s: [Validate game](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37470586367). Ese CI precede a la nueva regresión de mala gestión; la salida local de las cinco pruebas verifica la incorporación.
