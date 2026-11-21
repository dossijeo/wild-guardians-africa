# Pausa de dibujo de Build en la cabeza de la cola

La preparación del muro devuelve READY cuando el paquete gráfico está retenido. La autoridad inicia la transacción de compra al recibir la orden desde la cola ordinaria del Runtime y su cliente. Recotiza antes de detener Draw. Durante la preparación y la espera en cola, la simulación y Draw pueden seguir usando sus propietarios actuales. [Plan integrado](integrated-gpu-migration-plan-20261104.md) · [Build de muros sólidos residentes](native-wall-causal-adapter-20261121.md).

`beginNativeStructureCommand` verifica la identidad y la secuencia del comando que encabeza la cola. Entrega el handle existente a la admisión y espera su continuación de commit. `execute` conserva la compra síncrona, el recibo nativo y la liberación causal en ese turno. El comando consume su secuencia una sola vez. Cancelar READY aborta el handle antes del fence. Una cotización que ha cambiado se rechaza antes de la quiescencia y sin cobro. El cambio reutiliza la cola de comandos, WASM y las comprobaciones de propietario y recibo.

En Godot 4.4, `CommandQueueMT` asocia la espera al comando y la resuelve al ejecutarlo. `RenderingServerDefault` envía `draw` y `sync` por esa cola. De ese código se adapta el orden entre comandos y la barrera de dibujo. Wild Guardians conserva sus propios fences y recibos WebGPU. [CommandQueueMT](https://github.com/godotengine/godot/blob/4.4-stable/core/templates/command_queue_mt.h#L123-L190) · [RenderingServerDefault](https://github.com/godotengine/godot/blob/4.4-stable/servers/rendering/rendering_server_default.cpp#L353-L387).

## GPU física

En Edge con NVIDIA Turing, a 640×480 en calidad `muy_baja` y con el escritorio a 30 Hz, dos cruces sin retención artificial de READY conservaron Farm, adquirieron parada24, muro y nueva ruta sobre el mismo cuerpo, y drenaron sin errores WebGPU. El muro pasó de 45,5 a 23,1 ms desde solicitar quiescencia hasta instalar la liberación en Draw. En ambos cruces se observaron los envíos de Build y la recotización completa antes de la quiescencia. La recotización tomó 10,3 y 10,2 ms fuera de la pausa.

| Worker Draw | Referencia detallada | Cruce 1 | Cruce 2 |
| --- | ---: | ---: | ---: |
| Pausa del muro | 45,5 ms | 23,1 ms | 23,1 ms |
| Mayor intervalo entre envíos | 47,7 ms | 36,7 ms | 36,8 ms |
| Oportunidades de dibujo omitidas | 1 | 0 | 0 |
| Mediana entre envíos | 33,3 ms | 33,3 ms | 33,3 ms |

En el segundo cruce, el fence tomó 7,4 ms, la revalidación WASM 0,2 ms, la incorporación física 4,6 ms y la proyección Game 2,6 ms. Los 23,1 ms siguen por encima del presupuesto de 16,667 ms. C4 y la aceptación a 60 Hz siguen abiertas. [Cronología comparada del Worker](performance/native-build-active-farm-20261120/solid-wall-fifo-head-timing.json).

El cruce con READY retenida confirmó que Game avanza mientras espera. Entre la parada y el muro se conservaron los 34 propietarios de vegetación que ya estaban residentes y sus 58 pares. Fuera del corredor, Farm mantuvo su ruta original. Con regiones frías se rechazó antes de cobrar o detener a Farm. Los cinco recorridos drenaron el consumidor.

## Regresión

Pasaron 996 pruebas relacionadas y la compilación Vite de producción. Cuatro pruebas nuevas cubren la espera en la cola ordinaria, cancelación tras READY, cotización desactualizada y ejecución fuera de turno. La prueba de cola falla con la implementación anterior porque READY ya había adquirido la pausa. [Pruebas de la cola](../../tests/native-build-head.test.js).
