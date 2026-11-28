# Retirada del consumidor nativo fallido — 2026-11-19

Continúa `0cc972ac9`, e-R3/f-R4. El rechazo de una plantilla futura conservaba el cuerpo 20 pero dejaba la retirada en timeout: `fail()` cerraba el control, y la finalización de una retirada ya solicitada también se descartaba al ver `failed`. Se corrige la retirada terminal sin tratar el fallo como prueba de drenaje. El Host permanece fallido y no dibuja después del error; sus recursos admitidos permanecen vivos hasta disposición explícita. No es recuperación saludable ni solución de los 3.123 recursos.

## Fuente consultada y adaptación

Se inspeccionó código real de [Dawn Queue.cpp, revisión 095e430d](https://github.com/google/dawn/blob/095e430d29d7dc15e8b8f738773590b3c4fac33c/src/dawn/native/Queue.cpp#L171-L233): `APIOnSubmittedWorkDone`, `WorkDoneEvent::Complete`, `TrackTask` y `Tick` ligan la finalización al serial de trabajo enviado y separan sus estados del error de validación. Se conserva snapshot/hash de la fuente y se adapta esa separación al Host existente.

Fallo, retirada solicitada y disposición comparten una única espera terminal de `queue.onSubmittedWorkDone`, capturada una vez detenidos los envíos. La finalización notifica por el recibo existente ligado al token de esa conexión; rechazo de la promesa no acredita drenaje, salvo el camino de pérdida de dispositivo explícita ya existente. Los fences no terminales conservan sus propias esperas. No se añade dependencia, propietario de recursos, caché ni reinicio del renderer.

La publicación conserva únicamente el recibo terminal realmente recibido y validado. Una llamada posterior a `retireGpu()` lo reutiliza de forma idempotente sin inventar `retirementId`, tiempo o frontera solicitados. Una retirada ya pendiente mantiene su recibo solicitado original. Los guards de sesión/época/token siguen completos.

## Validación

Baseline significativo: **seis fallos de seis**, antes de cambiar producción. El intento anterior tenía un error sintáctico del fixture y no cuenta como baseline. Pasan las **seis pruebas nuevas**: cola retenida y recursos vivos, fallo durante retirada, fallo+disposición concurrentes, rechazo de cola/pérdida explícita, recibo espontáneo idempotente y pipeline tardío incapaz de reanudar envíos. Se usa autoridad WASM y publicación/client/Host reales; GPU y transporte son dobles deterministas.

La primera regresión amplia detectó tres expectativas históricas de timeout en negativos de bootstrap: el nuevo cierre terminal llega antes. Se conserva ese fallo y se actualizan las pruebas para exigir rechazo sin ACK/envíos y, si hay drenaje, recibo del token real de esa conexión; sin ese recibo sigue exigiendo timeout.

Pasan **201 dirigidas/7 archivos**, **3492/3493 seleccionadas/288 archivos**, una omisión opcional y las siete exclusiones históricas conservadas; ninguna falla/cancelación. Seis comprobaciones de sintaxis y build Vite **49.03s** pasan. **483 inputs/64 nativos sin cambios/16 ajenos exactos**; dos archivos de producción, un test nuevo y tres tests negativos actualizados. No se recompila WASM.

Después de terminar tests/build se ejecutan dos sesiones NVIDIA sin solapamiento ni profiler:

- Omitir exactamente una plantilla 21 sigue rechazando antes de adquirir el ciclo, conserva el cuerpo 20 real y ahora entrega el recibo terminal con token de conexión, sin timeout. El intento de quiescencia después del fallo conserva el error original de plantilla, que se registra separado del drenaje. La primera comprobación del auditor exigía limpieza sin error y rechazó ese diagnóstico; se conserva el fallo de comprobación y se corrige solo esa expectativa, reutilizando la misma sesión completa. El audit devuelve 1 por el rechazo esperado, no se convierte el negativo en éxito funcional. Host fallido; recuperación saludable pendiente.
- Regresión REST exterior 20→21→22→REST21 pasa con 98/96/98/68 preparaciones, cero recursos tras READY/shaders duplicados y drain solicitado normal. Ventana desde 20: máximo 286.585ms, 3 huecos>50ms; **cadencia no aceptada**. Los objetos originales completos, muestras y diagnósticos de ambas sesiones se conservan sin pérdida en los dos archivos gzip del recibo.

[Evidencia, hashes, fuentes y sesiones completas](performance/native-failed-consumer-drain-validation-20261119.json).

## Pendiente

Este cierre terminal no recupera un Host fallido ni reconstruye recursos. Continúan recuperación incremental de 3.123, productor/cohort/paradas/relevos ordinarios y cadencia/plataforma. Antes de diseñar recuperación hay que contrastar los mecanismos de retención y proyección ya existentes con código consolidado y probar qué recursos cambiaron realmente. El criterio de seguridad f-R3 conserva su cierre; e-R3/e-R4/f-R4 y padres A6/A/B/C siguen abiertos, D no iniciado.
