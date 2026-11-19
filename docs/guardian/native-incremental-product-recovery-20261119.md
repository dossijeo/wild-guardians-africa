# Recuperación incremental: baseline actual y límites de reutilización — 2026-11-19

Continúa `da4e241c8`, e-R3/f-R4 y la recuperación integral pendiente de la captura histórica de 3.123 recursos. Se ejecuta el recorrido original sobre el código actual antes de diseñar otro mecanismo. **Sigue usando `mark-lost,fresh-surface` y crea 1.893 recursos nuevos**. Es una mejora acumulada del tamaño del mundo/renderer respecto al recibo histórico, no recuperación incremental ni prueba de ausencia de tirones.

## Fuente real y decisión

Se inspeccionan [Babylon 8.0, `enabled/reset/endRenderPass/endFrame`](https://github.com/BabylonJS/Babylon.js/blob/048566f71dfce0f62d993fd3a7bcadc844407315/packages/dev/core/src/Engines/WebGPU/webgpuSnapshotRendering.ts#L40-L49) y [Three r180, `NodeFrame.update/updateNode/updateBeforeNode`](https://github.com/mrdoob/three.js/blob/r180/src/nodes/core/NodeFrame.js). Babylon vacía la grabación y vuelve a grabar conservando el motor; Three distingue actualizaciones por identidad del frame real. Se fijan revisión y snapshots/hash. El patrón orienta a separar comandos inválidos y recursos residentes dentro de nuestros propietarios existentes; no demuestra por sí solo la validez de un checkpoint o una frontera nativa.

La continuación de frames y las mutaciones preparadas ya existen en Wild Guardians. El caso histórico difiere: se confirma la mutación antes de preparar los recursos y luego se reproduce un checkpoint en una Surface nueva. La recuperación temporal actual exige propietarios gráficos vacíos; el camino preparado normal exige su propuesta admitida. Ninguna de esas precondiciones se debe eliminar para obtener un pase.

## Comprobación aplicada al siguiente cambio

El baseline usa autoridad WASM, producto Surface/cohort/coordinador y draw Workers reales con NVIDIA/Turing. Hay un trabajador original estacionario, nueve chunks y tiempo nativo 10. La única modificación del auditor aislado es un destino de captura nuevo. Pasa, presenta seis dibujos/tres paquetes, cero errores GPU, y su frontera preparada coincide con la requerida. Su callback `markLost` es inyectado; no es la interfaz ni el relevo del journal de autoridad ordinarios. La captura se revisó y se conserva exacta: [baseline.png](performance/native-incremental-product-recovery-20261119/baseline.png).

Después se comprueba la aplicabilidad de los canales vivos de terreno/publicación existentes mediante una ruta Playwright aislada, sin editar el repositorio. Se reutiliza la Surface y se intenta aplicar el delta real confirmado, con comprobaciones de renderer/dispositivo/escena/raíz. El guard rechaza antes de poder acreditar esa identidad final:

- `Live native terrain did not consume its prepared proposal`: una publicación no sustituye la admisión de recursos ligada a la frontera exacta. El stream había llegado a secuencia 2 antes del rechazo; no se afirma rollback ni presentación válida del mundo nuevo. Se descarta el navegador de la sonda.
- `A fence cannot cover uncommitted changes to a published frame`: hay uploads retenidos, incluido el buffer no uniforme de diagnóstico usado para probar que el frame obsoleto no envió su escritura. La barrera existente no puede acreditarlos antes de publicar una imagen nueva. Se conserva la lista de writes/recursos exactos; no se descartan ni se consideran drenados por el fallo.

Esta prueba rechazada delimita la implementación inmediata: admisión de una base retenida y tratamiento correcto de sus preparaciones pendientes, con identidad, generación y fronteras reales. No se acepta una etiqueta nueva sobre comandos antiguos ni se activa un fallback de reutilización sin esas pruebas. No hay cambios de producción, arquitectura, dependencia, propietario ni compilación nativa.

## Evidencia y pendiente

Se conservan sin pérdida ambos resultados originales, incluida la sonda fallida, en [baseline.json.gz](performance/native-incremental-product-recovery-20261119/baseline.json.gz) y [probe.json.gz](performance/native-incremental-product-recovery-20261119/probe.json.gz). [Recibo completo](performance/native-incremental-product-recovery-validation-20261119.json): fuentes, entradas, transformaciones aisladas, errores y hashes. Las dos sesiones fueron secuenciales, sin tests/build/profiler concurrentes. **487 entradas/64 nativos intactos/16 ajenos exactos**, incluidas las cuatro fuentes QA consultadas, sin modificar las 483 entradas anteriores. Las 201 dirigidas, 3492/3493 seleccionadas/una omisión y build49,03s pertenecen al commit anterior y se heredan explícitamente; no se repiten por esta documentación/diagnóstico.

No hay muestras suficientes para certificar cadencia; la captura de un actor desde arriba tampoco acredita paridad integrada. Recuperación incremental saludable, productor/cohort/paradas/relevos ordinarios y cadencia/plataforma siguen abiertos. Siguiente: reproducir ambos límites en los tests existentes y contrastar vida de recursos/proyección y admisión de base retenida en código consolidado antes de implementar. f-R3 seguridad conserva su cierre; A6/e-R3/e-R4/f-R4/A/B/C abiertos, D no iniciado.
