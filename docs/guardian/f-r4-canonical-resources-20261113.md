# f-R4: proyección canónica de recursos del commit nativo

Continuación de `749a71b52`. **f-R4 sigue parcial** y los once puntos principales
de A6 siguen abiertos. Se conserva el orden A → B → C → D del plan integrado.
Este incremento conecta la fuente de datos a los propietarios existentes; la
admisión gráfica completa y la aceptación con personajes siguen pendientes.

## Implementación

Wild Engine registra los chunks realmente publicados durante el commit de una
propuesta física, usando el mismo punto de publicación de los recursos nativos.
El journal versionado contiene upserts y retiradas deduplicadas, sesión, ticket,
tiempo efectivo, familia y revisiones del mundo. El staging no lo publica. Si el
mundo cambia después, no puede leerse como una proyección vigente del ticket.
Incluye adición/publicación pthread, retirada, props y terreno protegido; recoge
los halos publicados sin convertir chunks auxiliares de navegación en visibles.

El adaptador copia el journal antes de seleccionar chunks, porque WASM puede
crecer, y obtiene sus buffers mediante el exportador canónico existente. No
regenera terreno en JS ni vuelve a efectuar la mutación. Las retiradas exigen
que el chunk ya no resida en el motor. Se restaura la selección anterior.

La sesión reutiliza `stream.onData` para actualizar la vista de lectura de props
y entregar los payloads al canal de terreno existente. Las retiradas invalidan
sus caches y notifican `onRelease`. Cada publicación tiene revisión por chunk;
un ticket repetido se rechaza. Un fallo de conversión, staging u observador
posterior al commit conserva la condición de commit efectivo y cierra el control;
no libera al dibujante como si la mutación hubiera sido abortada.

El planner de la autoridad recibe esa publicación y acumula en la siguiente
publicación confirmada `nativeWorldResources`: identidad del mundo, familia,
coordenadas modificadas y retiradas. Los buffers siguen por el canal de terreno;
el puerto de control crítico no los transporta. Las respuestas compactas no
pueden ocultar esa frontera y la cola del host la conserva como barrera.

No se activan nuevos comandos nativos de producto. El journal de chunks tampoco
implementa la representación visual de polígonos/barreras ni de puertas móviles.
Los ACK del transporte siguen sin significar disponibilidad GPU. El surface aún
debe coordinar payload, retirada, preparación y admisión antes de etiquetar un
frame con la identidad nueva; consultar el ticket actual no basta.

### Retiradas en el canal existente

Después de `0a0f33560`, las retiradas físicas también producen tombstones
`authority: spatial-wasm, removed: true, cx, cz, capturedAt`. Comparten la revisión
por chunk y la secuencia de confirmación con los payloads, sin buffers ni
geometría de sustitución. La autoridad publica solo las retiradas que proceden
del commit nativo; la política de retención ordinaria conserva su comportamiento.

El manifiesto residente excluye los chunks retirados. El handoff conserva sus
revisiones y la marca de retirada: volver a añadirlos continúa la numeración.
El journal de recuperación incluye esa marca y exige coincidencia entre el
payload y su manifiesto. Descartar staging no retira el chunk ni consume revisión.

El receptor tiene una notificación `onRemoved` explícita para el propietario de
los demás recursos gráficos; no entrega tombstones al callback de geometría.
Sin esa capacidad, falla **antes** de tocar residencia. En el modo preparado,
el lote completo debe estar listo y confirmar antes de notificar la retirada;
cancelación o rechazo no acreditan aplicación. Un ACK del transporte no la prueba.

El surface aún no proporciona la retirada completa de contactos/cámara y demás
recursos. El incremento siguiente implementa los participantes de terreno y
vegetación descritos abajo. El contrato no permite saltarse lo que queda de
preparación ni etiquetar un frame como actualizado.

### Retirada preparada de terreno y vegetación

Después de `f8a31ab8e`, ambos propietarios existentes proporcionan
`prepareRemoval`. El adaptador de preparación temporal los incluye en el mismo
lote del coordinador, compartiendo época, revisión y orden por chunk. No llama
al generador de terreno, al preparador de mud ni a la carga de slots para un
lote que solo retira recursos. Los grupos vacíos son marcadores de la
transacción; no son geometría de sustitución ni un permiso de dibujo.

