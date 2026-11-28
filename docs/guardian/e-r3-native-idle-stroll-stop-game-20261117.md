# Parada preparada de WALK en la cohorte Game

Continua la integracion del [paseo nativo en Game](e-r3-native-idle-stroll-restoration-game-20261117.md). Este incremento admite en `Game.tick` un22 suspendido mediante una parada preparada real. Conserva su cuerpo mientras otro actor ejecuta su Task y permite consumir esa fuente retenida en una Task o Home genuinos. Es una dependencia del productor ordinario; no completa ese productor ni cierra A6/e-R3/e-R4/f-R4/A/B/C. D no se inicia.

## Referencia consultada y decision

Se consulta el codigo de [`NavigationAgent3D`, Godot 4.4-stable](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp), especialmente `NOTIFICATION_SUSPENDED`, `NOTIFICATION_PAUSED`, `NOTIFICATION_UNSUSPENDED` y `NOTIFICATION_UNPAUSED`: delega `agent_set_paused` por agente segun `can_process`, separado de la pausa del mundo. Se adapta esa separacion, no su implementacion de avoidance ni su ciclo de notificaciones. Wild Guardians reutiliza la prueba nativa existente de cuerpo22 retenido; no elimina el cuerpo, no lo recrea y no introduce otra autoridad, cola, registro ni dependencia.

## Cambio

La comprobacion de cohorte rechazaba cualquier `suspendedBodies`, aunque existiera una fuente retenida22 exacta y su proyeccion Game ya estuviera implementada. Ahora admite exclusivamente las entradas que satisfacen `nativeHeldIdleStrollBodyCurrent`: actor, asignacion, slot/generacion, pose ejecutada, cuerpo, radio/flags y pertenencia al registro de suspension. La comprobacion sigue cerrada para puertas y otras clases suspendidas.

Game reconoce esa fuente al terminar el contrato, solicita Home mediante el puente existente y conserva su pose/fases/presupuesto durante la espera de recursos. La reconciliacion verifica que Home procede exactamente del22 retenido antes de proyectar Home; no reinstala el WALK cancelado. Una Task real consume la misma fuente mediante el camino ya existente. El WALK activo sin parada adquirida sigue rechazando el retorno no soportado antes de avanzar tiempo o cuerpos.

Los tests de fuente usan propuestas nativas reales, incluyendo revalidacion despues de avanzar mientras se prepara la parada. Sus commits directos no simulan recibos GPU. La regresion grafica separada utiliza las verticales existentes de parada22 a Home/Task; no se presenta como una prueba grafica del nuevo `Game.tick`.

## Validacion y limites

Resultados verificables, hashes de los inputs y referencias: [evidencia de validacion](performance/native-idle-stroll-stop-game-validation-20261117.json).

Quedan pendientes el productor ordinario Idle/carga, su coordinacion de parada para Task/Home durante WALK activo, otras clases/finales y puertas, la disponibilidad de guardado y la recuperacion incremental integral de los3123 recursos. Las medidas historicas de85.62ms y41.01ms siguen abiertas para C; este cambio no demuestra ausencia de tirones. Se conservan los siete fallos previos reproducidos en la base, registrados en [la evidencia anterior](performance/native-idle-moving-task-source-validation-20261117.json).
