# f-R4: instalar los cambios nativos de props ya preparados

Continúa [la retención del terreno](f-r4-unchanged-terrain-20261113.md).
**f-R4 sigue parcial**, al igual que e-R3/e-R4 y los once padres A6. El mecanismo
se instala en los propietarios canónicos existentes; no activa todavía la vía
nativa en el gameplay normal.

## Código fuente consultado y decisión

- [Recast/Detour v1.6.0, DetourTileCache.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourTileCache/Source/DetourTileCache.cpp):
  `buildNavMeshTile` construye los datos del tile antes de reemplazar el tile
  efectivo. `update` conserva el seguimiento de tiles afectados y pendientes por
  obstáculo. Se aprovechan la preparación separada de la instalación y la
  delimitación del cambio; no se importa su navmesh ni su política de fallo
  después de retirar el tile anterior.
- [Godot 4.5, NavigationRegion3D](https://github.com/godotengine/godot/blob/4.5/scene/3d/navigation/navigation_region_3d.cpp):
  `bake_navigation_mesh` separa el parseo de geometría del bake asíncrono;
  `_bake_finished` difiere la notificación al hilo propietario cuando procede.
  Se conserva ese límite entre cálculo auxiliar y propietario efectivo, usando
  las propuestas y la instalación nativa que Wild Guardians ya tenía.

Las revisiones y las condiciones de vigencia siguen siendo las de Wild Engine.
La adaptación reutiliza `patchActiveRaster`, `prepareSectorOverlay` e
`installPreparedSectors`; no añade otro generador, grafo, ejecutor o dependencia.

## Implementación

La supresión y la restauración protegida conservan, junto a sus chunks canónicos,
los rasters parcheados de los perfiles activos y los sectores afectados. El
cálculo usa copias privadas de los rasters de los chunks afectados y sus bordes,
sin copiar el mapa de todo el mundo. Ni la preparación ni la lectura del payload
publican esas copias o confirman sectores del grafo vivo. Se restauran selección
y contexto de perfil al terminar.

La propuesta revalida disponibilidad, radio, tipo y revisión de grafo de cada
perfil, además de los controles existentes de sesión, ticket, tiempo, reloj,
inputs, cuerpos y reservas. Un cuerpo introducido bajo un prop propuesto o un
grafo/radio nuevo invalidan la preparación antes del efecto físico.

Después del drenaje se publican los chunks ya calculados y se instalan sus
rasters/sectores. Se mantienen el orden canónico de sectores de un cambio simple
y el orden deduplicado de un lote, los halos, las revisiones de inputs, los
witnesses y los controles de nuevos sólidos sobre cuerpos/rutas. La restauración
usa los candidatos conservados para ese mismo preflight; evita regenerar sus
recetas bajo el hold. El journal efectivo conserva sus buffers preparados, y
la fachada JS los copia sin reseleccionar ni regenerar chunks al exportar.

Una clave de supresión válida puede no corresponder a un prop generado. En ese
caso se conservan los candidatos privados necesarios para validar, pero el
journal no inventa publicaciones gráficas: solo cambian el conjunto canónico y
su revisión de inputs. La restauración heredada sin dominio de protección nativo
tiene semántica distinta de halos/revisiones; conserva expresamente su vía
canónica y su exportación conservadora.

## Evidencia

Standalone y pthread reconstruidos con los flags oficiales de
`tools/build-spatial-savanna-wasm.sh`, mediante el mismo procedimiento de los
incrementos anteriores: `.cache/native-prepared-props-build.log`. Se conserva
el aviso existente de Emscripten sobre pthread y crecimiento de memoria.

Trece casos nuevos en `tests/native-world-prepared-props.test.js` comprueban:

- Paridad de supresión en seis biomas y seis perfiles: payloads, snapshots,
  revisiones, sectores, celdas/aristas y rutas transitables reales.
- Restauración simple y de props separados por más de un chunk, con seis perfiles
  y ejecución nativa: mismo grafo, geometría, continuidad del cuerpo y calendario.
- Cero recetas adicionales en el commit preparado, vida de los buffers después
  de soltar la propuesta y copias JS sin alias; identidades de ruta ligadas a su época de autoridad.
- Rechazo de grafo/radio/cuerpo nuevos, claves sin prop y conservación de la
  restauración heredada sin dominio nativo.
- Runtime pthread real: supresión/restauración preparadas y descarte de un job
  anterior que quedó calculado con inputs ya sustituidos, sin publicarlo.

Selección amplia: 937 pruebas de 81 archivos aprobadas con concurrencia 2,
sin fallos/skips; `.cache/native-prepared-props-selection.json` y
`.cache/native-prepared-props-regression.tap`. La selección dirigida anterior
pasa 58 casos y el archivo nuevo pasa sus trece casos, incluido pthread:
`.cache/native-prepared-props-directed.tap` y
`.cache/native-prepared-props-pthread.tap`.
Build WebGPU/remote draw aprobado en 42,22 s, con las advertencias habituales de
tamaño de chunks: `.cache/native-prepared-props-vite-build.log`. Sintaxis del
harness y del nuevo archivo de pruebas comprobada.
La regresión con los Workers de presentación/dibujo de producto mantiene dos
rechazos nativos recuperados por regrabación, cero reemplazos de dispositivo,
93 buffers de vértices compartidos por paso y cero errores GPU; cierre/drenaje
verificados: `.cache/native-prepared-props-frame-regression.json`.

[Recibo GPU](performance/native-prepared-props-20261113.json) y
[captura inspeccionada](performance/native-prepared-props-20261113.png):

| Paso | Commit/proyección tras drenaje anterior | Preparado ahora |
| --- | ---: | ---: |
| Supresión de prop | 14,2 ms | 0,9 ms |
| Restauración de prop | 18,2 ms | 1,3 ms |

Son dos ejecuciones del mismo harness/hardware NVIDIA Turing, no una distribución
de latencias ni garantía universal. El contador de recetas pasa de 0 a 0 en la
supresión y de 2 a 2 en la restauración, entre preparación y commit. Ambos pasos
acreditan buffers nativos preparados en el journal efectivo. Se conservan los
cuatro buffers y máscaras de terreno de los chunks revisados, renderer,
dispositivo y personaje estacionario, sin errores/forks GPU. Cierre y drenaje
verificados antes de terminar los Workers. La readmisión bloqueada previamente
unos 500 ms sigue permitiendo dibujos del mundo anterior sin hold anticipado.

Reproducción: `tools/experiments/audit_webgpu_temporal_ground.mjs`,
`QA_NATIVE_DELTA=true`, `QA_NATIVE_OBSOLETE=false`, `QA_BASE_URL` y
`PLAYWRIGHT_MODULE` configurados, con `.cache/tooling/node20.exe`.

## Pendientes conservados

La preparación gráfica de props sigue recreando instancias y sus recursos por
chunk revisado: unos 278/785 ms antes del hold en este fixture. Es el siguiente
trabajo de reutilización de f-R4, junto con la instalación preparada de terreno
y las familias restantes. No se afirma mínima asignación gráfica global.
La ausencia de tirones y la aceptación con personajes autónomos requieren aún
la autoridad normal, e-R3/e-R4 y A–F/C. La captura muestra suelo, trabajador y
sombra a tiempo nativo 10 s; el prop alterado está fuera de cámara. Las pruebas
de ejecución nativa CPU no certifican locomoción autónoma en GPU.
