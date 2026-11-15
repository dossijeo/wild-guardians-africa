# Preparación nativa desde la autoridad, fuera de la cola de avances

Continuación de [fases y reconciliación de primera tarea](e-r3-first-task-phase-continuity-20261115.md).
e-R3/e-R4/f-R4, los once gates principales de A6 y la aceptación A/B/C siguen abiertos.

La primera tarea podía preparar sus recursos desde un coordinador en la página;
faltaba transportar esa solicitud desde la autoridad sin detener sus comandos.
El canal de propuestas de terreno exige que su secuencia base permanezca fija
durante la preparación. Reutilizar esa condición para una ruta habría invalidado
la solicitud cada vez que B publicase un avance normal.

## Propiedad y conexión

Los propietarios actuales exponen `attachNativeResourcePreparation(port)`:
cliente gráfico, host de partida, cliente de autoridad y autoridad. Host y cliente
de autoridad transfieren ese puerto fuera de la cola de comandos. No consumen
una secuencia de partida ni esperan a que termine el comando en vuelo.
La conexión comprueba sesión y versión y tiene un plazo de diez segundos.

La autoridad utiliza el cliente de recursos retenidos que ya empleaba el cliente
gráfico, extraído a un módulo común. Primera tarea, reanudación y motor de puerta
mantienen sus mensajes, recibos, validación de plantillas, actualización de datos,
commit y cancelación. El Worker gráfico utiliza el mismo receptor para ambos
endpoints y continúa llamando a los preparadores de su superficie existente.
Los handles y recursos permanecen allí; el puerto transporta datos y órdenes,
sin clonar funciones, construir otra escena o crear otro propietario del dispositivo.

La conexión de autoridad admite una solicitud o handle retenido a la vez, acorde
con el único candidato nativo pendiente. Cancelación, expiración y cierre retiran
el proxy; un handle que termine tarde se aborta en el propietario. Respuestas de
otra sesión o con identificadores no emitidos cierran la conexión. Cancelar tras
`ready`, o rechazar una actualización incompatible, libera capacidad para otra
solicitud. El cierre de la autoridad cancela su preparación. Una conexión fallida
puede sustituirse; una conexión viva no se reemplaza implícitamente.
Una segunda actualización concurrente se rechaza sin retirar la reserva de la
primera. Los handles de motor de puerta conservan su interfaz sin actualización
de ruta; no se les añade un método que pueda perder esa reserva al fallar.

Este puerto prepara recursos y no concede autoridad física o gráfica. La época,
el ticket nativo, la asociación real de la ruta y el canal directo con el dibujante
siguen acreditando el commit. No se relajan las barreras de terreno ni se vincula
la vigencia del recurso a una secuencia de estado ordinaria que B deba congelar.

## Código fuente consultado

Se leyó [Comlink v4.4.2, `src/comlink.ts`](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts):
`expose` (277–367), `wrap` (377–396), `releaseEndpoint` (404–409) y
`requestResponseMessage` (591–604). Se adaptan la correlación por identificador,
la resolución asíncrona y la liberación explícita a nuestros mensajes ya definidos.
Se conservan métodos acotados y recibos tipados; no se incorpora su proxy genérico
ni una dependencia nueva.

Se revisó también [Godot 4.4-stable, `ResourceLoader`](https://github.com/godotengine/godot/blob/4.4-stable/core/io/resource_loader.cpp),
`load_threaded_request` y los tokens de usuario (469–488). La solicitud devuelve
el control y conserva una referencia a la preparación. Aquí el handle retenido
permanece en el Worker gráfico; la identidad de assets y su reutilización siguen
perteneciendo a los bancos y al registro existentes. No se implementa otra caché.

## Evidencia y límites

La [validación](performance/native-resource-channel-validation-20261115.json)
congela los hashes de los 16 archivos propios durante las comprobaciones:

- 148 casos dirigidos y 167 de regresión pasan, sin fallos ni omisiones.
  Los contratos usan `MessageChannel` real para primera tarea, espera con B
  ejecutándose, cancelación tardía, actualización, expiración, cierre y sesión.
- Una autoridad real ejecuta tres comandos de avance mientras espera un
  preparador controlado. Sus snapshots y eventos coinciden con una autoridad de
  referencia. Esta comprobación prueba independencia del servicio, no una tarea
  de partida ejecutada mediante el nuevo coordinador.
- La compilación del producto pasa; pasan también sintaxis de los
  archivos propios y comprobación del diff. No cambia C++ ni se reconstruye WASM.

En la [prueba GPU del puerto directo](performance/native-resource-channel-gpu-20261115.json)
los Workers reales de preparación/dibujo conservan primera tarea, fases, rig,
selección y drenaje. Se prepara una vez y hay 54 dibujos durante el segundo
bloqueo de 1,8 segundos, con B avanzando y cero recursos nuevos después de `ready`.
Se revisó la [captura bloqueada](performance/native-resource-channel-blocked-20261115.png).
La [regresión de reanudación](performance/native-resource-channel-resume-gpu-20261115.json)
mantiene también 53 dibujos y cero recursos nuevos tras `ready`.
Ambas pruebas usan NVIDIA Turing y terminan sin errores GPU, de página, consola
o HTTP. El primer escenario registra además cero solicitudes de red fallidas.
Los recursos preparados antes de `ready` siguen constando en sus recibos;
esto no cierra el presupuesto global de reutilización ni de rendimiento.

La fuente de la prueba GPU continúa siendo un `SpatialGameSession` en la página;
ahora solicita recursos por el mismo endpoint que puede usar la autoridad.
Los propietarios de autoridad y host tienen la conexión y pruebas de contratos,
pero el bootstrap ordinario aún no la conecta con un productor autónomo de todas
las tareas. Los cinco fallos históricos de la selección amplia anterior no se
declaran corregidos ni se presenta esta selección como la suite completa.

El siguiente punto sigue siendo el productor y ejecutor de intenciones dentro
de la autoridad: cuerpo nativo, política de tarea, avance causal y proyección de
lo realmente ejecutado sin otro `moveWorker`. La llegada necesita preparación
de acción y consecuencias antes de retirar la reserva. Quedan también las demás
clases, cancelación/restauración completas y la aceptación integrada A/B/C.
