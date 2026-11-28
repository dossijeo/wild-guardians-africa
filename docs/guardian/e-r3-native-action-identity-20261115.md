# Identidad y tiempo de la acción en el propietario nativo

Continuación de las [variantes gráficas de acción](e-r3-native-worker-action-variants-20261115.md)
y del [candidato desde la llegada](e-r3-native-task-action-proposal-20261115.md).
Se mantienen abiertos e-R3/e-R4/f-R4, los once puntos principales de A6 y A/B/C.
Este incremento conecta identidad, propiedad física y lectura temporal nativas
con el espejo de control. **No activa todavía el flujo de acción de la partida**.

## Fuente de la identidad

El ABI condicionado de la familia 15 comprueba la frontera nativa exacta antes
de consumir el candidato. Conserva el ticket preparado actual o el predecesor
retenido que tiene los mismos parámetros de fuente. Al entrar en `ActionActive`
libera la ruta terminada y captura la secuencia de la transición realmente
emitida. La acción no se identifica por una secuencia prevista por JavaScript.

La asociación inmutable queda en la intención existente: origen preparado y
actual, tickets, secuencia de acción y flags del cuerpo. Son metadatos de
admisión; no hay otra trayectoria, registro físico o temporizador. Las referencias
versionadas y el recibo nativo conservan tarea, objetivo, cuerpo, versión de la
asignación original, pose y fases. Un array de recursos copiado no puede instalar
por sí solo una identidad de ejecución en el control.

**El ABI es una entrada de confianza del propietario de simulación**, igual que
las demás transacciones nativas. Su tupla no verifica por sí sola un recibo de
GPU. El coordinador debe obtener el drenaje directo y el paquete gráfico retenido
antes de llamarlo. Esa conexión de la nueva acción aún no está implementada ni
expuesta como comando ordinario. Las pruebas llaman al ABI expresamente para
validar el componente, sin afirmar una admisión gráfica de extremo a extremo.

## Cuerpo y reloj comunes

El cuerpo sigue en el mismo registro físico nativo. Mientras la acción lo posee,
se rechazan cambios de posición, radio, participación o vínculo y otra reserva
de ruta sobre ese cuerpo. La coherencia del cuerpo se comprueba antes de avanzar
la cohorte o confirmar su reloj. Una retirada del cuerpo cancela su intención y
retira la identidad; el reinicio también cancela esas asociaciones.

La edad y el tiempo restante se leen del único tiempo ejecutado nativo y del
intervalo admitido. No existe un contador JS que avance por separado. La pausa
y la tasa usan el reloj causal existente. El cuerpo de A permanece detenido
mientras la ruta de B sigue ejecutándose; el reloj también puede avanzar cuando
la última ruta se retira y queda una acción estacionaria coherente.

`finishAction` rechaza tareas que exigen recursos si aún no tienen una acción
admitida o si no alcanzaron su final. Terminar esa identidad no aplica por sí
mismo cosecha, reparación, recogida ni otro efecto. La proyección/consecuencia
del bucle de partida sigue pendiente: `Game.tick` conserva su rechazo explícito
de esta nueva clase, evitando caer en el ejecutor heredado.

## Control y consumidores nuevos

El espejo de control reutiliza el contexto existente de cada actor para el
recibo y su límite temporal. Un candidato puede estar preparado, pero solo la
transición nativa exacta y la asociación recibida por el control directo lo
hacen vigente. Cancelar o reemplazar la intención limita la referencia anterior
y evita readmitirla. Un lote inválido no instala parcialmente otras acciones.

El estado inicial de control entrega ahora las acciones vivas separadas de las
rutas ejecutables. El receptor del dibujante instala esos hechos tras su reloj
inicial. Recuperar un consumidor no requiere fabricar una ruta para una acción
ya iniciada. Esto acredita la reconstrucción del permiso de control; preparar y
recuperar su representación gráfica completa aún está pendiente.

La versión de proyección 1 retiene parámetros fijos y la duración declarada;
su adaptación gráfica debe usar esa duración, sin obtenerla restando tiempos
absolutos. La igualdad de la fuente y sus datos representables no sustituyen la
admisión de un paquete GPU ni la comprobación de las otras entidades del frame.

## Código fuente consultado y validación

Se revisó [Godot 4.4-stable, `ObjectDB::get_instance`](https://github.com/godotengine/godot/blob/4.4-stable/core/object/object.h)
(978–996): resuelve el slot y comprueba su validador antes de devolver el objeto.
Se adapta esa comprobación a las identidades y secuencias existentes; no se crea
otro registro de entidades ni se añade una biblioteca.

La [evidencia final](performance/native-action-identity-validation-20261115.json)
registra hashes, builds standalone/pthread y resultados. Los dieciséis casos
nuevos parten de una llegada real en `Game.tick`; después ejercitan el ABI y el
reloj nativos como componente. Comprueban asociación exacta y tardía, rechazo de
tuplas/tickets, propiedad física, pausa/tasa, finalización, cancelación, estado
inicial de consumidores nuevos y ausencia de efectos. Una prueba usa el emisor
de control real y un `MessageChannel` real para entregar el estado inicial y su
cancelación ordenada. Los recursos y reglas de la partida permanecen sin activar
esta nueva acción.

Las dos regresiones GPU mantienen los escenarios anteriores de primera tarea y
reanudación, con `SpatialGameSession` en la página y los Workers reales. No son
una ejecución GPU de la acción nueva. Los cinco fallos históricos de la selección
amplia siguen identificados y no se declaran corregidos.

Quedan enlazar la referencia al reloj/selección de clips, el paquete retenido y
el recibo del dibujante antes del commit; conectar proyección, consecuencias y
restauración de acciones; y completar productor ordinario, otras intenciones y
aceptación integrada.
