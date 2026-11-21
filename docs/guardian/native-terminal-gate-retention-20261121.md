# Settlement17 y Home19 tras un cruce de portón

Carry y Home conservan el historial del portón que cruzaron. Al completar la entrega o llegar al pueblo, la autoridad comprueba si liberar la reserva de paso modificaría algún motor. Los dos terminales usan el mismo predicado nativo que la retirada efectiva y lo vuelven a comprobar al confirmar. Las versiones de esas dos consultas WASM pasan a 2. Los nombres y tipos de la ABI y el formato de los recibos se conservan.

Las mallas y los relojes del portón siguen perteneciendo al muro. El roster entrega el historial de la ruta y Settlements verifica que cada motor siga en su dueño residente. El Host exige los relojes independientes cubiertos por la frontera en el paquete efectivo del fotograma. Preparar o refrescar la entrega y la ausencia reutiliza los recursos del muro. La comprobación de dueño se conserva durante la renovación del recibo.

DetourCrowd elimina el destino y su petición dentro del agente. Babylon.js separa una malla de su geometría y conserva el recurso mientras siguen usándolo otros propietarios. Wild Guardians conserva el portón al retirar al trabajador o su trayecto utilizando sus propias fronteras nativas y sus reservas existentes. [DetourCrowd v1.6.0, resetMoveTarget](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L609-L625) · [Babylon.js 7.0.0, Geometry.releaseForMesh y applyToMesh](https://github.com/BabylonJS/Babylon.js/blob/7.0.0/packages/dev/core/src/Meshes/geometry.ts#L663-L710).

## Validación física

Carry volvió por el mismo vano con la caja y conservó el cuerpo 1. El ensayo retuvo READY durante 620,1 ms. Hubo 19 dibujos y el saldo seguía en 100.000. Después se dibujó el ticket definitivo 12 y el libro mayor registró un solo abono de 14 monedas. La entrega mantuvo 843 buffers de malla, con 1.011 relaciones de dueño y atributo y cero sustituciones. El primer dibujo de la entrega llegó tras 33,4 ms a 30 Hz. El consumidor drenó con cero errores.

En NVIDIA Turing, Home cruzó por x=-13,9496 y conservó el cuerpo 1 y las 36 geometrías hasta llegar a z=11,8. El ensayo retuvo READY durante 625,3 ms y registró 19 dibujos con el trabajador aún presente. El ticket definitivo 8 presentó la ausencia. El portón siguió dibujándose por otros 681,5 ms y 23 dibujos. La retirada conservó 791 buffers, incluidas las siete referencias del portón. El consumidor drenó con cero errores. [Propiedad del reloj después de Home](native-clock-ownership-after-home-20261121.md).

En otra ejecución se movió la cámara a z=31 mirando hacia z=43, más allá del margen de 16 m del encuadre remoto. El renderizador registró cero dibujos del portón y el consumidor conservó su reloj. Home19 dibujó la ausencia y la escena registró otros 672 ms y 23 dibujos. Los 707 buffers de dueños que seguían en escena conservaron sus IDs, incluidos los siete del portón. Las 240 oportunidades enviaron dibujos y el consumidor drenó. [Prueba fuera del encuadre](performance/native-terminal-gate-retention-20261121.json).

El perfil `olderFemale` también pasó Home19 en NVIDIA con el portón residente. Conservó el cuerpo y sus 33 geometrías durante el trayecto, mantuvo el trabajador durante 614,2 ms de READY retenida y dibujó su ausencia con el ticket 8. Después siguieron 23 dibujos y el drenaje. Los 767 buffers de los dueños que permanecieron conservaron sus IDs. [Recibo del perfil](performance/native-terminal-gate-retention-20261121.json).

## Controles nativos

Standalone y pthread devuelven las dos versiones 2 y mantienen los nombres y tipos de sus interfaces, con 779 exportaciones en standalone y 800 en pthread. Los seis controles con WASM standalone usaron el portón 1000000 y sus reservas reales. Para ambos terminales, una propuesta de motor posterior fue rechazada con −7 y un intento de reescribir el motor reservado fue rechazado con −9. Los dos terminales pudieron confirmar después de esos rechazos. En el tercer control, una publicación causal de motor preparada antes del terminal incrementó la revisión sin cambiar el motor reservado. El terminal anterior fue rechazado con −2 y conservó el cuerpo y el estado económico en ambos casos.

Pasaron 1.020 pruebas en 78 archivos y el build de producción con `webgpu-worker` y dibujo remoto. Los controles de los participantes también cubren un recibo ajeno, un dueño revocado y el rechazo de WASM v1 por el bridge.

La ventana conservada de 240 oportunidades de cada prueba física envió todos sus dibujos. Los intervalos máximos fueron 36,1 ms durante Carry y 37,0 ms durante Home antes de las fronteras terminales. [Recibos físicos y nativos](performance/native-terminal-gate-retention-20261121.json).

Quedan pendientes las retiradas de paso que cambian un motor y las que requieren un reloj cuyo dueño gráfico ya se retiró. La aceptación C4, las demás adversidades de la partida y la validación en otras configuraciones siguen abiertas.
