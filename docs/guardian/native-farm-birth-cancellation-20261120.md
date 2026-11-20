# Cancelación de altas Farm con un READY real retenido

Continúa las [continuaciones de contratados](native-farm-newborn-continuations-20261120.md). Se comprueba ahora en Worker/Surface y GPU física el vencimiento de una contratación mientras su Farm23 está preparada, pero todavía no adquirida. El protocolo existente cancela esa preparación, conserva la pose de nacimiento y adquiere Home18 desde la declaración19 real; después publica la ausencia20. Reenviar el READY Farm cancelado, antes o después de adquirir Home, no activa23 ni consume la respuesta de reemplazo.

No fue necesario cambiar producto, ABI, dependencias o política de contratación. Se amplía el mismo harness de altas con una rama de ciclo de vida; todos los propietarios, puertos, reloj y publicaciones proceden de su autoridad y Surface originales.

## Investigación y decisión

Se leyó código real de [Comlink v4.4.2](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts): `requestResponseMessage` registra un receptor por ID; `wrap` busca ese ID, descarta respuestas sin receptor y elimina la entrada después de resolverla. Nuestro cliente de recursos ya tiene esa correlación, además de sesión, tipo, ID monótono y comprobantes nativos. Se verifica y reutiliza; no se instala Comlink ni se añade otra cola o un proxy.

