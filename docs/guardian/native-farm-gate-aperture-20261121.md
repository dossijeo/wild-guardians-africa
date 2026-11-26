# Farm cruza el vano de una puerta restaurada

La puerta de zarzas guardada en `x=-14,z=8.2` rechazaba el corredor centrado antes de comprobar los motores. Una primera revisión dejó que el barrido examinara solo el proxy transitable de la puerta registrada. El barrido rechazó la ruta central porque una saliente de la hoja abierta quedaba a 0,2656 m del eje y el trabajador tenía radio de 0,28 m. Un camino válido necesita pasar ligeramente hacia el centro del espacio libre. [Pruebas antes de la corrección](performance/native-farm-gate-aperture-baseline-20261121.json).

El planificador existente comprueba el marco y la hoja abierta al evaluar sus tramos. Si el directo invade la puerta, prueba los extremos del conector que ya registra el mundo. Esa comprobación conserva el radio del trabajador y el modelo de colisión existente. La ruta aún debe adquirir su reserva y pasar el barrido temporal, que comprueba cuándo se abre la hoja y dónde están los demás cuerpos. La revisión estática del overlay invalida el camino guardado al instalar o retirar el mecanismo. La apertura o el cierre en cada fotograma utiliza la misma entrada del planificador mientras la topología se mantenga. Se conservan las comprobaciones de solidez ordinarias.

