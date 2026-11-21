# f-R4: instalar el terreno nativo preparado

14 de noviembre de 2026. Continúa la [retención de slots gráficos](f-r4-retained-biome-slots-20261113.md).
**f-R4, e-R3/e-R4 y los once padres A6 siguen abiertos.** Este incremento evita
regenerar el terreno protegido durante el commit nativo; la demora hasta el
primer dibujo nuevo todavía requiere trabajo.

## Investigación aplicada

Se consultaron las implementaciones reales antes de diseñar el cambio:

- [Recast/Detour v1.6.0, Sample_TileMesh::buildTile](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/RecastDemo/Source/Sample_TileMesh.cpp): construye los datos candidatos antes de sustituir el tile efectivo. Se adapta esa separación dentro del propietario nativo actual.
- [Detour v1.6.0, dtNavMesh::addTile](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/Detour/Source/DetourNavMesh.cpp): conecta los enlaces externos en ambos sentidos con los vecinos. En nuestro grafo se preparan también los sectores de borde afectados, conservando su orden canónico.
- [Godot 4.5, NavMeshGenerator3D](https://github.com/godotengine/godot/blob/4.5/modules/navigation_3d/3d/nav_mesh_generator_3d.cpp): `generator_thread_bake` calcula y marca la tarea terminada; `sync` recoge su terminación y notifica desde el propietario. Se conserva la separación entre cálculo y publicación sin introducir otro ejecutor ni dependencia.

No se instala Detour ni se cambia el generador. Se reutilizan las mismas recetas,
rasterizador, sectores, perfiles y journal de Wild Guardians.

## Preparación e instalación

La propuesta de recursos de la familia 10 conserva los candidatos de terreno,
las muestras afectadas y los rasters/sectores de navegación ya calculados.
La preparación trabaja en mapas privados por perfil con el halo de rasters
anterior necesario, incluidas las diagonales. Reproduce la secuencia canónica
por chunk y perfil: los bordes ven los rasters nuevos anteriores y los antiguos
todavía no sustituidos. Preparar todos los rasters primero cambiaría ese orden
y las revisiones intermedias del grafo.

Antes del efecto se revalidan perfiles, radios, readiness, revisiones del grafo,
terreno, overlay y residencia. La guarda física vuelve a comprobar cuerpos,
rutas futuras y apoyos de puertas contra el candidato original. El commit
publica los chunks y luego instala los rasters/sectores preparados con las
mismas revisiones y callbacks. No recalcula recetas. La proyección usa los
buffers propios del journal, incluso después de liberar la propuesta.

La propuesta conserva solamente las muestras de los chunks afectados durante
la espera gráfica; descarta la copia temporal del resto del mundo residente.
La selección y los perfiles efectivos se restauran al terminar la preparación.
La vía protegida de terreno sigue limitada a **Desierto**. El dominio heredado
sin cuerpos nativos mantiene su ruta canónica; no se acredita preparación para
él ni se amplía silenciosamente el contrato de los otros cinco biomas.

## Evidencia y límite de latencia

[Recibo WebGPU](performance/native-prepared-terrain-20261114.json) y
[captura inspeccionada](performance/native-prepared-terrain-20261114.png).
Harness WASM, canal/coordinador y propietarios gráficos de producto, draw Worker
real y NVIDIA Turing. Un trabajador permanece estacionario a tiempo nativo 10.
Se retira/readmite un chunk, se suprime/restaura un prop y se añade/retira una
explanación canónica de terreno alejada del trabajador.

En los dos cambios de terreno, el chunk `1,-1` cambia realmente de altura:
en `(53,-67)`, `19,032207489 → 18,825428009 → 19,032207489`. El terreno admitido
coincide con el payload nativo completo, incluida su consulta de altura. Los
otros **3/8 chunks** revisados conservan meshes, materiales, buffers y máscara;
**22/50 meshes** de slots de props intactos conservan sus recursos. Mismo
renderer, dispositivo, escena y personaje; cero forks/errores GPU y cierre con
drenaje verificado. Los contadores de recetas quedan **4 → 4 y 13 → 13** entre
preparación y commit. Bloquear el preparador 500,9 ms deja **15 dibujos** del
mundo anterior y ningún efecto físico ni hold anticipado.

| Cambio | Preparación previa | Commit/proyección nativa | Drenaje → primer dibujo nuevo | Intervalo máximo entre dibujos nativos |
| --- | ---: | ---: | ---: | ---: |
| Añadir explanación | 248,1 ms | 4,9 ms | 90,8 ms | 99,9 ms |
| Restaurar terreno | 352,8 ms | 11,6 ms | 169,5 ms | 199,8 ms |

**El coste nativo aislado no acredita ausencia de tirones.** La nueva medición
usa las muestras y tiempos ya existentes del draw Worker con relojes absolutos
compartidos; incluye el relevo, transporte y pacing del harness. Una pasada
anterior midió 113,2/145,7 ms hasta el primer dibujo, con intervalos máximos de
133,3/168,2 ms. Estas ejecuciones muestran una espera posterior al commit que
todavía hay que localizar y reducir. No atribuyen su causa exacta ni miden la
latencia máxima del producto. Las comprobaciones finales de identidad/altura
se ejecutan después de recoger los tiempos.

No se ha reconstruido toda la escena en estos pasos: las factories acumuladas
del recibo incluyen bootstrap, cambios y dibujos de seis transacciones. No son
un recuento de recursos reconstruidos por cambio. Tampoco es aceptación de
locomoción con un preparador bloqueado ni de la autoridad ordinaria.

## Validación

- Diez casos nuevos en `tests/native-world-prepared-terrain.test.js`: append,
  solapamientos, replace, restauración, cambios distantes/vacíos; rechazo por
  grafo/perfil obsoleto o cuerpo nuevo; aislamiento de un job pthread anterior;
  y paridad de la ruta heredada sin protección.
- Comparación contra commits canónicos independientes: geometría, muestras,
  chunks/revisiones, seis perfiles, todas las celdas/aristas de los nueve chunks
  residentes y rutas reales transitables entre chunks. Se conserva la ejecución
  de la ruta nativa y su calendario. Preparar no cambia cuerpo, selección,
  residencia, snapshot ni grafo efectivos.
- **963 pruebas en 83 archivos**, concurrencia 2, sin fallos/skips:
  `.cache/native-prepared-terrain-regression.tap` y
  `.cache/native-prepared-terrain-selection.json`.
- Standalone y pthread reconstruidos con los exports/flags oficiales; se
  mantiene la advertencia existente de pthread con crecimiento de memoria:
  `.cache/native-prepared-terrain-build.log`.
- Sintaxis del harness comprobada. Build WebGPU/remote draw aprobado en 48,58 s,
  con las advertencias habituales de tamaño de chunks:
  `.cache/native-prepared-terrain-vite-build.log`.
- La regresión de los Workers reales de presentación/dibujo regraba dos frames
  obsoletos, sin reemplazos de dispositivo ni errores GPU, con 93 buffers de
  vértices compartidos por paso y cierre/drenaje comprobados:
  `.cache/native-prepared-terrain-frame-regression.json`.

## Siguiente punto pendiente

Medir las fronteras posteriores al commit hasta el dibujo preparado, y retirar
trabajo redundante de publicación/transporte cuando pueda acreditarse la misma
identidad canónica. Conservar las comprobaciones exactas y los propietarios
existentes; no sustituirlas por flags de confianza o hashes experimentales.
Después continúan las familias/streams restantes de f-R4 y la conexión de la
autoridad normal, personajes e intenciones, con aceptación A–F/B/C. No se retiran
protecciones ni se cierra el objetivo con esta prueba estacionaria.