Hasta el commit se conservan terreno, agua y vegetación visibles. La fase lógica
es reversible: residencia, muestreo de superficie, índices de props, versiones y
visibilidad se restauran si falla otro participante, incluso después de una
finalización parcial. Tras confirmar todo el lote se retiran los meshes mediante
los propietarios y mecanismos de liberación existentes, se descartan los
marcadores y se notifican contactos/árboles. Las revisiones anteriores no pueden
resucitar recursos. Un lote puede combinar retirada y alta de chunks diferentes.

Se rechazan identidad/tiempo modificados, tickets gráficos caducados y
observadores síncronos que pudieran ver el cambio parcial. Cancelar una reserva
o sustituirla por una retirada posterior no restaura la generación eliminada.
El callback de geometría preparada no recibe tombstones; la identidad de la
retirada solo se expone tras confirmar su lote.

El incremento posterior conecta ese callback en el surface temporal, según el
apartado siguiente. **Pendiente de f-R4:** la admisión de la frontera nativa
completa antes de abrir el frame, recuperación de uploads de frames rechazados,
cambios visibles con personajes reales y el resto del criterio original de
aceptación. No se etiqueta un frame como actualizado solo por retirar chunks.

### Cámara y grass temporal después del commit preparado

La notificación del propietario de terreno lleva ahora causa confirmada,
secuencia y orden de publicación. Grass distingue ese commit de una expulsión
local o sin secuencia: retira la cobertura del chunk y conserva la barrera de
ocupación de sus vecinos hasta confirmar el mismo estado. Mantiene el orden de
la retirada para ignorar notificaciones antiguas y conserva los intentos de
preparación posteriores. La notificación de bioma no repite la retirada.

El surface temporal acepta `onRemoved` después del commit del lote y notifica a
los propietarios dependientes existentes. La cámara recibe una retirada sin
alturas por el mismo canal y con su revisión/secuencia; descarta alturas y mud,
manteniendo la revisión para impedir resurrecciones. El Worker omite buffers en
ese mensaje. Una revisión posterior puede readmitir el chunk. Si todavía existe
su mesh visible, la cámara rechaza la retirada en lugar de inventar el resultado.

La capacidad de retirada preparada permanece limitada al perfil temporal con
coordinación de chunks; el receptor que no la proporciona conserva el fallo
explícito. No se activa por ello el ejecutor nativo de producto.

### Constancia del lote gráfico aplicado

Después de `8f1f38392`, el receptor de terreno preparado expone
`admittedBoundary(sequence)`: versión, secuencia, época y cambios compactos
`cx, cz, revision, removed, capturedAt`. Solo conserva el lote de la secuencia
confirmada actual, sin buffers de geometría. Captura la identidad antes de los
callbacks y publica la constancia después del commit **explícitamente true** del
lote y de sus notificaciones. ACK, preparación sin aplicar, commit lógico o
resultado ambiguo no la acreditan. Fallo/cierre o checkpoint la invalidan.

El objeto y sus entradas son inmutables: un callback que modifique el payload
después del commit no cambia la identidad acreditada. Una frontera vacía o una
secuencia posterior no reutiliza el recibo anterior. La prueba con propietarios
de terreno/bioma reales verifica su aparición después de la retirada conjunta.

Es evidencia del lote de terreno, **no** de todo el mundo ni de tiempo autorizado.
Sigue pendiente contrastarla con `nativeWorldResources`, el estado y los demás
propietarios antes de asignar la identidad nativa al frame. Tampoco sirve como
baseline de recuperación completo ni repara uploads descartados. No se relaja el
rechazo de paquetes antiguos para aprovechar este recibo.

### Identidad nativa de un checkpoint preparado

Después de `c9c1eafdd`, el checkpoint visual de la autoridad conserva la identidad
del último commit físico en `terrainCheckpoint.nativeWorldBoundary`, solo cuando
existe. El bridge verifica que su journal canónico sigue vigente: una mutación
por otra ruta no puede aprovechar ese ticket para identificar el mundo actual.
La marca pertenece a recuperación visual dentro de esa autoridad; no se incorpora
al snapshot durable del juego ni se restauran handles de otra sesión.

