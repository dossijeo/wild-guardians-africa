# Frontera causal de Build para muros sólidos residentes

La orden ordinaria `buildWallChain` conserva la cotización, el cobro y el evento `WallChainBuilt` de Game. El primer alcance nativo admite lotes de muros intactos y sólidos en regiones residentes. Las piezas reservan sus gráficos y sus huellas físicas antes de que la orden consuma la compra. La secuencia de la orden identifica el único cobro, el evento y el recibo de barreras.

## Referencias de código

Jolt Physics v5.3.0 reserva la inclusión de cuerpos en el broadphase con `AddBodiesPrepare`. `AddBodiesFinalize` toma el bloqueo de escritura y añade los mismos identificadores. `AddBodiesAbort` libera el estado preparado y su bookkeeping. Wild Guardians aplica el mismo ciclo de vida al lote que ya posee la transacción nativa de mundo. [BodyInterface](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyInterface.cpp#L167-L185) · [BroadPhaseQuadTree](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Collision/BroadPhase/BroadPhaseQuadTree.cpp#L140-L261).

OpenRA ejecuta `PlaceBuilding` y `LineBuild` en `AddFrameEndTask`. Allí revalida al productor y su cola, crea el tramo y consume el elemento de producción. Wild Guardians mantiene la revalidación, el cobro y la publicación de los muros en el turno de su propia orden, tras preparar los gráficos mientras Game sigue avanzando. [PlaceBuilding](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Traits/Player/PlaceBuilding.cs#L57-L202).

## Incorporación y reaprovechamiento

1. El Worker cotiza y comprueba la residencia antes de tocar el terreno o cobrar. Si hay una ruta Farm afectada, prepara y adquiere solo su parada 24. Vuelca a WASM el aviso de esa parada antes de capturar el lote de muros para que el siguiente tick conserve la revisión prevista.
2. Settlements reserva el primer `NativeWall` por ID en su ranura existente. El coordinador de admisión prepara solo las piezas nuevas y registra un paquete retenido con la declaración de barreras kind2. Los soportes de terreno y los dueños de rutas ajenas conservan sus identidades. El paquete puede actualizar su hora efectiva cuando WASM revalida el mismo lote con el reloj avanzado.
3. `buildWallChain` revalida la cotización, el permiso y la economía. Consume una vez el lote preparado y adopta las identidades que WASM asignó a sus huellas Float32 durante el `nav.setState` normal. El espejo ya contiene esas piezas cuando se sincroniza la topología. Si se cancela antes de consumir o cambia la cotización, se libera la reserva. El flujo legacy mantiene la colocación existente.
4. Surface abre la publicación confirmada al presentar el recibo del lote adquirido. La historia registra la nueva frontera con una lista vacía de regiones y eliminaciones de terreno. La compra conserva `terrainChanged:false`, por lo que la revisión de vegetación lejana no vuelve a solicitar los lotes equivalentes. La continuación Farm usa el mismo cuerpo con su nueva ruta cuando corresponde. [Retención de vegetación lejana](far-structure-revision-retention-20261121.md).

El comprobador de identidad del ABI confirma cinco funciones públicas aditivas en los binarios de WASM autónomo y pthread. Los dos ejecutan los controles de revalidación, identidad del lote, rechazo por geometría obsoleta y cancelación. El banco determinista comprueba que un `advance` inmediatamente posterior a `execute(Build)` conserva el recibo del muro y permite el checkpoint visual. También cubre una cotización invalidada, la cancelación, el uso único y la liberación del hold en el mismo turno de la compra. Pasaron las 603 pruebas de la selección y la compilación Vite de producción con empaquetado de imágenes y muros. [Prueba de autoridad](../../tests/native-barrier-authority.test.js).

## Worker y WebGPU real

En Edge sobre NVIDIA Turing, con resolución de 640×480 y calidad `muy_baja`, la ruta que cruza el muro dibujó Farm2, stop24 con ticket 5, ambos muros con ticket 7 y la continuación Farm9. El lote se preparó a 10,90 s con el ticket 6 y se adquirió a 11,40 s. Game avanzó durante las dos esperas controladas. El checkpoint visual 36 conservó las 12 regiones y la frontera exacta de la compra. El trabajador retuvo el cuerpo 1, la raíz, los huesos y los 32 propietarios de geometría.

Fuera del corredor, el recuento pasó de 115 a 118 módulos, el checkpoint conservó el ticket efectivo 5 del muro y Farm mantuvo su ticket 2. Ambos recorridos confirmaron un solo cargo, rechazaron el duplicado y drenaron el consumidor sin errores. Con `2,-1`, `2,0` y `2,1` ausentes, la orden se rechazó antes de cobrar, preparar barreras o detener Farm. [Recibos físicos, identidades y huellas de los binarios](performance/native-build-active-farm-20261120/solid-wall-kind2-20261121.json).

El cruce registró 1.497,9 ms entre las primeras presentaciones de los paquetes 46 y 47. El dato mide la llegada de un paquete nuevo. Falta contrastarlo con las repeticiones del paquete anterior y con la cadencia del compositor. Astra recibió las dos secuencias y la ventana del productor para localizar la espera. La aceptación de 60 FPS permanece abierta.

El alcance abarca muros nuevos sólidos en regiones ya residentes. Quedan la admisión causante de regiones nuevas, puertas, nuevas supresiones, sustituciones y recuperación de colisión en ruinas dentro de una partida nativa. [Historial del cruce](native-build-active-farm-20261120.md) · [Plan integrado](integrated-gpu-migration-plan-20261104.md).
