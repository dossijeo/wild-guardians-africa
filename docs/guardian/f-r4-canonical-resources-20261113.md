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

## Siguiente punto pendiente

Aplicar esta frontera en el preparador gráfico existente, incluyendo retiradas,
cancelación y recuperación de recursos rechazados. Admitir todos los recursos
afectados antes de abrir el frame nuevo y conservar congelada la generación
anterior mientras tanto. Después acreditar el mismo cambio físico y visible con
personajes reales consumiendo planes nativos completos, bloqueo del preparador,
pausa/velocidad y revocación, sin posiciones JS periódicas. No se reduce f-R4 a
estos contratos de datos ni se cierran e/f por sus incrementos internos.
