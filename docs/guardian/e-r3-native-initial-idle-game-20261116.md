# Idle inicial: declaración y comprobación semántica en Game

Continuación de [la fuente nativa inicial](e-r3-native-initial-idle-request-20261116.md), en `codex/guardian-3d-animation`. Este incremento añade la entrada explícita de Game, su comprobación contra el cuerpo retenido y la restauración semántica en una sesión nueva. No concede ejecución, admisión gráfica ni cierre A6/A/B/C.

## Referencias consultadas antes de implementar

- [DetourCrowd v1.6.0, código fuente real](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L591): `addAgent` inicializa el registro y velocidades con `targetState = NONE`; `requestMoveTarget` declara por separado un objetivo pendiente. Se conserva esa separación entre presencia, petición y autorización ejecutable sobre los propietarios existentes. No se adopta su ajuste de posición al NavMesh ni su corredor local limitado.
- Three.js 0.180.0, `node_modules/three/src/loaders/ObjectLoader.js`, `parse`: resuelve geometrías, materiales, objetos y esqueletos de un grafo serializado. Esa reconstrucción completa no corresponde a esta restauración semántica. La nueva declaración no llama al cargador ni reconstruye actores, lotes o recursos gráficos. La residencia gráfica y el trabajo incremental siguen perteneciendo a los consumidores existentes.
- Se contrastaron `normalizeNativeIntentRestoration`, la restauración Home, los valores iniciales del trabajador, `presentation-worker-headings.js` y `idle.js`. No se añade dependencia, controlador, registro, mundo físico ni cola.

## Comportamiento implementado

`requestNativeInitialIdleResources(state, worker, {yaw})` admite exclusivamente Idle estacionario, sin tarea, caja, paseo, recuperación o incursión, dentro del contrato y con centro intacto. La fuente es el `ActiveIntent` nativo introducido en el incremento anterior; no se fabrica una tarea, Carry o liquidación.

La orientación debe proceder del trabajador o, si aún no existe en él, de su orientación real de presentación suministrada explícitamente. Se rechaza sustituir una orientación ya conocida. Los acumuladores de locomoción todavía ausentes usan el mismo cero inicial del movimiento original; nunca se reinician los existentes. Game adopta estos campos y el marcador `pending-idle-resources` únicamente después de aceptar la declaración nativa. El descanso/vigilancia, fase local, RNG privado y ancla no se ejecutan ni se modifican. Los campos auxiliares heredados del estado Idle se conservan en Game; la petición transporta sólo su semántica pertinente.

`projectNativeInitialIdleRequest` comprueba la pertenencia de la partida y la correspondencia exacta de actor, centro, perfil, pose, presupuesto y estado Idle con la petición actual del cuerpo. Devuelve una petición, nunca una prueba de ejecución. Antes de vincular el cuerpo devuelve `null`; el primer vínculo físico exacto produce la nueva secuencia nativa prevista por el protocolo. La notificación ordinaria de planificación conserva el marcador de espera.

El guardado contiene sólo el marcador y los datos semánticos existentes del trabajador. No serializa la referencia de petición ni una autorización gráfica. La carga valida todos los Idle iniciales antes de cerrar consumidores o cambiar la sesión; exige un mundo físico nuevo, igual que la restauración Home. Después de restaurar las tareas, declara los Idle por identidad ordenada y antes de vincular sus cuerpos. Una partida heredada sin el marcador conserva su comportamiento anterior y no activa esta migración por accidente.

## Validación

La regresión compartida pasa 747/747 casos en 69 archivos (424.174,941 ms). Después de ella, la revisión del orden de notificación retiró el vaciado prematuro del nuevo comando inferior: Game debe adoptar su marcador antes de publicar la transición. La comprobación dirigida final pasa 16/16 casos (7.958,2825 ms), incluido un observador real que recibe la declaración después de esa adopción. No se presenta esta última corrección como parte de la regresión anterior.

Los casos nuevos ejercitan el módulo nativo real: Idle sin inicializar, descanso y vigilancia; valores iniciales y orientación; rechazo físico sin cambios parciales; vínculo posterior; carga de los cuatro perfiles; conservación del guardado, cuerpo, fases y RNG; pertenencia y datos alterados; preflight sin cerrar consumidores ni cambiar la sesión; mundo físico reutilizado rechazado. La carga no crea rutas o permisos de tarea, acción, entrega, liquidación o Home.

La regresión compartida y la compilación de producto se registran en [el resultado de validación](performance/native-initial-idle-game-validation-20261116.json). No hay cambios C++/WASM en este incremento; se reutilizan los módulos del commit anterior. No se repite hardware sobre una clase que aún no tiene admisión gráfica.

## Pendientes inmediatos y límites

Game rechaza el avance temporal de `pending-idle-resources` antes de cualquier mutación, también antes del primer reloj nativo, para impedir que el fallback JS ejecute Idle sobre una fuente retenida. Esta espera todavía no es una cohorte ejecutable de producto. Falta incorporar la clase al reloj común y a los eventos/baselines de control, su relevo válido a tarea/Home incluso antes de READY, y la admisión estacionaria inicial por el transactor y consumidor existentes. Después faltan los ciclos completos de descanso/vigilancia y el paseo original con sus reglas y RNG. No se considera resuelta la continuidad temporal de Game durante esta espera.

Otras clases y puertas, productor ordinario, sustitución de una partida viva, recuperación incremental de los 3123 recursos sanos y aceptación A/B/C antes de D siguen abiertos. Este incremento no mide tirones ni justifica reconstruir recursos gráficos sin cambios.