El preparador de checkpoints copia/valida la identidad y la expone solo si su
lote confirma explícitamente. Cancelación, veto, resultado ambiguo o cambio de
ticket durante la preparación no conceden esa identidad y abortan el lote.
Rechaza un tiempo físico posterior al snapshot y una supresión JS que ocultaría
props presentes en el payload canónico. Los checkpoints heredados sin identidad
mantienen su contrato anterior; la ruta de restauración sin preparación no puede
adoptar un checkpoint nativo.

El surface adopta la identidad después de restaurar el checkpoint preparado y
sus dependencias de presentación/trabajo. El Worker la captura al abrir el frame
y la conserva al cerrarlo; no consulta la etiqueta requerida por dibujo para
reclasificar geometría anterior. El dibujante conserva sus verificaciones de
identidad/control. Esto conecta el **baseline preparado**, no las mutaciones
incrementales posteriores: replay de otras fronteras nativas, recuperación de
un frame obsoleto/uploads y la aceptación integrada siguen pendientes.

## Validación ejecutada

- Nueve pruebas nuevas con WASM real: recibo antes de publicar, propiedad de
  buffers, retirada exacta, canal de terreno con confirmación de secuencia,
  supresión/restauración de props, terreno protegido, tickets inválidos/obsoletos,
  fallos posteriores al commit y publicación pthread real.
- Selección de 38 archivos: 493 pruebas, 489 aprobadas y 4 omitidas por el opt-in
  del prototipo. Se vuelve a ejecutar ese archivo con
  `WILD_ENGINE_NATIVE_ROUTE_WASM=src/world/wild-engine/spatial-savanna.wasm`:
  sus 5 pruebas pasan sin omisiones. No se suman como pruebas únicas.
- Otras 80 pruebas de consulta de props, settlements, prototipo y transiciones
  pasan sin fallos ni omisiones. Build WebGPU de producción aprobado en 1m 6s;
  conserva los avisos existentes de imports mixtos y tamaño de chunks.
- Ambos binarios se reconstruyen con el SDK Emscripten local y los flags del
  script oficial (standalone y pthread, sin perfilado experimental). El comando
  usa un response file para superar el límite de longitud de CMD en Windows.
- Los seis casos reales WASM/WebGPU de f-R2 vuelven a confirmar sin dibujar el
  paquete antiguo tras el commit. También pasan identidad/sustitución de f-R4 y
  relevo, pérdida real de dispositivo y silencio de f-R3, con preparación
  bloqueada 500 ms. Cero errores GPU/página; persiste el 404 de consola sin URL
  atribuida del harness. Son triángulos y cambios fuera de vista, no aceptación
  de recursos visibles, personajes ni rendimiento integrado.

Recibos locales reproducibles: `.cache/native-resource-projection-regression.tap`,
`.cache/native-resource-projection-prototype.tap`,
`.cache/native-resource-projection-legacy.tap`,
`.cache/native-resource-projection-build.log`,
`.cache/native-canonical-resource-boundary.json`,
`.cache/native-world-mutations-regression.json` y
`.cache/native-canonical-control-lifecycle.json`.

Validación del incremento de retiradas: **190 pruebas de 19 archivos, cero
fallos/skips**, selección en `.cache/terrain-tombstones-selection.json` y resultado
en `.cache/terrain-tombstones-regression.tap`. Incluye retirada WASM real por
MessagePorts después del recibo, secuencia confirmada, handoff, coalescing,
replay, upload atrasado, rechazo y cancelación de preparación. Build WebGPU
aprobado en **47,42 s**, `.cache/terrain-tombstones-build.log`, con los avisos
existentes. El arranque conectado de producto conserva Shield legal, revocación
y **15 dibujos durante 500 ms** de bloqueo; cero errores capturados en su
alcance (`.cache/native-product-control-resource-boundary.json`). Este último
no dibuja personajes ni prueba la retirada visible o locomoción autónoma.

Validación de la retirada preparada: **362 pruebas de 23 archivos, cero
fallos/skips**, `.cache/prepared-terrain-removals-selection.json` y
`.cache/prepared-terrain-removals-regression.tap`. Las once nuevas usan terreno
WASM, el pack de bioma y los propietarios/coordinador reales con tickets GPU
simulados: confirmación, readmisión, cancelación, sustitución, identidad/tiempo,
rollback de activación/finalización y lotes mixtos. Comprueban también el replay
del receptor y las notificaciones después del commit. **No son prueba WebGPU de
la retirada visible.** Build de producción WebGPU aprobado en **45,50 s**,
`.cache/prepared-terrain-removals-build.log`, con los avisos existentes.

