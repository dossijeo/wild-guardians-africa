# Recuperación temporal opt-in

## Decisión de contrato A7

El contrato interno de interacción y recuperación está conectado en el perfil
explícito: IDs y orden de comandos, confirmación/rechazo de provisionales,
propiedad del Worker de reemplazo, generación de recursos, negociación del
checkpoint y replay, descarte de resultados obsoletos y fallo explícito si no
existe una base recuperable. No crea otra autoridad ni habilita rebobinado de
consecuencias confirmadas. El control de saturación y la retirada del snapshot
completo siguen siendo requisitos pendientes de **A2**, no se reclasifican como C.

Las pruebas dirigidas de cliente, coordinador, impactos, canal de entrada y
recuperación histórica pasan juntas (85 casos). Incluyen autoridad WASM real y
receptor en Worker con las limitaciones descritas abajo. La cobertura de todas
las magias y contenidos es B5/B6; pérdida real de dispositivo, sesión completa,
restauración con física activa y continuidad gráfica son C. Esta decisión no
declara cerrado A globalmente ni garantiza que cualquier fallo permita continuar:
un diario incompleto termina la recuperación de forma visible y segura.

El perfil de integración `VITE_PRESENTATION_BACKEND=webgpu-worker` puede solicitar
`VITE_HISTORICAL_PRESENTATION_RECOVERY=true` durante la compilación. La opción está
apagada por defecto y no convierte el backend en la ruta predeterminada del juego.

El perfil negocia antes del arranque la historia de terreno, el diario de
publicaciones y los checkpoints de presentación y efectos. La autoridad preparada
recibe la configuración y la observación de movimiento antes de crear su Worker;
el host rechaza discrepancias al conectar la presentación. El cliente entrega el
mismo perfil a la superficie inicial y a la que recupera, y el reloj de
presentación solo reproduce intervalos ya confirmados que hayan superado el
certificador completo. No autoriza tramos futuros por deducción.

Ante un error `historical-playback-invalidated`, una desconexión de terreno o
una pérdida de dispositivo, el coordinador intenta marcar la vista perdida,
obtener un checkpoint confirmado y reproducir el diario en un Worker de
reemplazo. Un handoff de terreno incoherente, un diario incompleto o un replay
fallido no se aceptan: la recuperación informa el error y no inventa estado ni
confirma una frontera pendiente. Las señales de pérdida repetidas durante un
intento se fusionan; los errores diferentes y los fallos del reemplazo siguen
comunicándose.

La entrada sigue una secuencia autoritativa. Los efectos provisionales no
restauran por sí solos consecuencias ya confirmadas. El perfil no implementa
rebobinado causal de simulación o física y no habilita suposiciones sobre rutas
futuras. La prueba de host usa Wild Engine y WASM reales y transporta replay por
MessageChannel a un receptor en un Worker de Node, pero usa un adaptador para el
cliente de autoridad, revisiones de terreno sintéticas y preparación gráfica
simulada. Los tests de contratos no prueban WebGPU real, pérdida de dispositivo,
continuidad gráfica, paridad de materiales, física activa o partidas largas.
Esas validaciones siguen pendientes en C; tampoco se ha medido rendimiento.

Componentes principales: `src/app/temporal-presentation-options.js`,
`src/app/early-worker-options.js`, `src/app/main.js`,
`src/app/webgpu-auto-recovery.js`, `src/simulation/worker-hosted-runtime.js`,
`src/simulation/worker-runtime-host.js`,
`src/rendering/confirmed-timeline-pump.js`,
`src/rendering/temporal-recovery-receiver.js` y
`src/rendering/webgpu-world-surface.js`. Cobertura principal:
`tests/worker-runtime-host-historical-recovery.test.js`,
`tests/fixtures/temporal-recovery-receiver-worker.mjs`,
`tests/temporal-presentation-options.test.js` y
`tests/webgpu-auto-recovery-qa.test.js`.
