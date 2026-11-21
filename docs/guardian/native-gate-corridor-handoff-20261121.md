# Compra de puerta en un corredor Farm activo

La compra ordinaria de una puerta de zarzas en x=-14, z=8,2 detuvo la ruta Farm mediante Stop24, adquirió el portón con la transacción de mundo kind2 y retomó Farm desde el mismo cuerpo. El trabajador cruzó el vano con la hoja totalmente abierta. La partida cobró 10 monedas una sola vez.

## Inspección y relevo

El [control original](performance/native-gate-buy-active-route-baseline-20261121.json) rechazaba la colocación antes de enviar recursos, aunque el trabajador estaba fuera del volumen de la puerta. Los proxies de paso permiten trabajadores y no representan la envolvente completa de la hoja. La primera consulta compartía el barrido temporal de adquisición y encontró una colisión futura con el corredor a partir de t=10, cuando el cuerpo estaba a 6 m del vano. Por ese motivo devolvía `-5` antes de identificar el corredor que debía detenerse.

La inspección calcula las reservas afectadas con la envolvente del mecanismo nativo. Sólo en esa consulta, el barrido evalúa esos cuerpos como discos en su pose física actual. Las demás reservas conservan su trayectoria completa. La consulta amplía el conjunto con el cálculo de Stop24 para los discos detenidos y los pasos por otras puertas. Las comprobaciones de montaje, cuerpos, hoja y objetos estáticos siguen vigentes. La preparación y la revalidación de compra exigen que ya no quede una reserva incompatible.

La autoridad copia los IDs, comprueba las familias de parada admitidas y reutiliza la secuencia que ya usaban los muros. Stop24 fija la pose del cuerpo cuando adquiere su recibo. La compra vuelve a validar la cotización y aplica la puerta, el mecanismo, los tres proxies y el débito en la confirmación ordinaria. El productor continúa Farm desde el cuerpo existente. La cancelación después de Stop24 y la cotización obsoleta conservaron las estructuras y el saldo, y Farm retomó su ruta original en los controles.

Los binarios standalone y pthread exponen las tres funciones aditivas de consulta. La versión de consulta es 1. Los imports, las funciones anteriores y las versiones 2 de Settlement17 y Home19 se conservaron. La consulta devolvió sólo el actor 900011 y dejó el ticket de propuesta en cero en ambas variantes. Intentar adquirir en ese momento siguió devolviendo `-5`. El cuerpo físicamente situado en la zona incompatible bloqueó la consulta.

Pasaron las 20 pruebas dirigidas y otras 400 de barreras, puertas, reservas y Stop24. El build de producción con WebGPU Worker y dibujo remoto terminó en 52,35 s.

## Dibujo y recursos

En Edge con NVIDIA Turing, se retuvo la respuesta real de preparación de Stop24 durante 615,8 ms con 19 dibujos. El trabajador avanzó de z=11,152 a z=10,450 antes de confirmarse la parada. Durante los 622,2 ms de espera de la compra se dibujaron otros 19 fotogramas con el cuerpo 1 en la misma pose detenida. La puerta y el cargo siguieron pendientes en ambas esperas.

Stop24 adquirió el ticket 4, la compra el 6 y la nueva ruta Farm el 8. La puerta adquirió el mecanismo 1 y los proxies 116, 117 y 118. La ruta atravesó z=8,2 a x=-13,9496 con la apertura en 1. La raíz 616 y las 32 geometrías de Farm siguieron residentes. Se conservaron 760 identificadores de buffers entre 824 vínculos comparables, con cero sustituciones. WebGPU confirmó el drenaje sin errores.

Los primeros dibujos de los tickets 4, 6 y 8 registraron 33,4, 33,3 y 33,2 ms a 30 Hz. Se enviaron las 240 oportunidades de la ventana y el mayor intervalo fue de 36,9 ms en un dibujo repetido del ticket 4. Sigue sin atribución y C4 queda abierto. La retirada preparada de una puerta y la cobertura de otras formas del corredor siguen pendientes. [Recibo](performance/native-gate-corridor-handoff-20261121.json).

## Implementaciones consultadas

- DetourTileCache reúne los tiles afectados mediante los límites de cada obstáculo y deduplica su lista de actualizaciones. Wild usa el índice nativo de reservas y los límites de la puerta para localizar las rutas afectadas. [DetourTileCache v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourTileCache/Source/DetourTileCache.cpp#L502-L611).
- DetourCrowd conserva el agente cuando detecta que debe reemplazar su corredor. Wild conserva el cuerpo y usa su parada preparada para mantener la pose nativa exacta. [DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L887-L983).
- Jolt prepara, confirma o cancela la incorporación al índice espacial mediante el mismo dueño. Wild aplica ese ciclo en su transacción de mundo existente. [Jolt v5.3.0 BodyInterface](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyInterface.cpp).
