# Altas Farm con autoridad Worker y Surface reales

Continúa la [admisión incremental](native-farm-birth-admission-20261119.md). La implementación publicada ya supera el alta adicional pagada de los cuatro perfiles con SimulationAuthority en su Worker, productor ordinario, ambos puertos directos, roster y Surface originales y dibujo WebGPU físico. Este incremento añade la comprobación y sus recibos; no necesita cambiar producto, ABI ni dependencias.

## Investigación aplicada

Se inspeccionó la versión instalada Three 0.180.0/r180, no solo su documentación: [Geometries](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Geometries.js) retira los atributos al destruir su geometría; [Pipelines](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js) conserva stages por fuente y pipelines por clave/uso. Se mantiene esa propiedad existente y se verifica identidad de buffers y ausencia de módulos WGSL idénticos duplicados. No se introduce alias de atributos entre geometrías con vidas independientes.

[WebGPUTextureUtils](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUTextureUtils.js) y [DataMap](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/DataMap.js) muestran la asociación real Texture→datos backend→GPUTexture. La instrumentación QA consulta esa asociación mediante referencias débiles y conserva solo metadatos históricos. Permite identificar texturas de movimiento subidas dentro de compilación, donde la mera pila de fábrica no indica su dueño. No modifica su vida, datos o shader; las anotaciones servidas de nombre/origen y sus hashes quedan en los recibos. No se reemplaza la caché de Three ni se añade biblioteca.

## Ejecución y reutilización

El checkpoint semántico tiene un compañero youngFemale con declaración Farm13 y fondos para contratar. Su mundo de creación se destruye antes de abrir el navegador. Desde entonces toda física y cada comando pertenecen al Worker ordinario; la página no llama al ABI nativo ni mantiene otro planificador. La autoridad nueva genera su propia época y admite al contratado como cuerpo2.

Se bloquea únicamente el Worker preparador durante 1.8s al contratar. El contratado conserva pose/fases iniciales mientras el compañero y la autoridad continúan. Se retiene una respuesta READY auténtica de Farm, se reenvía intacta y se vuelve a bloquear el preparador durante 1.8s: el hardware adquiere23 y sigue dibujando. Cada ventana registra54 dibujos; el compañero avanza más de0.5 durante preparación y el paquete adquirido avanza más de0.5s durante el segundo bloqueo. No es un bloqueo del Worker de autoridad.

| Perfil contratado | Recursos antes de READY | Recursos después | Buffers de geometría observados del nuevo actor | Compartidos con el compañero | Nuevos vivos |
| --- | ---: | ---: | ---: | ---: | ---: |
| olderMale, visual | 653 | 0 | 18 | 0 | 18 |
| olderFemale, visual | 655 | 0 | 19 | 0 | 19 |
| youngMale, visual | 738 | 4 | 26 | 0 | 26 |
| youngFemale, visual | 560 | 14 | 26 | 26 | 0 |
| youngFemale, sin capturas | 557 | 8 | 26 | 26 | 0 |

En las cinco ejecuciones NVIDIA/Turing permanecen los **575 IDs residentes comprobados**: geometría previa de toda la escena excepto geometría transitoria de huellas identificada, y texturas vivas excepto programas reales de movimiento/muestras de huellas. Se conservan actor, huesos, mallas, geometrías y generación de Surface anteriores. Los huesos CPU permanecen iguales entre READY y el dibujo autónomo. No se duplican módulos de shader con fuente idéntica; picking identifica ambos trabajadores y el cierre obtiene el recibo real `disposed:true` de GPU antes de cerrar la autoridad.

El mismo perfil reutiliza los26 buffers vivos observados y las28 geometrías de sus mallas; eso no equivale a coste cero de instancia ni descarta versiones transitorias. Los totales incluyen bindings/uniformes nuevos, tablas de movimiento y primera demanda concurrente de VFX. No son un presupuesto causal exclusivo del nacimiento ni demuestran minimalidad sin un control sin contratación. La categoría de geometría `new-worker` puede solaparse con la del compañero cuando comparten geometría.

Las asignaciones posteriores a READY son exclusivamente samplers/texturas de `footstep-samples` y bindings de `footstep-draw`, identificados por sus objetos reales. Los tres contadores de forks de uniformes, buffers y bindings permanecen en cero después de READY; las versiones y retiros anteriores se conservan en el recibo y no se presentan como cero asignaciones globales. El único recurso previo retirado en cada ejecución es la tabla de movimiento del compañero al pasar legítimamente23→22, con actor900011 verificado. No se retira geometría ni banco anterior.

## Validación y trazabilidad

Cinco ejecuciones físicas terminan con código0, cero errores de navegador/red/fuente/GPU y drenaje real. Se revisaron las cuatro capturas originales de modelos, terreno y sombras en una vista limitada. La pasada de tiempo no hace capturas ni readback. Los máximos entre dibujos en las ventanas están entre33.42 y33.52ms, sin huecos superiores a50ms: estas ventanas rondan30Hz, no certifican60fps, coste CPU/GPU completo ni cadencia de producto.

Tres módulos propios pasan sintaxis; la página nueva pasa además su script inline explícitamente. El comprobador general selecciona páginas ya rastreadas y pasa309 scripts de367 páginas: ese resultado no incluía todavía la página nueva. Los676 inputs congelados antes de la matriz se verifican;682 inputs actuales incluyen seis comprobaciones complementarias de GLB/catalogue/atlas hechas después. Los cuatro GLB coinciden con sus hashes de paquete. Permanecen exactos64 inputs nativos,16 archivos ajenos y38 A5.

Tras las capturas solo se reforzaron guardas del CLI que rechazan errores tardíos y ausencia de drenaje/autoridad viva. Los cinco recibos satisfacen también esas guardas; el runner capturado se reconstruye y verifica contra su hash, y los tres archivos del navegador no cambiaron. No se atribuye a esas guardas una nueva ejecución GPU. Regresión4807 pases/una omisión y build56.157s son **heredados** del incremento anterior, con sus646 inputs de producto/pruebas intactos; no se repitieron compilaciones ni pruebas de producto sin un cambio que lo justificara.

El primer pase comprobaba solo28 IDs del actor/banco. Al ampliar la guarda a toda la escena apareció un rechazo: una textura sin origen en la pila parecía inmutable. La asociación backend real prueba que era la tabla de movimiento anterior del compañero, sustituida al cambiar de intención. Se corrigió la atribución QA, manteniendo la comprobación de geometrías/bancos; se conserva el rechazo, sus fuentes y la aceptación intermedia corregida, separados de los cinco pases finales.

[Recibo, hashes y fuentes verificadas](performance/native-farm-birth-worker-surface-validation-20261120.json). [Capturas, recibos completos, checkpoints y logs comprimidos](performance/native-farm-birth-worker-surface-20261120/).

## Pendiente

Cada caso tiene una sola alta y comienza desde una declaración Farm nativa autorada. No activa partidas íntegramente legacy, incursiones, puertas ni otras clases excluidas. Quedan independencia y cancelación de lotes en GPU real, fallos/cierre durante preparación, guardado/recuperación, admisión y autonomía de huellas, coste mínimo de publicación y aceptación de plataformas/cadencia. El caso histórico de recuperación de3.123 recursos sigue abierto y exige conservar lo invariable; esta alta no lo sustituye.

Siguiente: extender el mismo flujo ordinario a altas concurrentes y sus esperas/cancelaciones antes de cerrar el ciclo de cohort. A6/A, B1–B7 y C abiertos; D no iniciado; f-R3 conserva solo su cierre de seguridad y las tres exclusiones históricas permanecen.
