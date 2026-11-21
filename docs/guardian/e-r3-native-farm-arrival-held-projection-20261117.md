# Proyección del cuerpo Farm retenido

Continúa el [contrato de parada Farm24](e-r3-native-farm-arrival-stop-data-20261117.md) dentro del [plan principal](integrated-gpu-migration-plan-20261104.md). Game puede reflejar la pose física del cuerpo retenido, conservando `arriving`, fases y presupuesto. No ejecuta otra ruta ni convierte la parada en Idle, Task o Home. El relevo preparado y su consumidor gráfico siguen pendientes; A6/A/B/C permanecen abiertos y D no se inicia.

## Referencias y decisión

Antes de diseñar esta lectura se inspeccionan implementaciones reales: [DetourCrowd 1.6.0, `dtCrowd::getAgent`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L485) devuelve el agente existente tras comprobar el índice; [Godot 4.4, `NavigationAgent3D::_transition_to_navigation_finished`](https://github.com/godotengine/godot/blob/4.4/scene/3d/navigation_agent_3d.cpp#L923) conserva el agente, sincroniza su posición real y pone su velocidad a cero. Se adapta el criterio de consultar y conservar la asignación existente, reutilizando el patrón de lectura de Idle retenido. No se importan sus semánticas de finalización: Farm sigue `arriving`. No se añade dependencia, registro de cuerpos, controlador ni historial.

## Fuente y espejo semántico

La lectura nativa exige el slot suspendido y reanudable real, la generación revocada exacta, el cuerpo físico y la asociación Farm23 original. Comprueba también perfil, centro, punto de servicio y secuencia de asignación. La pose procede de la caché física retenida; no se reconstruye con el tiempo de pared. Puede seguir retenida después de la antigua fecha de llegada sin declarar una llegada falsa.

Se reutilizan los scratch buffers existentes: 30 valores de ejecución, 29 de asociación/extremo y los 23 de petición. El bridge copia cada resultado antes de consultar otros getters. La referencia congelada identifica la fuente original y el handle retenido; ese handle no concede permiso ejecutable. La consulta no copia la polilínea ni asigna un cuerpo o slot nuevo. Una colección sobre los intents existentes permite cerrar el baseline cuando hay Farm retenido, evitando omitirlo silenciosamente.

Game acepta el primer espejo desde el marcador pendiente o activo, y exige coherencia exacta en los espejos retenidos sucesivos. Copia pose, fases y presupuesto, desactiva `running`/`gateWaiting` y conserva `arriving`, sin ruta JS ni estado Idle privado. Comprueba tiempo nativo/Game, propietario, contrato y objetivo antes de mutar. La notificación de planificación conserva el marcador retenido.

El guardado programático conserva los valores semánticos, sin handles ni asociaciones ejecutables. Restaurar requiere un mundo físico nuevo y convierte el marcador en una declaración pendiente nueva con su pose retenida. La nueva sesión debe adquirir recursos de nuevo. El guardado UI, el tick ordinario, el productor integral y nuevos baselines siguen cerrados para este estado. No se anuncia capacidad gráfica24.

La elegibilidad confirmada de Task sigue aceptando al trabajador `arriving`: se verifica con una tarea y cultivo reales mediante el validador de asignación pendiente. No se modifica la prioridad para eludir el relevo nativo pendiente, tampoco para cultivos que maduran dentro del tick. Ese test acredita elegibilidad, no una transferencia Task comprometida.

## Validación y límites

La [evidencia](performance/native-farm-arrival-held-projection-validation-20261117.json) identifica 19 casos nuevos y 72 dirigidos. Se cubren los cuatro perfiles en standalone/pthread, fuente genuina Farm23→24 y Task14 independiente, revalidación tardía, generación exacta, primer espejo pendiente/activo, consultas repetidas sin avance o reasignación, tiempo posterior al deadline original, poses ajenas/obsoletas, retiro de propietario, guardado/restauración y cierres del tick/baseline. Los commits físicos de las fixtures usan la ABI confiada; no son recibos GPU.

Los primeros tests detectaron un predicado que dependía de campos de revocación transitorios, limpiados al emitir el evento. Se sustituyen por la generación y el slot suspendido duraderos. También se corrige un test que consultaba el reservador legacy, que sólo admite Idle, para usar la elegibilidad confirmada pertinente. La evidencia distingue esos resultados de la ejecución final.

Dos controles negativos de sólo lectura eliminan, por separado, la igualdad de tiempo de Game y el cierre del baseline retenido. Cada prueba falla por aceptar un estado que debía rechazar. Se conservan árbol y WASM; los fallos intencionados no pertenecen a la regresión final. Ambos módulos nativos se recompilan; se congelan 64 inputs/artefactos y 364 entradas de validación. Se preservan los 16 archivos locales ajenos y el worker pthread sin seguimiento.

No se repite hardware porque aún falta el consumidor24. La evidencia histórica de Farm23 conserva sus huecos conocidos; este incremento no acredita ausencia de tirones ni recuperación incremental de los 3.123 recursos. Continúan control/admisión/publicación/ambos puertos/reloj/picking/Surface para24, relevo Task/Home desde Farm retenido, finales y cohort, productor integral, guardado UI y continuidad A/A6/B/C.
