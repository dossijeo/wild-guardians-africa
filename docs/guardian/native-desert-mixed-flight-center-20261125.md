# Huida y ataque al centro en Desierto

La calificación de desarrollo de Desierto 983 conserva el trabajador de Farm y el facóquero de RaidSpawned. El encuadre sur permite que Game elija el centro y que el dueño nativo pruebe la separación antes de solicitar los recursos gráficos de ambas marchas. Los muros de la partida permanecen activos. La selección ordinaria encuentra el acceso a `structure-2`.

Home18 se prepara primero. Verifica el corredor hasta el refugio frente a la pose de nacimiento del animal, que permanece estacionario hasta GO26. Para adquirir 26 se verifica la separación del tramo todavía vigente de Home18 o la ausencia exacta de Home19. La primera acción contra el centro espera esa ausencia. Se conservan las distancias de encuentro de Game y el barrido de terreno de cada ruta.

Box2D une las envolventes del principio y del final antes de consultar posibles contactos. Una separación superior al alcance acredita también los extremos retenidos. Para el encuadre norte la comprobación nativa alcanza cada segmento restante y el refugio. Los recorridos que de verdad producen un encuentro requieren el dueño de encuentros del plan. [Box2D 3.1, búsqueda continua](https://github.com/erincatto/box2d/blob/v3.1.0/src/solver.c#L427-L446).

## Huida por un portón

El contraste de CPU combina el portón certificado de `(-14, 8,2)` con el nacimiento diurno del caso sur. Farm23 adquiere la puerta y la incursión comienza con el trabajador dentro del vano. Stop24 adquiere el mismo cuerpo y declara el refugio. `prepareRaidFlightAnimal` excluye la cohorte cuando hay un motor instalado, antes de invocar la selección ordinaria. La partida queda detenida antes de Home18. El selector aplicado por separado al mismo estado encuentra `structure-2` con un corredor de 43 puntos.

Un control privado dejó pasar únicamente ese portón y añadió al paquete determinista el reloj de hoja que pide el Host. Home18 adquirió el corredor por el vano y el animal adquirió su ruta al centro en el otro cuerpo. Home19 completó la ausencia a t=15,10 s, con la hoja abierta y el animal aún en marcha. Ese control empleó WASM y una cola GPU determinista.

La admisión acotada de desarrollo exige un único motor intacto identificado por la ruta Farm ya adquirida. Comprueba su sesión, época, instante y apertura con el dueño de la simulación. Home vuelve a certificar el paso y el animal conserva su propio filtro y barrido. La prueba de separación existente conserva la autoridad sobre ambos corredores. Detour trata un portal como transitable según el filtro de cada consulta. Box2D comprueba la compatibilidad de las formas antes del contacto. [Detour 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/Detour/Source/DetourNavMeshQuery.cpp#L66-L94) · [Box2D 3.1](https://github.com/erincatto/box2d/blob/v3.1.0/src/contact.c#L427-L435).

El control con la guarda anterior se detuvo después del nacimiento. El candidato completa Farm23, Stop24, Home18, marcha26 y Home19 con la ruta por el mismo portón. Un READY de Farm retenido y entregado después de `RaidSpawned` se cancela. El motor de esa propuesta queda fuera de la admisión mixta. La selección cruzada con Recovery pasó 215 pruebas. El build web terminó en 52,38 s con los WASM instalados.

En NVIDIA Turing, `RaidSpawned` ocurrió a 13,40 s. Stop24 conservó el cuerpo 1. Home18 volvió por el portón y Home19 confirmó el refugio en `(-14, 11,8)` a 21,55 s sin daño al trabajador. El animal mantuvo el cuerpo 2 y siguió hacia `structure-2`. Hubo nueve dibujos con ambos relojes avanzando, 1.335 de 1.335 referencias de buffer con identidad y versión conservadas, y drenaje sin avisos. La hoja siguió ligada al portón original y quedó abierta con 60 HP. Entre 590 muestras a 30 Hz, el máximo fue de 36,30 ms. Las 512 oportunidades retenidas se enviaron y la traza se conservó sin pérdida. Esta captura termina en Home19. [Recibo de la huida con portón](performance/native-desert-mixed-flight-center-20261125.json).

La continuación conservó el portón y aplicó cuatro golpes al centro, con 580, 560, 540 y 520 HP. El paquete 489 confirmó la retirada del animal tras `RaidEnded` y el 490 presentó el regreso civil. El trabajador original readquirió el cuerpo 3 y cruzó el mismo portón sin urgencia. Llegó a Idle a 81,50 s con el saldo y los asientos originales, sin daño y con drenaje. La prueba de regresión con Game, WASM y Host determinista llega a Idle y conserva ambos cuerpos durante sus programas. Pasaron ocho controles de la familia. [Recibo de la incursión completa con portón](performance/native-desert-mixed-flight-center-20261125.json).

El primer impacto registra 1.766,60 ms entre los dibujos 294 y 296. La línea de tiempo ocupa 868,30 ms, la captura 247,50 ms y la espera de ocho pipelines 389,50 ms. En el cuarto impacto, el intervalo de 399,90 ms incluye 231,40 ms de captura y cero espera de recursos. El primer reparto coincide con los tramos observados sin portón. La calificación de desarrollo conserva los límites de encuentro, activación ordinaria y C4. [Tramos medidos](performance/native-desert-mixed-flight-center-20261125.json).

El contraste instrumentado se detuvo después del primer impacto y drenó. Desde 600 a 580 HP, la publicación 739 dedicó 647,80 ms a `assets.damage` dentro de `onConfirmed`. El preview de la misma publicación ocupó 25,10 ms. La captura posterior ocupó 290,60 ms y el Host esperó 462,30 ms por ocho pipelines. El tramo hasta el dibujo 279 fue de 1.600,50 ms. [Atribución de la traza](performance/native-desert-mixed-flight-center-20261125.json).

### Preparación de la geometría del primer daño

La propuesta 27 dirigida a un centro residente prepara el dato de destrucción en el Worker de edificios antes de retener la publicación. El banco conserva el resultado mientras coincidan la malla, la geometría, los atributos y sus versiones. El envío transfiere copias privadas del modelo. La instancia de daño usa el material vigente cuando llega el HP confirmado y los golpes sucesivos reutilizan su plantilla. El control con Mapungubwe verificó la igualdad byte a byte del cuerpo y la ceniza. También se verificaron el aborto y reintento, el cambio de atributos y la carga con daño previo. [Preparación de edificios](../../src/rendering/prepare-building-data.js) · [Transferencia de buffers en Chromium](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/bindings/core/v8/serialization/serialized_script_value.cc#620).

En NVIDIA, `assets.damage` bajó de 647,80 a 30,70 ms. El Worker necesitó 729,70 ms de preparación, con 7,00 ms de despacho síncrono. Desde la entrada a Surface hasta READY transcurrieron 1.777,51 ms, frente a 1.126,16 ms en la referencia. Durante ese tramo siguieron los dibujos, con un intervalo máximo de 36,90 ms frente a 35,10 ms a 30 Hz. El centro quedó en 580 HP, con la presentación dañada seleccionable y el drenaje limpio. Las 1.539 entradas de buffer comparables conservaron la referencia y 1.461 conservaron también la versión. El intervalo del primer impacto bajó a 967 ms. Dentro de ese intervalo, el render del preparador tomó 258,80 ms y el Host esperó 407,20 ms por recursos. C4 sigue por encima de 16,667 ms. [Comparación y huellas](performance/native-desert-mixed-flight-center-20261125.json).

### Materiales del facóquero al cerrar el golpe

Una captura del mismo primer impacto enlazó los ocho IDs de los pipelines que esperaba el Host con las mismas cuatro mallas del facóquero en color y sombra. `Nodes.getForRender` sumó 237,70 de los 267,80 ms del render. Al retirar la acción, las mallas recuperaron los materiales 374–377. El golpe había usado las variantes 394–397. Para cada combinación de malla, material y pase, la traza registra la primera construcción de su estado y de su pipeline en ese renderer. La espera del Host fue de 445,60 ms en el dibujo 297. La prueba terminó con el centro dañado y drenaje limpio. [IDs y contraste](performance/native-desert-mixed-flight-center-20261125.json) · [Caché y liberación de pipelines en Three r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js#L142-L228).

Para el golpe contra un centro, la admisión de 27 ahora prepara también los cuatro materiales de Walking que recuperarán esas mallas al retirar el binding. Ambas solicitudes pasan por la admisión de color, sombra y pases auxiliares existente. En NVIDIA, el primer dibujo sin 27 usó los ocho IDs preparados antes de ese READY. Las construcciones de `Nodes` y la espera del Host bajaron a cero en ese dibujo. El render ocupó 23,60 ms y el intervalo 200,10 ms. Se conservaron las 1.575 referencias comparables y 1.497 versiones. El primer impacto dejó el centro a 580 HP, conservó el rig y drenó. [Recepción de ambos lotes](../../src/rendering/webgpu-animal-roster.js) · [Comparación física](performance/native-desert-mixed-flight-center-20261125.json).

Durante la preparación del candidato, Surface tardó 2.440,96 ms hasta READY y el dispositivo siguió dibujando. Se registraron 73 dibujos, con un intervalo máximo de 35,70 ms a 30 Hz. En el hueco residual de 200,10 ms, cinco oportunidades rechazaron el binding del dibujo 300. La línea de tiempo del reemplazo ocupó 65,60 ms y su captura 37,10 ms. El paquete se envió a los 157,20 ms y quedó admitido a los 173,00 ms. C4 mantiene el objetivo de 16,667 ms y queda abierto el relevo del paquete ya obsoleto. [Corte residual](performance/native-desert-mixed-flight-center-20261125.json).

### Cuatro golpes y regreso a 60 Hz

El recorrido completo repitió los cuatro golpes, dejó el centro a 520 HP, retiró al facóquero y devolvió al civil a Idle por el mismo portón. El preparador registró los mismos ocho IDs de color y sombra, preparados antes del primer READY, al codificar los cuatro paquetes que el Host sometió sin 27. Los cuatro tuvieron espera de recursos de cero. El aviso de retirada sale después del submit y el arnés difiere la inspección detallada hasta terminar la incursión. Se conservan las 1.335 referencias y versiones comparables de la huida y el drenaje fue limpio. [Recibo a 60 Hz](performance/native-desert-mixed-flight-center-20261125.json).

Los cuatro intervalos de relevo fueron 166,30, 99,80, 116,60 y 364,80 ms. En el cuarto, la captura del preparador ocupó 258,70 ms y el paquete salió a los 337,50 ms. El primer dibujo de ausencia tras Retreat llegó en un intervalo de 128,80 ms. La captura headless usa la GPU física con un viewport de 640 × 480 y la pantalla temporalmente a 4K/60 Hz. Se guardaron 4.767 intervalos, con 2.692 por encima de 16,667 ms, un recuento que incluye jitter de los callbacks. C4 sigue abierto por los saltos de relevo. La traza terminó sin pérdida y Windows volvió a 4K/30 Hz. [Cortes y restauración de pantalla](performance/native-desert-mixed-flight-center-20261125.json).

El cuarto golpe y `AnimalRetreating` llegaron en la misma publicación 1032. En su captura, `Nodes.getForRender` dedicó 235,40 ms a ocho estados nuevos de las mallas 858–861 y los materiales 357–360. Esas mallas utilizaron los mismos IDs de pipeline que las mallas 863–866 de los tres golpes anteriores. El paquete 572 salió después de esa captura y el Host tuvo los pipelines disponibles. La preparación pendiente corresponde a los estados de las mallas que entran al retirarse el facóquero. [Identidades y tiempos](performance/native-desert-mixed-flight-center-20261125.json).

### Mallas de carrera en el último golpe

Con un solo golpe restante contra el centro, Strike27 prepara las cuatro mallas de Running ya instaladas junto con las de Walking en la misma solicitud de retorno. Walking cubre la publicación en que el animal aún conserva ese estado. Los tres primeros golpes solo preparan Walking. El selector del rig conserva la elección en cada publicación y la retirada mantiene su orden. [Selección del lote](../../src/rendering/webgpu-animal-roster.js) · [Construcción y reutilización de estados de nodo en Three r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/Nodes.js).

En NVIDIA a 60 Hz, los ocho estados de color y sombra de Running ya existían al llegar el cuarto READY. El dibujo 573 de retirada del último Strike27 reutilizó esas claves. La captura correspondiente a la publicación 1060 bajó de 258,70 a 19,80 ms y el intervalo bajó de 364,80 a 116,80 ms. La espera de recursos siguió en cero. La preparación del cuarto ticket pasó de 830,20 a 1.048,30 ms. Durante ella se registraron 63 dibujos, con un intervalo máximo de 19,60 ms frente a 21,20 ms en la referencia.

El recorrido volvió a dejar al centro en 520 HP y al trabajador en Idle. Se conservaron las 1.335 referencias y versiones de buffer comparables y el drenaje cerró sin errores. El primer impacto alcanzó 166,80 ms y la ausencia tras Retreat, 133,30 ms. De los 4.784 intervalos guardados, 2.652 superaron 16,667 ms, incluido el jitter de temporización. La captura usó 640 × 480, conservó la traza completa y restauró el modo 4K/30 Hz. C4 sigue abierto. [Recibo del contraste](performance/native-desert-mixed-flight-center-20261125.json).

### Colores del centro al recibir el primer golpe

El daño confirmado copia los colores RGBA8 normalizados y contiguos directamente a los mismos cuatro componentes Float32 que recibe el shader. Lee el color vigente, conserva el relleno blanco de los vértices nuevos del techo y utiliza los accesores de Three para otros formatos. La plantilla mantiene la misma geometría preparada y el mismo número y tamaño de buffers. La conversión reproduce la división por 255 de Three r180 y sigue ejecutándose cuando llega el HP confirmado. [Conversión de Three](https://github.com/mrdoob/three.js/blob/r180/src/math/MathUtils.js#L386-L405).

Cuatro procesos fríos por variante, alternados, midieron la plantilla de Mapungubwe con su Worker y ambos atributos de color reales. La mediana de creación de la plantilla bajó de 36,30 a 21,56 ms y la de la operación completa de daño de 44,99 a 30,02 ms. El control comprueba los componentes, la ceniza y los buffers entregados. Pasaron 119 pruebas dirigidas y el build.

En NVIDIA a 60 Hz, el primer impacto dejó el centro seleccionable a 580 HP y conservó las 1.335 referencias y versiones comparables. `assets.damage` bajó de 29,40 a 18,20 ms. La captura del reemplazo ocupó 34,60 ms y el preview 22,30 ms. El intervalo completo fue de 168,30 ms frente a 166,80 ms, con nueve oportunidades rechazadas por obsolescencia y cero espera de recursos. El arnés terminó después del primer golpe y drenó. Una pasada previa se había detenido antes del impacto, cuando Home terminó a 21,796 s y el corredor del animal adquirió a 22 s. El ensayo focal comprobó el solapamiento cuando ambos programas coincidieron. Las dos pasadas restauraron la pantalla a 4K/30 Hz. [Comparaciones y límites](performance/native-desert-mixed-flight-center-20261125.json).

### Coste del preview de la publicación confirmada

El receptor conserva la congelación profunda de la publicación antes de prestar el lector histórico. Ahora visita los descriptores propios uno a uno, incluidas las propiedades no enumerables, y rechaza los accesores inesperados sin ejecutarlos. V8 materializa un objeto con todos los descriptores para la operación anterior. El bucle evita ese objeto y los pares intermedios. [Receptor](../../src/simulation/confirmed-state-receiver.js) · [Implementación de V8](https://github.com/v8/v8/blob/main/src/builtins/builtins-object.cc#L314-L346).

En el control CPU, 24 repeticiones alternadas por variante usaron la publicación delta del golpe real contra el centro. La mediana del preview bajó de 29,95 a 12,48 ms y la congelación del snapshot de 18,82 a 2,50 ms. La copia del estado que conserva el lector siguió alrededor de 5,9 ms. El lector tardío conserva el estado original y el decodificador sigue ejecutándose bajo demanda. La selección de rama pasó 92 pruebas y reprodujo el timeout ya presente en la prueba de puertos. Se corrigió esa prueba en `04b711af9`. Con un crédito negociado, la segunda publicación espera en el emisor hasta el primer ACK. La selección de transportes pasó 67 pruebas, y la prueba de puertos pasó con la preimagen del receptor. El build terminó en 54,72 s.

En NVIDIA a 60 Hz, el preview del golpe pasó de 22,30 a 14,60 ms y el intervalo de 168,30 a 150,20 ms. La captura ocupó 31,40 ms, el daño 21,30 ms y la espera de recursos fue cero. Ocho oportunidades rechazaron el binding obsoleto antes del dibujo 398. El centro quedó seleccionable a 580 HP, las 1.335 referencias y versiones comparables se conservaron y la cola drenó. La traza terminó sin pérdida y se restauró 4K/30 Hz. El relevo sigue por encima de 16,667 ms. [Recibo y medidas](performance/native-desert-mixed-flight-center-20261125.json).

### Esferas del cuerpo dañado y la ceniza

La preparación del Strike27 solicita las dos esferas al Worker de edificios junto con los datos de la malla. El centro y el radio coinciden exactamente con `BufferGeometry.computeBoundingSphere` de Three r180. Las esferas viajan como dos tuplas y se usan con la misma geometría y versión de atributos que las produjo. El cuerpo y la ceniza conservan sus vértices originales. [Cálculo de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/core/BufferGeometry.js#L691-L795).

En seis pares de procesos fríos con Mapungubwe, la mediana de creación de la plantilla bajó de 22,96 a 9,26 ms y la operación local de daño de 32,79 a 18,76 ms. La preparación del Worker pasó de 1.157,13 a 1.167,70 ms. Las dos esferas y los datos de las dos mallas coincidieron en los doce ensayos.

En dos pasadas emparejadas a 4K/60 Hz, NVIDIA presentó el primer daño del mismo centro y la ausencia de Strike27. `assets.damage` pasó de 23,50 a 9,30 ms y la preparación del centro de 712,20 a 723,80 ms. El intervalo entre envíos pasó de 134,00 a 115,30 ms. Ambas pasadas dejaron el centro seleccionable con 580 HP, conservaron las 1.335 referencias y versiones comparables durante la huida y terminaron sin errores registrados. Las trazas terminaron sin pérdida y la pantalla volvió a 4K/30 Hz. El relevo supera todavía 16,667 ms. La variante conserva 12,40 ms de preview y 26,70 ms de render en su paquete de reemplazo. [Recibo de los dos recorridos](performance/native-center-first-hit-bounds-20261125.json).

## Controles

Desde la pose que acreditó Stop24, el encuadre norte dio una distancia mínima de 15,856 m en 143 pasos de Game hasta el refugio. En ese contraste se retiró solo el marcador de admisión para reproducir el movimiento previo. Cerca del centro, los dos recorridos pasan a unos 0,838 m en momentos diferentes. La preimagen bloqueaba Home18 y la marcha del animal antes de preparar sus recursos. El encuadre sur conserva al menos 3 m entre las envolventes y supera el radio de encuentro de 2,2 m.

En el control positivo, retener READY de Home conserva ambos orígenes. Se confirma Home19 sin daño, cuatro golpes que llevan el centro de 600 a 520 HP y un Retreat con el mismo cuerpo del facóquero. Tras RaidEnded, la ausencia Home19 acredita desde el mismo refugio un cuerpo nuevo para el trabajador original. Farm23 conserva la vuelta sin urgencia y llega a Idle. La selección integrada pasa 57 pruebas e incluye AttackCrops, el ataque aislado y las rutas previas de Farm y Flee.

## NVIDIA Turing

El trabajador conserva el cuerpo 1 desde Farm23 hasta Home19. El facóquero usa el cuerpo 2 en las nueve adquisiciones de marcha, golpe y retirada. Se registran 34 dibujos con ambos relojes en avance y las 1.363 referencias comparables mantienen su identidad y versión. Los cuatro impactos distintos dejan el centro en 520 HP. La ausencia del facóquero se dibuja en el paquete 460 y el primer dibujo de vuelta es el 461. El mismo trabajador vuelve con el cuerpo 3 y llega a Idle a 72 s. La salida devuelve un recibo de drenaje y la sesión termina sin errores. El build web y la comprobación de memoria compartida en pthread pasan. [Recibos y pruebas](performance/native-desert-mixed-flight-center-20261125.json).

A 30 Hz, el primer golpe registra 1.365,50 ms entre envíos. El avance de la línea de tiempo ocupa 572,10 ms, la captura 256,30 ms y la espera de recursos en el Host 401,10 ms. El cuarto golpe registra 366,70 ms, con 231,80 ms de captura, cero espera de recursos y diez oportunidades rechazadas por obsolescencia. Otros tres relevos quedan entre 132,70 y 133,20 ms. C4 conserva el objetivo de 16,667 ms. Quedan la atribución dentro de cada tramo, la resolución del encuentro físico, Recovery y la activación ordinaria.


## Ruina del centro durante Retreat

La partida de calificación de Desierto 712 restaura un facóquero con un golpe disponible y el centro Mapungubwe a 140 HP. Game aplica una sola vez el golpe 140→120, ausenta al facóquero cuando termina su corredor y emite un único StructureRuined en el subpaso original. El test de CPU retiene READY, completa los dos pasos solicitados y comprueba que el checkpoint posterior ya no contiene el polígono.

En NVIDIA Turing, Surface grabó desde el estado publicado a 48,250 s. El ticket 7 se preparó a 48,290 s y adquirió la retirada del polígono 9 a 48,300 s. El dibujo 460 del mismo ticket ocultó el cuerpo original del centro y conservó sus cuatro geometrías residentes para presentar ceniza, 270 escombros y 77 instancias de humo. El Host sometió ese frame a 48,300 s, con el Retreat del cuerpo 1 aún ligado al reloj adquirido. El siguiente extremo acreditó RaidEnded a 68,170 s y la ausencia del actor en el dibujo 656. El dispositivo se drenó sin avisos. [Recibo de Edge con NVIDIA](performance/native-desert-center-ruin-retreat-20261125.json.gz).

El intervalo del primer dibujo de ruina fue de 33,300 ms. De 2129 muestras retenidas de la inspección final, el máximo fue de 132,400 ms. El escritorio seguía a 30 Hz. C4 y la activación de esta mutación en cohortes mixtas siguen abiertos.

El mapa de centros conserva el ID del polígono en el WASM y su procedencia en la reconstrucción fría autorizada. La reserva vuelve a comprobar ID, huella y corredor antes de retirar el obstáculo. El observador de Game ya ve la retirada en StructureRuined. El reloj confirmado cruza el subpaso después de procesar el estado de la incursión. El Host exige el recibo completo de la misma adquisición antes de presentar el paquete. El propietario gráfico integra los efectos con los mismos tramos de 1/30 s que usa la actualización ordinaria. [Comprobación de identidad al retirar un obstáculo en Detour TileCache 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourTileCache/Source/DetourTileCache.cpp#L449-L461).

La selección de regresión pasó 218 de 218 pruebas con los WASM instalados. Incluye la misma huella capturada antes del corte, los bytes de ambos efectos y la caducidad de Escudo. La compilación de producción terminó en 55,63 s.

SHA-256 del recibo gzip `ba573966195b14cfbb8271b51fb725ff79ed87ba9be445d8d9231406d97f7529`. SHA-256 del snapshot de entrada `027e34ca72b5994b5654805027f74da684e269e532696ed03bd218314ec39514`.


### Ruina con el trabajador refugiado y el portón abierto

La partida de Desierto 983 conserva el trabajador contratado, el portón original y los muros. El centro parte de 200 HP para que los cuatro golpes lleguen a 180, 160, 140 y 120 HP. Home19 ya ha acreditado la ausencia física del trabajador antes de la ruina. La condición nativa exige una única ruta en ejecución y verifica que cada motor instalado esté asentado, sin propuesta, ocupación ni reserva de cruce. Revalida la misma topología y revisiones al consumir la reserva.

Home19 adquirió el ticket 11. El refugiado conservó su posición y el portón siguió abierto con 60 HP. La ruina preparó el ticket 28 a 62,850 s, retiró el polígono 9 a 62,870 s y lo presentó en el dibujo 440 con el cuerpo 2 aún en Retreat. El dibujo 490 confirmó la ausencia del animal después de RaidEnded a 68,140 s. El trabajador siguió refugiado, el último centro cayó y Game aplicó su condición de derrota. Draw drenó sin avisos. [Recibo de Edge con NVIDIA](performance/native-desert-gated-center-ruin-retreat-20261125.json.gz).

El dibujo de ruina registró 33,400 ms entre inicios de dibujos. El máximo de las 1973 muestras retenidas en la inspección final fue de 200,000 ms a 30 Hz. C4 y los casos de motor activo u otro actor móvil siguen abiertos.

El arranque del arnés esperó el primer Farm23 adquirido antes de activar el reloj. En la salida, el Host rechazó el paquete 489 con la ruta revocada, conservó sus preparaciones y presentó el paquete 490. Surface abrió la captura una vez al comprobar el enlace exacto de Retreat 27 con la ruina 28.

Pasaron 53 de 53 pruebas dirigidas y la compilación web terminó en 47,88 s. Las dos pruebas mixtas fallaron con la guarda anterior. La regresión del retiro cubre el rechazo antes y después de confirmar la ausencia y descarta una generación ajena.

SHA-256 del recibo gzip `c2f0632563e234658558a7a99c0612f97fa67c5e890a62fb8e544067471cdd5d`. SHA-256 del snapshot de entrada `9eea11bd2ffa33e9c442019f66a884098008e7a450cd734c503554d5bc75792f`.


### Farm pendiente al nacer la incursión

El arnés retuvo el READY real de Farm23, ticket 1, hasta el RaidSpawned de 13,400 s. Entregó el READY después de que el pedido hubiese sido cancelado. El trabajador ya estaba en el refugio. La petición Home v2 volvió a acreditar su cuerpo, pose y evento, con un barrido estacionario contra el mecanismo vigente. Home19 adquirió el ticket 7 y confirmó la ausencia física sin ninguna reserva de cruce. La hoja original conservó apertura 0 y 60 HP. Farm23 y Stop24 no adquirieron una ruta.

NVIDIA presentó la retirada del polígono 9 con el ticket 24 y el dibujo 399 a 63,920 s. Tras RaidEnded a 69,140 s, el dibujo 446 acreditó la ausencia del animal y el dispositivo drenó sin avisos. Los cuatro golpes conservaron sus débitos de HP y el trabajador permaneció en el refugio. [Recibo de Edge con NVIDIA](performance/native-desert-pending-farm-gated-center-ruin-20261125.json.gz).

La primera presentación de ruina registró 40,500 ms. El máximo de 1998 muestras retenidas fue 166,700 ms con el escritorio a 30 Hz. C4 y la huida pendiente desde fuera del refugio con portón instalado siguen abiertos.

Pasaron 35 de 35 pruebas dirigidas. El control anterior al cambio reproduce el bloqueo cuando el trabajador ya está en el refugio. El control negativo conserva el rechazo cuando comienza a 0,25 m del refugio. La compilación web terminó en 45,91 s.

SHA-256 del recibo gzip `29cf8766fb98710f447b0eec74853d88a8783f54a893eab3f17a94cba8e86fd8`. SHA-256 del snapshot de entrada `9eea11bd2ffa33e9c442019f66a884098008e7a450cd734c503554d5bc75792f`.

## Pérdida de Draw durante el ataque aislado

El relevo conserva la aproximación 26 y el golpe 27 cuando su reserva identifica al centro todavía intacto en WASM y Game. La superficie prepara la geometría de daño del centro y admite el material del golpe junto con los materiales a los que volverá el rig. Los controles dirigidos usan el glTF original, comparan el reloj escrito con el de picking y rechazan `plant-2` cuando el permiso identifica a `structure-2`.

NVIDIA Turing ejecutó dos pérdidas en la misma partida sin civiles. El primer sustituto retomó el cuerpo 1, la asignación 2 y el ticket 2 con edad 0,299999982 s en t=3,35. La aproximación continuó hasta el Strike27 que adquirió el mismo cuerpo. El segundo sustituto retomó la asignación 3 y el ticket 4 con edad 0,399999976 s en t=45,55. Cada recuperación confirmó su primer envío antes de reanudar. `attack-5` redujo una sola vez `structure-2` de 600 a 580 HP en t=46,70. El dibujo 14 posterior omitió el golpe retirado, el saldo permaneció intacto y el sustituto final drenó.

La prueba física carga un estado de Desierto anterior a RaidSpawned, con un facóquero previsto, un centro y el terreno residente. Los dos controles de recuperación también se pueden ejecutar con `node --test tests/native-ordinary-animal-center-host.test.js`. Sigue abierta la cadencia integrada a 60 Hz. [Estado de partida](../qa/raid-spawn-navigation/prepared-complete-browser-desert.json) · [Recibo físico](performance/native-center-draw-loss-20261126.json).

## Pérdida de Draw durante la huida y tras Home19

La recuperación durante la huida comprueba la misma pareja que admitió WASM tras RaidSpawned. Draw exige el reloj de Home18, el motor asociado al mismo ticket y el corredor al centro en el primer envío. El control con Host determinista rechaza el motor registrado con el ticket del facóquero, incluso cuando es el ticket mundial más reciente. Tras Home19, la retirada acreditada del trabajador permite volver a presentar únicamente el corredor del animal, con su adquisición original. La propia transacción Home19 exige que el motor de cualquier portón de su ruta se haya asentado antes de retirar el cuerpo.

El segundo sustituto incorpora el comprobante de Home19 a su control directo después del primer envío válido. El trabajador permanece ausente y el comprobante se consume cuando llega la solicitud Farm23 civil que coincide con la misma retirada. El ensayo anterior llegó a los golpes, pero Draw rechazó ese regreso porque había perdido la prueba de Home19 al sustituir el dispositivo.

En NVIDIA Turing, el primer relevo dibujó a t=20,00 con Home18 y el motor del portón ligados al ticket 7. Ambos usaron el mismo tiempo local. El facóquero dibujó con su ticket 9 y edad 0,299999982 s. Tras Home19, el segundo sustituto presentó únicamente ese corredor a t=20,90 con edad 1,199999928 s y el ticket mundial 11. Hubo cuatro débitos de 20 HP, de 600 a 520. Después de RaidEnded, el trabajador original volvió por el portón con el cuerpo 3 y llegó a Idle. El saldo se conservó y el Draw final confirmó el drenaje.

La prueba física usa la cohorte de desarrollo con el portón abierto y asentado en el primer corte. La aceptación de 60 Hz sigue abierta. [Recibo físico](performance/native-mixed-center-draw-loss-20261126.json).

## Pérdida de Draw tras la ruina durante Retreat

La autoridad conserva el recibo del colapso y comprueba los tres números de revisión de WASM en la frontera vigente. El grupo de reemplazo lleva el recibo exacto de retirada del polígono y el corredor de Retreat que el colapso dejó activo. Surface prepara la escena del centro ya arruinado bajo el ticket mundial posterior y el corredor conserva su adquisición. El primer envío del sustituto acredita ambos permisos a la hora congelada antes de reabrir la producción. Al llegar el animal a la salida, la proyección retira su reloj también en el sustituto.

El control anterior reproducía la pérdida con el mundo en el ticket 28 y Retreat en el ticket 27, sin un candidato recuperable. La regresión con WASM y cola determinista rechaza una revisión de polígono alterada, el recibo en la frontera antigua y una solicitud de acreditación antes del primer envío. Termina con cuatro golpes, una ruina y un RaidEnded.

En NVIDIA Turing, el polígono 9 se retiró a t=63,12 con el ticket mundial 28. El paquete del Draw original aún referenciaba la plantilla 26 con el reloj anclado a la adquisición 27 a t=60,50. El primer envío del sustituto dibujó a t=63,45 con el ticket 27, cuerpo 2, asignación 25 y edad local 2,949999809 s. El dibujo 52 confirmó la ausencia del corredor al acabar la incursión a t=68,34. El centro quedó en 0 HP, el trabajador siguió en el refugio, se conservó el saldo y el Draw nuevo drenó sin errores. Una comprobación del arnés detuvo la primera pasada al comparar dos recibos con campos distintos. La segunda verificó los campos de identidad compartidos y completó el recorrido. [Recibo físico](performance/native-ruin-retreat-draw-loss-20261126.json).

Pasaron 415 pruebas dirigidas y la compilación web de producción terminó en 46,65 s. La calificación usa la cohorte de desarrollo de Desierto con un trabajador y un facóquero. E sigue abierto para otras cohortes y C4 mantiene su criterio de cadencia.

## Pérdida de Draw durante Strike27 después de Home19

En el control anterior, el sustituto retomaba el golpe y los débitos de HP. Al acabar la incursión, el control de Draw rechazaba el Farm23 civil porque había perdido el recibo de Home19. El reemplazo transporta ahora el golpe activo y la retirada anterior del trabajador. La autoridad comprueba en WASM la secuencia de retirada, su ticket, su instante y el cuerpo retirado. La adquisición del golpe acredita la frontera mundial más reciente. El primer dibujo conserva al trabajador ausente y confirma el reloj del golpe en el tiempo congelado. Solo entonces el nuevo Draw instala el recibo que consumirá la petición civil.

La prueba con WASM y cola determinista comprueba el orden entre Home19 y Strike27, rechaza acreditar el golpe con el ticket de Home19 y exige un envío válido antes de aceptar el relevo. Tras reanudar, el golpe original emite un único impacto y el sustituto acepta la petición de Farm23 para un cuerpo nuevo del mismo trabajador con la secuencia original de Home19.

En NVIDIA Turing, Home19 retiró el cuerpo 1 con el ticket 11 y la secuencia 9. El primer dibujo del sustituto presentó `attack-29209` con el cuerpo 2, ticket 13 y edad local 0,399999976 s a t=45,00. El ataque descontó 20 HP una sola vez. El centro terminó intacto con 520 HP. Tras RaidEnded, Farm23 consumió la secuencia 9 y adquirió el cuerpo 3 para el mismo trabajador. Llegó a Idle con el saldo conservado y el dispositivo drenó sin errores. [Recibo físico](performance/native-mixed-center-strike-home19-loss-20261126.json).

Pasaron 416 pruebas dirigidas y la compilación web de producción terminó en 46,40 s. La prueba física de Strike27 usa el perfil de desarrollo y aporta evidencia parcial de E.

## Pérdida de Draw durante Retreat con el centro intacto

El control anterior recuperaba el corredor de Retreat con el ticket 27 a t=48,30. Al terminar la incursión, el regreso civil se rechazaba porque requería la retirada del ticket 11. La autoridad y Draw comparten ahora la regla de orden de los recibos. Si Home19 es la frontera vigente, conserva la aproximación anterior. Si el animal adquirió después otro movimiento, ese ticket debe ser la frontera vigente y coincidir con el recibo del animal. La ruina conserva su propia prueba de retirada del polígono.

Los controles con WASM y cola determinista ejercitan ambos Retreat. Con el centro intacto, el primer envío del sustituto acredita el corredor y conserva la retirada del trabajador. La misma secuencia de Home19 autoriza Farm23 tras un único `RaidEnded` de la incursión en curso. El descriptor rechaza la frontera anterior de Home19 y un ticket mundial posterior al corredor. El control de ruina sigue exigiendo el recibo de colapso y termina con el trabajador en el refugio.

En NVIDIA Turing, el primer envío del sustituto presentó el cuerpo 2, la asignación 25 y el ticket 27 a t=61,75 con edad local de 0,25 s. La incursión terminó a t=69,34. El centro conservó 520 HP y los cuatro débitos previos. Farm23 consumió la secuencia 9 de Home19, adquirió el cuerpo 3 para el mismo trabajador y llegó a Idle con el saldo conservado. El último dibujo carecía del reloj de Retreat y el sustituto drenó sin errores. [Recibo físico](performance/native-mixed-center-retreat-civil-loss-20261126.json).

Pasaron 417 pruebas dirigidas y la compilación de producción terminó en 47,44 s. En este recorrido el portón ya estaba abierto desde Farm23.

## Pérdida de Draw durante la apertura del portón en la incursión mixta

El trabajador comienza en el lado de trabajo del portón cerrado y adquiere un Farm23 local. El control anterior abortaba la incursión porque ese Farm carecía de una reserva de cruce. La autoridad acredita ahora la pose y el cuerpo del Farm adquirido al nacer la incursión. WASM comprueba la pose contra el marco y la hoja vigentes y certifica la separación respecto al facóquero. Stop24 conserva el cuerpo 1. La siguiente admisión de Home18 obtiene del mismo motor su propio cruce y programa de apertura.

El control con WASM y cola determinista pierde el dispositivo con ambos actores activos y la hoja en movimiento. El sustituto presenta los relojes de Home18, AttackCenter y la hoja antes de reanudar. El paso posterior conserva el corredor y sigue abriendo la hoja. La preimagen falla al cruzar `RaidSpawned` y conserva ese fallo en el registro del ensayo.

En NVIDIA Turing, el primer dibujo del sustituto se envió a t=10,80. Home18 y la hoja conservaron el ticket 7 y el mismo tiempo local. El motor presentó una apertura de 0,333333313 y el facóquero conservó el cuerpo 2 y el ticket 9. El trabajador cruzó la hoja ya abierta y Home19 retiró el cuerpo 1. Hubo cuatro débitos del centro, de 600 a 520 HP. Farm23 volvió a adquirir al mismo trabajador con el cuerpo 3. Llegó a Idle con el saldo conservado y Draw drenó sin errores. [Recibo físico](performance/native-mixed-center-opening-gate-loss-20261126.json).

El arnés controló el reloj del planificador para alcanzar la apertura parcial y retomó el ritmo normal después del relevo. Las primeras pasadas terminaron antes de perder Draw, durante la preparación del corte. La calificación aporta evidencia de E para esta cohorte de desarrollo y deja abierta la aceptación de cadencia.

Pasaron 426 pruebas dirigidas y la compilación de producción terminó en 44,52 s. Dos controles posteriores delimitan el siguiente relevo de huida. Si la incursión nace con Farm23 completado e Idle todavía en preparación, se rechaza la petición de Home. Si Idle ya se adquirió, el avance exige una proyección nativa de esa intención.

## RaidSpawned entre Farm23 completado y el primer Idle

La preimagen abortaba al pedir Home mientras el primer Idle21 del Farm completado todavía ocupaba la propuesta nativa. La transición cancela únicamente el borrador 21 que pertenece al mismo recibo de Farm, actor, cuerpo y asignación. Home conserva la pose terminal ya ejecutada. La prueba nativa del origen vincula la solicitud nueva con el `RaidSpawned` exacto. El portón verifica la pose antes de que Home18 prepare su cruce. El Farm que todavía carece de una adquisición sigue sin admitir la pareja fuera del refugio.

En NVIDIA Turing, Farm23 terminó en el punto inicial del lado de trabajo con el cuerpo 1. El arnés retuvo el READY del ticket 3, observó la cancelación del pedido 2 a partir de `RaidSpawned` en t=10,10 y entregó tarde ese mismo READY. Home18 adquirió el ticket 5 con el cuerpo 1, la pose terminal y el portón original. Home19 retiró ese cuerpo y autorizó el regreso con la secuencia 8. Después de los cuatro golpes, el mismo trabajador volvió con el cuerpo 3, llegó a Idle y el dispositivo drenó. [Recibo físico](performance/native-mixed-raid-completed-farm-idle-ready-20261126.json).

El arnés controló los dos primeros pasos y dejó correr el planificador normal tras liberar el READY antiguo. El control determinista también repite el relevo con un Farm que camina antes de llegar. Las dos variantes WASM se reconstruyeron con la nueva consulta de procedencia. Las cuatro comparaciones de ABI, terreno, ruta, incursión y guardado pasaron frente al binario anterior. El módulo pthread arrancó con memoria compartida y expuso la consulta.

Pasaron 469 pruebas de regresión, los dos controles focales de llegada estacionaria y llegada tras caminar, y la compilación de producción en 45,15 s. La captura aporta evidencia funcional para la cohorte de desarrollo de Desierto.

## RaidSpawned con Idle21 estacionario adquirido

La preimagen pierde la procedencia del cuerpo al convertir el trabajador a `fleeing` y rechaza el siguiente avance. La autoridad ahora enlaza el `RaidSpawned` confirmado con el ciclo WASM adquirido. Draw valida el ciclo y la pose completa de la solicitud Home. El trabajador conserva cuerpo, orientación, fases y presupuesto de carrera mientras espera el GO. Home18 acredita su propio corredor y el portón. La marcha del animal espera a que Home adquiera su ruta.

En NVIDIA Turing, Idle21 adquirió el ticket 4 a t=10,05. La incursión nació a t=10,20 en `event-29208` y el arnés retuvo el READY de Home hasta t=10,35. Después de los tres pasos, Home18 adquirió el ticket 6 desde la misma pose y con el cuerpo 1. Home19 retiró ese cuerpo. El centro recibió cuatro débitos consecutivos de 20 HP y el mismo trabajador volvió a Idle con el cuerpo 3 y el saldo intacto. Draw drenó sin errores. [Recibo físico](performance/native-mixed-raid-acquired-idle-20261126.json).

El primer arnés quedó detenido después del GO de Idle21 mientras esperaba su proyección. En la segunda pasada, un paso normal del planificador permitió publicar ese Idle antes de la incursión. Pasaron las 471 pruebas de regresión y la compilación de producción terminó en 49,57 s. Las dos variantes WASM se reconstruyeron, las cuatro comparaciones de ABI pasaron y el módulo pthread arrancó con memoria compartida. La evidencia cubre la cohorte de desarrollo de Desierto con Idle21 estacionario. Un control separado readquirió Idle22 desde un guardado y reprodujo un avance rechazado después de `RaidSpawned` mientras el trabajador todavía caminaba.

## RaidSpawned durante Idle22 en marcha

La autoridad conserva el corredor adquirido y acredita que permanece fuera del alcance del facóquero estacionario. Durante la preparación de Stop12, Game publica la pose y las fases del mismo cuerpo, y el animal espera. Draw valida cada muestra contra el actor, la generación y el evento de origen. La solicitud de Home debe coincidir con el nacimiento que llegó por el canal directo, incluido el ticket de Idle22. El control de una solicitud adulterada confirma que se rechaza y que el permiso de marcha instalado conserva su vigencia. Home18 toma la pose nativa de la parada y acredita por separado su cruce del portón.

En NVIDIA Turing, Idle22 había adquirido el ticket 2 cuando nació `event-29208` a t=10,30. Se retuvo el primer READY durante tres pasos. La marcha continuó y ese READY quedó obsoleto. Draw presentó Stop12 con el ticket 5 y el cuerpo 1 en el envío 33. Home18 adquirió el ticket 7 desde esa misma pose. El cuerpo llegó al refugio y Home19 lo retiró. El centro recibió cuatro débitos de 20 HP, el mismo trabajador volvió a Idle con el cuerpo 3 y Draw drenó. [Recibo físico](performance/native-mixed-raid-moving-idle-20261126.json).

En la segunda captura NVIDIA, Idle22 alcanzó su destino a t=12,963 mientras el READY de Stop12 seguía retenido. El productor canceló ese ticket en la publicación de t=13,00. El arnés entregó la respuesta tarde. Home18 adquirió el ticket 5 en el punto terminal ejecutado con el cuerpo 1, cruzó el portón y completó el retorno civil tras el final de la incursión. La regresión también cubre el nacimiento de la incursión dentro de un avance de dos subpasos. La calificación cubre la cohorte de desarrollo de Desierto.

Pasaron 670 pruebas de regresión. Las dos variantes WASM se reconstruyeron y pasaron las cuatro comparaciones de compatibilidad. El módulo pthread arrancó con memoria compartida. La compilación de producción terminó en 54,74 s.

## RaidSpawned antes del primer GO de Idle22

En la preimagen, el productor cancelaba Idle22 al nacer la incursión y el siguiente avance rechazaba la proyección del trabajador. La autoridad retira ahora la propuesta 22 del mismo dueño y declara Home desde su pose restaurada. Draw exige la secuencia de la solicitud pendiente que acredita WASM. El control que altera esa secuencia rechaza el relevo.

En NVIDIA Turing, `event-29208` llegó a t=10,30 con el ticket 1 de Idle22 retenido. La autoridad canceló ese pedido y el arnés entregó el READY tarde. El cuerpo 1 conservó la posición (−14, 6), la orientación y las fases. Home18 preparó el ticket 2 y el envío 19 confirmó el ticket adquirido 3 y el portón propio. Home19 retiró el cuerpo al llegar al refugio. El centro recibió cuatro golpes de 20 HP y el mismo trabajador regresó a Idle con el cuerpo 3 y el saldo conservado. Draw drenó sin errores. [Recibo físico](performance/native-mixed-raid-pending-idle-20261126.json).

El control determinista retiene también el READY de Home18 durante tres pasos y comprueba que las poses del trabajador y del animal siguen fijas. La evidencia cubre la cohorte de desarrollo de Desierto con un cuerpo de Idle22 ya vinculado. La aceptación de cadencia sigue abierta.

Pasaron 784 pruebas de regresión y cuatro comparaciones de compatibilidad WASM. La variante pthread arrancó con memoria compartida. La compilación de producción terminó en 54,93 s con los mismos binarios WASM de la captura.

## RaidSpawned durante la admisión inicial de Idle20

El avance posterior a `RaidSpawned` fallaba tanto con el primer READY de Idle20 retenido como con Idle20 adquirido y el primer READY de Idle21 retenido. WASM ahora transfiere a Home la solicitud pendiente o el cuerpo estacionario adquirido y cancela solo la propuesta de ese dueño. Draw comprueba la secuencia original, el cuerpo, el perfil y la pose completa. Los controles de los dos órdenes rechazan la misma solicitud con la secuencia de origen adulterada.

En NVIDIA Turing, la incursión nació a t=10,30 en `event-29208` en ambas capturas. Con Idle20 pendiente se canceló el ticket 1. Home18 adquirió el ticket 3, confirmado por el envío 19. Con Idle20 adquirido por el ticket 2, se canceló el primer READY de Idle21, ticket 3. Home18 adquirió el ticket 5, confirmado por el envío 23. Ambos recorridos entregaron el READY antiguo después de cancelarlo. Home18 conservó el cuerpo 1, la posición (−14, 5), la orientación, las fases y el presupuesto de carrera, y acreditó su propio cruce del portón 1000000. [Recibo físico de ambos recorridos](performance/native-mixed-raid-initial-idle-20261126.json).

Home19 retiró el cuerpo 1. El centro recibió cuatro débitos de 20 HP en cada recorrido. Volvió el mismo trabajador con el cuerpo 3 y conservó su saldo hasta Idle. Draw drenó sin errores. En el primer intento del caso adquirido, el arnés mantuvo el reloj suspendido después del GO20 y venció la espera de publicación antes de la incursión. La captura válida dio un paso ordinario de 0,05 s antes de esperar el READY de Idle21. Los controles deterministas también retienen Home18 durante tres pasos y comprueban que las poses del trabajador y del animal quedan fijas. La evidencia se limita a la cohorte de desarrollo de Desierto con un trabajador, un facóquero y un portón. La aceptación de cadencia sigue abierta.

Pasaron 1.062 pruebas de regresión, incluidas las cuatro pruebas nuevas que fallan en la preimagen. Las dos variantes WASM se reconstruyeron y pasaron cuatro comparaciones de compatibilidad. El módulo pthread arrancó con memoria compartida y expuso las dos funciones nuevas. La compilación de producción terminó en 55,07 s y sus tres artefactos nativos coinciden con los usados en las capturas.

## RaidSpawned durante Task14 en marcha

En la preimagen, una orden ordinaria de Repair obtenía GO14 y Game liberaba la tarea en `RaidSpawned`. El siguiente avance fallaba, incluso dentro del mismo comando con dos subpasos. Ahora el espejo nativo aplica la baja de esa asignación cuando Stop25 o la llegada transfieren el cuerpo a Home18. Game sigue retirando la tarea al nacer la incursión. El facóquero queda en la pose de nacimiento hasta que Home adquiere su corredor. Draw exige el ticket de Task14, su generación, su cuerpo y el evento de incursión. El roster conserva el rig y verifica la pose de parada y el origen de Home.

En NVIDIA Turing, Task14 adquirió el ticket 5 a t=10,15 y `event-29210` llegó a t=11,35. El cuerpo 1 siguió caminando durante los cuatro avances con READY25 retenido. La revalidación nativa rechazó el ticket 6 a t=11,55. Tras otro paso ordinario, Stop25 adquirió el ticket 8 a t=11,60 y el envío 54 presentó su pose. Home18 adquirió el ticket 10 con el mismo cuerpo y acreditó su propio cruce del portón 1000000.

En la segunda captura, Task14 alcanzó su destino nativo a t=14,126. Al confirmar t=14,15, el productor canceló el READY de Stop25 antes de que el arnés lo entregara. Home18 tomó esa pose terminal con el ticket 8 y el envío 48 confirmó el cruce. En ambos recorridos Home19 retiró el cuerpo 1, el centro sufrió cuatro débitos de 20 HP y el trabajador volvió a Idle con el cuerpo 3. La muralla siguió en ruinas, el saldo se conservó y Draw drenó sin errores. [Recibo de las dos capturas](performance/native-mixed-raid-task14-20261126.json).

La calificación corresponde al perfil de desarrollo de Desierto con una Task14 en el lado de trabajo, un trabajador y un facóquero. La aceptación de cadencia sigue abierta.

Pasaron 320 pruebas de regresión y cuatro comparaciones de compatibilidad WASM. Los cuatro controles nuevos de autoridad y el control del rig fallaron en sus preimágenes. El módulo pthread arrancó con memoria compartida y rechazó una petición sin evento de incursión. La compilación de producción terminó en 58,06 s con los tres artefactos nativos de las capturas.

## RaidSpawned antes del GO de Task14

Con el READY de Repair retenido, la preimagen rechazaba Home porque la propuesta de Task14 aún ocupaba el slot nativo. El planificador coteja ahora la baja de la tarea emitida por Game con la solicitud nativa pendiente. Reutiliza la cancelación acreditada en el [relevo de Despertar](native-watering-idle-20261120.md) y publica su prueba antes de consultar el dueño estacionario para Home18. Draw comprueba que la prueba conserve el ticket y la secuencia de ese dueño, el cuerpo y la solicitud de la tarea. Los controles con el ticket de origen adulterado rechazan el relevo, tanto para Idle20 como para Idle21.

En NVIDIA Turing, el primer recorrido canceló Task14 con el ticket 4 a t=11,35. Home18 adquirió el ticket 6 y el envío 24 confirmó su cruce. En el segundo recorrido, Idle21 había terminado a t=16,392. La incursión canceló Task14 con el ticket 5 a t=17,05. Home18 adquirió el ticket 7 y el envío 32 confirmó su cruce. En ambos casos se entregó el READY antiguo después de cancelarlo. Home18 conservó el cuerpo 1, su pose y el presupuesto de carrera. Home19 retiró ese cuerpo tras cruzar el portón 1000000. El centro recibió cuatro débitos de 20 HP, la muralla siguió en ruinas y el mismo trabajador volvió a Idle con el cuerpo 3 y su saldo intacto. Draw drenó sin errores. [Recibo físico de ambos recorridos](performance/native-mixed-raid-pending-task14-20261126.json).

En el primer intento de Idle21, el arnés seguía reteniendo READY14 cuando venció el plazo de preparación de 10 s, con la autoridad confirmada a t=16,20. La captura válida usó el lote existente de dos subpasos para llegar a la incursión antes de ese plazo. Los controles deterministas cubren también Idle21 antes de terminar y retienen READY18 durante tres pasos para comprobar que el trabajador y el facóquero conservan sus poses. La calificación cubre la cohorte de desarrollo de Desierto y la aceptación de cadencia sigue abierta.

Pasaron 136 pruebas de regresión. Los cinco controles nuevos reproducen el rechazo de Home en la preimagen. El build WebGPU de producción terminó en 52,87 s y sus tres artefactos nativos coinciden con los de las capturas.

## RaidSpawned antes del GO de Action15

En la preimagen, Task14 llegaba a la muralla y `RaidSpawned` liberaba Repair mientras se retenía el READY de Action15. El slot de esa propuesta seguía ocupado al declarar el facóquero. El animal quedaba sin objetivo y el avance rechazaba la cohorte. La autoridad coteja ahora la propuesta con la solicitud de acción del mismo cuerpo, tarea, objetivo, asignación y generación del corredor. Usa la cancelación de Action15 antes de que la declaración del animal necesite el slot. El corredor terminado sigue siendo el origen de Home18. El control impide adquirir la acción cancelada o aplicar Repair y atraviesa el nacimiento dentro de un avance de dos subpasos.

OpenRA distingue la cancelación de una actividad en cola de la de una actividad en curso. En este relevo, la autoridad puede descartar la preparación pendiente directamente. La actividad que ya poseía el cuerpo sigue acreditando la pose. [OpenRA `Activity.Cancel`](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs).

En NVIDIA Turing, Task14 adquirió el ticket 5 y llegó a t=14,126. El arnés retuvo el READY15 del ticket 6 desde t=14,15. `event-29210` lo canceló a t=14,50 y el arnés lo entregó después. Home18 adquirió el ticket 8 desde la pose terminal (−12,470, 1), con el mismo cuerpo 1. El envío 47 acreditó Home18 y el portón 1000000. Home19 retiró el cuerpo 1 en el refugio. Hubo cuatro golpes de 20 HP al centro. El mismo trabajador volvió a Idle con el cuerpo 3, su saldo intacto y la muralla todavía en ruinas. Draw drenó sin errores. [Recibo físico](performance/native-mixed-raid-pending-action15-20261126.json).

El primer intento físico avanzó el reloj antes de GO14. Su llegada quedó a t=16,176, después del nacimiento programado, y el arnés se detuvo antes de READY15. La captura válida esperó GO14 antes de avanzar al destino. La calificación cubre la cohorte de desarrollo de Desierto con un trabajador, un facóquero y un portón. La cadencia sigue abierta.

Pasaron 123 pruebas de regresión. El control nuevo confirma el mismo rechazo de la cohorte en la preimagen. El build WebGPU de producción terminó en 55,81 s y sus tres artefactos nativos coinciden con los de la captura.

## RaidSpawned con Repair Action15 adquirida

En la preimagen, el trabajador conservaba la acción adquirida cuando Game liberaba Repair durante `RaidSpawned`. El siguiente subpaso rechazaba la cohorte. La autoridad liga la propuesta de restitución al actor, la acción y el objetivo que la solicitaron. WASM coteja el ticket de esa propuesta y conserva la pose de Action15 al declarar la petición de Home18. Draw exige la secuencia exacta de la acción y el estado del cuerpo que ya tenía. Home18 adquiere el corredor y su propio cruce del portón. El control de WASM rechaza por separado una secuencia de acción y un ticket de restitución ajenos antes de aceptar los originales. El control de Draw rechaza la secuencia de origen adulterada.

En NVIDIA Turing, Action15 adquirió el ticket 7 a t=14,15. La restitución quedó preparada con el ticket 10 a t=14,20. `event-29210` a t=14,80 transfirió el cuerpo 1 desde (−12,470, 1). El arnés entregó el READY de restitución después de su cancelación. Home18 adquirió el ticket 12 y el envío 53 confirmó su cruce del portón 1000000. Home19 retiró el cuerpo 1 en el refugio. El centro conservó sus cuatro débitos de 20 HP y el mismo trabajador volvió a Idle con el cuerpo 3. La muralla siguió en ruinas, el saldo quedó intacto y Draw drenó sin errores. [Recibo físico](performance/native-mixed-raid-acquired-repair15-20261126.json).

La calificación cubre un trabajador, un facóquero y un portón en el perfil de desarrollo de Desierto. Los encuentros entre ambos corredores y la cadencia siguen abiertos.

Pasaron 117 pruebas de regresión y las dos pruebas nuevas reprodujeron el fallo en la preimagen. Standalone y pthread conservan sus importaciones y exponen las dos funciones de relevo. Pthread arrancó con memoria compartida. El build WebGPU de producción terminó en 51,35 s. Sus tres artefactos nativos coinciden con los usados en la captura.

## Huida por el corredor norte

Los recorridos completos pasan a 0,838 m entre sí con tiempos independientes. El recorrido inicial del trabajador deja al menos 24,10 m hasta la pose de nacimiento del facóquero. Home18 acredita ese caso estacionario y el dueño nativo conserva el nudo posterior al último tramo que puede acercarse a 2,2 m de la ruta del animal. Desde ese nudo, una parada en cualquier punto restante, incluido el refugio, conserva la separación. Si el propio refugio queda dentro del alcance, 26 espera la retirada de Home19. WASM coteja la solicitud y el evento de nacimiento, y vuelve a comprobar los segmentos del programa 26 al prepararlo y adquirirlo. La distancia punto-segmento acota la proyección a los extremos. La petición queda bajo su dueño mientras espera. [Jolt 5.3.0, punto más próximo](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Geometry/ClosestPoint.h) · [DetourCrowd 1.6.0, solicitudes de marcha](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp).

El control de WASM preparó un 26 de prueba a 11,60 s y rechazó su admisión mixta. Cuando la comprobación pasó, una solicitud, un evento o un actor ajeno siguieron rechazándose. La prueba de producción retuvo READY de Home18, mantuvo inmóvil al animal y comprobó la pausa durante Home18. La preimagen se detuvo antes del primer READY de refugio con ese mismo control.

En NVIDIA Turing, `event-29208` nació a 10,80 s. Home18 adquirió el ticket 6 a 11,00 s y conservó el cuerpo 1 durante la pausa a 12,20 s. La marcha 26 adquirió el ticket 8 a 16,20 s, antes del final de Home18 a 18,376 s. El envío 68 presentó ambas marchas con edades de 5,25 y 0,05 s. Home19 retiró el cuerpo 1 en el refugio. El centro recibió sus cuatro golpes de 20 HP y el mismo trabajador volvió a Idle con el cuerpo 3, sin daño y con el saldo intacto. Draw drenó sin errores y la traza terminó sin pérdidas. El primer intento del arnés siguió avanzando mientras Stop24 esperaba su admisión. El recorrido acreditado esperó su GO antes de continuar. [Recibo físico y control nativo](performance/native-mixed-raid-north-suffix-20261126.json).

La calificación cubre un trabajador y un facóquero en el encuadre norte sin portón. El encuentro efectivo, la recuperación del dispositivo en esta variante, la activación ordinaria y C4 siguen abiertos.

Pasaron 115 pruebas de regresión y el build WebGPU de producción terminó en 59,10 s. Los tres artefactos nativos del build coinciden con los de la captura. Standalone y pthread conservan sus importaciones y añaden `nav_center_flight_animal_ready`. Pthread arrancó con memoria compartida.

## Nacimiento cerca de Farm

En el encuadre de Desierto `(-16, 1,4)`, el mismo `event-29208` coloca al facóquero a 2,644 m del trabajador. La preimagen rechazaba la propuesta por la caja del corredor Farm. Sus 18 nudos dejan 2,261 m como mínimo en el itinerario completo y 2,644 m en el tramo todavía ejecutable al nacer el animal. El dueño de reservas conserva la prueba rápida de la caja y, si esta es insuficiente, comprueba el itinerario restante contra la posición estacionaria de nacimiento. La comprobación se repite al declarar el objetivo del animal. En el control con separación inicial de 0,319 m la admisión sigue cerrada.

El segundo encuadre cercano confirma que el tramo ya recorrido queda fuera de la prueba. El itinerario completo baja a 1,816 m, frente a 2,228 m desde el nacimiento. El control nuevo reabre ese caso y mantiene el rechazo del nacimiento solapado. El ensayo CPU del encuadre físico también continúa por la regla de separación ya publicada. Home18 adquiere a 11,00 s, 26 espera hasta 13,72 s y Home19 retira el cuerpo a 18,40 s.

Game con el movimiento compatible sobre esos mismos chunks aplica un golpe frontal sin empuje a 11,70 s. Es una comprobación de la mecánica de encuentro. La calificación de desarrollo cubre el nacimiento y la conservación del cuerpo en Farm hasta Stop24. Todavía falta adquirir la marcha que produciría el encuentro y retirar su corredor en la frontera que corresponde. En un ensayo de diagnóstico que permitió solicitar 26 antes de la separación, el dueño de reservas devolvió conflicto físico con el cuerpo 1 a 12,222 s. Es el instante de un corredor hipotético y de los horarios del ensayo. El precedente de detección continua aporta el instante candidato. La tirada, el contacto previo y la consecuencia siguen bajo las reglas de Game. [Detección continua en Box2D 3.1](https://github.com/erincatto/box2d/blob/v3.1.0/src/solver.c#L2688-L2713).

En NVIDIA Turing, el animal conservó su pose de nacimiento y la selección de `structure-2`. Stop24 preparó el ticket 3 a 10,80 s. Con ese READY retenido, el trabajador avanzó hasta 10,90 s con el cuerpo 1. El envío 29 presentó el reloj de Farm con una edad de 0,90 s. La autoridad canceló el READY obsoleto, preparó otro ticket y adquirió Stop24 con el ticket 5 a 10,95 s. El envío 34 presentó esa parada en el mismo cuerpo. Se conservó el saldo, hubo drenaje limpio y la traza terminó sin pérdidas. En el primer intento la sonda leyó el cuerpo fuera de la lista de rutas del recibo. El segundo comprobó el READY obsoleto y se detuvo antes de enviar el avance que despierta su nueva preparación. [Recibo físico](performance/native-mixed-raid-birth-suffix-20261126.json).

Pasaron 130 pruebas de regresión. En la selección final de tres casos de nacimiento, la preimagen pasó uno y el candidato pasó los tres, incluido el control añadido del tramo ya recorrido. El build WebGPU terminó en 54,44 s y conserva los tres artefactos nativos de la captura. Standalone y pthread mantienen la misma ABI pública, y pthread arrancó con memoria compartida.

## Consecuencia y frontera del encuentro

Game usa la misma clasificación y la misma preparación de efectos para consultar un encuentro y resolverlo. El cálculo determina el siguiente RNG y, si corresponde, la pose del impacto, la caída y el destino del empuje. El evento conserva la pose previa al empuje y se emite después de aplicar el cupo, los golpes y la lesión. Si el barrido de terreno falla, ese encuentro conserva sus valores anteriores. En la preimagen del control, la excepción ya había consumido RNG y cupo y añadido un golpe. Separar el cálculo de la aplicación también permite comprobar la identidad del cuerpo antes de transferirlo. Box2D conserva los contactos del paso para que el consumidor los lea antes de mutar el mundo. [Eventos de contacto de Box2D](https://box2d.org/documentation/group__events.html).

El contraste CPU compara el estado completo en 2.048 casos con una preimagen de Game. Incluye varios actores por caso, contactos ya registrados, barrido relativo, tirada frontal rechazada, empuje e incapacidad. Coincidieron 299 eventos `WorkerHit`, 325 `WorkerIncapacitated` y 43 casos que solo cambiaron el RNG. Las selecciones de regresión de la autoridad y de Game pasaron 133 y 96 pruebas respectivamente, con solape. El build WebGPU acabó en 54,72 s y conservó los artefactos nativos.

En un prototipo CPU privado, el golpe frontal a 11,82 s mantuvo la pose confirmada a 11,80 s en el cuerpo 1. La revocación de Home18 precedió al reloj nuevo. El primer ensayo también revocó 26 al evaluar la nueva posición estacionaria del trabajador. Al conservar la autorización del mismo par y la misma generación de 26, Game confirmó un solo golpe y avanzó doce subpasos de caída. Otro ensayo rechazó la tirada frontal a 11,82 s y confirmó una colisión a 12,18 s con un único empuje de 1,722 m. El mismo cuerpo conservó el destino del empuje durante los doce subpasos siguientes. Ambos ensayos usaron el Host determinista con binarios privados. La admisión del contacto en producto, el dibujo de Fall y el relevo a GetUp aún requieren validación. [Resultados de Game y del prototipo](performance/native-raid-encounter-effects-20261126.json).

Al prolongar el ensayo frontal, Fall terminó a 15,36 s y Game abrió un GetUp de 3,20 s con el mismo origen. El siguiente avance se detuvo en la guarda de cohorte. El contrato pendiente debe conservar ese origen y el desplazamiento de recuperación hasta la siguiente orden de refugio.

## Pose final de GetUp

Game calcula la fase y el desplazamiento de GetUp antes de modificar al trabajador. Si una consulta de terreno lanza una excepción, se puede repetir el paso desde la misma fase. Una obstrucción geométrica conserva la política existente y limita el desplazamiento alcanzable. El contraste con la preimagen recorrió 61.440 pasos en 1.024 casos con los cuatro perfiles, incluidos obstáculos que aparecen durante GetUp. Coincidieron el estado y la decisión de inmovilizar al trabajador en todos los pasos.

En un ensayo privado de Desierto con el Host determinista, el golpe frontal de 11,82 s mantuvo el cuerpo 1 en `(-16, 0,8059573)` durante Fall y GetUp. En el paso de 18,54 a 18,56 s, Game y el WASM privado adoptaron `(-16,2701404, 0,4689055)` en el mismo cuerpo. La transición rechazó otro actor, la hora anterior y el consumo repetido. Game publicó los 0,24 s completos de mezcla de salida. Otro ensayo emitió la solicitud Home 10 desde esa pose. Draw la rechazó porque el origen carecía de una prueba admitida. El siguiente Home requiere acreditar la recuperación y admitir la mezcla de salida mientras el trabajador vuelve a moverse.

En el ensayo alternativo, la primera colisión desplazó el cuerpo 1 en 1,722 m. Game siguió resolviendo contactos durante Fall. Un segundo golpe, frontal, incapacitó al trabajador a 12,62 s y agotó el presupuesto del animal, que aún conservaba el corredor antiguo al centro. La guarda de la incursión detuvo el ensayo en esa frontera. Ese segundo golpe y el cambio de intención del animal requieren su propio relevo. [Resultados CPU](performance/native-raid-getup-cut-20261126.json).

### Mezcla de salida durante la marcha

En el recorrido ordinario de Desierto, el trabajador recuperado avanzó 0,048 m y cambió su orientación en el primer paso de 20 ms. La mezcla aún tenía 220 ms. Al cabo de 240 ms estaba a 0,353 m de su posición inicial de salida. La adquisición nativa debe permitir la locomoción mientras se presenta esa mezcla.

El material nativo que selecciona Walk, Run o Idle ya aplica la misma mezcla que el material de un solo clip. En el control con el rig original, el compilador de Three encontró el mismo testigo de mezcla en color y sombra. El picking leyó el tiempo de salida una vez por rig y sus vértices coincidieron con el animador de referencia dentro de 5 cm. El control falla sobre la preimagen porque el programa combinado omite la mezcla.

En otro control de componentes, una propuesta Home sobre el cuerpo 1 se retimó 300 ms y conservó la textura y el programa compilado. El arnés suministró la mezcla al reloj relativo de esa propuesta. El picking conservó 240 ms en el origen adquirido, leyó 220 ms con el cuerpo en marcha a los 20 ms y llegó a cero a los 240 ms. Este Home procede de una entrega ordinaria. La transición de GetUp aún requiere el testigo de origen en la autoridad, el paquete preparado y su dibujo en GPU física. [Controles CPU y compilación](performance/native-home-getup-exit-20261126.json).

## Autorización del primer encuentro

El binario canónico esperó al tramo seguro de Home antes de adquirir la marcha del facóquero a 13,58 s en el encuadre cercano. Hasta el corte de 15,20 s no hubo golpe. El prototipo privado sustituyó el permiso anterior basado en los IDs del arnés por una autorización que exige la solicitud vigente del animal y la asignación, generación, cuerpo y evento de incursión de Home18. La excepción de reserva solo corresponde a ese par. El motor rechazó un subpaso sin autorización, con otro evento, con el resultado contrario al preparado y con un tiempo distinto del autorizado. Los rechazos conservaron reloj y poses. Cada autorización válida fue de un solo uso.

Con READY del animal retenido durante seis publicaciones, Home siguió avanzando y el facóquero permaneció en el punto de nacimiento. Al adquirir se recalculó la entrada en alcance a 11,850388 s y la primera colisión posible a 12,219293 s. Un cálculo independiente sobre los nudos adquiridos coincidió dentro de una millonésima de segundo en los tres recorridos. Game aplicó la tirada frontal en su subpaso de 11,88 s. Draw recibió la revocación de Home antes del nuevo reloj. GetUp terminó a 18,62 s en el mismo cuerpo.

Sin la retención adicional, el golpe frontal permaneció a 11,82 s. Con la tirada frontal rechazada, el Game del prototipo aplicó el empuje de 1,722 m a 12,18 s. Ese primer ensayo se detuvo al agotarse el cupo con el segundo golpe. El ensayo abarca un par en Desierto, sin portón, sobre standalone privado y con el Host y una cola de GPU determinista. [Autorizaciones y cortes de reloj](performance/native-raid-encounter-permit-20261126.json).

QA-105 se ejecuta sin el loader de diagnóstico. Fija la vista `(15,9, 2) → (24, 2)` por la entrada de navegación y conserva las semillas 21 y 152. Exige una colisión anterior, una sola tirada en la segunda entrada, el evento exacto si esta incapacita al trabajador y varios pasos sin repeticiones. Los diez casos de las cinco culturas pasan con guardado y recarga. La selección de reservas, encuentros, recuperación y navegación pasa 45 pruebas. En la preimagen, los diez casos fallaban al buscar una posición elegible.

## Retirada al agotar el cupo en un encuentro

El segundo golpe, `WorkerIncapacitated event-29210`, ocurre a 12,62 s y agota el cupo. Conserva la posición del trabajador tras el empuje anterior de 1,722 m, con Fall en curso. El prototipo privado revoca la ruta al centro de la asignación 8, slot 1 y generación 3. Emite `AnimalRetreating` en el mismo subpaso y prepara el corredor de salida sobre el mismo cuerpo 2, desde la pose y fase de la aproximación revocada. Draw comprueba la revocación y el evento de origen antes de admitir el sucesor. Los controles con otro golpe, otro trabajador o sin el identificador del golpe dejan la retirada sin adquirir.

Retreat adquiere el ticket 11 a 12,66 s. El primer envío escribe edad cero y picking lee esa edad del mismo binding. Con el READY retenido durante seis publicaciones, el facóquero conserva su pose mientras Fall avanza y adquiere a 12,76 s. Ambos recorridos llegan a `RaidEnded` y presentan un paquete sin el binding del animal. El centro conserva 600 HP. GetUp termina a 18,92 s sobre el cuerpo 1 con 0,24 s de mezcla de salida; el trabajador sigue incapacitado. La publicación de `AnimalRetreating` usa la misma función de Game en los caminos de retirada ordinario y tras el golpe nativo adquirido.

El ensayo usa WASM privado, el Host real y una cola de GPU determinista con paquetes de prueba. Un contraste a partir del estado exacto tras el segundo golpe ejecutó la retirada ordinaria de Game con el planificador canónico. En ese subpaso de 20 ms, el facóquero retrocede 0,076 m, invierte la orientación y aumenta 0,020 s su fase. El primer prototipo llegó a la misma pose y fase en el primer subpaso después de GO, a 12,68 s, 60 ms de simulación después del paso ordinario. Ambos emitieron `AnimalRetreating` a 12,62 s. La selección de regresión de rama pasó 56 pruebas y el build conservó los tres artefactos canónicos del motor. [Recibo CPU inicial](performance/native-raid-encounter-retreat-20261126.json).

El siguiente ensayo privado comprueba el corredor antes del golpe y vuelve a cotejar el estado del mundo y de los cuerpos al consumirlo. Tanto `WorkerIncapacitated` como `AnimalRetreating` observan la pose anterior. Después de esos hechos, WASM desplaza el cuerpo 2 y Game publica la pose, la orientación y la fase de la retirada a 12,62 s. La diferencia de posición frente al planificador canónico es inferior a 0,000001 m. El corredor restante empieza en esa pose, sin repetir los 7,6 cm. El control retiene seis publicaciones con la misma pose del facóquero y Fall aún en progreso. Draw rechaza las alteraciones de fase, posición, golpe y trabajador, así como la retirada que omite el identificador del golpe. [Recibo del primer paso](performance/native-raid-encounter-retreat-first-step-20261126.json).

La publicación de 12,62 s todavía coexiste con el último envío de la aproximación a 12,60 s. El primer envío de Retreat sigue por detrás del paso lógico, a 12,68 s sin retención y 12,78 s con ella.

### Preparación gráfica antes del segundo golpe

El ensayo privado prepara en WASM los nueve nudos del corredor restante desde la pose del final del subpaso. A 12,60 s asigna el ticket 10 al programa preparado y conserva la aproximación activa. El Host con cola GPU determinista devuelve READY del paquete 6 y el canal directo confirma su retención. Durante esa espera el último dibujo sigue mostrando la aproximación y el reloj confirmado permanece a 12,60 s. La cancelación directa deja el paquete sin presentar y conserva la aproximación hasta ejecutar el subpaso.

Al confirmar `event-29210` a 12,62 s, la propuesta real usa el ticket 11. WASM y JavaScript comprueban la misma proyección Float32 del corredor, incluidos los tiempos relativos, la pose, el cuerpo y la generación. El Host de la preimagen rechaza la preparación si la aproximación aún está activa. Los controles del prototipo también rechazan otro cuerpo, otro reloj, una retención que difiere del paquete y un intento de GO antes del golpe. [Recibo de READY y cancelación](performance/native-raid-encounter-retreat-ready-20261126.json).

En este ensayo el paquete anticipado se cancela y la retirada adquiere después por la vía existente.

### GO del paquete retenido en el subpaso del golpe

El control posterior conserva el paquete 6 desde READY a 12,60 s. A 12,62 s el golpe `event-29210` revoca la aproximación, publica la solicitud de retirada y adquiere la asignación 12 sobre el mismo cuerpo 2. La autoridad completa los dos cambios de reloj del subpaso y libera la retención. El Host somete el paquete 6 con el ticket adquirido 11 y conserva el ticket preparado 10 como origen del recurso. El reloj visible de Retreat empieza con edad cero y picking lee el mismo valor.

En el avance de dos subpasos, se retiene el primer RAF tras GO. El reloj causal ya está en 12,62 s y el último dibujo sigue siendo el paquete 5. Tras el acuse del paquete 6 se ejecuta el segundo subpaso. La respuesta completa cuenta dos pasos y alcanza 12,64 s con otros 0,076 m de desplazamiento y un solo `AnimalRetreating`. Ambos recorridos completan la retirada y GetUp. La cancelación sigue funcionando y cinco controles rechazan el GO prematuro o adulterado y la retención de otra fuente. [Recibo del GO](performance/native-raid-encounter-retreat-go-20261126.json).

El paquete del ensayo usa el Host real y una cola GPU determinista.

### Relevo del rig original del facóquero

La preimagen del roster rechaza el candidato mientras la aproximación aún posee el rig. El prototipo admite la preparación si coincide la asignación de aproximación, el destino de salida y el cuerpo. Conserva la raíz y las cuatro mallas con sus geometrías originales. La captura activa los materiales de retirada de forma reversible. Picking durante la preparación puede consultar la aproximación y la cancelación devuelve esos mismos materiales. El reintento conserva el dueño anterior hasta GO y rechaza un comprobante con otra asignación.

El arnés registra el uniforme del rig mediante el adaptador de relojes remoto y sube su tabla Float32 de 720 bytes al paquete retenido. Los recorridos de uno y dos subpasos producen la misma tabla. A 12,62 s el Host somete el paquete 6 con edad cero y picking devuelve la pose y la fase iniciales. A 12,68 s el mismo reloj muestrea Running a 3,8 m/s. Pasan los dos recorridos con el rig, el rechazo de la preimagen y 96 pruebas de regresión. [Recibo del rig](performance/native-raid-encounter-retreat-rig-20261126.json).

La prueba usa el glTF y las animaciones baked originales, con un pase de prueba y una cola GPU determinista.

### Fall del trabajador en el primer envío de Retreat

A 12,60 s el trabajador ya estaba en Fall. El control privado prepara sus cuatro mallas baked para 12,62 s con el mismo rig, geometrías y materiales. El participante devuelve la fase anterior después de grabar, incluso si la grabación falla. El picking de la fuente vuelve a su geometría anterior. Los controles rechazan actor ajeno, restante adulterado y una fase histórica que aún posee el rig.

En el avance de dos subpasos el primer RAF autorizado somete el paquete 6 con Retreat a edad cero y Fall a fase Float32 de 0,460000008 s. Game verifica el mismo cuerpo y posición del trabajador, con 3,081666508 s restantes de Fall. Omitir la captura temporal deja en el paquete la fase anterior de 0,44 s y el control detecta la misma geometría de picking anterior al golpe. Las publicaciones siguientes llevan el rig a GetUp a 15,72 s y completan su desplazamiento a 18,92 s con 0,24 s de mezcla de salida. Pasaron 19 pruebas dirigidas. [Recibo de Fall y GetUp](performance/native-raid-encounter-worker-fall-20261126.json).

El arnés escribe la fase de las mallas en un buffer del pase de prueba. Quedan por acreditar el grupo de uniformes del renderer en una captura completa de Surface, el acuse por el puerto de recursos, la integración en producto y la validación en GPU física.
