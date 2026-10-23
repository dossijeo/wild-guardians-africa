# Protocolo y límites de interpretación

## Equipo y aislamiento

Windows, Intel UHD Graphics Gen12LP `0x9A60`, controlador `32.0.101.6881`,
Intel Core i7-11800H. Chrome 155 instalado, Playwright `channel: chrome`,
headless, adaptadores físicos; 1280×720, DPR 1, sin MSAA. La recomendación
`powerPreference` se ignora en Windows; se registra la identidad efectiva.
No se ha forzado SwiftShader, ANGLE software ni un adaptador de reserva.

El worktree se creó desde `59fdb9459e6ab55718e2397aab83a0c1ebfcd428` tras
`git fetch origin --prune`. Las ramas del laboratorio y del experimento previo
se consultaron sin alterarlas. PR #159 no es destino de ningún cambio.

No se controla en exclusiva el sistema operativo: existen otros procesos del
usuario. No se cierran aplicaciones ajenas. Por eso se alternan motores, se
repiten medidas y se conservan sus rangos; estos números no son constantes
universales del hardware. Los navegadores propios de preparación y smoke
se cerraron antes de las mediciones finales. Los pilotos bajo `test-results/`
se excluyen de las conclusiones.

## Escenas

A: terreno plano teselado, 9 chunks, 36 edificios Mapungubwe, 135 plantas y
432 componentes de cultivos originales. 604 meshes, 1.415.471 triángulos
visibles en el fixture sin culling. GLB común congelado, materiales glTF
estándar. El terreno no reproduce el relieve procedural completo del juego.

B: mismo mundo más 24 trabajadores Kofi y 8 búfalos, 896 huesos, clips
esqueléticos nativos, movimiento de actores y cámara, transformaciones de
chunks actualizadas. 2.648.855 triángulos de contenido antes de sombras.
Ambos cargan exactamente las mismas variantes web de los modelos. La
visibilidad contextual de herramientas del juego no se reproduce: todos los
submeshes del GLB están disponibles para ambos motores.

C: selección real congelada de la cobertura continua Sabana, con viento 8,
LOD en shader, pigmento de textura y normales. 10.741 instancias y 212.704
triángulos a densidad 1; se prueban 0,5 / 1 / 2. La selección residente y el
culling de CPU están congelados, no se mide streaming. La escena original no
incluye terreno ni sombras; tampoco las agrega uno solo de los motores.
Véase [GRASS-PARITY.md](GRASS-PARITY.md).

## Dos preguntas distintas

- **Backend/material equivalente:** C expandida utiliza los mismos atributos,
  índices, deformación de viento, LOD, colores y mipmaps. Los shaders GLSL y
  Filament generan el mismo resultado estilizado. Sigue siendo un recorte del
  juego; no prueba la calidad ni rendimiento de una campaña.
- **Soluciones razonables:** C nativa usa atributos instanciados en Three y
  `getInstanceIndex()` + textura de datos en Filament. A/B utilizan los PBR de
  cada motor y calidad visual aproximada. El control optimizado agrupa meshes
  Three por chunk y activa automatic instancing en Filament, desactivado por
  defecto. La geometría se conserva; el agrupamiento de draws es libre.

A/B NO tienen shaders equivalentes bit a bit ni AfricanToon. Luz direccional,
mapa de sombras 1024, una cascada/cobertura comparable, misma resolución,
cámara y modelos. Las unidades fotométricas/exposición y filtrados PCF son
distintos. Las capturas sirven para inspeccionar la aproximación; estos datos
no pueden autorizar una migración artística por sí solos. Una conclusión
negativa puede detener el experimento sin reconstruir todo AfricanToon.

## Secuencia y métricas

Orden por escenario/densidad: Three → Filament → Three → Filament. Cada
página mide día y noche; 120 callbacks de calentamiento, 300 callbacks RAF
sin timestamps para cadencia, luego 20 frames GPU válidos de calentamiento
y 60 muestras GPU seriales. Los intentos que Filament omite no cuentan como
muestras GPU ni fotogramas renderizados. Cada página se destruye entre motores.

**Cadencia:** Filament `Renderer.render()` puede devolver sin renderizar cuando
`beginFrame()` falla. Contar callbacks RAF produciría falsos 60 FPS. Se registra
el envío real a `GPUQueue.submit`; los intervalos son los tiempos RAF entre
frames aceptados. FPS sostenido = frames aceptados / duración del tramo RAF.
Three entrega todos los renders en estas pruebas. Se conservan además RAF,
omisiones, P50/P95/P99 e intentos. Esto mide cadencia de frames enviados a la
superficie, no escaneo físico de la pantalla. El control sin instrumentación
usa el retorno booleano de `beginFrame` directamente.

CPU de actualización/preparación y CPU dentro de render se separan con
`performance.now()`. CPU de render Filament se resume sobre frames aceptados;
los costes de los intentos omitidos siguen disponibles en las filas crudas.
Draw calls y triángulos se interceptan en las llamadas reales, incluyendo
sombras y pases de pantalla. Por eso pueden superar el contenido de la escena.

**GPU:** Filament no implementa su temporizador nativo en este backend. Se
inyectan timestamps WebGPU al inicio/final de cada render pass, se reporta
primero→último y suma de pases. No incluyen uploads o compute fuera de ese
intervalo. Three usa `EXT_disjoint_timer_query_webgl2` alrededor de todo render,
con sombras; consultas disjoint se descartan. El alcance no es idéntico: no se
suman tiempos CPU+GPU y prima la cadencia real. Las muestras GPU bloqueadas
para lectura están separadas de los intervalos RAF.

**Memoria:** heap JS expuesto por Chrome y capacidad lineal WASM por separado.
No equivalen a memoria residente total ni deben sumarse sin más. Recursos
WebGPU: tamaños de buffers y estimación de texturas/mips/muestras interceptadas;
no incluye swapchain, alineación ni memoria interna del controlador. Las
liberaciones por referencia/GC no pasan necesariamente por `destroy`, de modo
que el contador tras cleanup no prueba una fuga ni memoria viva exacta.
WebGL no expone bytes totales: se conserva `renderer.info.memory` y los bytes
de buffers de la cobertura. Un dato no accesible queda nulo, nunca cero.

**Carga:** tiempos locales hasta preparar la escena, tamaños reales de
recursos descargados y runtime oficial. No simulan red ni caché de producción.
Los GLB congelados de A/B son grandes (64.129.832 bytes por fixture), porque
el exporter integra texturas PNG. Son el mismo paquete para ambos motores,
no una propuesta de distribución del juego. Los costes de preparar/exportar
fixtures están fuera del benchmark y se guardan por separado.

**Recursos:** creación/destrucción de recursos WebGPU y tiempo de API, cleanup
de escena, y control separado de ciclos de un GLB de suelo pequeño. C actualiza
1% de entidades en buffers persistentes cada 30 intentos; el control separado
registra bytes y CPU de actualización. Filament nativo sube el nivel entero de
la textura de datos; Three sube rangos del atributo. No se oculta esa diferencia.

## Umbral de decisión

La migración exige funcionamiento, fidelidad, compatibilidad y ventaja
consistente; orientativamente ≥15–20% de reducción de frametime en escenas
representativas. Una ganancia de GPU con cadencia igual/peor no basta, sin
corregir y validar el cuello de CPU. Una escena de hierba que alcanza el límite
de refresco en ambos motores no demuestra ventaja de cadencia. No se extrapola
la compatibilidad probada en este Intel a móviles, Safari o todos los biomas.
