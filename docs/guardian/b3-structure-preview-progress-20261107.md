# Previsualizaciones de construcción — avance B3

Las solicitudes de centros y murallas esperan los recursos sin perder su ID. Una huella compartida, admitida durante el arranque del Worker gráfico, indica una construcción pendiente y se retira al publicar el modelo, rechazar la acción o reconciliar la estructura confirmada. La huella no representa una confirmación de la simulación. Los recibos y eventos se registran por separado para evitar que fallos o retiradas acumulen entradas sin consumir.

La respuesta sigue dependiendo del Worker gráfico: si está ocupado, no se garantiza el siguiente fotograma. La huella no sustituye al modelo semitransparente solicitado y necesita validación visual en la partida. Falta resolver el feedback independiente del Worker y completar B3; estas pruebas no demuestran fluidez ni tiempos de GPU.

Verificación local: 43 pruebas de indicador, admisión, conciliación, material y suelo; compilación de producción del perfil `webgpu-worker` con recuperación temporal. No se ha hecho una comparación visual ni de rendimiento en hardware real.

En paralelo, el material experimental del manglar recibe la variación de atlas basada en la semilla de la vista nativa. Sigue desactivado como alternativa de producto: faltan máscara, otros efectos y paridad visual.
