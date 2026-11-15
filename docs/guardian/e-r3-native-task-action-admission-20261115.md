# Admisión de acciones con el paquete GPU retenido

Continúa la [fase sobre el actor residente](e-r3-native-action-actor-phase-20261115.md).
La acción ya atraviesa el Surface, el canal de preparación y el control directo
existentes antes de emitirse en C++. Se valida una nueva acción Harvest con GPU
real. El productor ordinario, las consecuencias y la persistencia siguen
pendientes; e-R3/e-R4/f-R4, los once padres A6 y la aceptación A/B/C permanecen
abiertos. Se conserva el orden A → B → C → D.

## Orden y propiedad

`startNativeTaskActionAfterGpuQuiescence` amplía el coordinador existente de
propuestas. Parte de una llegada realmente ejecutada y de su solicitud tipada;
prepara el candidato de la familia 15, conserva su identidad original y exige
la misma plantilla en el paquete capturado. La revalidación temporal conserva
el origen preparado. Un candidato o un recurso listo no autoriza una acción.

El canal de recursos de la autoridad transporta esa preparación por su puerto
existente, fuera de la cola de avances. El Surface prepara el soporte fijo, los
clips y el binding del cuerpo activo; captura uploads y comandos, y conserva
las validaciones y el rollback del mismo ticket. Negocia la capacidad de
admisión de acciones por separado de la capacidad de su reloj.

El consumidor acepta el reloj pendiente únicamente dentro de ese candidato
retenido y de su frontera exacta. La quiescencia vuelve a comprobarlo antes de
esperar a `queue.onSubmittedWorkDone`. Solo después del recibo directo y de
revalidar recursos, fuente e identidad se llama al commit nativo existente.
La tupla del ABI sigue siendo una entrada confiada del propietario; por sí sola
no constituye prueba de drenaje GPU.

La liberación exige una asociación emitida que cubra exactamente la plantilla
preparada, sin mezclarla con otras clases de relevo. Publica intención y reloj
en orden antes de instalarla y reproducir el paquete retenido. El consumidor
conserva también su permiso revocable de actor; cancelar o retirar la acción
impide reproducir un paquete antiguo. La cobertura incluye el nuevo inicio
real y mantiene los relojes independientes del mismo paquete.

No se crea otro registro físico, transporte, renderer ni motor de fences. El
cuerpo permanece estacionario en el registro C++ existente. La fase gráfica
usa su reloj ejecutado y el clip del actor original. Repair mantiene duración
cero: el grafo conserva explícitamente `clamp(reloj, 0, 0)` para retener la
asociación tipada en los bindings reales del programa, sin inventar tiempo de
trabajo ni una excepción de selección constante en el host.

## Código fuente consultado y decisiones

Se consultó el código de Godot 4.4-stable,
[`RenderingServerDefault::sync` y `draw`, líneas 371–387](https://github.com/godotengine/godot/blob/4.4-stable/servers/rendering/rendering_server_default.cpp).
Su sincronización de cola de comandos distingue orden del hilo de render y
trabajo de dibujo. Aquí se conserva esa distinción: recibir la preparación o
vaciar una cola CPU no acredita terminación del dispositivo.

También se leyó Dawn, rama `main` observada el 15 de noviembre de 2026,
[`Queue::APIOnSubmittedWorkDone` y `TrackTask`, líneas 171–248](https://github.com/google/dawn/blob/main/src/dawn/native/Queue.cpp).
Sus eventos se asocian a seriales de ejecución y se completan al alcanzar el
serial correspondiente. Se aprovecha la garantía de `onSubmittedWorkDone` del
dispositivo existente y se liga al paquete/fuente exactos; no se implementa
otra cola ni se añade Dawn como dependencia. La referencia `main` no es un SHA
inmutable. Las soluciones de clips y bindings residentes del incremento
anterior se reutilizan.

## Validación

La [evidencia con hashes](performance/native-task-action-admission-validation-20261115.json)
registra 377 pruebas dirigidas aprobadas. Diez casos nuevos cubren admisión
exacta y tardía, plantilla/recibo incorrectos, cancelación durante drenaje,
espera efectiva al recibo, canal real MessageChannel, picking del actor con
edad enviada y el binding gráfico de Repair cero. El ensayo de drenaje retiene
su promesa y comprueba que C++ todavía no ha emitido la acción; el tiempo físico
puede avanzar mientras tanto. La selección amplia ejecuta 1.986 casos: 1.981
aprobados y los mismos cinco fallos históricos, sin omitidos ni cancelados.
Compilación y sintaxis de scripts de navegador pasan. Los binarios nativos no
cambian. Los fallos históricos siguen pendientes para el cierre integrado.

La prueba con GPU NVIDIA Turing usa el Surface, el preparador, el dibujante y
los puertos reales. Su fuente `SpatialGameSession` sigue en la página; B usa
su fixture Home independiente. A llega por una tarea real, se proyecta una vez
su marcador semántico y se declara Harvest mediante la API de solicitud
existente. La entrada de acción utiliza el coordinador y el drenaje reales.
No es la activación ordinaria de `Game.tick` ni la autoridad completa en Worker.

La preparación se bloquea 1.800 ms antes de terminar y otros 1.800 ms tras estar
lista. B continúa avanzando, A conserva su cuerpo, el rig CPU permanece sin
cambios y la acción dibuja desde su reloj nativo sin publicaciones periódicas
de poses JS. Se registran los conteos y edades de la ejecución final en el JSON,
sin errores de GPU, página, consola, HTTP o peticiones. Las regresiones de primera
tarea y reanudación diferida también se conservan y drenan al cerrar.

La planta situada delante del trabajador mantiene su precedencia normal en la
selección de la escena completa: el resultado es `plant-900099`. Una prueba
separada ejercita el picker normal del actor aislado a varias edades enviadas;
no se presenta esa selección aislada como un acierto del trabajador a través
de la planta. La prueba Repair cero acredita construcción real del programa
y su binding; no una reparación ordinaria ejecutada con consecuencias.

## Recursos y siguiente integración

El escenario reducido de Desierto con dos trabajadores y un cultivo prepara
98 recursos para la entrada Harvest. Tras quedar listo, el paquete se adopta
y reproduce sin recursos nuevos ni forks adicionales de buffers, bindings,
uniforms o texturas. Esto acredita ausencia de preparación en ese tramo de
dibujo; no acredita reutilización total, presupuestos de todos los biomas ni
el cierre del caso de 3.123 recursos. Las siguientes publicaciones deben
conservar lo no modificado y preparar únicamente los cambios necesarios.

Queda conectar productor y proyección ordinarios, comprobar la finalización
nativa antes de cualquier consecuencia de juego y admitir los recursos de
esa consecuencia antes de aplicarla. No se retira el rechazo actual de
`Game.tick` para `ActionActive`. También faltan guardado/restauración semánticos,
entrada de un consumidor nuevo con una acción ya emitida desde el Surface,
las demás intenciones y aceptación integrada. El bootstrap del control y del
roster de acciones emitidas ya existe, pero no cierra esa conexión del Surface.

El Surface sigue exigiendo coherencia de la secuencia completa de publicación.
Este ensayo usa una publicación y el reloj directo posterior; no demuestra
que las publicaciones ordinarias de otros actores eviten invalidar o volver
a preparar el paquete. Esa dependencia debe resolverse en el productor común
con identidad de recursos coherente, sin eliminar controles ni regenerar la
escena por cada avance.
