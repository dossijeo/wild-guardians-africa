# Retirada preparada de una puerta nativa

La orden `removeWall` retira el mecanismo y sus tres proxies en la transacción de mundo kind2. El espejo adopta la retirada antes de ejecutar las consecuencias existentes de Game. Los muros sólidos, las puertas no registradas y la ruta antigua conservan el mismo recorrido de Game. La cotización rechaza una puerta con reparación adquirida y comprueba las familias de parada antes de detener los cuerpos.

## Frontera de autoridad y dibujo

WASM localiza las rutas que aún dependen del mecanismo. La autoridad usa Stop24 para las rutas Farm que lo requieren y deja avanzar los demás cuerpos durante la preparación. El comprobante identifica la entidad, el mecanismo y el triplete ordenado de proxies. La confirmación de Game mantiene el reembolso, la pérdida de bendición y la idempotencia. El Worker entra a esta confirmación en el mismo punto de la cola que las compras.

El dibujo preparado omite la puerta junto con su reloj. La captura oculta el grupo de forma temporal, al igual que la retirada de un lote de bioma. El participante comprueba la identidad del propietario gráfico en la confirmación y lo retira por el fence existente. El Host rechaza un fotograma que aún referencia el reloj de la puerta retirada. Los demás relojes pueden seguir en ese fotograma.

Cancelar o invalidar la retirada conserva el portón, su saldo y sus proxies. La ruta siguiente usa el mismo cuerpo y respeta la espera real de la hoja. El origen de esa ruta conserva la posición y las fases exactas del dueño detenido. Una espera que empieza a menos de una unidad de precisión del origen había añadido `8,27 × 10⁻¹⁶ m` a la primera muestra y alterado un bit de la fase de marcha. El muestreo nativo fija la distancia en cero para el tiempo inicial y conserva las esperas interiores.

## Stop24 con un motor en movimiento

El preparador mantiene la raíz y las geometrías de la puerta y prepara el uniforme escalar de apertura. Su selector identifica la plantilla de Stop24 y el mecanismo. El Host exige el uniforme en el paquete antes de READY, toma la apertura final del recibo de WASM y escribe ese valor antes de enviar el primer dibujo. La selección lee esa misma muestra presentada. El paquete posterior de retirada exige que ya no figure el uniforme preparado ni el reloj del motor anterior.

Cuando la hoja termina su recorrido durante READY, WASM conserva la proyección para ese uniforme si coinciden el mecanismo, la malla y las revisiones del mundo. También comprueba que una ruta afectada conserve la reserva exacta y que la hoja haya alcanzado su destino sin movimiento pendiente. El recibo conserva el propietario y publica su apertura final. Esto permite confirmar el dibujo preparado incluso cuando el motor ya no necesita una mutación. Los cambios de los actores preparados o de la identidad del mecanismo siguen requiriendo otra preparación.

## Puerta cerrada fuera del corredor

Edge con NVIDIA Turing retuvo el READY del ticket 3 durante 613,6 ms con 18 dibujos. La puerta conservó sus mallas y siguió sin abonarse el reembolso mientras el cuerpo 1 avanzaba con el ticket Farm 2. El ticket 4 retiró el mecanismo 1 y los proxies 116, 117 y 118. Game abonó una vez 10 monedas y el dibujo confirmó la ausencia sin reloj de puerta.

La traza registró una llamada a `destroy` por cada uno de los cuatro buffers exclusivos de la puerta. Se conservaron 795 buffers entre 859 vínculos comparables, con cero sustituciones. El trabajador mantuvo la raíz y las geometrías mientras seguía avanzando sobre la misma ruta. El drenaje terminó sin errores. El primer dibujo de la retirada registró 33,4 ms. Las 240 oportunidades se enviaron y superaron el presupuesto C4 de 16,67 ms a 30 Hz, con p95 de 33,6 ms, p99 de 34,4 ms y máximo de 35,5 ms en el arranque.

## Puerta que se abre para Farm

La orden entró con la hoja al 13,25 %. El READY de Stop24 se retuvo 620,8 ms y hubo 18 dibujos mientras el trabajador seguía en movimiento. Los contadores de fábricas se mantuvieron durante esa espera. La hoja acabó de abrirse y el ticket 4 publicó la apertura nativa en 1 para el mecanismo 1. El fotograma presentó ese valor en el uniforme preparado y Game mostró la misma apertura. El cuerpo 1 quedó detenido en z=10,342 durante otros 616,8 ms y 18 dibujos, hasta confirmar la retirada.

El ticket 6 presentó la ausencia de la puerta, de su reloj y del uniforme de parada. Game abonó 10 monedas una vez. El ticket 8 reanudó Farm sobre el cuerpo y la malla originales y cruzó el lugar de la puerta retirada. La traza registró un `destroy` por cada uno de los siete buffers exclusivos. Se conservaron 760 buffers entre 824 vínculos comparables, con cero sustituciones y drenaje sin errores.

Durante la segunda espera los contadores del productor aumentaron en 18 buffers, tres texturas, tres samplers, nueve bind groups, cuatro layouts de grupo, dos layouts de pipeline, dos shaders y dos pipelines asíncronos. La traza cuenta esas altas y deja abierta su atribución por objeto. Los primeros dibujos de los tickets 4, 6 y 8 registraron 33,3, 33,3 y 33,5 ms. Las 240 oportunidades se enviaron y superaron el presupuesto a 30 Hz. El p95 fue de 34,1 ms, el p99 de 35,0 ms y el máximo de 35,8 ms quedó sin atribución.

Quedan la restauración de Repair en curso, las retiradas con otros consumidores del mecanismo y C4. [Recibos de ambos recorridos](performance/native-gate-retirement-20261121.json).

Pasaron 722 pruebas en 51 archivos. Los binarios standalone y pthread conservan los imports y añaden seis exports de retirada. El build de producción con WebGPU Worker y dibujo remoto terminó en 48,46 s.

## Implementaciones consultadas

- Detour registra la solicitud de retirada y actualiza los tiles afectados antes de liberar la identidad del obstáculo. Wild prepara la ausencia con el dueño existente y aplica el cambio a los proxies originales. [DetourTileCache v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourTileCache/Source/DetourTileCache.cpp).
- Jolt coordina la retirada de un grupo de cuerpos bajo la misma frontera de escritura. OpenRA limpia la huella bloqueada al retirar la puerta de su mundo. Wild agrupa el mecanismo y sus tres proxies en la transacción de mundo. [Jolt v5.3.0 BodyInterface](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyInterface.cpp#L187-L196), [OpenRA Gate](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Buildings/Gate.cs#L118-L121).
- Detour copia la posición exacta al reiniciar o reparar el inicio de un corredor. Wild mantiene la pose detenida en el primer nudo de su propio perfil temporal. [DetourPathCorridor v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp).
- Three actualiza los uniformes de un grupo de forma independiente de su reconstrucción. wgpu conserva las escrituras pendientes y las envía antes de los comandos que las consumen. Wild aplica la apertura adquirida sobre el uniforme preparado antes de enviar el dibujo, dentro de la cola existente. [Three r180 Bindings](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js), [wgpu 26.0.1 PendingWrites](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs).
