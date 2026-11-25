# Regreso civil desde el refugio en Sabana 712

La calificación DEV del día 2 completa la vuelta al trabajo tras una incursión diurna. Game gasta los dos golpes del facóquero en plant-5 y plant-7, termina su retirada y declara el regreso del mismo trabajador desde (60, 0). El nuevo Farm23 acredita la baja de Home19, conserva pose, fases y presupuesto, y vuelve al centro sin urgencia. La persona, el contrato, el saldo 190 y sus asientos se conservan. [Contrato y reproducción CPU](sabana-flee-civil-return.md).

Dos órdenes de entrega llegan a Idle con la autoridad WASM y los puertos de producción sobre el dispositivo de prueba. El negativo adultera la secuencia de retiro y rechaza la preparación. En el checkout integrado pasaron 87 pruebas de Farm, Flee, Retreat, control y roster. Se verificaron ambos WASM, la firma del nuevo export y la compilación Vite. El chequeo del paquete web falla al verificar una referencia de origen del manifiesto de LOD de búfalo que ya figura en la base. El fichero `content/source/character-lod/buffalo-decoded.glb` está ausente del paquete.

## Recorrido observado en NVIDIA Turing

La captura de diagnóstico presenta la primera ausencia del facóquero en el paquete 494 tras el último Retreat del paquete 493. Después se adquiere Farm23 sobre el cuerpo nuevo 3 de worker-21, person-9. El primer dibujo del retorno presenta el ticket 21 en el instante de su adquisición. El trabajador llega a Idle en (88, 1,999494), sin daño, y el consumidor devuelve su recibo de drenaje. El corte anterior de huida conserva 2.974 de 2.974 referencias comparables y cambia una versión de atributos en su mismo buffer.

La primera captura se detuvo con un aviso de recursos que el arnés redujo a una cadena genérica. La segunda conservó el objeto del aviso y registró el recorrido completo. Ambas quedaron rechazadas por el criterio de recursos. El aviso de agriculture-vfx es `Cannot order uncommitted published resource mutations`. Se registró junto al primer relevo de golpe; el contraste de su propietario exacto y la repetición estricta siguen abiertos.

| Frontera | Intervalo entre envíos del Host | Trabajo observado |
| --- | ---: | --- |
| Primer golpe, paquete 406 | 833,30 ms | El Preparer ocupa 289,06 ms (284,67 ms CPU) y el Host espera recursos 346,6 ms antes de admitir el paquete. Su dibujo tarda 6,60 ms. |
| Segundo golpe, paquete 427 | 466,70 ms | El Preparer ocupa 274,64 ms (274,33 ms CPU). La espera medida de recursos es cero. El dibujo tarda 6,20 ms. |
| Fin de Retreat, paquete 494 | 166,60 ms | El Preparer ocupa 51,43 ms (50,85 ms CPU), seguido de transporte y admisión. El dibujo tarda 7,60 ms. |

En 711 paquetes ordinarios, se emparejaron emisor y receptor por secuencia y se midió el tramo de deserialización dentro del callback de Draw. Mediana 6,94 ms, p95 8,59 ms y máximo 14,11 ms. El paquete del máximo tiene 5.840 comandos de pase, 484.064 bytes en buffers transferidos y ninguna imagen. Los bytes describen los buffers transferidos y excluyen el tamaño serializado del árbol de comandos. El tramo de deserialización mide CPU del hilo Draw. [Chromium, despacho de MessagePort](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/messaging/message_port.cc#L345-L417).

El entorno de esta captura entregaba oportunidades a 30 Hz. C4 sigue abierto con su objetivo físico de 16,667 ms. También quedan el encuentro físico con el animal, AttackCenter en el desierto, las adversidades de Recovery y la activación ordinaria. [Recibos, cortes y hashes](performance/native-sabana-civil-return-20261125.json).

La repetición posterior completó el mismo recorrido con el criterio estricto de cero avisos y drenó la cola. [Recorrido estricto en NVIDIA](native-retirement-presentation-fence-20261125.md).
