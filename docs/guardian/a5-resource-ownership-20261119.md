# A5 — propiedad y coste de cobertura lejana

Auditoría de apoyo, 2026-11-19. Subordinada a [MIGRATION-OBJECTIVE](MIGRATION-OBJECTIVE.md), [plan integrado, A5](integrated-gpu-migration-plan-20261104.md) y [A6-CHECKLIST](A6-CHECKLIST.md). **No cierra A5, A6 ni otro gate.** Sol conserva la autoridad de integración. Comandos, evidencia y restricciones: [traspaso del laboratorio](a5-resource-lab-handoff-20261119.md).

## Conclusión técnica

La recuperación retenida conserva recursos cuando la demanda está estabilizada. Esto no demuestra que la primera preparación sea mínima. Tampoco demuestra fluidez: estas trazas instrumentadas copian inventarios extensos y no sirven para aprobar cadencia.

No es correcto sustituir `source.geometry.clone()` por atributos e índices compartidos entre propietarios con disposiciones independientes. En Three r180, `Geometries` elimina los atributos del `RenderObject` al recibir `geometry.dispose()`; `Attributes.delete()` destruye su buffer sin un contador de propietarios de geometrías. Dos objetos con los mismos bytes pueden necesitar buffers distintos.

Existe una oportunidad **aún no implementada** para evitar algunas copias CPU de datos inmutables mediante wrappers de atributos privados, patrón que ya usa `cloneChunkGeometry`. No ahorra por sí mismo buffers GPU, bindings ni pipelines. Requiere separar datos estáticos de transformaciones, supresión, preparación y atributos de instancia mutables. Esta auditoría no introduce caché, pool, contador de referencias ni gestor nuevo.

## Fuentes consultadas y versiones

La dependencia instalada es **Three.js 0.180.0 con los parches del repositorio**, aplicados por `tools/patch-three-webgpu-pipeline.mjs`. Los hashes efectivos de seis módulos comunes están en el informe de ejecución del laboratorio. Las referencias r180 siguientes ayudan a localizar el código; no sustituyen los hashes del código realmente ejecutado.

