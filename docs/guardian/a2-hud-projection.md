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

Esto no elimina todavía el snapshot completo: se sigue transfiriendo y usando
para tutorial, selección, comandos,
notificaciones y guardado. El host y el cliente aún recorren datos; no se ha
medido un ahorro de CPU o tráfico ni una partida integrada. La migración de
esos consumidores y el protocolo incremental en origen siguen pendientes.
