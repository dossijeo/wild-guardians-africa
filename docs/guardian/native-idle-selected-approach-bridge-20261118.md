# Descriptor y puente de aproximación seleccionada — 2026-11-18

Continuación de `8a1771878`, A6-04.f-R3/e-R3. El soporte nativo existente ya conserva remaining; ahora el descriptor y el puente lo transportan y lo contrastan con la decisión del 21 terminado. No habilita la proyección/guardado de Game ni la admisión gráfica de esta variante. A6/A/B/C abiertos; D no iniciado.

## Investigación aplicada

Se leyó la implementación instalada de Three r180 (`examples/jsm/loaders/GLTFLoader.js`, líneas 457–464 y 492–529), no solo su documentación. El parser comprueba la versión del formato antes de interpretar sus datos y selecciona manejadores por capacidad. Se adapta únicamente esa separación: discriminador primero, capacidad nativa explícita y lectura de la longitud correspondiente. Aquí los campos/variantes desconocidos se rechazan; no se adopta la tolerancia de GLTFLoader para extensiones desconocidas ni su rango abierto de versiones.

Referencia de código: [GLTFLoader r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/loaders/GLTFLoader.js#L457-L529). Snapshot local y hash en la evidencia. Sin dependencia, parser alternativo ni nuevo protocolo de permisos. Se conserva la separación solicitud/camino ya contrastada con DetourCrowd.

## Cambio

- `native-idle-stroll-reference` versión 2 exige `walkRemaining` finito/representable y no negativo, origen de ciclo real, pose exterior, destino exactamente igual al ancla y retry seleccionado original. No puede contener un origen frío/Farm. La versión 1 mantiene su forma y rechaza ese campo incluso con `undefined`.
- `nativeIdleStrollContinuesNext` contrasta variante, remaining, RNG, retry, pose, ancla, identidad, secuencias y tiempo con el `native-idle-cycle-next-request` actual. Copiar un descriptor por sí solo no concede ejecución ni recursos. Cambiar remaining invalida también la relación de revalidación.
- El puente lee primero el marcador dentro de los límites heredados: 20/21 campos semánticos, 72/73 de binding y 47/48 de fuente retenida. Para marcador 2 exige la capacidad nativa ya compilada. Usa la entrada nativa explícita únicamente para el `next.approach` real; el resto mantiene sus entradas originales.
- Proposal, attestation, cohort y ejecución existente conservan el valor exacto. La ejecución activa y retenida lo comparan con el descriptor. La ruta de aproximación permite el recorrido exterior original, con extremo exacto; el paseo local mantiene su radio. La llegada sigue exponiendo el sorteo REST original, sin reutilizar el remaining WALK.
- Se actualiza la prueba de época grande del soporte nativo: ahora demuestra la lectura tipada habilitada en este paso. La entrada nativa antigua continúa devolviendo -8 para esa selección; no se modifican C++ ni los tres binarios.

## Validación

- **16 pruebas nuevas**: cuatro perfiles normal/pthread, límites REST/WATCH con remaining cero, discriminación/versiones y metadatos ajenos, cancelación/revalidación y fuente retenida/Home. Las ocho cadenas tipadas preparan desde el 21 actual, adquieren el mismo 22 y observan ejecución/llegada con el sorteo REST original. Las **36** pruebas conjuntas con el soporte nativo pasan.
- Baseline con los dos lectores JS anteriores en solo lectura y WASM actual: **4 fallos esperados, 12 casos filtrados, 0 pases**. Pasan **566 dirigidas en 29 archivos** y **3.243 de 3.244 seleccionadas en 275 archivos**: una comparación opcional omitida y siete exclusiones históricas. No es toda la suite del repositorio. Build **45.86 s**.
- Ocho registros tipados originales conservan WALK remaining **11,149999856948853** frente al nacimiento 7,599999904632568; al llegar generan REST **11,399999856948853** con el siguiente RNG privado. Se conserva también el valor cero y el estado retenido. El worker del fixture y el RNG global no cambian durante preparación/commit/ejecución ABI.
- **457 inputs finales /64 nativos sin cambios /16 ajenos exactos**; worker ajeno intacto. No se recompilan ni editan los módulos nativos. No hay captura GPU nueva ni declaración de aceptación de cadencia en este paso.

[Evidencia, selección de pruebas y registros tipados originales](performance/native-idle-selected-approach-bridge-validation-20261118.json).


## Pendiente inmediato

Continúa la proyección inicial/móvil de Game, el estado semántico guardado y su declaración nativa nueva con remaining real; después control, roster/actor residente y Surface/GPU. El validador/restaurador frío actual aún presupone `idleSeconds*2`. No se considera habilitada la variante en partida ni probado su permiso gráfico por poder decodificarla.

Las pruebas nuevas usan commits ABI de confianza y un cohort nativo real. Para `prepareNativeIdleStrollProposal`, el montaje refleja en el worker la fase real del 21 terminado; esto es preparación del fixture, no implementación ni validación de la proyección Game pendiente. Siguen pendientes REST/WATCH exterior guardado, productor/cohort ordinario, recuperación incremental de 3.123 recursos y cadencia/plataforma.
