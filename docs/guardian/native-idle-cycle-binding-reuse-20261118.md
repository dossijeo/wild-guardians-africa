# Reutilización de bindings entre programas Idle — 2026-11-18

Continuación de `5222f8554`, dentro de A6-04.f-R3/e-R3. Se elimina la creación repetida de 68 objetos GPU en los sucesores 21 de la misma estructura. El calentamiento queda acotado a dos juegos: uno activo y uno retirado/preparable. No cambia la autoridad física, la política Idle ni los formatos nativos. A6/A/B/C continúan abiertos; D no se inicia.

## Investigación aplicada

Se leyó el código de [ImGui v1.91.9b, backend Vulkan](https://github.com/ocornut/imgui/blob/v1.91.9b/backends/imgui_impl_vulkan.cpp#L469-L515): conserva juegos de buffers y los crea/redimensiona solo si faltan o no tienen capacidad. Se adapta la reutilización de almacenamiento que ya terminó su uso, sin añadir ImGui ni Vulkan. Aquí el bloqueo de preparación existente admite un candidato y un juego activo: bastan dos juegos.

El código instalado de [Three r180, WebGPUBindingUtils](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUBindingUtils.js#L245-L311) conserva layouts por `bindingsReference` y actualiza el buffer existente mediante `queue.writeBuffer`. [Bindings._update](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js#L237-L243) envía solo uniformes modificados. Conservar nodos/materiales/render objects permite utilizar esos caminos contrastados. La fence de retirada ya existente sigue marcando cuándo puede reutilizarse un juego.

## Implementación e invariantes

- El slot de familia Idle que ya retenía materiales conserva ahora un grafo completo retirado: motion, variante y binding. No se introduce pool global, registro, propietario o cola nuevos. El juego activo permanece intacto mientras se prepara el otro.
- La retirada diferida existente debe completar su fence antes de tomar el juego. Si aún no terminó, la preparación espera esa promesa y puede cancelarse; no crea un tercer juego para evitar la espera. La retirada del actor libera ambos juegos.
- Se conservan las identidades de nodos y materiales. Duración, modo, offset WATCH y bases de fase son uniformes con referencias estables; se actualizan sus datos y tags en el juego inactivo. Three mantiene sus buffers/layouts/grupos existentes. El retiming del mismo programa conserva su validación anterior.
- Solo se reutiliza el grafo compatible con actor/cuerpo/perfil/época/sesión, origen tipado, altura y los mismos bakes. Cambios de datos estructurales o de propietario de bake usan la preparación normal. No se amplía la compatibilidad de los DTO ni se convierte un retag en un permiso.
- Variante, materiales, picking y raycast rebasan su restauración sobre el propietario actual. Cancelar devuelve ese propietario. Las referencias a predecesores se limpian al suspender/disponer; no se conserva una cadena de asignaciones.
- El binding retirado es almacenamiento, no autoridad ejecutable. El 21 nuevo sigue requiriendo evento nativo, reloj/control ordenados, plantilla preparada e instalación real. La fase cosmética conserva la corrección anterior y el horizonte físico sigue finito.

## Validación

- La prueba nueva falla con los siete módulos anteriores: cuatro perfiles fallan por identidades de materiales diferentes (ocho casos filtrados). Con la implementación final pasan **12 casos nuevos**, **370 dirigidos en 19 archivos** y **3.184 de 3.185 seleccionados en 271 archivos**: una comparación opcional omitida y las siete exclusiones históricas; no equivale a todo el repositorio. Build **50,07 s**. Se verifican **452 inputs**, **64 recursos nativos** y **16 archivos ajenos** exactos; worker pthread preservado y ningún rebuild WASM.
- Originales GLB/bancos/kernel: seis adquisiciones consecutivas por los cuatro perfiles; WATCH pthread, REST→WATCH, fence pendiente/abort, cancelación activada, retiming, retirada completa, cancelación antigua y cambio de propietario de bake. Una sonda adicional genuina de initial20 versión 1 confirma cuatro relevos WATCH/REST con dos juegos (renderer/reloj/admisión simulados, no hardware).
- **Timing y visual NVIDIA/Turing pasan 15 adquisiciones cada uno**: primera preparación 100 objetos, segunda 68, **13 siguientes cero creados y cero destruidos**. En la [captura anterior](native-idle-failed-cycle-surface-20261118.md) eran 100+14×68=1.052; ahora 168 de calentamiento. Se conservan 647/648 IDs inmutables iniciales (timing/visual) y no hay recursos tardíos ni shaders duplicados. La auditoría permanente exige trace vacío en cada relevo desde el tercero. Cuerpo/RNG, continuidad REST/WATCH, picking propio/compañero y drain pasan.
- Negativos frío y caliente: retirar la plantilla rechaza antes del primer 21 y antes del tercero, respectivamente. El caliente conserva exactamente el binding del segundo; ni materiales ni tags almacenados autorizan una adquisición. El error deliberado del Host reaparece en la inspección de cleanup: no se afirma drain positivo en negativos. Regresión válida 22→21 pasa (100/98 recursos preparados, cero tardíos, 648/649 IDs iniciales; ventana máxima 161,850 ms, 6 huecos >50; global 8).

| Captura | Frames ventana | Máximo ms | Ventana >50 ms | Global >50 ms |
|---|---:|---:|---:|---:|
| Timing | 806 | 83.095 | 18 | 22 |
| Visual | 808 | 265.505 | 28 | 31 |

Error máximo de continuidad entre ambas capturas: **2.67029399e-07 s**. No se descarta el pico visual de 265,505 ms ni el provisional de 137,835 ms / 21 huecos globales >50. Las muestras de cadencia completas y las marcas de preparación/READY/relevo quedan en la [evidencia](performance/native-idle-cycle-binding-reuse-validation-20261118.json). No se afirma que cero asignaciones elimine todos los tirones ni se atribuye su causa.

Se revisaron las imágenes [REST](performance/native-idle-cycle-binding-reuse-failed-cycle-0-rest-20261118.png) y [WATCH](performance/native-idle-cycle-binding-reuse-failed-cycle-14-watch-20261118.png): actor y compañero residentes visibles, escenario y sombras conservados. Los fallos iniciales del harness y manifiestos se conservan como sondas, separados de las validaciones finales.


## Alcance y siguiente punto

La reutilización cubierta es la sucesión de programas 21 compatibles en el actor residente. No demuestra recuperación integral de los 3.123 recursos ni elimina por sí sola los tirones de las transacciones. Los picos y sus muestras se conservan sin atribuirles causa: el siguiente punto inmediato es medir los huecos de frame durante los relevos y contrastarlos con preparación/quiescencia/adopción, antes de diseñar la corrección pertinente.

Siguen pendientes aproximación 22 con remaining, REST/WATCH exterior guardado desde cuerpo inicial genuino, productor/cohort, recuperación incremental integral, cadencia y plataforma. Ningún gate integral se cierra aquí.
