# Inicio de marcha animal en un intervalo histórico

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