También se contrastaron [FileLoader](https://github.com/mrdoob/three.js/blob/r180/src/loaders/FileLoader.js) y [LoadingManager](https://github.com/mrdoob/three.js/blob/r180/src/loaders/LoadingManager.js) de Three r180: cargas por URL compartidas, caché y controladores de aborto de distinta amplitud. Se mantiene la cancelación por petición del protocolo nativo; no se aborta globalmente el cargador compartido del compañero. El receptor existente comprueba tanto su controlador como la identidad de su entrada al terminar una preparación asíncrona, de modo que una devolución antigua no retira el reemplazo.

## Escenarios comprobados

Tres casos nuevos usan autoridad, productor, ambos puertos y un paquete preparado auténtico. Interceptan el mensaje real del endpoint, sin fabricar un ACK. Comprueban el vencimiento y reenvían la respuesta Farm antes o después de la respuesta Home, incluyendo una repetición obsoleta. El tercero cierra la autoridad después del READY y comprueba aborto y ausencia de adquisición tardía. La física usa Wild Engine real; su cola/dibujo GPU son dobles deterministas.

La selección de esos tres casos y los17 de admisión anteriores pasa **20/20**, sin omisiones, en30.854s de duración Node. Cinco módulos propios pasan sintaxis. El primer fixture dirigía el nacimiento al centro ocupado del compañero: el contrato vencía antes de que pudiera obtener Farm READY. Se conserva ese diagnóstico y se usa el segundo centro libre ya probado para aislar la carrera que se quiere comprobar; no se modifica el tráfico del producto para conseguir el pase.

En hardware se mantienen los mensajes Farm y Home originales, con IDs distintos. El contrato vence mediante avances ordinarios de la autoridad. El Worker preparador observa el aborto Farm; el harness reenvía después su respuesta original intacta y libera el Home legítimo. Los comprobantes conservan el cuerpo2 y la misma época; no se introduce una historia de Farm23 adquirida. Las muestras cubren todo el intervalo desde el alta y ninguna dibuja el ticket Farm cancelado. Sí existe dibujo del Home adquirido, seguido por ausencia20.

| Caso GPU NVIDIA/Turing | IDs invariantes retenidos | Preparados antes de Farm READY | Fábricas posteriores, incluyendo Home/ausencia |
| --- | ---: | ---: | ---: |
| olderMale, respuesta obsoleta antes de Home | 578 | 242 | 53 |
| youngMale, respuesta obsoleta después de Home | 575 | 328 | 100 |
| Control youngFemale sin cancelación ni capturas | 575 | 546 | 6 |

Cada cancelación supera tres bloqueos de1.8s del preparador: preparación inicial, reenvío obsoleto y adquisición Home. Hay54 dibujos por ventana; el reloj dibujado avanza entre1.70 y1.72s y el compañero avanza durante preparación y reenvío. Conserva actor, huesos CPU, mallas, geometrías y generación de Surface. No se retira ningún recurso invariante identificado ni se duplica un módulo WGSL idéntico. Los conjuntos se definen por la base real de cada caso; no se interpreta578→575 entre ejecuciones como una retirada.

El picking conserva al compañero y rechaza al contratado ausente. Al terminar queda un actor listo/nativo y cero preparaciones de roster pendientes. El perfil retirado tiene cero referencias activas y permanece en la caché inactiva acotada existente:45.11/46.17MB frente a su límite100.66MB. No se confunde esa residencia reutilizable con una preparación activa ni se fuerza su destrucción. Las dos capturas originales revisadas son vistas limitadas; no aceptan paridad visual general. Los tres cierres reciben `disposed:true` de GPU y mantienen viva la autoridad hasta el cierre gráfico.

## Cadencia pendiente, con evidencia conservada

Los dos casos de cancelación no registran huecos superiores a50ms en sus tres ventanas; sus máximos están alrededor de33.5ms. **El control funcional sí registra tres huecos de168.28,97.49 y139.47ms durante la preparación**, con46 dibujos en esa ventana. Su segunda ventana tiene54 dibujos y máximo33.46ms. El código0 del control acredita sus guardas funcionales y de propiedad, no una aceptación de cadencia.

Las muestras anteriores y posteriores a esos huecos tardan aproximadamente0.9–1.52ms en dibujar. El máximo trabajo síncrono de recursos registrado es19.21ms (`copyExternalImageToTexture`) y ocurre después de la ventana afectada. Esa instrumentación no atribuye la causa de los huecos; no se declaran externos ni se excluyen del resultado. Falta correlacionar scheduling, colas y GPU antes de proponer una corrección. No se repite el control para reemplazar el dato por una pasada más favorable.

El primer intento del caso youngMale comenzó demasiado cerca de250: su carga se canceló antes de emitir Farm READY, mientras el harness esperaba ese mensaje y retenía Home. Ese intento no acepta la carrera de respuesta obsoleta. La matriz final comienza en240; el alta se produce aproximadamente en242.3 y la preparación real llega antes del vencimiento250, dentro de los mismos límites del protocolo. No se amplían timeouts, cambian perfiles o fabrican respuestas. La cancelación antes de producir READY queda como escenario distinto pendiente de aceptación GPU completa.

## Trazabilidad y límites

Las tres ejecuciones GPU terminan con código0 funcional, sin errores de fuente, navegador, red o GPU y con drenaje real. Eso no convierte el control en un pase de cadencia: sus huecos se conservan en el recibo. Los688 inputs finales,64 inputs nativos,16 archivos ajenos y38 A5 permanecen exactos. Solo cambian cinco archivos de pruebas/herramientas. Regresión4833 pases/una omisión y build124.459s de c01e659f8 son **heredados**, con todos los inputs de producto iguales; no se repiten ni se presentan como pruebas nuevas.

[Recibo, fingerprints y hallazgo de cadencia](performance/native-farm-birth-cancellation-validation-20261120.json), [fuentes propias, capturas finales y diagnósticos](performance/native-farm-birth-cancellation-20261120/).

Esto acredita dos órdenes de respuesta obsoleta para una alta, con un compañero previamente admitido. No cierra cancelación de lotes simultáneos o con el mismo perfil compartido por otro actor, fallo de cargas, cierre GPU con READY pendiente, recuperación, guardado, device loss o todos los perfiles/estados. El cierre con READY de este incremento tiene evidencia CPU con GPU doble, no hardware. Tampoco demuestra coste mínimo de las53/100 fábricas posteriores: incluyen preparaciones Home/ausencia y VFX concurrentes.

Los huecos del control y la recuperación histórica que reconstruyó3.123 recursos siguen abiertos. La reutilización es necesaria, pero estas pruebas no demuestran por sí solas la eliminación de todos los tirones. A6/A, B1–B7 y C permanecen abiertos; D no iniciado; f-R3 conserva únicamente su cierre de seguridad y las tres exclusiones históricas siguen vigentes.
