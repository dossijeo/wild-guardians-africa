# Calificación de AttackCrops en Sabana

La partida original `sabana712-d1-native-active-raid.json.gz` contiene el facóquero `animal-396` y su reserva sobre `plant-373`. La calificación cubre su aproximación, la pose terminal y el primer golpe. La autoridad admite este caso con un solo animal y los ocho trabajadores en casa sin cuerpo activo.

## Admisión y reloj

La marcha usa el corredor reservado y el registro de cuerpos existentes. El ticket 26 retiene los recursos preparados hasta confirmar la misma reserva. Conserva la fase guardada `4.497729763870326` y las velocidades de 3,8 y 1,5 m/s. El cambio ocurre en el cruce geométrico del círculo estricto de 25 m. La regla anterior lo aplicaba en el primer paso dentro del círculo, de modo que el programa puede cambiar de velocidad hasta un paso antes.

Tras llegar, el ticket 27 conserva el cuerpo y la posición terminal. La confirmación asigna el `attackId` y consume una sola tirada. El dueño de la acción existente aplica el daño al concluir la animación. El Host escribe la edad relativa del ticket adquirido sobre el recurso preparado. La selección toma esa edad del mismo testigo de dibujo. Hasta la confirmación, las propuestas pueden cancelarse con los mismos dueños de ruta, reserva y recursos.

