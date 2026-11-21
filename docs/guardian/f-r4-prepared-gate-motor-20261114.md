# f-R4 parcial: motor de puerta preparado e independiente del actor

Continuación: [corte con comandos ya retenidos](f-r4-prepared-world-commands-20261114.md). Resuelve la dependencia de otro turno del preparador para el corte de puerta; los demás límites de producto siguen abiertos.

Fecha: 2026-11-14. Base: `73fa60859`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) y la
[puerta original bajo tiempo nativo](f-r4-native-gate-graphics-20261114.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Cambio y propietarios

El motor causal utiliza ahora la transacción de mundo existente: propuesta C++
todavía no efectiva, copia de recursos, preparación gráfica, quiescencia y
drenaje del consumidor actual, commit nativo, marcador de mundo y release.
Los tickets comparten el contador de las demás mutaciones. No hay otro
coordinador, canal autoritativo, renderer o dependencia.

La propuesta captura las curvas del mismo `NativeGate`, su geometría autorada,
raíz y bisagra, sin alterar su apertura. En modo causal, las entradas inmediatas
de reconciliación/preparación y el commit legado no pueden saltarse ese proceso.
Un fallo, cancelación, cambio de cuerpo o pérdida del consumidor invalida la
propuesta antes del efecto. Un fallo después del efecto cierra el canal según
el protocolo común; no se presenta como un aborto sin cambios físicos.

WorldClient/Worker/Surface preparan los materiales mediante Settlements y el
propietario de muro existentes. El handle listo se retiene hasta el commit o
su cancelación. Se cancela también al cerrar/fallar el Worker. La activación
ocurre bajo el marcador confirmado; los datos de propuesta por sí solos no
habilitan un dibujo.

El uniform de la puerta identifica su recurso mediante puerta y frontera de
mundo, sin conservar la asignación del trabajador. El consumidor exige tanto
el marcador aplicado por el control directo como el marcador del paquete.
Una frontera inventada, futura o de otra autoridad no sirve. La selección usa
el tiempo float32 realmente enviado en el último dibujo de esa puerta.

La curva termina en una apertura constante. Su residencia puede continuar
después de ese extremo; la cobertura de recursos no autoriza tiempo futuro.
Cada dibujo sigue limitado por el reloj causal confirmado por C++. El mismo
ejecutor permite avanzar un conjunto vacío de rutas coherente, respetando
pausa, pruebas estáticas y pertenencia. `set_time` sigue sin poder hacerlo.
Esto permite cerrar la puerta después de retirar su último solicitante.

Un paquete obsoleto podía retener inicializaciones de uniformes hasta otro
dibujo y bloquear el fence de admisión del relevo. El consumidor reutiliza su
mecanismo de copia al escribir para enviar esas inicializaciones a generaciones
separadas, conservando los buffers de la última imagen. Solo admite esa clase
verificada de preparación; texturas, cómputo y cambios no clasificados mantienen
sus restricciones. El ACK sigue esperando `queue.onSubmittedWorkDone()` real.

## Implementaciones consultadas

- Godot **4.5.1-stable**, [RenderingServerDefault](https://github.com/godotengine/godot/blob/4.5.1-stable/servers/rendering/rendering_server_default.h)
  y [CommandQueueMT](https://github.com/godotengine/godot/blob/4.5.1-stable/core/templates/command_queue_mt.h):
  reserva de identidad separada de inicialización, argumentos poseídos por la
  cola y ejecución ordenada con sincronización explícita. Se adapta al handle
  preparado y al commit existente, sin introducir un segundo servidor gráfico.
- Godot, [Main::iteration](https://github.com/godotengine/godot/blob/4.5.1-stable/main/main.cpp):
  avance de simulación y posterior sincronización/dibujo son responsabilidades
  distintas. Aquí la ausencia de rutas deja de desactivar el tiempo nativo de
  los motores de mundo; no se deriva tiempo del render.
- wgpu **v26.0.1**, [StagingBelt](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu/src/util/belt.rs):
  estados de transferencia y recuperación diferenciados; `finish` no equivale
  a submit ni a reutilización. Se conserva esa distinción en los uploads
  retenidos y el fence real; no se importa su asignador ni otra dependencia.
- Three **r180**, [UniformNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/core/UniformNode.js):
  el nombre semántico estable no fusiona la identidad del uniform. La variante
  independiente mantiene la interfaz ya preparada y sus buffers propios.

## Validación

El [recibo de validación](performance/native-gate-motor-validation-20261114.json)
registra comandos, selección exacta y límites de la regresión. Se reconstruyen
standalone y pthread; este último se carga y comprueba su ABI causal.
Pasan 165 casos dirigidos y los seis de propuestas de barrera. La regresión de
133 archivos registra 1.478 casos: 1.476 aprobados, los dos fallos heredados
Carry/Harvest ya identificados y cero omisiones. Build aprobado en 46,39 s;
308 scripts de las páginas QA comprobados sin errores.

Las pruebas nuevas cubren preparación anterior a quiescencia/efecto, recursos
obligatorios, abortos, cambios de cuerpo, pausa con cero rutas, rechazo de vías
inmediatas, vida del handle RPC, frontera de selección y reloj de recursos que
no amplía el tiempo autorizado. El test del consumidor conserva los bytes de
la imagen anterior al completar los uploads retenidos.

Los recibos reales de [Walk/Idle](performance/native-worker-gate-motor-20261114.json)
y [Carry](performance/native-worker-gate-motor-carry-20261114.json) usan
WorldClient/Worker/Surface/roster/Settlements normales y NVIDIA Turing. Primero
abren la hoja con el trabajador; después retiran su intención, cuerpo y entidad
nativos, preparan el cierre y publican una única retirada de entidades. Durante
otro bloqueo confirmado de 500 ms, la GPU sigue dibujando la puerta bajo
watermarks C++, con cero trabajadores y sin publicaciones periódicas de posición.
Conserva malla, geometría, hashes y versiones de atributos. El primer render
preparado no crea recursos y no aparecen shaders/pipelines nuevos. Los buffers
de datos/bindings del relevo sí se preparan: no se afirma cero asignaciones.
La comparación de apertura admite el mismo error float32 conservador de 3e-6.
El recibo conserva la curva exacta y SHA-256/tamaño/tipo de las posiciones y
máscaras autoradas; evita duplicar sus miles de índices como propiedades JSON.
El cierre del cliente espera el drenaje real antes de disponer de la autoridad.

## Límites y siguiente punto

Esto no convierte la retirada lógica del actor en una propuesta preparada:
la prueba la ejecuta explícitamente antes de proponer el motor. Tampoco convierte
la admisión de rutas de gameplay en una transacción gráfica ordinaria. Siguen
pendientes ese relevo completo, el productor/ejecutor ordinario de todas las
intenciones, sus consecuencias y guardado/restauración, animales y clases de
puerta/apoyo fuera del alcance nativo ya validado. La prueba entrega recursos
de ruta de forma explícita y pausa para su admisión.

El handle listo retiene los materiales; su commit todavía necesita un turno
del Worker de preparación para activar el grupo y grabar el nuevo paquete.
El consumidor rechaza la imagen anterior si ya cambió el marcador, pero no se
acredita un relevo sin espera al bloquear ese Worker entre ready y commit.
El segundo bloqueo de estos recibos comienza después de observar el primer
dibujo del marcador nuevo. Esa diferencia impide declarar cerrado f-R4.
Las preparaciones retenidas de otras clases conservan su rechazo seguro;
su aplicación coordinada tampoco queda resuelta por el caso de uniformes.

Siguiente dependencia: preparar y reutilizar el delta del relevo completo de
asignaciones/entidades y sus comandos de dibujo antes del efecto, conectándolo
al productor ordinario. El consumidor debe poder aplicar ese relevo ya listo
aunque el Worker de preparación esté bloqueado en la frontera del commit.
No se activa autonomía en partida ni se adelanta la aceptación A/B/C o la fase D.
