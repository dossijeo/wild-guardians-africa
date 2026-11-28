# Reutilización en main tras la demanda regional inicial — 2026-11-19

Continuación A4/A5 del [plan integrado](integrated-gpu-migration-plan-20261104.md) y de la [conexión de recursos en main](native-resource-startup-20261119.md). Cambian únicamente dos QA: un ensayo reproducible y un criterio separado de aceptación. El producto y sus dueños no cambian.

## Origen del crecimiento observado

El ensayo anterior conservaba cliente/canvas/binding, pero el contador crecía 1768 → 1945 → 2477. No bastaba para aceptar reutilización. Se añade la observación por objeto/geometría/material ya usada con Three, una traza de los llamadores reales del preparador y dos ventanas sin recuperación antes del relevo.

El primer control muestra creación incluso sin relevo: 1804 → 5768 → 10855. Los actores conservan raíz, huesos, geometrías y materiales. La segunda traza localiza los grupos nuevos en prepareNonresidentFarSources de webgpu-biome-props y FarChunkSwap.offer, llamados desde webgpu-far-coverage. Los chunks ofrecidos pasan 14 → 51 → 87 → 121 → 161 sobre una demanda de 173. Las primeras dos subidas suceden sin recuperación. Las admisiones observadas pasan 46 → 120 → 192 → 260 → 340: aparecen las dos solicitudes de preparación por cada nueva incorporación regional, además de las 18 iniciales. Las pilas reales se conservan.

Esto identifica la entrada de la cobertura lejana, que seguía recibiendo demanda después del primer ready. No demuestra que todos sus buffers sean mínimos, que no duplique datos estáticos ni que su coste sea aceptable. El código crea fuentes no residentes y pares 3D/impostor; FarPair también clona la geometría. La auditoría de ese contenido y sus vidas sigue abierta en A5. Conservar un contador creciente sin atribución ya no se interpreta como reconstrucción causada necesariamente por el relevo.

## Criterio y resultado con demanda satisfecha

El ensayo espera el estado real del propietario regional: wanted positivo e igual a offered, sin deferred ni pending, y admisión sin cola, compilaciones pendientes o trabajo activo. La política del producto sigue igual; esta espera delimita la medición de reutilización.

Un piloto y el caso final con el código fijado completan los 173 chunks. En el caso final, las dos ventanas de referencia y los dos relevos conservan:

| Control | Resultado |
| --- | --- |
| Recursos declarados por el productor | 26666 constantes |
| Compilaciones iniciadas | 907 constantes |
| Fábricas nuevas, incluidos shaders/pipelines | 0 |
| Forks nuevos de uniformes/bindings | 0 / 0 |
| Referencias de atributos comparadas | 15423, sin cambios |
| Actores e instancias: objeto/geometría/material | mismos inventarios |
| Cliente, canvas y binding | mismos identificadores |
| Recuperaciones retenidas y frame vigente | 2 / 2 |
| Handshake de recursos / disposición por menú | 1 / 1 |
| Errores navegador, HTTP y GPU finales | 0 |

La comparación de atributos exige misma referencia nativa, geometría, longitud, versión y hash disponible, sin filas ausentes o duplicadas. Los hashes pequeños proceden de la observación CPU existente; no se hace readback ni se afirma verificar todos los bytes GPU. La ausencia de nuevas fábricas y las identidades conservadas acreditan reutilización en esta ventana. Se inspecciona la imagen final. La partida es sabana pausada, dos chunks cercanos y cohorte nativa inactiva; WALK nativo pertenece a los dos casos previos, no a este ensayo de interfaz.

Se separan functionalOk y resourceReuse.accepted. El nuevo criterio rechaza explícitamente falta de ventanas de referencia, demanda regional incompleta, compilación activa, pérdida de frame, cambio de dueño, inventario o datos, fábricas nuevas, forks, GPU fallida, relevo no retenido y falta de disposición. Pasan 20 controles sobre el informe hardware real: un positivo y 19 negativos adulterando evidencia. Se repiten además los 18 controles del clasificador nativo anterior: un positivo y 17 rechazos. Su función anterior permanece idéntica; se añade otra exportación para main.

## Referencias y alcance

Se reutiliza el patrón de observación síncrona de [Three Renderer r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js) y [NodeLibrary](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/NodeLibrary.js), leídos durante la atribución anterior. compileAsync espera sus solicitudes actuales; no certifica que otro propietario no tenga demanda futura. No se invoca fromMaterial para inspeccionar. Las pilas se toman al entrar en la preparación existente, antes de delegarla sin cambiar objetos ni promesas.

Se contrasta la demanda con las implementaciones reales de [far coverage](../../src/rendering/webgpu-far-coverage.js), [far region](../../src/rendering/webgpu-far-region.js), [far pair](../../src/rendering/webgpu-far-pair.js) y [biome props](../../src/rendering/webgpu-biome-props.js). No se incorpora otra cola, reloj, caché, dependencia o propietario. La instrumentación y la serialización de inventarios son amplias: este ensayo no es un benchmark de cadencia.

Dos sintaxis, 38 controles y el nuevo caso hardware final pasan. Se fijan 626 inputs: 624 anteriores intactos, una herramienta ampliada y otra añadida; 64 nativos y 16 archivos ajenos exactos. Los 951 dirigidos, la cobertura única seleccionada 4452/4453 con una omisión y los dos builds se heredan expresamente de 42cf99cdd, junto con sus tres exclusiones históricas aún abiertas. No hay cambios de producto que requieran repetir esas suites o compilar nativos.

## Pendiente

Queda acreditada la recuperación pausada de main después de satisfacer la demanda observada, sin reconstrucción de recursos residentes en las dos ventanas. No acepta los 26666 recursos ni las 907 compilaciones iniciales como mínimos o baratos. El siguiente punto de A5 es auditar las copias de geometría y sus vidas compartidas durante la preparación lejana antes de cambiar ese mecanismo; también siguen abiertas entrada nativa ordinaria/nacimientos, cohortes no admitidas, consumidor fallido, pérdida de dispositivo, publicación pausada, autonomía VFX, cadencia y plataformas. A6/A/B/C abiertos, D no iniciado; f-R3 conserva seguridad.

[Recibo, controles, fuentes servidas y trazas](performance/main-retained-resource-reuse-validation-20261119.json).
