# Intervalos de Repair y Farm en NVIDIA

La prueba con Repair activo se hizo en Edge sobre NVIDIA Turing, con la pantalla a 30 Hz. El informe usa los intervalos de inicio de dibujo del Host. [Recibo físico](performance/native-ruined-wall-active-farm-20261123.json).

## Lo que se puede demostrar

| Paquete/ticket | Intervalo entre entradas al dibujo | Duración instrumentada del dibujo actual | Estado |
|---|---:|---:|---|
| 44 / 15 | 46,5999 ms | 4,4001 ms | RAF, repetición |
| 32 / 5 | 41,0000 ms | 4,3999 ms | RAF, repetición |
| 32 / 5 | 38,5000 ms | 4,0999 ms | RAF, repetición |
| 15 / sin ticket | 38,4001 ms | 0,2000 ms | RAF, repetición |

`remote-webgpu-host.js::draw` toma `startedAt` después de las primeras guardas. `intervalMs` mide la distancia al inicio del dibujo anterior y `drawMs` mide el tiempo instrumentado dentro del dibujo actual. La ejecución de GPU y la presentación física requieren sus propias medidas.

El dibujo anterior al intervalo de 46,6 ms compartía el paquete 44 y ticket 15. Empezó en `1795426497107.9001` y duró 4,3 ms. Quedaron **42,2998 ms desde su final instrumentado hasta el inicio del dibujo siguiente**. Ambos escribieron la edad saturada de Repair (`0.4799999893`). La causa del hueco sigue abierta.

Se recuperaron 94 de 683 muestras declaradas. Las 94 superaron los 16,667 ms del objetivo de 60 FPS. Faltaban los dibujos anteriores a los otros máximos y una traza de esa sesión. Esta cobertura solo permite informar sobre las muestras conservadas.

El periodo nominal de la pantalla era 33,333 ms. El mayor intervalo observado lo superó en 13,267 ms. C4 sigue abierto.

## Ajuste reutilizable del analizador existente

`analyze_native_frame_cadence.mjs` añade `targetCadence` con presupuesto de 16,667 ms, cobertura, máximos y el dibujo anterior cuando es contiguo. El informe `gaps` sigue indicando irregularidades relativas a `1,5 × mediana RAF`. A 30 Hz ese umbral ronda los 50 ms y se sitúa por encima de los máximos de este recibo.

`summarizeNativeCadenceTarget(receipt)` funciona con el recibo por sí solo. `analyzeNativeFrameCadence(receipt, trace)` añade el análisis correlacionado. Pasaron 13 pruebas de análisis, incluidos intervalos bajo el umbral relativo, cobertura incompleta, duplicados y vecinos contradictorios.

## Señales para atribuir los intervalos

El auditor físico puede guardar las señales que ya devuelve `Host.inspect`.

```js
cadence: {
  count: samples.length, peaks,
  samples: host.samples,
  presentationOpportunities: host.presentationOpportunities,
  frameTimings: host.frameTimings,
  fenceTimings: host.fenceTimings,
}
```

Para una ventana que supere los anillos del Host, `collectNativeHostHistory` fusiona las inspecciones conservadas. La continuidad se comprueba con las marcas de inicio y los intervalos registrados.

| Pregunta | Evidencia necesaria |
|---|---|
| ¿Se recibió un callback que se descartó? | `presentationOpportunities` con `outcome`, `holdId` y vecinos |
| ¿Hubo espera en cola o preparación? | `frameTimings`, desde el productor hasta `firstDraw`, y traza de los Workers de preparación, dibujo y autoridad |
| ¿El consumidor estaba ocupado o faltó un RAF? | Traza CDP de la misma sesión con `traceClockAnchor`, callbacks y tareas de los hilos. Usar `tdur` cuando se necesite el tiempo de CPU |
| ¿El intervalo se produjo en el envío, GPU o compositor? | Operaciones de envío, colas GPU y Viz, evidencias de presentación y fences existentes |

`tools/guardian/native-audit-trace.mjs` conserva el ancla de reloj y el resultado de finalización de la traza. La captura debe identificar el solapamiento con las inspecciones y la instrumentación de Repair.
