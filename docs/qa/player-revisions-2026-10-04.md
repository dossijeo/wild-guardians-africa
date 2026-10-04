# Cambios solicitados tras jugar en móvil

Estas decisiones del usuario tienen prioridad sobre los labs y las reglas anteriores. El objetivo completo del plan maestro sigue activo. La verificación general anterior no acredita automáticamente estas revisiones nuevas.

| Petición | Estado y evidencia actual |
| --- | --- |
| Caminar: desplazamiento y animación +50 % | Implementado, commit 634e77c. 48 tests de locomoción, acciones y contactos sonoros aprobados; comprobación visual en partida pendiente. |
| Correr: desplazamiento +50 %, cadencia original | Implementado en el mismo commit; fases y agotamiento por metros probados. |
| Agua alineada al extremo de la regadera | Pendiente de revisar los cuatro rigs originales y el emisor. |
| Entrega por el borde más próximo de la casa desde el cultivo | Pendiente de sustituir el punto de servicio fijo. |
| Cosecha automática, sin acción ni mini modal | Implementado en simulación y UI; madurez real, cultivo maduro guardado, reconstrucción de colas tras incursión y entrega pagada una sola vez probados. Tutorial bilingüe y mano manual retirados. Recorrido visual móvil pendiente. |
| Tocar cultivos/aplicar magia conserva modo de magia | Implementado: la selección de cultivo solo cancela los otros modos; confirmar poder conserva el modo. Prueba de interacción en partida pendiente. |
| Muralla dibujada con dedo y límite saldo menos reserva de 100 | Pendiente de recorte del trazo y comprobación táctil. |
| Construir muralla inmediatamente al soltar, sin modal | Pendiente. |
| Eliminar muralla devuelve su valor restante | Pendiente de cálculo, idempotencia y texto bilingüe. |
| Tutorial fuera de todo el lateral seguro en landscape | Pendiente de layout y capturas. |
| Contratación obligatoria sin cierre | Implementado sin botón de cierre; el controlador impide cerrar o sustituirla hasta confirmar. Game Over puede sustituirla. Tests de bloqueo y resolución aprobados; Escape comprobado en la partida real del navegador integrado: la modal permanece abierta, sin botón de cierre. Vista móvil y confirmación visual pendientes. |
| Primera incursión en noche 1 | Pendiente; sustituye explícitamente noche 2 anterior. |
| Spawn cercano justo detrás de cámara real | Pendiente de conexión entre presentación y navegación, rutas e incursión visual. |
| Pantalla permanece encendida durante ejecución | Commit 9f0d8fb, seis tests y concesión/liberación de API real documentados en screen-wake-lock.md. Prueba física móvil y política del iframe de itch.io dependen de la plataforma. |

Cosecha: `harvestRequested` sigue siendo estado lógico persistente, ahora generado automáticamente. No se cobra al madurar ni recoger; únicamente al entregar la caja. Se conserva la función programática de compatibilidad para los fixtures anteriores, sin acción manual accesible en la interfaz del juego. Los mensajes de cosecha del tutorial describen el trabajo automático, no un botón.

Aclaración del usuario: el automatismo solo inserta una tarea en la cola FIFO. Sin trabajador, el cultivo sigue vivo y no se crea caja ni ingreso. El trabajador debe recorrer el camino hasta la planta, completar su acción nativa de recolección y transportar físicamente la caja hasta el centro; el abono ocurre al entregar. Este recorrido no se abrevia ni se sustituye por cobro al madurar.

Regresión tras estas revisiones: la suite completa de 43b3ce1 produjo 1.441/1.490 aprobadas, con 49 fallos de escenarios anteriores. Se revisaron individualmente: las nuevas pruebas mantienen FIFO, cuidado físico, turnos, rutas seguras, carga, persistencia y liquidación una sola vez; los valores esperados incluyen los ingresos de cosecha automática y el desplazamiento revisado. El caso de dos cosechas pendientes al amanecer usa contratación cero y maduración real tras el final de turno, no plantas retiradas ni ingresos artificiales. Se distingue además en los eventos si un encuentro fue colisión física o ataque de proximidad; solo la colisión genera empujón.

Validación dirigida tras adaptar los 49 escenarios: 121/121 movimiento, encuentros, turnos, manos, audio de desbloqueo y replay determinista; 43/43 agricultura, personal, colas y cajas; 24/24 superficies, UI y cosecha automática. Tras la reducción de búsquedas repetidas de tareas: 30/30 agricultura/colas/cajas, build aprobado y paquete web de 578 archivos, 816 enlaces relativos y 20 GLB de runtime aprobado. El CI completo del nuevo commit queda pendiente; estos grupos se solapan y no se presentan como una nueva suite completa aprobada.
