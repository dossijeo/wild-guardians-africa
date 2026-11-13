# f-R4: instalar la adición nativa ya preparada

Continuación de 5f0846f2d. **f-R4 permanece parcial**. Se conserva la exigencia
del usuario: preparar antes del efecto y reutilizar los recursos sin cambios.
Este incremento elimina la regeneración observada en la adición preparada de un
chunk; no certifica ausencia global de tirones ni completa las otras familias.

## Propiedad y orden de la transacción

La propuesta nativa de adición conserva su PreparedChunkData canónico y prepara
también los rasters de los perfiles activos y los sectores propios y vecinos.
Lo hace sobre vistas privadas acotadas de muestras y rasters; no inserta el
chunk, sustituye rasters vivos ni confirma sectores mientras se prepara. Restaura
selección y contexto de perfil. El cálculo usa los mismos prepareActiveRaster y
prepareSectorOverlay de la vía canónica. La lista de sectores y su instalación
son comunes con el preparador pthread existente, sin otro ejecutor de navegación.

Antes de entrar en el hold, y otra vez al confirmar, se validan sesión, ticket,
tiempo, mundo, reloj, cuerpos, reservas e intenciones como hasta ahora. La
preparación exige además que coincidan los perfiles activos, sus radios/tipos y
la revisión de grafo de cada perfil. Una revisión nueva, aunque no cambie los
inputs de terreno/residencia/overlay, invalida la preparación; no se instala un
raster o un borde calculado para otro grafo.

Después del recibo de drenaje, spatial_add_chunk instala la receta preparada y
los rasters/sectores ya calculados en el orden canónico. Conserva los commits de
sectores, notificaciones, revisiones, preflight, pins y resultado de la mutación;
la generación y rasterización costosas quedan antes del hold. La vía sin
preparación mantiene su comportamiento canónico anterior.

El journal efectivo conserva una referencia propia a los buffers canónicos
instalados. Su identidad y lista de cambios deben concordar con el commit. Se
puede soltar la propuesta sin liberar la proyección del commit actual, que queda
acotada a una publicación y se sustituye al confirmar otra. La publicación de un
job pthread preparado usa también esos buffers ya producidos por su propietario.
Una revisión física posterior hace que la captura falle como stale.

La fachada JS copia desde esos buffers validados mediante spatialChunkPayload;
no selecciona ni regenera otra vez el chunk para exportarlo. Sus arrays siguen
siendo copias propias. Una proyección compuesta solo de retiradas tampoco
reselecciona el chunk actual. Las familias sin esta prueba de buffers preparados
conservan la captura canónica anterior; no se reutiliza una vista especulativa
como si acreditara cualquier mutación efectiva.

## Validación nativa y de producto

Standalone y pthread reconstruidos con los flags oficiales de
tools/build-spatial-savanna-wasm.sh; registro local
.cache/native-prepared-commit-build.log. Se conserva el aviso de Emscripten de
pthread con crecimiento de memoria; no se cambia de runtime ni de motor.

902 pruebas de 78 archivos pasan con --test-concurrency=4, sin fallos ni skips:
.cache/native-prepared-commit-selection.json y
.cache/native-prepared-commit-regression.tap. La prueba de paridad nueva se
refuerza después con cruces de borde realmente transitables y vuelve a pasar sus
nueve casos (.cache/native-prepared-commit-seam-parity.tap). El build WebGPU con
VITE_WEBGPU_REMOTE_DRAW=true pasa en 45,15 s
(.cache/native-prepared-commit-vite-build.log). Para cada uno de los
seis biomas compara con una mutación canónica independiente:

- Los bytes de geometría, colores, máscara, agua y props.
- Las celdas y aristas de los seis perfiles, revisiones y número de sectores.
- Las rutas del grafo, exigiendo rutas no vacías para aristas transitables entre
  el chunk y sus vecinos.
- La ausencia de cambios de residencia/grafo/selección durante la propuesta y
  de selecciones al exportar el commit preparado.
- La propiedad de buffers tras soltar la propuesta, la ausencia de alias JS/WASM
  y el rechazo de perfiles, revisiones de grafo o mundo posteriores.

[Recibo WebGPU NVIDIA/Turing](performance/native-prepared-commit-20261113.json),
reutilizando QA_NATIVE_DELTA=true del harness de producto, y
[captura](performance/native-prepared-commit-20261113.png). En ese caso:

| Medida | Resultado |
| --- | --- |
| Commit y proyección de readmisión tras drenaje | 1,6 ms (antes: 39,9 ms) |
| Commit y proyección de retirada tras drenaje | 1,8 ms |
| Preparación gráfica de la readmisión antes del hold | 405,5 ms |
| Bloqueo real del preparador antes del hold | 500,9 ms; 15 dibujos del mundo anterior |
| Buffers del chunk sin cambios | Los mismos cuatro IDs |
| Dispositivo/renderer/escena/root del trabajador | Conservados |
| Forks de buffers/bindings y errores GPU capturados | 0 |

Son tiempos de esos eventos, no percentiles ni una promesa de latencia máxima.
La preparación de navegación nativa ocurre antes del callback gráfico; el campo
preparationMs del recibo mide el callback, no el coste nativo previo. Se mantiene
el análisis separado de costes. El contador acumulado de factories pasa de 2163
a 2524; no se reconstruye un surface y no se afirma que cada asignación restante
sea mínima. No aparecen pipelines/shaders/texturas adicionales después del hold
respecto a los preparados en ese ensayo.

El trabajador está estacionario a tiempo nativo 10 s y se retira/readmite el
chunk (-1,-1), fuera de su encuadre. La conservación de otro chunk y la
continuidad del dibujo durante el bloqueo son reales; no son aceptación de
locomoción nativa autónoma ni del gameplay normal. El ensayo no provoca aquí un
frame obsoleto en vuelo; esa rama todavía puede activar la recuperación amplia.

## Siguiente punto pendiente

Resolver el rechazo de un frame preparado en el mismo Worker/surface, usando la
retención de uploads y la propuesta gráfica real, sin recrear todo el dispositivo
ni retaggear comandos antiguos. Mantener la prueba de que los targets necesarios
se regeneran mediante sus propietarios. Después, completar preparación/commit
de props y terreno y los metadatos derivados que falten, conectar la autoridad
normal y validar personajes con planes nativos completos, pausa/velocidad y
revocación. El cierre exige esa integración, no solo los ensayos descritos.

e-R3/e-R4/f-R4 y los once padres A6 siguen abiertos; no se salta a contenido B,
aceptación C u optimización D para sustituir esas dependencias.
