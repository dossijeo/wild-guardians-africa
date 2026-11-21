# Continuidad de dibujo después de Home19

Después de Home19, Draw puede presentar el instante T + 0,05 s mientras el canal de recursos aún entrega un paquete ordinario cuya cobertura termina en T. En NVIDIA, esa carrera interrumpía la vista cuando el control estricto rechazaba el retroceso de 41,95 a 41,90 s o de 43,40 a 43,35 s. [Recibos anteriores](performance/native-task-stop-home-graphics-20261120/ordinary-shift-completed-task-home.json) · [Plan integrado](integrated-gpu-migration-plan-20261104.md).

La reproducción usa la cadena Harvest, Carry y Home. En el padre `5d43ffc2b`, con esos módulos servidos por un cargador de pruebas, el mismo control falló de 98,14327059565 a 98,09327059565 s. El relevo de una Task completada permite alcanzar la misma frontera de Home desde otra tarea.

El Host retira un paquete pendiente ordinario del mismo reloj causal si su cobertura termina antes del instante que ya presentó. Conserva el paquete activo y retiene las preparaciones reutilizables con el mecanismo de retirada existente. La nueva grabación debe corresponder al mismo mundo aplicado y requerido por control, conservar sus preparaciones y carecer de un intervalo histórico. Surface espera su próximo frame para grabar. Un cambio de mundo sigue requiriendo la adquisición del recibo correspondiente y el tiempo de dibujo sólo avanza cuando se confirma un envío.

Chromium aplica la misma distinción entre una imagen retrasada y la que ya se presentó en `VideoRendererAlgorithm::EnqueueFrame`. Wild Guardians conserva sus comprobaciones de época, cobertura y preparación al descartar esa grabación. [Código de Chromium](https://github.com/chromium/chromium/blob/main/media/filters/video_renderer_algorithm.cc#L319-L335).

## Validación de autoridad y dibujo

```powershell
.cache/tooling/node20.exe --test tests/native-post-home-clock.test.js tests/remote-frame-time-guard.test.js tests/native-home-arrival-remote.test.js
```

La prueba del Host conserva la identidad del buffer. Deja pendientes las escrituras de la grabación obsoleta y el siguiente envío publica el valor nuevo sobre ese mismo recurso. Los controles comprueban el rechazo de un mundo distinto, una preparación no retenida, un intervalo histórico y la ausencia del propietario. El guard sigue rechazando el retroceso del reloj activo. [Pruebas de la frontera](../../tests/native-post-home-clock.test.js).

Pasaron las 449 pruebas de la selección relacionada y la compilación Vite de producción.

## GPU física

NVIDIA Turing completó los dos recorridos que habían fallado, `olderMale` y `youngMale`. Se dibujó Home19 sobre la cadena de tickets 2, 5, 8 y 10, se retiró el actor y el consumidor confirmó el drenaje. Se esperó la primera publicación visual para aislar Idle20. El paquete tardío se forzó en el control dirigido y no apareció en esas dos repeticiones físicas. La aceptación de cadencia C4 sigue abierta. [Recibos comparados](performance/native-task-stop-home-graphics-20261120/post-home-clock-handoff.json).
