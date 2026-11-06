# Proyección confirmada del HUD

El host Worker añade a las publicaciones proyectadas una vista `hudProjection`
versión 1 con secuencia, reloj, día, noches, saldo y los datos mínimos que usan
los permisos, tarjetas de magia y medidor de Despertar. El consumidor verifica
la proyección contra el estado confirmado antes de aceptarlo. Los pliegues de
vistas conservan la secuencia del último mensaje y el cliente temprano entrega
la misma vista a los consumidores del HUD. Las rutas antiguas reconstruyen la
proyección desde el estado confirmado como fallback.

El HUD del perfil Worker consume esta vista para indicadores, aviso de saldo,
permisos de muralla, tarjetas de magia, permisos de construcción y Despertar.
No es un estado autoritativo, una fuente de comandos ni un checkpoint. Las
pruebas comprueban equivalencia de reglas para pausa, incursión, ausencia de
centro y enfriamientos; validan también orden, aislamiento, rechazo anterior al
commit y agrupación de publicaciones.

Esto no elimina todavía el snapshot completo: se sigue transfiriendo y usando
para verificar la proyección y para tutorial, selección, comandos, audio,
notificaciones y guardado. El host y el cliente aún recorren datos; no se ha
medido un ahorro de CPU o tráfico ni una partida integrada. La migración de
esos consumidores y el protocolo incremental en origen siguen pendientes.
