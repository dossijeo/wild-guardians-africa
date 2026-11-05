# Terreno confirmado para cámara: QA

Con `qa-webgpu-camera-terrain`, el Worker gráfico envía una copia de las 2.401
alturas de cada chunk que ya aplicó, con secuencia, época y revisión. La copia
ocupa 9.604 bytes por publicación; no se consulta por fotograma. El cliente
solo expone el chunk después de que el estado confirmado en main alcance su
secuencia. Una revisión recibida invalida la altura anterior hasta confirmarse;
los datos ausentes o futuros producen `CameraTerrainUnavailable`.

La vista está limitada a 512 chunks y 256 publicaciones pendientes. Ante
desbordamiento, datos inválidos o cambio inesperado de época, el cliente
destruye la vista QA, sin cerrar el renderer ni la simulación. Una recuperación
gráfica crea una vista nueva vacía: todavía no se repueblan los chunks del
checkpoint. No se ha inyectado en los controles de cámara; faltan un manejo
transaccional de pose segura para chunks ausentes, cobertura de exclusiones y
paridad frente al campo nativo, que puede diferir de la malla triangulada.

`tests/browser/worker-camera-terrain.html` valida un chunk de autoridad real
pasando por Workers reales y backend WebGPU, sin inyección de cámara. Con Vite
en `http://127.0.0.1:5187` y Playwright en `NODE_PATH`, se reproduce mediante
`node tools/experiments/audit_worker_camera_terrain.mjs`. No es una prueba de
interacción, recuperación, biomas completos ni rendimiento.

Un guard experimental se descartó: con OrbitControls real y damping, una
actualización fallida redujo el delta angular de 0,5 a 0,475 y el offset de
pan de 2 a 1,9 aun restaurando la pose. Por tanto restaurar solo la cámara y
el objetivo no preserva la entrada. Antes de inyectar esta vista deben
resolverse también los acumuladores internos del control, el primer cambio de
fuente con pose segura, focus/pick diferidos y la equivalencia de exclusiones.

Se probó después un snapshot explícito de los acumuladores de OrbitControls
r180 con eventos reales: restauró un único giro, pan o rueda, pero no reprodujo
la trayectoria ni el damping de dos movimientos recibidos mientras faltaba
terreno. El segundo guard también se descartó. Un reintento seguro necesita
preservar y reproducir el orden de las intenciones, además de validar foco,
selección y exclusiones; la fuente sigue sin inyectarse.
