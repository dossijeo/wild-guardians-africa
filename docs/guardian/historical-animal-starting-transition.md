# Inicio de marcha animal en un intervalo histórico

También se admite `waiting` con ruta activa estable cuando las muestras
confirman el desplazamiento y el ataque ya terminó. La presentación normal
utiliza Walking en ese caso; la ruta histórica conserva su pose de mixer
durante el tramo acotado y entrega la pose al siguiente límite confirmado.
No activa un bake ni infiere una fase nueva. Cambios de acción, recuperación,
estado o discontinuidad conservan el fallback. La reproducción nativa del
intervalo 14,35–14,39 s de la captura de islotes conserva snapshots y eventos
idénticos con y sin observación. La prueba de roster comprueba la propiedad de
pose; no acredita por sí sola fluidez de animación o paridad visual en GPU.

Una captura nativa de sabana mostraba un obstáculo concreto para eventos
interiores: dos jabalíes pasan de `waiting` sin ruta a `walking` durante un
único tick, mientras la publicación contiene 14 eventos. Los extremos de
posición y orientación, el segmento, la separación y el estado causal están
observados. La fase de marcha inicial no existe, por lo que no es legítimo
inventarla a partir del fotograma final.

Se valoraron tres opciones:

1. Mantener el fallback completo. Conserva el comportamiento anterior, pero
   impide reproducir el intervalo autónomo aunque su trayectoria esté probada.
2. Mantener la pose y la fase visual iniciales durante ese único tick y mover
   el modelo con la trayectoria y orientación observadas. El estado confirmado
   del extremo habilita después la marcha. Esta opción se ha implementado de
   forma acotada y reversible: no altera la autoridad ni inventa una fase.
3. Crear un blend authored para el arranque. Podría mejorar la transición, pero
   necesita contenido y validación por especie sin resolver un requisito lógico
   adicional; se aplaza hasta que la evidencia visual lo justifique.

El caso nuevo exige exactamente dos muestras, duración de simulación de hasta
20 ms, `waiting` sin ruta al inicio, `walking` con ruta al final, un segmento
continuo con extremos y orientación confirmados, y ausencia de ataque,
recuperación, caída, incapacidad, carrera o espera de puerta. Cualquier dato
ambiguo mantiene el fallback. La admisión del rig, terreno y separación siguen
siendo obligatorias; esta extensión no elimina esos certificados.

`tests/authority-historical-starting.test.js` compara dos autoridades Wild
Engine sobre `sabana712-d10-native-unknown-enclosure.json.gz` sin modificar la
captura y prueba los dos inicios y el resto de participantes. Esa captura no
contiene `wildEngineWorldVersion`, por lo que **no** es una fixture válida
para restauración de producto sin modificación y no debe emplearse como prueba
de partida restaurada. `tests/webgpu-animal-starting-real-rig.test.js` carga el
esqueleto real del facóquero en Node y comprueba que sus huesos y el estado
lógico no cambian durante el inicio; el renderer de la prueba es simulado.
`tests/webgpu-animal-roster.test.js` cubre también la fase baked constante.

Para una futura prueba integrada se ha identificado la captura intacta
`docs/qa/mangrove-magic-20261026/hydraulic-v2-raid/fixture.json`, campo
`snapshot`: contiene `wildEngineWorldVersion: 1`, `mangroveNetwork: true` y
`mangroveSettlementVersion: 2`. Tras el `resume` autoritativo de su pausa de
menú, una ejecución Wild Engine con la cadencia `seconds=.05, steps=2` observa
`AnimalTargetUnavailable` en torno a 8,04 s, con deltas causales, separación,
cortes y los seis participantes aceptados. No se cambiaron posiciones, tiempos
ni mecánicas. Esto no certifica recursos gráficos, terreno visible ni una
ejecución en GPU: el test hardware debe verificar los contadores del stream y
el resultado visual en la partida real.

## Same-tick event poses

Three alternatives were compared: reject every event-time pose differing from the tick (safe but rejects real events), capture extra per-actor intra-tick trajectories (more state and a new continuity proof), or synchronously apply the existing causal event snapshots followed by the already-captured silent post-tick delta. The last is used: all states retain the same actor identities and species, each observer sees its exact event state, and the silent state must match every observed actor tick exactly. The whole group is decoded before starting; no rendering, asynchronous yield or publication ACK occurs between its states. The next slice starts only after the silent state. Existing topology, terrain, physics, collision and 100 ms input-latency gates remain in force. This does not establish GPU hardware validation.

Reproducible native islet regression: `.\.cache\tooling\node20.exe --test tests/authority-historical-starting.test.js`. It restores the original `hydraulic-v2-raid/fixture.json`, resumes normally, compares real observed and reference authority snapshots/events through sequence 82, and validates the real spatial and separation evidence, causal decoder, two slices and six participants at the t≈8.04 event. It does not certify GPU resources, terrain support, or hardware presentation.

The hardware capture `.cache/historical-terrain-detail.json` identified `Uint32Array` indices on the two rejected canonical terrain chunks. Three.js `node_modules/three/src/renderers/webgpu/utils/WebGPUAttributeUtils.js`, `createAttribute`, promotes non-normalized `Uint16Array` to `Uint32Array` and assigns the converted array back to the BufferAttribute when creating its GPU buffer. Native terrain starts with 16-bit indices; the renderer-owned representation may therefore differ after admission. Terrain certification accepts either unsigned width while still checking every index, the full canonical topology, array identity and versions. Signed indices, changed content and stale certificates remain rejected. The captured sequence 524 preview is exercised in `tests/fixtures/islet-historical-preview-524.json` against native WASM chunks with this 32-bit promotion. Hardware verification of the corrected path remains pending.

## Event-specific rejection diagnostics

In DEV with experimental historical events enabled, `wildGuardiansWebGpuWorldQa({auditHistoricalPreview:true})` returns `historicalAnimalAudit.latest` and `historicalAnimalAudit.event`. The latter retains the latest animal participant rejection specifically from an event slice even if a later non-event preview is rejected. It includes the actor, granular rejection and the exact observed slice; the trace is copied only when the audit is requested. This is a diagnostic, not a new certificate or a production fallback.

An offline scan of the original islet raid compared two legal `.05`-second batch alignments without modifying its snapshot. With real WASM authority and no player attack, events around simulation times 22.39–22.40 and 30.39–30.40 passed causal decoding, observed spatial and separation evidence, slicing and all six participant checks in both alignments. These results do not certify the actual GPU rigs, terrain, VFX or complete in-game playback. In the offset run, an earlier event interval crossed a confirmed walking-to-attack transition and was correctly rejected; no animation or attack phase was inferred. Other later events were rejected by structural-change or separation guards.

Targeted diagnostic and roster tests: `.\.cache\tooling\node20.exe --test tests/confirmed-historical-motion-group.test.js tests/webgpu-animal-roster.test.js tests/confirmed-historical-event-playback.test.js` (53 passed). Real WebGPU validation of interior event playback is still pending.