| Implementación | Código y mecanismo relevante | Aplicación y límite |
|---|---|---|
| Three r180 | [Geometries.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Geometries.js), `initGeometry/onDispose`; [Attributes.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js), `delete` | Disponer una geometría puede destruir un atributo utilizado por otra. No importar el supuesto de refcount de otro motor. |
| Three r180 | [RenderObject.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObject.js), constructor, `getAttributes`, claves de material/geometría | El listener de disposición invalida la caché. Igualdad de geometrías o shaders no implica igualdad de contexto, luces, objeto, material o bindings. |
| Three r180 | [RenderObjects.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js), `onDispose`; [Pipelines.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js), `usedTimes`; [Bindings.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js) | Reutilizar las claves y propietarios existentes. Materiales diferentes pueden compartir pipeline pero mantener grupos/uniformes distintos. No convertir compilaciones de objetos en número de pipelines únicos. |
| Babylon.js 8.0.0 | [Meshes/geometry.ts](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Meshes/geometry.ts), `applyToMesh`, `releaseForMesh`, `dispose`; [Buffers/buffer.ts](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Buffers/buffer.ts), `_increaseReferences`, `dispose` | Su geometría registra consumidores y su motor libera buffers según referencias. Patrón de propiedad explícita, no permiso para compartir atributos de Three sin soporte equivalente. |
| wgpu v26.0.1 | [wgpu-core/src/device/life.rs](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs), `ActiveSubmission`, `LifetimeTracker::triage_submissions` | Conservar recursos y trabajo pendiente hasta la finalización de la submission correspondiente. No añadir fences globales por objeto o frame. |
| Dawn, commit `432d5a4f703606c6a48b14fbae581bc04a089099` | [DeviceD3D12.cpp](https://dawn.googlesource.com/dawn/+/432d5a4f703606c6a48b14fbae581bc04a089099/src/dawn/native/d3d12/DeviceD3D12.cpp), `ReferenceUntilUnused`, `TickImpl`, `ClearUpTo(completedSerial)` | Retirada por serial completado. El programa debe abandonar el recurso de forma ordenada; la retirada interna del driver no corrige aliases lógicos o una publicación obsoleta. |

Babylon, wgpu y Dawn son referencias consultadas, no dependencias añadidas ni una afirmación sobre la revisión exacta del driver de Edge. `research-sources.json` conserva URLs y SHA-256 de los textos consultados.

## Mapa de propiedad

| Familia | Creador / propietario de vida útil | Escritores y consumidores | Reutilización / liberación segura |
|---|---|---|---|
| Prototipos y texturas de bioma | `webgpu-biome-props.js`, recursos y leases del propietario de bioma | Carga inicial y variantes de material; meshes de chunks, fuentes no residentes, parejas far | Reutilizables dentro del propietario mientras identidad, LOD, contenido y compatibilidad sigan válidos. Disposición final mediante leases y `deferCompilations`, después de consumidores pendientes. |
| Geometría de chunk / fuente no residente | `buildMeshes`, `prepareNonresidentFarSources` en `webgpu-biome-props.js` | Wrappers privados; arrays estáticos pueden proceder del prototipo. `wgOffset`, `wgScale`, `wgRotation`, instancias, clip y atributos near tienen sus propios escritores | `cloneChunkAttribute` separa identidad GPU, **no** el array CPU. Publicar candidato preparado antes de retirar anterior. La lease de fuente oculta se retira mediante admisión; cancelar invalida el candidato. |
| Modelo de pareja 3D/impostor | `webgpu-far-pair.js`, pareja y swap de chunk | Clon de geometría/material. Supresión y transición pueden escribir `instanceMatrix`, `wgOffset`, `wgFarReady`; datos `wgFarBase/Radius` privados | La pareja es propietaria de geometrías y materiales. Texturas/TSL prestados conservan su propietario. `prepareAndPublish`, comprobaciones de vigencia y `deferRelease` ordenan publicación y retirada. No disponer la fuente prestada desde la pareja. |
| Geometría/material/picking de impostor | Constructor de impostor, poseídos por la pareja | Instancias y mezcla día/noche, consumidor gráfico y picking | Reutilizar mientras contrato de pareja sea válido. Retirar picking, caster, geometría y material; recursos prestados se liberan por su lease, no por igualdad de bytes. |
| Atlas día/noche por slot | `webgpu-far-assets.js`, un propietario por cobertura | Lectura por parejas; carga/preparación por propietario; refs de leases | Una carga por registro/slot del propietario. `maybeFree` exige propietario cerrado **y** cero refs. Retención con propietario abierto es política de residencia, no automáticamente fuga. `releaseAfterWebGpuWork` protege uploads pendientes. |
| Cobertura regional y swaps | `webgpu-far-coverage.js`, mapas `swaps` y `nonresident` | Regiones confirmadas por Wild Engine; cámara demanda cobertura; invalidación dirigida; supresión confirmada | Nueva región exige trabajo legítimo. Reemplazo revalida revisión/actualidad, conserva fallback hasta publicación y retira sólo el afectado. Descarga/cierre cancela pendientes y libera leases. |
| Buffers de atributos e índices | `Attributes`/backend, identidad de atributo o interleaved storage | Geometría y nodes del `RenderObject`; CPU escribe versiones antes de upload | Wrappers privados conservan vidas independientes. Compartir un atributo entre geometrías que se disponen separadamente es incompatible con el destructor actual. |
| Materiales, uniformes y bindings | Propietarios gráficos + `RenderObjects`/`Bindings` y consumidor remoto existentes | Material, contexto de render, objeto, snapshot del frame en vuelo | Clones pueden necesitar aislamiento aunque shaders coincidan. Forks protegen datos en vuelo; exigir cero sólo en ventanas estabilizadas equivalentes. Desregistrar propietarios y drenar; objetos WebGPU sin `destroy()` quedan sujetos a referencias/GC del backend. |
| Pipelines/programas | `Pipelines` de Three y cachés existentes | Claves de material, layout, luces, shadow pass, render target | `usedTimes` y claves existentes permiten compartir compatibilidad real. 907 admisiones/compilaciones de objetos no significan 907 pipelines GPU. No construir otra caché global. |

La confirmación semántica viene de Wild Engine y de las comprobaciones de revisión/vigencia existentes. La seguridad física de retirada viene del seguimiento de compilaciones/uploads, publicación y cola GPU en `webgpu-pipeline-admission.js` / `webgpu-texture-upload.js`. `queue.onSubmittedWorkDone()` en el laboratorio se usa una vez al finalizar la retirada observada, no se inserta en el bucle de render ni sustituye dichas garantías.

## Clasificación del trabajo observado

1. **Primera preparación legítima:** atlas, fuentes, geometrías privadas, variantes de material, layouts y pipelines necesarios para la primera publicación. Se mide desde un renderer nuevo; no se vacían cachés del SO/driver.
2. **Nueva demanda legítima:** progresión de `wanted/offered` hasta 173 regiones. No imponer cero fábricas durante esta fase.
3. **Duplicación posiblemente evitable:** copia CPU profunda de datos estáticos en modelos far. El inventario registra igualdad de bytes, wrappers, arrays, versiones y buffers. Falta demostrar inmutabilidad y beneficio de una corrección de producción.
4. **Recreación residente sin cambios:** el comparador exige cero nuevas fábricas/forks y mismas identidades en controles y dos recuperaciones. Una recreación artificial en el recibo se rechaza. No se ha confirmado una recreación innecesaria que justifique modificar producción en esta misión.
5. **Copias necesarias para aislamiento:** atributos/índices con disposición independiente; transformaciones, supresión y bindings mutables. Los controles negativos reproducen destrucción ajena e incompatibilidad de escrituras.
6. **Retención posiblemente excesiva:** atlas permanece con cobertura abierta aunque ciertas refs desaparezcan; es una decisión explícita del propietario. Falta campaña de memoria con recorrido/extensión regional para establecer exceso. Al cierre se exigen cero leases y texturas dispuestas, además de buffers privados retirados.
7. **Preparación especulativa no utilizada:** el ensayo provoca una cancelación dentro de la construcción real de pareja. Puede crear recursos legítimamente antes de descubrir obsolescencia; debe retirarlos. Reducir esta especulación requiere medir frecuencia y causalidad, no ocultar el coste.

## Medición GPU conservada

Ejecución `2026-11-19T18-02-17.358Z-a5-5856`, HEAD `9f22a331e80a34bced8bca2f14b4946576d20356`, seed `712`, sabana pausada, viewport 640×480, Edge `157.0.4341.60`, Playwright `1.62.1`, Three `0.180.0` parcheado. Incluye modificaciones ajenas preexistentes: **HEAD no basta para reconstruir el árbol**. El [informe de ejecución](performance/a5-resources-20261119/report.json) conserva fingerprint completo antes/después, estable, y SHA-256 de WASM y gestores Three.

| Punto | Regiones ofrecidas/demandadas | Recursos acumulados del productor | Compilaciones de objetos | Parejas vivas / creadas | Bytes CPU copiados acumulados |
|---|---:|---:|---:|---:|---:|
| Primer frame listo del arranque frío | 20/173 | 5.202 | 142 | 80/80 | 12.143.288 |
| Demanda estabilizada | 173/173 | 26.666 | 907 | 582/582 | 85.449.112 |
| Dos controles y dos recuperaciones | 173/173 | 26.666 | 907 | 582/582 | 85.449.112 |
| Sustituir región `-2,-6` | 173/173 | 26.794 | 912 | 582/585 | 85.881.544 |
| Cancelar candidato y readmitir | 173/173 | 26.967 | 919 | 582/591 | 86.746.408 |
| Retirar cobertura y drenar | 0/0 | 26.967 | 919 | 0/591 | 86.746.408 |

Los contadores acumulados no bajan al liberar recursos. El estado estabilizado tiene 21.337 llamadas `createBuffer`, 4.984 `createBindGroup`, 48 `createTexture`, **45** pipelines render (3 síncronos + 42 asíncronos), 42 pipeline layouts y 76 shader modules, según la instrumentación existente. Estos contadores de fábricas y los 26.666 recursos del productor tienen ámbitos distintos: no deben sumarse ni interpretarse como memoria residente.

La sustitución prepara tres parejas; las otras 579 conservan identidad y contenido. No crea texturas, pipelines, layouts o shader modules nuevos. La cancelación añade seis construcciones de pareja (tres obsoletas y tres finales); el ensayo exige que el candidato cancelado esté retirado. No se oculta ese coste ni se exige cero ante invalidación explícita.

Se verifican 54 buffers privados del reemplazo E y 54 del reemplazo F al retirarse; al cierre, los 10.476 buffers privados del último inventario vivo están destruidos. Además, las 10.584 creaciones de buffers INDEX/VERTEX atribuidas a modelos/impostores en toda la traza, incluidos candidatos retirados, tienen su destrucción registrada. Los ocho atlas día/noche se disponen, quedan cero leases, y los actores ajenos sobreviven con frame actual y cero errores GPU. Las referencias de bindings/pipelines sin destructor explícito no se convierten artificialmente en una prueba de memoria del driver.

Los 85.449.112 bytes contabilizados corresponden a copias CPU de los modelos far observadas al construir las parejas; no son el ahorro realizable, un pico de heap ni una medida de VRAM. El ahorro seguro depende de cuáles datos resulten inmutables tras auditar todos sus escritores.

Evidencia: [resumen derivado](performance/a5-resources-20261119/summary.json), [clasificación final y negativos sobre recibo real](performance/a5-resources-20261119/final-classification.json), [manifiesto](performance/a5-resources-20261119/manifest.json). El clasificador se reforzó después de la ventana GPU, sin cambiar los hooks ni volver a medir: ambos recibos se reclasificaron conservando su aceptación/rechazo original.

## Experimento de disposición reproducible

`a5-geometry-lifetime.mjs` usa los gestores y **el constructor real** de `RenderObject` de Three instalado, con backend registrador. No es GPU real.

| Variante | Creaciones iniciales | Recreaciones al volver a dibujar fuente | Resultado |
|---|---:|---:|---|
| Clon profundo | 4 | 0 | Fuente conserva buffers; disposición final sin buffers registrados vivos |
| Atributo e índice compartidos | 2 | 2 | Disponer copia destruye buffers de fuente todavía viva: control negativo |
| Compartidos, borrados antes de disponer | 2 | 0 | **Falla**: `TypeError` leyendo `version` en `RenderObject.getAttributes`; cero asignaciones no significa seguridad |
| Arrays CPU compartidos, wrappers privados (`cloneChunkGeometry`) | 4 | 0 | Vida GPU independiente; escribir array de copia sigue mutando fuente |

El experimento previo de Sol creaba `Object.create(RenderObject.prototype)` y observaba una recreación al borrar atributos. Omitía el listener del constructor que invalida la caché. Esta auditoría conserva la distinción y reproduce el error del constructor real; no atribuye una corrección a Sol ni cambia su evidencia histórica. Ambas variantes rechazan usar el borrado de atributos como mecanismo de propiedad.

## Ensayo rechazado y límites

El piloto inicial seleccionó el primer chunk `2,2`, próximo a la cámara: pasó de cuatro a cinco parejas y cambió índices/partición por LOD al revalidar. Falló `unchanged-source-content-local`; se conserva como **rechazado**, sin reclasificarlo como aprobado. No prueba por sí solo un bug de producción. El escenario comparable selecciona la última región no residente disponible y conserva exactamente el mismo criterio de contenido y de preservación de propietarios ajenos.

E es una sustitución gráfica dirigida con datos nativos sin modificar. No prueba edición del mundo nativo, cambios de contenido de terrenos, e-R3 ni Farm. F prueba cancelación, obsolescencia y cierre del propietario completo de cobertura; el final del main sigue esperando su ACK de disposición. No acredita por sí solo ausencia universal de fugas de driver, evacuación por movimiento de cámara, recuperación de device loss o todas las acciones del juego.

Las fotos son evidencia visual para revisión; no se exige igualdad binaria de PNG porque siguen existiendo efectos y presentación autónoma. El comparador exige conservación de contenido/identidad, frame actual, actores ajenos y cero errores GPU. Una optimización visual futura necesita además su comparación específica antes/después.

## Próximas optimizaciones, por beneficio/riesgo

| Propuesta | Evidencia disponible | Falta antes de producción |
|---|---|---|
| Evitar copias CPU estáticas de parejas usando wrappers privados existentes | Bytes copiados medidos; disposición aislada en test de Three | Auditar todos los escritores, interleaving, morph/índices y supresión; negativo que falle con implementación actual y medición total de memoria/CPU antes/después. No prometer menos buffers GPU. |
| Evitar recompilar o reconstruir recursos residentes | Identidades y fábricas estables en recuperación | Reproducción de una recreación real; no hay motivo probado para cambiar caché ahora. |
| Reducir especulación cancelada | Eventos de construcción/cancelación/retirada real | Frecuencia en navegación real, causalidad y ahorro neto, sin retrasar admisión necesaria. |
| Evicción más temprana de atlas | Cierre/refs y disposición observados | Presión de memoria demostrada y política compatible con reentrada; no reemplazar leases ni añadir gestor. |

No se implementa una optimización de producción sin estos datos. La entrega utilizable es el auditor y sus negativos: Sol puede probar una corrección aislada con los mismos escenarios sin repetir la investigación de propiedad.
