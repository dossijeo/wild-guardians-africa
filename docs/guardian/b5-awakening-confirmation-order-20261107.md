# Confirmación de Despertar adelantada al gesto visual

La acción de Despertar y el estado confirmado llegan al Worker gráfico por canales distintos. Antes, si `BlessingApplied` se recibía primero, se marcaba el comando como confirmado y se descartaba el mensaje visual posterior; nunca se mostraba el gesto. La presentación conserva ahora el hecho reciente por ID y usa la posición visual recibida para iniciar el gesto confirmado una sola vez. El hecho no sustituye otro gesto activo, no recupera objetivos retirados ni reproduce una animación con más de medio segundo de antigüedad de simulación. Las reglas y beneficios siguen siendo autoritativos.

Las pruebas de componentes cubren los dos órdenes, la deduplicación, objetivos retirados y gestos superados. El checkpoint conserva los hechos recientes para que una restauración no los pierda; la entrega de la entrada visual tras una pérdida completa del Worker gráfico sigue sin verificarse. No se ha validado esta carrera en una partida real. No se han medido tiempos de fotograma ni se afirma una mejora de rendimiento.