Detour busca la referencia exacta de una conexión especial dentro de su corredor y obtiene de la malla los dos extremos. Wild Guardians usa los dos extremos del portal ya registrado para guiar la ruta nativa. [Código de Detour](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp#L356-L395).

En la autoridad, las dos posiciones centradas de zarzas adquirieron una ruta de tres puntos y 6,60 m con la puerta 1000000. El plan cruzó en x=-13,9496 en ambas. El control descentrado también pasó por su propio vano. En NVIDIA, el trabajador salió de z=11,8, cruzó z=8,2 con la hoja totalmente abierta y llegó a z=7,70 con Farm aún en marcha. El ticket 2 retuvo el cuerpo 1, la raíz 619 y sus 32 geometrías. La puerta conservó la raíz 474 y la geometría 202. El Host dibujó 142 veces con ese ticket sin errores y confirmó el drenaje. El máximo entre dibujos fue de 36,0 ms a 30 Hz. [Recibo](performance/native-farm-gate-aperture-20261121.json).

Los controles incluyen la ruta en ambos sentidos, invalidación de la ruta guardada tras instalar la puerta, reutilización estable de la caché en rutas alejadas, rechazo de una ruta central explícita, sólidos vecinos, cuerpos en el barrido y proxies sin propietario o de otra forma. Quedan la compra que obliga a relevar el corredor activo, la retirada preparada, los cruces integrados con tráfico o con Carry y C4.

Pasaron 62 pruebas de integración y regresión con standalone y 17 comprobaciones en pthread. El rechazo del corredor central explícito ocurre al intentar restaurarlo, antes de adquirir una ruta o activar su motor. Las pruebas dirigidas de los tres materiales y del barrido contra otro cuerpo pasaron con el binario candidato. La interfaz WASM conserva sus 772 exports standalone y 778 funciones públicas pthread. El factory y el Worker auxiliar conservaron sus bytes. [Hashes y resultados](performance/native-farm-gate-aperture-20261121.json).

La compilación Vite de producción con WebGPU Worker y dibujo remoto completó el empaquetado.

## Pausa con la hoja en movimiento

La pausa ordinaria durante Farm congeló el cuerpo y el motor en el segundo 10,5 con apertura 0,216. NVIDIA envió 13 dibujos en la parte estable de los 550 ms del control y registró un máximo de 33,5 ms a 30 Hz. Al reanudar, Farm cruzó con apertura 1 sin cambiar el ticket 2, el cuerpo 1, las 32 geometrías ni la malla de la puerta. El consumidor confirmó el drenaje con cero errores. [Recibo de la pausa](performance/native-farm-gate-aperture-20261121.json).

## Guardado tras el cruce

El coordinador de guardado rechazó escribir durante Farm en marcha, incluso con la partida pausada y la hoja fija en apertura 0,216. Tras cruzar y adquirir Idle, escribió un checkpoint de 12 regiones. Una nueva autoridad verificó la reconstrucción de la topología y adquirió Idle20 con la misma posición y fases del trabajador y el mismo portón abierto a 60/60 HP. El control usa WASM, el Host determinista y un repositorio en memoria. [Recibo del guardado](performance/native-farm-gate-aperture-20261121.json).

## Una primera tarea con el motor preparado

Harvest hacia un cultivo al otro lado de una puerta sana reproducía el rechazo de Task14 después de confirmar sus recursos. La comprobación de la ruta ya verificaba el cuerpo, la asignación, la geometría y los tiempos relativos de la hoja. Una segunda comparación exigía las marcas absolutas originales del motor. Task14 usa ahora la comprobación de su atestación con ambas fronteras y rechaza una confirmación sin atestación, incluso con marcas absolutas idénticas. El Host conserva su ajuste de reloj existente para el dueño preparado. [Contrato de Task14](../../src/world/native-task-start-attestation.js), [ajuste del reloj](../../src/rendering/native-route-control.js#L682).

En NVIDIA, el ticket preparado 5 de tiempo 10,05 se adquirió como ticket 6 de tiempo 12,25. Mientras la prueba retuvo READY, el trabajador y la hoja se quedaron en su pose de espera. Tras la adquisición, el trabajador cruzó por x=-13,9496 con la hoja abierta. Conservó el cuerpo 1, su raíz y las 36 geometrías y el portón mantuvo raíz y geometría. El primer dibujo fue de 33,4 ms y el máximo observado de 37,9 ms a 30 Hz. El consumidor drenó con cero errores. Quedan la transición visual de Repair y la cadencia a 60 Hz. [Recibos y regresión](performance/native-task14-gate-retiming-20261121.json).

La prueba de regresión usa Game, WASM y los puertos reales con un Host determinista. Reproduce el rechazo anterior y comprueba que la atestación admite las filas relativas correctas. Rechaza una confirmación sin atestación y las alteraciones de tiempos, geometría o mecanismo. Pasaron 981 pruebas y la compilación de producto WebGPU Worker con dibujo remoto.

La partida de ida y vuelta cruzó con Task14, cosechó con Action15 y regresó por la misma hoja con Carry16. NVIDIA dibujó los tickets 6, 8 y 10 sobre el cuerpo 1. El cultivo produjo una sola caja. Las 13 mallas añadidas al actor durante Carry usaron geometrías que ya estaban en el conjunto residente de 36 mallas. El portón conservó su raíz y geometría. El primer dibujo de Carry fue de 33,4 ms a 30 Hz y los máximos de la ventana anterior fueron 39,0 ms en Task y 39,8 ms en Action, ambos en dibujos de repetición, con causa pendiente. El ensayo terminó tras el cruce de regreso y drenó con cero errores. [Recibo de ida y vuelta](performance/native-task14-gate-retiming-20261121.json).

### Cadencia con la pantalla a 60 Hz

La misma partida con trazado CDP completó los dos cruces en NVIDIA con la pantalla a 3840 × 2160 y 60 Hz. El auditor midió intervalos entre los inicios de los dibujos que el consumidor llegó a enviar y retuvo las siguientes muestras. El presupuesto es 16,666… ms.

| Fase | Muestras | Sobre el presupuesto | p95 | Máximo |
| --- | ---: | ---: | ---: | ---: |
| Task14 | 434 | 243 | 17,9 ms | 21,7 ms |
| Action15 | 300 | 175 | 16,9 ms | 25,3 ms |
| Carry16 | 230 | 131 | 18,3 ms | 23,2 ms |

Durante el intervalo de 25,3 ms el consumidor envió ambas oportunidades sin retención. Entre las señales de Viz pasaron 16,54 ms. Los callbacks de dibujo empezaron 0,20 ms y 8,95 ms después de sus señales cercanas. El callback anterior ya había terminado. El `CommandBuffer::Flush` de 12,87 ms terminó 7,81 ms antes de la segunda señal. Una tarea de autoridad de 11,23 ms solapó la espera, con causalidad pendiente. Una oportunidad se retuvo antes del primer dibujo de Carry, de 23,2 ms. En otro intervalo de Action, la traza registró `pump` de preparación durante 225,35 ms en su Worker. Los hilos se solapan en el tiempo. La captura se exportó sin pérdidas y se restauró el modo original de 4K a 30 Hz. C4 sigue abierto. [Traza y contadores](performance/native-task14-gate-retiming-20261121.json).

La captura adicional con eventos de Blink terminó antes de adquirir Idle20. En ese arranque, el intervalo de 207,90 ms contiene una llamada `CompositorFrameSinkClient::OnBeginFrame` de 190,00 ms en el propio hilo de dibujo. Se identificó el método con el hash del generador de Mojo. En ese tiempo Viz registró 12 señales y la captura carece de eventos Blink o JavaScript anidados en esa tarea. La espera interna del receptor sigue pendiente de atribución. El intervalo de 67,75 ms sigue a un callback que pasó 63,25 ms en `CommandBufferProxyImpl::Flush`. El de 143,87 ms sigue a un callback que pasó 142,69 ms en `present`, con la mayor parte del tiempo pendiente de atribución. Los eventos de Blink separan la recepción de `BeginFrame`, su microtarea y el callback. Esta segunda captura caracteriza el arranque y conserva su fallo en el recibo. El seguimiento de Action sigue abierto. [Recibo](performance/native-task14-gate-retiming-20261121.json) · [Código del proveedor de BeginFrame](https://chromium.googlesource.com/chromium/src/+/5cf4b8b13ed518472038170f8de9db2f6c258fe4/third_party/blink/renderer/platform/graphics/begin_frame_provider.cc#104) · [Código del callback del Worker](https://chromium.googlesource.com/chromium/src/+/78c3f601c9b3851be1810f3c3f885167a134b6af/third_party/blink/renderer/core/animation_frame/worker_animation_frame_provider.cc#43) · [Generador del hash](https://github.com/chromium/chromium/blob/main/mojo/public/tools/bindings/generators/mojom_cpp_generator.py#L216-L219) · [Nombre del método en el generador](https://github.com/chromium/chromium/blob/main/mojo/public/tools/bindings/generators/cpp_templates/interface_definition.tmpl#L140-L148).

Una tercera captura dejó completar el arranque visual antes de iniciar el recorrido. En 4K a 60 Hz terminó los dos cruces y drenó con cero errores. Superaron 16,67 ms 556 de 980 intervalos. El máximo fue 26,8 ms en Action15. Viz emitió nuevamente a los 16,66 ms. El observador de Mojo empezó 10,45 ms después. Desde la recepción por Blink hasta el callback pasaron 0,022 ms. Durante la espera, la traza solo registra en el hilo de dibujo la propia entrega de Mojo al final del intervalo. Sí había un mensaje de Game en el hilo principal del navegador y un mensaje en el Worker de autoridad. Su solapamiento sigue pendiente de atribución. Los máximos de 22,2 ms en Task14 y 22,9 ms en Carry16 siguieron a la liberación de sendas retenciones. Se restauró el modo original de 30 Hz. [Traza en caliente](performance/native-task14-gate-retiming-20261121.json).

## Carry por el vano

El mijo maduró en el lado de entrada de la puerta y Game asignó Harvest. Carry16 adquirió el mismo cuerpo 1, la caja y el motor 1000000. Con la hoja abierta el trabajador pasó de z=8,28 a z=8,17 por x=-13,9496. En el control con WASM y Host determinista llegó al centro y generó un solo abono de 14 monedas.

En el ensayo inicial, Carry dibujó el ticket 10 y llegó a x=-14, z=4,639. La preparación de Settlement17 rechazaba el historial del motor. El recorrido corregido dibujó la entrega con el ticket 12, conservó el cuerpo y el portón, abonó 14 monedas una sola vez y drenó. [Recibo inicial](performance/native-ordinary-carry-gate-20261121.json) · [Entrega verificada](native-terminal-gate-retention-20261121.md).

## Home por el vano

El fin de turno de `youngMale` desde Idle20 solicitó Home18. Salió de z=5,7 y cruzó el vano por x=-13,9496 con la hoja abierta. NVIDIA dibujó el ticket 6 con el cuerpo 1, la raíz 695 y las 36 geometrías del trabajador. La puerta conservó su raíz 397 y la malla residente. El mayor intervalo observado durante el cruce fue de 37,2 ms a 30 Hz.

En el ensayo inicial, Home19 rechazó la preparación de retirada al llegar a z=11,8 porque el trayecto había usado el portón. El recorrido corregido dibujó la ausencia con el ticket 8. El portón conservó su reloj y siguió dibujándose otros 681,5 ms antes del drenaje. [Recibos iniciales](performance/native-ordinary-home-gate-20261121.json) · [Retirada verificada](native-terminal-gate-retention-20261121.md).

## Empalizada y portón reforzado

En ambos materiales, un portón comprado mediante la orden ordinaria y restaurado con yaw 0 dejó cruzar por el centro con apertura 1. Farm conservó el cuerpo 1, la raíz y las 32 geometrías del trabajador. El portón conservó su raíz y geometría. NVIDIA dibujó las 137 oportunidades registradas con el ticket 2 en cada caso y drenó con cero errores WebGPU. Los máximos fueron 36,3 ms en empalizada y 36,0 ms en reforzado con pantalla a 30 Hz.

Con yaw 0,37 rad, el plan de empalizada incluyó el motor, pero cruzó el plano unos 2,11 m a un lado del eje. Se reprodujo en WASM con Host determinista en dos posiciones y se verificó el rodeo en NVIDIA con la puerta a 120/120 HP. El control equivalente de reforzado produjo `farm-arrival unsupported` en el Host determinista. Ambos casos oblicuos quedan pendientes. [Recibos alineados y oblicuos](performance/native-farm-other-gate-apertures-20261121.json).

## Dos trabajadores hacia el mismo centro

En la prueba con WASM y Host determinista, el segundo Farm espera mientras el primero ocupa la llegada común. Cuando el primero sale de allí en Idle22, el segundo adquiere su propio cuerpo y cruza el mismo vano. El control sin portón también espera por el destino ocupado. En NVIDIA Turing se dibujó primero la escena confirmada con ambas figuras y el portón y se conectó después la preparación nativa. Los tickets 2 y 6 llevaron los cuerpos 1 y 2 por x=-13,9496 con apertura 1. Se conservaron las dos raíces, sus 32 geometrías por trabajador y la malla del portón. El cierre drenó con cero errores. Las muestras conservadas de tránsito registraron máximos de 35,1 y 35,6 ms a 30 Hz.

Durante el arranque del ensayo se registraron dos intervalos aún sin atribución de 42,4 y 47,7 ms, antes de adquirir Farm. El control en frío agotó el plazo mientras preparaba los tickets gráficos. En otro control, la maduración durante el primer Farm pidió una parada en z=7,535, después de cruzar. En esa versión, la validación de Stop24 rechazó la ausencia de la pose proyectada del motor. [Recibo de tráfico](performance/native-ordinary-farm-gate-traffic-20261121.json).

El repro posterior guardó los datos tipados de esa frontera. La parada propuesta situaba al cuerpo 1 en z=5,75 tras pasar el vano. Su paquete de Farm conservaba el historial del mecanismo 1000000, abierto por completo desde el segundo 16,67. El diario nativo de Stop24 llegó vacío para los motores en el segundo 21,90. La corrección conservó el motor residente y completó el dibujo y el drenaje en NVIDIA con ambos trabajadores. [Diario original](performance/native-ordinary-farm-gate-traffic-20261121.json) · [Validación de Stop24](native-farm-stop-historical-gate-retention-20261121.md).

Al continuar ambos cruces con Host determinista, el primer trabajador alcanzó Action15 de Harvest y el segundo terminó su desplazamiento Farm. Desde ese punto se alternaron intentos bloqueados de Carry y de Idle22 hasta el segundo 67. Carry también quedó bloqueado en la prueba sin puerta. Con un solo trabajador, el mismo cultivo produjo una caja y una entrega en el segundo 26,7. La posición final del segundo cuerpo quedó a 0,40 m del punto de liquidación del control individual. La suma de radios es 0,56 m. Queda resolver la ocupación compartida conservando la comprobación de colisiones. [Recibo extendido](performance/native-ordinary-farm-gate-traffic-20261121.json).

El contraste en `1aae63960` reproduce el bloqueo con y sin portón. WASM
identifica la ruta del cuerpo 2, actor 900012, slot 0 y generación 5 como
primer conflicto, en el segundo 25,803. El recorrido de 570 avances registra
232 propuestas de Carry sin admisión. La cifra cuenta propuestas y queda
pendiente medir su coste.

En el control con turnos distintos, el cuerpo 2 cede el espacio al iniciar
Home18 al final de su jornada. Harvest conserva el cultivo y el saldo mientras
el otro cuerpo ocupa el destino. Carry16 y Settlement17 adquieren el cuerpo 1
y entregan una sola caja en el segundo 38,20, con un único abono. El control
termina al confirmar esa entrega. Queda resolver el conflicto si el trabajador
que ocupa el destino sigue de turno. [Control de autoridad](../../tests/native-intent-production-authority.test.js).

El contraste en `8f17b3bd5` separa las dos reservas. Tras la llegada de
Farm, el final de Carry16 queda a 0,402 m del cuerpo 2 con portón y a 0,387 m
sin portón. Idle22, a su vez, intenta terminar en el centro del mijo,
ocupado por el cuerpo 1 al acabar Harvest15. Omitir solo la selección de
Carry en el productor deja 416 rechazos de Idle22 por el cuerpo 1 y la
misma pose final de los dos cuerpos. Con ambos productores operativos hubo
208 rechazos de Idle22 en el caso con portón. Se contaron intentos del WASM.

La ejecución anterior, sobre el mismo montaje y sin marcadores de admisión
nativa, emite `CropPicked` una vez con y sin portón. A los 67 s el
cosechador aún lleva la caja pendiente de entrega. En la ejecución nativa el
cultivo sigue vivo porque Carry16 aún no ha sido adquirido. Ninguna de las
cinco corridas entrega la caja. El caso sigue abierto: cualquier solución
debe mantener la comprobación de ambos cuerpos y probar la entrega una
sola vez mientras los dos trabajadores siguen de turno.
[Mediciones y testigos WASM](performance/native-same-shift-delivery-block-20261126.json).

En un prototipo privado sobre ese mismo guardado, el barrido WASM permitió
un destino lateral dentro del radio del mismo cultivo. En
`(-13,509801, 5,987866)` quedó a 1,060 m del corredor completo de Carry,
frente a los 0,56 m requeridos. Con ese destino fijo de diagnóstico,
Idle22 adquirió el cuerpo 2, Carry16 adquirió el cuerpo 1 hasta el destino
de entrega original y Settlement17 entregó una sola caja a los 29,50 s.
La prueba usó los dos puertos de producción con Host determinista.

El contraste encontró la siguiente frontera. El cultivo fue recogido a los
26,00 s. A los 26,50 s el cuerpo 2 ya había llegado al punto lateral y su
Rest21 pasó a `unsupported` porque el ancla de Walk22 había dejado de estar
activa. A los 67 s seguía en el extremo de Walk22. Para habilitar el relevo
se necesita tanto una selección nativa del destino lateral como el cambio
de ancla tras recoger el cultivo. El destino fijo se usó solo en el
prototipo.

### Relevo tras retirar el cultivo

Al llegar un Walk22 que perdió su cultivo, Game elige el nuevo ancla con la
misma regla de Idle. WASM comprueba la retirada del cultivo anterior y el
final exacto del recorrido adquirido antes de preparar el relevo. El
trabajador conserva cuerpo, pose y fases mientras espera READY. Dentro del
nuevo radio inicia Rest21. Fuera reutiliza el programa de reintento para
adquirir otro Walk22 sobre el mismo cuerpo. Un cultivo anterior todavía
activo, una asignación ajena o coordenadas distintas de las del nuevo
cultivo rechazan la operación. Cancelar conserva el Walk22 adquirido.

Los controles standalone y pthread cubren ambos radios. Los puertos de
producción y el Host determinista verificaron la sustitución del reloj
presentado. El roster verificó las mismas geometrías e índices y su
restauración al cancelar la activación del paquete. Pasaron 247 pruebas
dirigidas y el build de producción.

Al combinar este relevo con el destino lateral fijo del prototipo, el
cuerpo 2 adquirió la marcha inicial, el relevo y un nuevo acercamiento al
centro. El cuerpo 1 entregó una sola caja en el punto original. Ambos
llegaron a Idle en el mismo turno a los 67 s. La selección lateral
ordinaria y la captura en hardware siguen pendientes.
[Recibo y límites](performance/native-idle-stroll-reanchor-20261126.json).

OpenRA pospone la búsqueda de otro camino si el bloqueador ya está
saliendo. En Wild Guardians, el mismo punto de
entrega sigue ocupado hasta que la reserva de Home permite acreditar el
recorrido de Carry. [OpenRA, decisión de espera y desvío](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Move/Move.cs#L231-L305).

## Dos trabajadores en sentidos opuestos

Dos trabajadores con centros distintos llegaron desde z=11,8 y z=4,2. Con la salida del primer cuerpo desplazada hacia el oeste, los dos cruzaron en NVIDIA el mismo vano de zarzas por x=-13,9496 con la hoja completamente abierta. El cuerpo 1 cruzó hacia el sur a los 13,95 s. El cuerpo 2 aguardó y cruzó hacia el norte a los 20,85 s. Los tickets 2 y 4 se dibujaron con las raíces y las 32 geometrías de cada trabajador. El consumidor drenó sin errores.

Se conservaron 779 buffers únicos de malla, incluidos los siete del portón. Las 875 relaciones de malla y atributo de la primera muestra seguían usando los mismos IDs. El máximo en 240 oportunidades fue de 38,0 ms a 30 Hz. Las 240 enviaron dibujos. C4 sigue abierto.

Con el primer destino alineado, el segundo trabajador permaneció en espera hasta los 55,95 s en NVIDIA. El contraste con WASM y Host determinista mantuvo el mismo bloqueo hasta los 75,10 s. Desde el mismo origen, el segundo trabajador sí cruzó por el centro cuando estaba solo. Al desplazar 1,8 m al oeste el primer centro, los dos volvieron a cruzar en ese Host. El recorrido de salida ocupado queda pendiente. [Recibo físico y controles](performance/native-ordinary-farm-opposite-gate-traffic-20261121.json).