Validación de cámara/grass y su conexión al surface: **571 pruebas de 49 archivos,
cero fallos/skips**, `.cache/confirmed-terrain-retirement-selection.json` y
`.cache/confirmed-terrain-retirement-regression.tap`. Incluye retiro/readmisión
por el receptor con los propietarios reales, confirmación, recuperación y
protección ante alturas/identidades atrasadas. Build WebGPU aprobado en **52,60 s**
(`.cache/confirmed-terrain-retirement-build.log`). La regresión del arranque con
autoridad y Workers gráficos conserva Shield/revocación y 15 dibujos durante
500 ms de bloqueo; su alcance sigue siendo el del harness de control.

[Recibo WebGPU real](performance/confirmed-terrain-retirement-20261113.json):
surface de producto, admisión real NVIDIA/Turing, terreno WASM, grass y cámara.
Tras tres publicaciones sin cambios, la secuencia 4 retira el chunk: cero chunks
de terreno/bioma/cámara y cero cobertura visible; la secuencia 5 readmite la
revisión 3 y restaura los tres. Se inspeccionan las capturas de
[retirada](performance/confirmed-terrain-retirement-20261113-removed.png) y
[readmisión](performance/confirmed-terrain-retirement-20261113-readmitted.png).
No hubo errores recogidos por el surface/dispositivo en este ensayo.

Se amplía el harness existente de terreno temporal con una opción de retirada,
sin otro renderer. Mantiene vacías las instancias de props del fixture: acredita
terreno/cobertura, no árboles 3D ni personajes. Las mutaciones de este control de
recursos se secuencian manualmente; **no** acredita propuesta nativa, quiescencia,
preparador bloqueado y aplicación visible en una sola ejecución. f-R4 sigue
parcial; sus pruebas anteriores de control no sustituyen esa aceptación conjunta.

```powershell
$env:QA_BASE_URL='http://127.0.0.1:5181'
$env:QA_RETIREMENT='true'
# PLAYWRIGHT_MODULE apunta a la instalación externa de Playwright.
.cache/tooling/node20.exe tools/experiments/audit_webgpu_temporal_ground.mjs
```

Regresión de la constancia de lote: **575 pruebas de los mismos 49 archivos,
cero fallos/skips**, `.cache/terrain-admitted-boundary-regression.tap`; build
WebGPU aprobado en **52,18 s** (`.cache/terrain-admitted-boundary-build.log`).
El contraste dirigido con los propietarios reales pasa también en
`.cache/terrain-admitted-boundary-real-owners.tap`. No añade una aceptación
gráfica nativa integrada ni cambia los cierres de A6.

Validación de checkpoint/identidad: **696 pruebas de 55 archivos, cero
fallos/skips**, `.cache/native-world-checkpoint-selection.json` y
`.cache/native-world-checkpoint-regression.tap`. Se incluyen el journal de
recuperación, checkpoint con propietarios reales, contratos del renderer remoto
y transiciones nativas; las seis nuevas verifican admisión, propiedad, veto,
cancelación, alteración, tiempo/supresión y transporte del checkpoint.
Build WebGPU aprobado en **59,47 s** (`.cache/native-world-checkpoint-build.log`).
La regresión real del arranque/control conserva 15 dibujos durante 500 ms y cero
errores capturados (`.cache/native-world-checkpoint-product.log`); no certifica
recuperación nativa tras una mutación ni personajes autónomos.

## Replay nativo y admisión de la escena completa

El preparador de recuperación contrasta ahora cada publicación nativa con la
constancia de terreno que este consumidor realmente aplicó. Exige secuencia,
época, coordenadas, operación, revisión y tiempos compatibles; los commits se
ordenan por ticket y conservan autoridad/sesión. Si varios commits afectan una
coordenada antes de publicar, prevalece su última operación. Rechaza una frontera
atrasada, una retirada/upsert discordante, supresión de props canónicos y las
familias overlay que todavía no tienen propietario gráfico. Una frontera sin
cambios de terreno obtiene una constancia explícita vacía de esa secuencia; no
reutiliza el recibo anterior ni afirma que se ejecutó trabajo GPU inexistente.

