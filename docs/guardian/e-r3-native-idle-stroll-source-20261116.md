# Paseo Idle: propuesta y ejecución nativas sobre el cuerpo existente

Continuación de [la fase Idle proyectada en Game](e-r3-native-idle-cycle-game-20261116.md), dentro de A6-04.f-R3. Se completa la fuente nativa del paseo ya elegido por la política 21. Su admisión tipada, presentación preparada, proyección de Game y descanso posterior siguen pendientes; no cambia ningún cierre A6/A/B/C.

## Referencia consultada y decisión

Antes de implementar se leyó el código real de [Godot 4.3 `NavigationAgent3D`](https://github.com/godotengine/godot/blob/4.3-stable/scene/3d/navigation_agent_3d.cpp): `set_target_position`, `get_next_path_position`, `_update_navigation`, `_advance_waypoints`, `_request_repath` y `_is_within_waypoint_distance`. Conserva el objetivo al limpiar la consulta, consulta desde la posición física, renueva el camino cuando cambia el mapa y avanza sus hitos desde la posición ejecutada. Se adapta la separación entre objetivo, camino derivado y ejecución física, reutilizando las reservas, pruebas de puertas, reloj y kernel cinemático existentes de Wild Guardians. No se incorpora Godot, otro agente, un integrador ni una dependencia.

## Fuente preparada y ejecución

La propuesta 22 exige un ciclo 21 genuino agotado con decisión WALK, misma sesión, secuencia y ancla vigente. Reutiliza el camino nativo ya elegido. Si cambia su revisión de navegación, consulta de nuevo al mismo destino, conservando el RNG privado. Verifica extremo y radio local antes de preparar tiempos y reservas mediante las funciones que ya usa Home. Un conector inválido, terreno desconocido o camino rechazado retienen el cuerpo; no fabrican una ruta ni un reposo. El resultado negativo del planificador conserva la semántica anterior: un conector inválido también puede devolver `-6`.

Preparación, cancelación y revalidación mantienen el cuerpo y la fase anterior mientras los demás actores avanzan. La adquisición comprueba la frontera completa y el ticket preparado; una traslación temporal sólo reutiliza ese programa si tiempos relativos, geometría y motores siguen siendo compatibles. Se publica una ruta ambiental propia, sin tarea, regreso o entrega ficticios. La asociación conserva metadatos acotados y las secuencias causales del ciclo y decisión, evitando una cadena creciente de historias.

El slot reservado y el cuerpo original pasan al ejecutor nativo común. El paseo no corre ni transporta carga: conserva los acumuladores de carrera/carga y avanza el de caminar. La vista de ejecución lee la pose realmente escrita en el registro físico; no vuelve a integrar el movimiento. La asociación inicial 20 y el ciclo 21 dejan de ser los propietarios activos cuando comienza el paseo.

La llegada se reconoce sólo desde `executionPose.arrived`. El cuerpo se retiene en el extremo real y la fase sigue siendo WALK. Una vista pura ofrece entonces la solicitud REST con el siguiente valor de xorshift y la duración original de `cancelWalk`; no modifica el RNG ejecutado, no emite una nueva asignación ni concede permiso para descansar. Consultas repetidas o tiempo adicional no cambian ese resultado. El siguiente incremento debe acreditar ese cuerpo estacionario real y admitir el nuevo ciclo, sin fingir que ha vuelto a su pose inicial 20.

## Validación

Resultados, comandos y hashes en [la validación](performance/native-idle-stroll-source-validation-20261116.json).

- **13/13 pruebas de fuente**, 6937.668 ms: cuerpo retenido durante preparación/cancelación; compañero en marcha; revalidación y ticket ajeno; cuatro perfiles contra `updateIdle` original; secuencias, pose, fases y RNG; REST sólo tras llegada física y extremo retenido; sesión/fase ajenas; ancla/cuerpo retirados; navegación revisada; destino bloqueado; pausa y retirada física en standalone/pthread; RNG no nulo al llegar en ambos módulos.
- **1142/1142 pruebas de regresión en 98 archivos**, 606498.2997 ms, sobre estos módulos y fuentes exactos. Después se añade sólo al archivo de pruebas el caso de RNG no nulo en ambos módulos y se verifican de nuevo sus 13 pruebas. Las otras 17 entradas conservan los hashes de la regresión; el build de producto usa las entradas finales.
- Ambos módulos canónicos reconstruidos con las 21 exportaciones nuevas; **build de producto correcto en 49.64 s**. Se conservan los 16 archivos locales ajenos protegidos y el helper pthread original. Se registra el manifiesto nuevo de 17 entradas nativas; el manifiesto del componente anterior ya no describe estos binarios.

La comparación con JavaScript se usa como oráculo del test. La fuente no llama a esa política ni proyecta Game: se comprueba que su cohorte ordinaria sigue devolviendo no soportado para 22. No se anuncia capacidad gráfica nueva ni se habilita el scheduler ordinario. Este incremento no mide GPU, no reconstruye recursos gráficos y no aporta evidencia nueva sobre la recuperación de los 3123 recursos sanos.

## Siguiente punto del plan

Integrar la referencia tipada y adquisición preparada 22 en los propietarios y puertos existentes; después presentación y Game sobre el mismo actor. Completar la fuente estacionaria tras el paseo, descanso siguiente, aproximación, cambios de ancla y política de camino bloqueado. Siguen abiertos las demás clases/finales/puertas, productor ordinario, nacimiento y sustitución en vivo, recuperación incremental integral de los 3123 recursos y validación A6/A/B/C. No se inicia una campaña D.
