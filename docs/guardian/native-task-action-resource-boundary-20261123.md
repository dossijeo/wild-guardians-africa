# Frontera de recursos de Action15 después de recargar

## Causa y cambio

Al recargar una partida, la primera Action15 podía adquirir su ticket sin registrar la frontera de recursos en WASM. El checkpoint con `visualTerrain` encontraba `spatial_world_resource_snapshot() == 0` y detenía la publicación.

`nav_task_action_proposal_commit_bound` registra ahora la frontera de tipo 15 mediante `spatialRecordMotionResourceBoundary`, igual que las admisiones vecinas. La preparación, la cancelación y los rechazos conservan la publicación anterior. Una mutación posterior fuera de la frontera sigue devolviendo −1.

## Pruebas reutilizables

Con los WASM canónicos y Node 20.

```powershell
node --test tests/native-task-action-resource-boundary.test.mjs tests/native-task-action-restoration.test.js
node --test --test-name-pattern='restored terminal Repair' tests/native-production-lifecycle.test.js
```

El control alojado genera un guardado público dentro de Repair y solicita 70 checkpoints de terreno al restaurarlo y avanzar siete segundos. Usa Workers, autoridad WASM y Host gráfico con cola GPU determinista. Comprueba topología exacta, mismo cuerpo, regreso a Idle y un solo cargo. Pasa tanto con un guardado v2 nuevo como con el v1 de la prueba física. El WASM anterior falla por la guarda de recursos. Pasaron 66 pruebas integradas y la ejecución adicional con el recibo v1.

Los dos binarios canónicos conservan importaciones, exportaciones y versiones de interfaz. El módulo JavaScript pthread coincide byte a byte. Pasaron las 494 pruebas de regresión seleccionadas y el build WebGPU Worker terminó en 71 s.

## Validación en NVIDIA

En Edge con NVIDIA Turing, el guardado v1 presentó la pared a t=30,85 s, 100 ms después del origen de la curva. Después de reanudar, llegó a la malla sana y volvió a Idle con el cuerpo 1. El saldo conservó un solo cargo. Se conservaron la raíz de la pared y 734 buffers comparables, y el consumidor drenó. [Recibo físico](performance/native-task-action-resource-boundary-20261123.json).

La transición gráfica sigue pendiente. El paquete retenido envió 126 dibujos con el reloj general limitado a t=30,85 s. En las inspecciones de la curva sigue apareciendo ese valor y la malla sana aparece después. Se registraron cuatro cambios de versión de posición y normal de la pared a t=32,50 s. Queda reproducir la curva en GPU con el reloj confirmado y conservar las versiones.

El máximo del Host fue de 37,6 ms en el arranque a 30 Hz. Pudo coincidir con el final de una prueba de CPU y C4 sigue abierto.