OpenRA combina movimiento hasta rango y orientación con un dueño de ataque que ejecuta la acción diferida. DetourCrowd calcula la velocidad a partir de los parámetros del agente y del corredor. Wild Guardians adapta esa separación al programa temporal y al dueño de daño existentes. [Movimiento y orientación en OpenRA](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Attack.cs#L190-L234), [Acción diferida en OpenRA](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Armament.cs#L193-L229), [Velocidad en DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L1115-L1144).

## Alcance de la activación

`qualifyAnimalCrop:true` se admite en el Worker de desarrollo para las pruebas. El perfil ordinario conserva su recorrido actual hasta que el cuerpo pueda adquirir el siguiente objetivo. En la calificación, un avance de dos subpasos que cruza el primer golpe alcanza la guarda de cohorte en el segundo. El control ordinario cruzó ese golpe y terminó otro avance de dos subpasos con cero propuestas 26 o 27.

El control con Game, WASM, ambos puertos, el Host con cola determinista y el roster original validó ambos tickets con READY retenido. Verificó la continuidad de geometrías y atributos, la selección con la edad enviada y el rechazo de un cuerpo o época ajenos. Emitió un `AnimalLogicalHit` con `attack-661` y dejó un golpe disponible.

## Prueba con WorldSurface

El primer ensayo en NVIDIA llegó a la solicitud de la ruta de 31 nudos. La sonda posterior conservó el error de origen del cliente. La solicitud pedía la secuencia 110 cuando Surface tenía la 9. La precondición se cumplió a la secuencia 117 tras 1,823 s. El rig estaba visible y sus clips de marcha y carrera estaban instalados. Aún se estaba preparando su motor histórico local cuando el roster recibió la ruta nativa. La preparación se rechazó antes de READY.

El roster reserva ahora el mismo actor para la solicitud nativa y cancela la preparación histórica especulativa por su controlador existente. Conserva el retiro diferido de sus recursos. Las pruebas cubren la compilación histórica que responde tarde y el caso en que la preparación de Walking iba a iniciar Running mientras la ruta esperaba. Pasaron los 59 controles de autoridad, Host y roster de esa selección.

El siguiente ensayo dibujó el ticket de marcha con edad inicial cero. La publicación 124 ya estaba recibida y tenía el terreno listo. El pump la había reservado para un intervalo histórico que Surface debía sellar, mientras Surface esperaba aplicar esa publicación para terminar la adopción. Con la cobertura del dueño nativo, el grupo histórico deja ese tramo al pump ordinario y vuelve a certificar cuando el dueño se retira. El control mantiene el orden y la comprobación del terreno. Surface usa la misma cobertura para la selección.

En NVIDIA Turing, la partida sin modificar dibujó dos tickets adquiridos tras retener sus READY durante 550 y 250 ms. Ambos enviaron edad inicial cero. La marcha produjo testigos de dibujo a ambos lados del cambio de velocidad. El ataque tomó el cuerpo 1 y la pose terminal de la marcha. `attack-661` emitió un único `AnimalLogicalHit`, destruyó `plant-373` y dejó un golpe disponible. La raíz 338, sus cuatro geometrías y las 78 referencias y versiones de atributos comparables se conservaron en las cinco etapas observadas. El consumidor confirmó el drenaje.

El arnés ejecutó un subpaso por avance y detuvo el despacho tras recibir el primer golpe. La captura a 30 Hz conservó 1.000 intervalos de inicio de dibujo. El máximo durante la marcha fue 40,60 ms. Cerca del cierre del ataque hubo 633,70 ms entre envíos. En ese intervalo se recibieron 18 callbacks y los 18 rechazaron el paquete anterior por `stale-binding`. El paquete siguiente esperó 515,0 ms entre el cierre del frame en el preparador y el inicio de su envío. En ese hilo, `pump` de `webgpu-pipeline-admission.js` ocupó 514,34 ms de pared y 508,17 ms de CPU justo antes del envío. Queda identificar qué solicitud genera ese coste, completar la continuación del mismo cuerpo y verificar las adversidades A–F. C4 sigue abierto. [Recibos, picos y hashes](performance/native-attack-crops-qualification-20261125.json).

## Preparador bloqueado

Dos ensayos en NVIDIA bloquearon el preparador durante 550 ms con la marcha admitida. En cada ventana hubo 16 dibujos del mismo ticket y de una sola secuencia del Host. El reloj avanzó 0,50 s y el mayor intervalo entre esos dibujos fue de 33,50 ms a 30 Hz. Esta prueba cubre la continuidad durante el bloqueo. La revocación durante esa misma ventana queda pendiente.

Los dos ensayos llegaron al golpe. Después, Draw recibió un paquete ordinario con el binding de ataque del programa 27 desde la secuencia de control 11. La traza del segundo ensayo registra la misma época y la secuencia de control 13, con el dueño ya retirado. La admisión del paquete tardío provocó un error del Host y el drenaje quedó pendiente en esas corridas. [Ventanas, rechazo original y hashes](performance/native-attack-crops-qualification-20261125.json).

## Orden de envío al terminar el golpe

Three.js r180 recorre la escena y construye las listas y pipelines antes de esperar las promesas de compilación. Wild Guardians conserva la precedencia de un frame ordinario que ya está codificado. El preparador espera su `postMessage` con el transporte y los créditos existentes antes de comenzar otro lote de pipelines. La confirmación de Draw y sus fences siguen el flujo habitual. [Implementación de `compileAsync`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L797-L910).

Draw conserva la prueba de retirada en el binding físico que adquirió el ataque. Si llega tarde ese mismo binding, el Host rechaza el paquete mediante la vía de obsolescencia existente y admite después los paquetes autorizados. Otra copia en un buffer que nunca adquirió la acción sigue fallando. Los controles reproducen el envío adelantado por la compilación y el cierre del Host por un paquete tardío en la base anterior.

Una captura instrumentada identificó la solicitud que sigue al retiro del ataque. `prepareLateHistoricalMotion` preparó en la misma raíz 12 variantes de cuatro familias de material. La parte síncrona de una llamada a `compileAsync` duró 504,28 ms. Queda comprobar en qué momento se necesita esa preparación histórica y qué variantes puede reutilizar.

Con el orden corregido, el frame 245 dibujó el golpe a 402,05 s con el binding de ataque ya retirado. El preparador inició el envío 1,20 ms después de cerrar el frame. La compilación especulativa empezó 12,40 ms después del envío y seguía ocupando el preparador al dibujar el golpe. El consumidor confirmó el drenaje y conservó los 78 buffers comparables. En ese borde se midieron 133,30 ms y tres oportunidades rechazadas por obsolescencia, frente a los 633,70 ms y 18 oportunidades del ensayo anterior. La espera previa al cierre del nuevo frame y la cadencia a 60 Hz siguen abiertas. [Captura del golpe y marcas de orden](performance/native-attack-crops-qualification-20261125.json).

Esta selección pasó 343 pruebas y el build en 57,51 s, con los mismos binarios WASM. El perfil ordinario sigue pendiente del segundo objetivo.

## Preparación histórica por demanda

Después del golpe, la admisión histórica especulativa de la misma raíz registró 14 módulos WGSL de fuente distinta a las anteriores y ocho pipelines. Algunas etapas compartieron módulos por referencia. El coste de esa admisión solo corresponde al movimiento histórico que use las variantes. Three.js r180 crea el estado de nodos cuando se solicita para un objeto renderizable y lo comparte por clave del objeto. [Selección de nodos en Three.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/Nodes.js#L171-L214).

Tras el retiro del ataque, el mismo rig admite las observaciones estacionarias con sus recursos residentes. La primera observación de movimiento con trayectoria, apoyo y fase válidos solicita la variante mediante el controlador de preparación existente. Las solicitudes concurrentes comparten esa preparación. El control anterior preparaba una variante sin desplazamiento y el corregido verifica cero admisiones en ese caso.

La primera captura del candidato llegó al golpe sin iniciar el lote histórico. Al retirar el ataque, la admisión pidió una confirmación de la GPU mientras el Draw Worker aún retenía escrituras de un paquete obsoleto. Una escritura afectaba a un vértice publicado. La guarda de la cola rechazó el fence y el paquete posterior quedó sin dibujar.

La retirada usa el fence del trabajo ya enviado y mantiene las generaciones que el Host tiene fijadas. Si quedan escrituras retenidas, el preparador espera una presentación nueva y su confirmación física antes de liberar el recurso. Un paquete descartado o una repetición del anterior mantienen la espera. Al cerrar el preparador, el Host conserva las generaciones hasta completar su propio fence de último uso. La cola ordinaria sigue rechazando una solicitud que exija confirmar escrituras aún sin publicar. Godot procesa liberaciones diferidas al completar la ranura del frame. Dawn asocia las tareas de finalización al número de ejecución de la cola. [Godot 4.5](https://github.com/godotengine/godot/blob/4.5-stable/servers/rendering/rendering_device.cpp#L5803-L5828) · [Dawn QueueBase](https://dawn.googlesource.com/dawn/+/refs/heads/main/src/dawn/native/Queue.cpp#260).

Los controles del Host mantienen en 3 el valor del vértice dibujado pese a la escritura retenida de 99. Comprueban la liberación tras un reemplazo confirmado y durante un cierre sin otro dibujo. Una escritura posterior en una generación ajena sigue rechazándose. Pasaron las 382 pruebas seleccionadas.

La segunda captura con el fence corregido confirmó el prefijo en 0,70 ms y retuvo 70 escrituras hasta la secuencia gráfica 237. La última secuencia dibujada fue 236. Game confirmó el golpe en la publicación 688, y antes del vencimiento se registraron 298 oportunidades con el binding obsoleto durante 9.932,60 ms. El preparador aún esperaba la sustitución gráfica. En ambas capturas se registraron cero pedidos de compilación histórica tras el golpe.

Cuando la publicación terminal retira el strike, el roster avisa a Surface. Surface comprueba el tipo y la frontera nativa adquirida, avanza la revisión gráfica y habilita la captura. El mismo control cubre la llegada del rechazo antes y después de confirmarse la publicación. Otro tipo de ruta o una frontera de otra época mantiene la espera. Las referencias forjadas continúan rechazándose en el Host.

Con los tres cambios, NVIDIA dibujó el paquete 242 a 402,20 s. La inspección del paquete 244 confirmó el mismo instante con el binding del ataque retirado. Se conservó el cuerpo 1, la raíz, las cuatro geometrías y los 78 buffers de atributos comparables en las cinco etapas. Hubo un solo golpe, cero pedidos y compilaciones de variantes históricas tras el retiro, y drenaje sin errores. Durante 550 ms de bloqueo del preparador, el Draw Worker presentó 17 veces, 16 con el mismo paquete retenido, y adelantó el reloj causal 0,50 s.

El intervalo del relevo fue de 166,60 ms a 30 Hz, frente a 133,30 ms de la captura anterior con compilación especulativa. Hubo cuatro oportunidades que rechazaron el binding obsoleto. El preparador consumió 29,90 ms al avanzar la publicación y 22,90 ms al capturar la escena, incluidos 21,80 ms en el registro del renderer. En los 21,70 ms previos a la recepción, la traza del preparador contiene 35 pares de serialización y deserialización que ocupan 7,76 ms y siguen pendientes de atribuir a sus llamadas. El paquete se envió 0,20 ms después de cerrar la codificación. C4 y la continuación al segundo objetivo siguen abiertos. [Capturas, desglose y hashes](performance/native-attack-crops-qualification-20261125.json).

La selección completa pasó 382 pruebas al ejecutarse sin el build concurrente. Durante la ejecución concurrente, una prueba de descargas de carrera observó el reintento de 5 ms antes de su primera comprobación y registró 381 aciertos. El build pasó en 52,34 s con los mismos binarios WASM.

## Regresión

Pasaron 512 de 522 pruebas seleccionadas. Cinco quedaron omitidas y cinco casos QA-100 de último golpe a trabajador reprodujeron los mismos fallos de la línea base. El build de producto con WebGPU Worker y Draw remoto pasó en 1 min 5 s. Standalone y pthread conservaron las firmas existentes y añadieron 25 funciones de los contratos de ruta, golpe y estado del animal.
