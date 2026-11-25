# Publicación de Action15 al restaurar una partida pausada

La recarga v1 de una reparación sólida puede adquirir Action15 mientras la partida sigue en pausa. Antes del cambio, el ticket 2 se adquirió a los 30,85 s y la autoridad publicó 490 secuencias confirmadas con `pending-action-resources`. Surface esperaba `native-action` del mismo trabajador y agotó su plazo. El dueño de la acción solo marcaba cambios pendientes para que Game los proyectara al avanzar.

El puente proyecta ahora Action15 al recibir los recursos confirmados en la misma época. Reutiliza la proyección que comprueba tarea, objetivo y frontera y mantiene el progreso en el instante de adquisición. El productor difiere los sucesores automáticos de una acción completada mientras haya pausa. Si la partida se pausa cuando un sucesor aún prepara READY, la revalidación lo cancela y descarta su respuesta tardía. El renderer conserva su predicado de adopción y su plazo.

OpenRA aplica las tareas diferidas de final de frame incluso cuando se detienen los ticks de actores y efectos. Wild Guardians usa la misma distinción entre publicar el resultado ya adquirido y hacer avanzar la acción que lo sigue. [OpenRA `World.Tick`](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/World.cs#L393-L432).

## Verificación

- El guardado físico v1 anterior se reprodujo en los Workers de producción con WASM real y doble de GPU. El control anterior se quedaba en `pending-action-resources`. Al aplicar solo la proyección, Idle se preparaba durante la pausa. Con la corrección completa se publicaron cinco estados en el mismo instante. Después de reanudar, una segunda pausa canceló el READY de Idle y el siguiente intento terminó tras volver a reanudar.
- En NVIDIA, con READY entregado normalmente, la partida permaneció pausada 22 segundos. Action15 ticket 2 quedó publicado a los 30,85 s y la edad enviada a la GPU se mantuvo en `0.099999994`. La pausa conservó el progreso, el saldo y el único `RepairApplied`. Idle se adquirió tras reanudar con el mismo cuerpo 1. Se conservaron los 734 buffers comparables y el consumidor drenó. [Recibo físico y controles](performance/native-paused-action-publication-20261125.json).
- Pasaron 356 pruebas de la selección integrada de 20 archivos y el caso aislado con el v1 real. Plant, Water y Despertar están incluidos en la regresión. El build de producto con WebGPU Worker y Draw remoto pasó en 49,53 s. Se usaron los binarios WASM canónicos.

## Preparación fría pendiente

Un intento físico tras aplicar el cambio agotó los 10 segundos de la solicitud antes de adquirir Action15, con READY entregable. En la repetición instrumentada, READY llegó 9,655 s después de enviar la solicitud. Surface esperó 4,860 s a la secuencia inicial, el roster tardó 3,863 s y el ticket de pipeline tardó 0,846 s. Esos tiempos pertenecen a la repetición que terminó y delimitan dónde se consume el margen. El agotamiento intermitente anterior queda abierto.

Un contraste físico conectó el puerto de preparación después de `waitForCurrentFrame`, usando el mismo guardado y la misma pausa de 22 segundos. La solicitud llegó a READY en 4,244 s, con 1,696 s de espera de publicación, 1,760 s de roster y 0,716 s de pipeline. La autoridad ya pedía la secuencia 94 cuando Surface tenía la 1. El tiempo del ancla de navegación a READY fue de 13,401 s frente a 14,178 s en el orden actual. Este par de pruebas delimita el margen del plazo y la secuencia que debe acreditarse antes de cambiar el arranque de producto. [Contraste y hashes](performance/native-paused-action-publication-20261125.json).

Una sonda independiente retuvo READY artificialmente durante 22 segundos y confirmó el mismo límite de la solicitud. El resultado esperado de esa sonda se conserva junto al fallo de la corrida que sí entregaba READY. La prueba funcional positiva registró máximos de dibujo de 38,0 y 37,9 ms y guardó la traza Dawn sin pérdida. C4 sigue abierto. [Secuencia de preparación y hashes](performance/native-paused-action-publication-20261125.json).

En el intervalo de 38,0 ms, el Draw Worker recibió `BeginFrame` 4,61 ms después de Viz. Mientras tanto importó `Texture:211`. La región de 512×512 en la posición `(1024, 512)` de un atlas sRGB de 2048×2048 tardó 4,10 ms. En el intervalo de 37,9 ms, el mismo hilo tardó 6,13 ms en un manejador de mensajes, incluidos 5,92 ms de serialización. Queda identificar el tipo del mensaje y, en particular, comprobar si era una inspección del arnés. [Eventos y tiempos relativos](performance/native-paused-action-publication-20261125.json).
