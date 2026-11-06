# Proyección confirmada del HUD

El host Worker añade a las publicaciones proyectadas una vista `hudProjection`
versión 2 con secuencia, identidad de partida, reloj, día, noches, saldo y los datos mínimos que usan
los permisos, tarjetas de magia y medidor de Despertar. El consumidor valida
su esquema, secuencia y coherencia interna antes de aceptarla, sin necesitar
compararla con el snapshot; la autoridad del Worker sigue siendo el productor
de los datos. Los pliegues de
vistas conservan la secuencia del último mensaje y el cliente temprano entrega
la misma vista a los consumidores del HUD. Las rutas antiguas reconstruyen la
proyección desde el estado confirmado como fallback.

El HUD del perfil Worker consume esta vista para indicadores, aviso de saldo,
permisos de muralla, tarjetas de magia, permisos de construcción y Despertar.
El guardado alojado usa la identidad confirmada de la partida y solicita el
checkpoint íntegro a la autoridad, sin construirlo desde la vista del HUD.
No es un estado autoritativo, una fuente de comandos ni un checkpoint. Las
pruebas comprueban equivalencia de reglas para pausa, incursión, ausencia de
centro y enfriamientos; validan también orden, aislamiento, rechazo anterior al
commit y agrupación de publicaciones.

La proyección incluye también los campos usados por las voces de bestias y
trabajadores, los contactos de locomoción y los sonidos de agricultura. El
cliente conserva identidades de actores, tareas y objetivos entre publicaciones
y retira las desaparecidas; así las comprobaciones asíncronas de vigencia no se
cancelan por recibir un clon. La música, el ambiente, los desbloqueos y el
procesamiento de eventos también usan esa vista en el perfil Worker; conserva
el historial de eventos para la deduplicación y los objetivos para invalidar
magias pendientes. Las pruebas comparan señales y cambios de identidad. Una
prueba ejecuta además el flujo completo `updateGameAudio` con
`AudioSystem` real durante incursión, llegada, trabajo y pausa y compara ambas
rutas; los recursos de audio están simulados y no prueba sonido en navegador.
`GameJuice` usa también la vista estable en el perfil Worker: recibe las
liquidaciones autoritativas explícitas y conserva saldo, eventos, enfriamientos
y objetivos mínimos para sus efectos. Una comparación comprueba liquidación,
fin de enfriamiento y amanecer frente al estado completo.
La selección del indicador de mano del tutorial utiliza esa misma vista con
campos de cultivo, magias y progreso limitados; las decisiones de colocación
del guardián siguen consultando el estado anterior y al Worker autoritativo.
El panel contextual del perfil Worker utiliza las propiedades confirmadas mínimas
de la estructura seleccionada, incluidas salud, puerta y coste para mostrar el
reembolso. Las acciones siguen enviando su identidad a la autoridad para su
validación; esta vista no cambia las reglas ni confirma una operación.
La selección de Despertar del perfil Worker solicita la validación del objetivo
una vez a la autoridad y descarta respuestas de selecciones o herramientas ya
sustituidas. La confirmación vuelve a comprobar el objetivo en el Worker; la
vista provisional no concede beneficios ni autoriza la operación.
La selección de magias utiliza posiciones y fases confirmadas mínimas de la
misma vista. Las comprobaciones visuales de un ataque se conservan para no iniciar
el gesto sobre una bestia caída; el Worker vuelve a validar daño y disponibilidad.

Esto no elimina todavía el snapshot completo: se sigue transfiriendo y usando
para tutorial, selección, comandos,
notificaciones y guardado. El host y el cliente aún recorren datos; no se ha
medido un ahorro de CPU o tráfico ni una partida integrada. La migración de
esos consumidores y el protocolo incremental en origen siguen pendientes.
