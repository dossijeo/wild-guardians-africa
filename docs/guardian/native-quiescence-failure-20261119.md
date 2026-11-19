# Fallo terminal de una barrera con productor suspendido — 2026-11-19

Continúa `1070cb6e9` dentro de A4/e-R3/f-R4. La comprobación previa a conectar recursos ordinarios en `main` encontró una suspensión sin asociación RPC válida: después de terminar el commit nativo, el fallo de la barrera gráfica borraba el registro del Worker fuente, pero el productor conservaba su recibo y seguía suspendido. El error parecía recuperable y los siguientes intentos volvían a fallar. Ahora se conserva el recibo en el registro existente y se comunica ese fallo por el camino terminal ya disponible.

## Referencia consultada

Antes de diseñar la corrección se leyó [NATS Go v1.39.1, `nats.go::drainConnection`](https://github.com/nats-io/nats.go/blob/v1.39.1/nats.go#L5543-L5638): tras intentar el drenaje de publicaciones con `FlushTimeout`, informa el error y cierra la conexión. No presenta el drenaje fallido como una conexión recuperada. Se adapta esa decisión sobre nuestro protocolo nativo existente, sin incorporar NATS, su sondeo, otra cola, reloj, contador, dueño o dependencia. URL, versión, SHA-256 del código inspeccionado y decisión están en el recibo.

## Implementación

El Worker fuente guarda el recibo opaco real inmediatamente después de terminar la quiescencia del productor. Solo marca el registro como resuelto después de confirmar la barrera del puerto gráfico. Si esta falla con un recibo de productor adquirido, mantiene el registro sin resolver y envía `nativeIntentControlFailure`. El cliente autoritativo existente falla y termina su Worker; la disposición existente cierra la autoridad y sus propietarios. No reanuda al productor sobre recursos fallidos ni emite un certificado parcial.

El host detecta el estado fallido de ese cliente y transmite el mensaje `failure` que ya usa el runtime hospedado. Se aplica tanto al control nativo explícito como al error durante preparación automática del checkpoint. Window termina el host y rechaza sus peticiones. No se comunica una recuperación ni se vuelve a declarar operativo un productor cuyo recibo se ha perdido.

El registro local conserva su identidad y permanece sin resolver hasta la disposición. Antes de que llegue esa disposición, una reanudación temprana y otra suspensión se rechazan; no se puede emitir un testigo nuevo para el mismo productor. El objeto opaco no cruza el puerto.

Una respuesta nula significa que no hay productor nativo. Si falla su barrera, sigue siendo el error RPC recuperable anterior: no existe un productor suspendido que deba declararse terminal. El caso de control reemplaza realmente el puerto de recursos, obtiene otra suspensión nula, la libera con su identidad y continúa publicando sobre la misma autoridad. Los errores de identidad, suspensión repetida y reanudación obsoleta conservan sus controles anteriores.

## Evidencia

Baseline final con los dos módulos de producción anteriores cargados antes del bundle: **18 controles pasan y 3 casos afectados fallan, de 21**, sin omisiones, cancelaciones ni avisos de actividad asíncrona. El control sin productor ya pasa con el código anterior. La selección inicial actual pasa **43/43**, incluidos los 22 casos del checkpoint. El primer baseline de 20 casos, antes de añadir el control fuente hasta disposición, da 18 pases/2 fallos; ambos logs se conservan.

Validación final: **915 dirigidas/64 archivos**, **4428 de 4429 seleccionadas/343 archivos**, una omisión opcional, cero fallos o cancelaciones. Tres sintaxis y build de producción **56.28 s**. **616 entradas congeladas, 64 nativos intactos y 16 ajenos exactos**, sin recompilar WASM. Decisión, diagnóstico, fuentes anteriores propias, baselines, logs completos, selecciones, sintaxis y hashes en el [recibo de validación](performance/native-quiescence-failure-validation-20261119.json).


La reproducción inicial emplea el runtime hospedado, host, cliente autoritativo y Worker fuente de producción, con la autoridad/planner/C++/WASM y ambos transportes nativos reales. Tras rechazar el commit gráfico y fallar la barrera, el estado anterior era `suspended`, `fault:null`, tanto después del error como del siguiente intento. El registro RPC se había eliminado. La selección diagnóstica pasa dos controles con 16 casos fuera del patrón; es evidencia del estado observado, no una aceptación de recuperación.

Tres casos nuevos y un control anterior actualizado cubren las diferencias: fallo de la barrera después de un commit correcto; productor inexistente y sustitución real del puerto; registro fuente sin resolver hasta disposición; y commit gráfico rechazado mientras se estaba suspendiendo. El control actualizado exige ahora el cierre real de fuente y host. No se introducen comandos de simulación para resolver el error ni se consume otra secuencia fuente. La selección inicial final incluye además los 22 casos del checkpoint de `1070cb6e9`.

Los adaptadores de creación ejecutan los handlers reales. Host/control y cola GPU son los adaptadores deterministas existentes; la sesión inválida inyectada en una petición real de barrera provoca el cierre del endpoint y su respuesta real. No se ejecutan hilos OS/navegador, WorldSurface ni GPU hardware nuevos. Los tres fallos anteriores del host/timeline permanecen explícitamente excluidos, heredados y abiertos.

## Siguiente pendiente

Este incremento hace observable y terminal un fallo que antes dejaba una suspensión inaccesible. No implementa recuperación de un cohort activo sobre un consumidor ya fallido, no reconstruye la escena y no declara continuidad ni ausencia de tirones. El camino de dispositivo perdido y la recuperación con canal ya separado necesitan su evidencia y solución antes de habilitar ordinariamente el preparador desde `main`.

Siguen pendientes esa integración, bootstrap/relevo completos, intenciones y cohortes restantes, coste de publicaciones pausadas, cadencia y plataformas. A6/A/B/C continúan abiertos; D no iniciado; f-R3 conserva su cierre de seguridad. El commit anterior conserva su alcance de checkpoint confirmado y reutilización del consumidor sano; los 3.123 recursos no se solicitan reconstruir como parte de esta corrección.
