# Previsualizaciones de construcción — avance B3

Las solicitudes de centros y murallas esperan los recursos sin perder su ID. Una huella compartida, admitida durante el arranque del Worker gráfico, indica una construcción pendiente y se retira al publicar el modelo, rechazar la acción o reconciliar la estructura confirmada. La huella no representa una confirmación de la simulación. Los recibos y eventos se registran por separado para evitar que fallos o retiradas acumulen entradas sin consumir.

La interfaz muestra ahora una señal en el punto de pulsación antes de esperar al pick del Worker; al conocerse el terreno la liga al ID y la proyecta sobre la escena. Se retira al rechazarse la acción o cuando el Worker ha enviado dos dibujos consecutivos con la huella o el modelo visible y la misma versión de cámara y viewport. Los errores y la sustitución del Worker limpian la generación correspondiente. Dos dibujos enviados no demuestran que el compositor haya presentado el fotograma: el traspaso y la apariencia necesitan validación en la partida. La señal no sustituye al modelo semitransparente solicitado y B3 sigue incompleto.

Verificación local: 140 pruebas dirigidas de entrada, indicador, admisión, conciliación, tutorial, material y suelo; compilación de producción del perfil `webgpu-worker` con recuperación temporal. No se ha hecho una comparación visual ni de rendimiento en hardware real.

En paralelo, el material experimental del manglar recibe la variación de atlas basada en la semilla de la vista nativa. Sigue desactivado como alternativa de producto: faltan máscara, otros efectos y paridad visual.
