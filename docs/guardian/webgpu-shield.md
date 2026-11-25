# WebGPU shield presentation

The WebGPU world subscribes to the existing `shieldVfxPlans` derived from confirmed spells and `AnimalLogicalHit` events. The existing native VFX composer generates the shield dome, rings and contact sprites; the WebGPU VFX controller shares its atlas with agriculture, combat and guardian aura. A terrain residency miss hides an effect until the terrain is available. Removing or expiring a confirmed spell or contact removes its presentation. The existing WebGL shield remains the fallback and the simulation remains authoritative.

The geometry adapter draws the native vertices in WebGPU with a TSL Fresnel edge, hexagonal pattern and scan. Soft depth and local lights are not yet ported, so this is not established visual parity. Geometry is currently regenerated and uploaded during presentation preparation, with no performance claim. A live game shield cast and matched visual comparison still need verification.

Run `node --test tests/webgpu-agriculture-vfx.test.js` on Node 20 for lifecycle, terrain and confirmed impact coverage. Run `tools/experiments/audit_webgpu_agriculture_vfx.mjs` against the Vite server with Playwright available through `NODE_PATH` for the OffscreenCanvas WebGPU draw. One run observed 5,568 shield vertices, 27,488 non-background pixels, no uncaptured GPU errors, and removal after the spell disappeared.

## Escudo durante Farm nativo

En NVIDIA Turing, la selección confirmó el punto del terreno y Game publicó un SpellActivated para Escudo de 20 s. Fuera del corredor activo, Farm siguió avanzando con el cuerpo 1 y el Guardian confirmó dos haces. Dentro del corredor, Farm quedó retenido en la última pose. Las dos ejecuciones alojadas terminaron con Native world changed outside its committed resource boundary al observar una publicación de la autoridad. Los recibos conservan las selecciones, los eventos y la última secuencia confirmada. [Controles físicos](performance/native-ordinary-shield-boundary-20261121.json).

El recorrido con WASM y Host determinista conservó Farm y caducó fuera de la ruta. En el corredor, el cuerpo quedó retenido hasta caducar. La propuesta del sucesor reutilizó el cuerpo 1 y devolvió Prepared world frame unavailable. La prueba física falla antes, al contrastar el mundo publicado, incluso si no se detiene Farm. Quedan el alta y la retirada preparadas y el relevo de los corredores afectados.

En DetourTileCache, añadir o retirar un obstáculo usa la misma referencia, sólo ensucia las celdas a las que toca y completa la transición cuando termina ese trabajo. Este patrón permite acotar la preparación de Escudo a su forma y dependencias en la transacción de mundo existente. [Código de DetourTileCache](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourTileCache/Source/DetourTileCache.cpp#L502-L610).

## Máscara nativa del Escudo

La huella del Escudo permite el paso a los trabajadores. WASM aplica esa máscara tanto al invalidar corredores activos durante el alta como al comprobar de forma continua las rutas nuevas. El control nativo conserva el cuerpo, el corredor y su generación para el trabajador, y revoca el corredor del animal al instalar la misma huella. Una ruta nueva de trabajador también puede atravesar el Escudo instalado. El filtro temprano por categorías sigue el patrón de la fase amplia de Box2D. [Código de Box2D 3.1](https://github.com/erincatto/box2d/blob/v3.1.0/src/broad_phase.c#L205-L245).

En las dos partidas del control de Escudo, la orden ordinaria conserva Farm23 y llega a Idle con el mismo cuerpo a t=16,36 s, con la huella tanto dentro como fuera del corredor. El Escudo caduca a t=30,36 s. Ambos recorridos usan WASM y un Host con cola determinista. Los dos controles nativos fallaban antes del ajuste y pasan junto con las 96 pruebas seleccionadas. Las compilaciones standalone y pthread conservan la ABI.

La solicitud de un snapshot con terreno y checkpoint aún falla tras el alta en ambas partidas. Siguen pendientes la publicación coordinada del polígono con el efecto gráfico, su retirada al caducar y la validación física de esas fronteras.