Antes de exponer la identidad recuperada espera la disponibilidad común de
terreno, bioma, animales/trabajadores, construcciones, cultivos y cajas, y pide un
ticket real de admisión para la escena completa, incluidos sus pases de sombra.
Un ticket invalidado se prepara otra vez. Cancelación, cierre, cambio de frontera
o plazo de preparación agotado fallan sin exponer esa identidad. El plazo no es
una vigencia de navegación ni un permiso para avanzar el reloj.

Un checkpoint antiguo puede prepararse oculto mientras el consumidor gráfico ya
exige una frontera posterior. El replay debe alcanzarla antes de finalizar la
recuperación; el host conserva además su comprobación al admitir/dibujar el frame.
No se etiqueta con el ticket más reciente una escena que aún no lo aplicó.

La ejecución real descubrió dos operaciones legítimas de inicialización fuera de
un frame: filtros de textura de Three r180 y borrado de profundidad auxiliar.
El cliente declara un ámbito síncrono solo alrededor de mipmaps, flipY y clear
fuera del canvas. El host comprueba recursos y comandos: no admite buffers,
texturas ajenas, canvas, geometría indexada/indirecta ni compute en los filtros;
el borrado exige adjuntos fuera del canvas, un clear real y ningún dibujo.
Estas operaciones se ejecutan una vez y no se repiten en rAF. Conservan drenaje,
retención, snapshots y staging de recursos publicados. El dibujo ordinario sigue
exigiendo la identidad exacta capturada al crear su encoder.

### Evidencia y límites

[Recibo WebGPU real](performance/native-world-replay-20261113.json) y
[captura inspeccionada](performance/native-world-replay-20261113.png): dos commits
físicos WASM reales, journal canónico, relevo con drenaje por el cohort existente,
checkpoint ticket 1 y replay de retirada ticket 2 en el surface de producto.
El checkpoint intermedio permanece sin frames; la secuencia 2 termina con nueve
chunks residentes y la identidad preparada igual a la exigida. NVIDIA/Turing,
seis dibujos nativos de tres paquetes y cero errores GPU capturados. La captura
se toma después de una fence GPU real y antes de liberar el surface.

Un trabajador original está cargado y aparece en la captura cenital; su posición
coincide con la muestra nativa en el instante 10. El tiempo permanece fijo, y el
perfil de calidad muy baja informa textured:false para ese recurso. Esto no
acredita locomoción/animación nativa en GPU, paridad de materiales ni la aceptación
con preparador bloqueado durante 500 ms. El harness usa preparación y fuente
nativa en el mismo Worker y dos Workers de dibujo de producto creados desde el
hilo principal; no sustituye la prueba conjunta con la autoridad Worker normal.
Los overlays y la integración de publicaciones vivas siguen pendientes.

Validación: 728 pruebas de 58 archivos, cero fallos/skips
('.cache/native-world-replay-selection.json',
'.cache/native-world-replay-regression.tap'). Incluye los propietarios reales,
el native WASM real, reconciliación del replay, espera/cancelación de admisión,
recursos prohibidos y filtros ejecutados una sola vez tras un commit nativo.
Las 99 pruebas dirigidas de propiedad/renderer/terreno también pasan tras retener
las texturas declaradas durante la vida del command buffer, incluso si un filtro
no genera pases. Build WebGPU aprobado; duración final en el checkpoint.

Reproducción:

~~~powershell
$env:QA_BASE_URL='http://127.0.0.1:5181'
$env:QA_NATIVE_REPLAY='true'
# PLAYWRIGHT_MODULE apunta a la instalación externa de Playwright.
.cache/tooling/node20.exe tools/experiments/audit_webgpu_temporal_ground.mjs
~~~

## Siguiente punto pendiente

Conectar esta frontera a publicaciones vivas y recuperar uploads de frames
rechazados mediante un baseline preparado nuevo. Después acreditar el mismo
cambio físico y visible con personajes consumiendo planes nativos completos,
bloqueo del preparador, pausa/velocidad y revocación, sin posiciones JS periódicas.
No se reduce f-R4 a este replay de recursos ni se cierran e/f por sus incrementos.
