# Carga fría GPU de la aproximación seleccionada — 2026-11-18

Continuación de `70f948cb2`, A6-04.f-R3/e-R3. El control/roster/actor/Surface ya se había corregido y validado para ambas fuentes como componente y para la selección21 en hardware. Este paso verifica la carga fría explícita versión2 en Surface/puertos/Host/GPU reales. No cambia código de producción ni binarios nativos.

## Referencia técnica y alcance

No se diseña un mecanismo arquitectónico nuevo. Se usa la separación existente entre alta semántica, solicitud pendiente y corredor ejecutable, contrastada en el código real de [DetourCrowd v1.6.0 addAgent/requestMoveTarget](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L511-L637) y aplicada en el paso de Game anterior. Se releen las funciones del snapshot de esa investigación; su hash queda en la evidencia. La carga crea una autoridad y un cuerpo nuevos y necesita una nueva admisión; datos o identificadores antiguos no la conceden. No se introduce dependencia, caché, mixer ni propietario.

## Fuente guardada y recorrido

El checkpoint original Farm23→aproximación22 se guarda y carga realmente. Se bloquea únicamente su destino pendiente; las adquisiciones nativas reales21 fallida/reintento respetan la primera decisión REST y después seleccionan WALK con remaining propio. Se ejecuta una fracción del22 seleccionado. El guardado público no contiene referencias de ejecución ni handles; conserva el marcador semántico, pose, ancla, RNG y remaining.

Una segunda carga pública crea otra autoridad, registra un cuerpo nuevo y declara el request2. Se comprueba que no existe binding20/21/22 antiguo. El cohort B independiente se proyecta antes de guardar. Solo después se crea el mundo gráfico original y se recorre la admisión preparada de22 y el REST21 de llegada, con bloqueo explícito del productor de control y dibujo/picking independiente.

La fuente previa al mundo gráfico usa commits nativos de confianza; no son recibos GPU. El hardware valida la autoridad posterior a la carga. El auditor conserva sus límites: autoridad de página, cohort B explícito, no productor ordinario, recuperación en el mismo mundo ni conjunto completo de3.123 recursos.

El auditor existente `tools/guardian/audit_native_first_task_world_owner.mjs` selecciona este caso con `QA_NATIVE_IDLE_SELECTED_APPROACH_RESTORE=true`. Se mantienen `QA_NATIVE_CAPTURE_MODE=timing|visual` y el control dirigido `QA_NATIVE_IDLE_SELECTED_APPROACH_DROP_TEMPLATE=true`. No se habilita el productor ordinario mediante estas opciones de QA.

## Validación

- **8 pruebas nuevas**, cuatro perfiles normal/pthread, recorren el mismo helper nativo previo al gráfico y su guardado/carga: dos21 auténticos, WALK seleccionado, request2 nuevo con tiempo/RNG conservados, sin bindings20/21/22 ni handles anteriores. Se conservan los fallos iniciales del fixture y sus correcciones de observación.
- Pasan **788 dirigidas en 43 archivos**, **3.333 de 3.334 seleccionadas en 279 archivos**, una comparación opcional omitida y siete exclusiones históricas. Build **49.00 s**. **468 inputs /64 nativos intactos /16 ajenos exactos**. Producción y binarios sin cambios.
- GPU NVIDIA timing/visual: request2/descriptor2, **sourceCycleSequence0**, remaining **10.399999856948853** frente al nacimiento **7.599999904632568**; épocas distintas. Aproximación22 y REST21 preparan **100/98** recursos, **cero después de READY**. Actor/raíces/geometrías/índices/bancos retenidos, sin shaders duplicados; progreso independiente, picking, adopción, REST/WATCH y drain pasan.
- Ventana22→21: máximos **268.130/246.095 ms**, huecos >50 **3/3**. Global: **268.130/246.095 ms**, huecos >50 **5/5**. Todas las muestras y las 6 capturas visuales se conservan; no es aceptación de cadencia.
- Regresión heredada request1: **100/98** preparados/cero tardíos/drain; máximo ventana **44.870 ms**, 0 huecos >50. Mantiene el recorrido anterior después de factorizar la carga común del auditor.
- Negativo dirigido sin plantilla WALK: una coincidencia, cuerpo guardado retenido, ningún22/21 adquirido en la autoridad nueva. Error exacto de plantilla del Host y timeout de retirada exterior; **no se declara drain ni recuperación normales**.

[Evidencia, investigación, hashes, pruebas, fuente guardada, capturas y muestras GPU completas](performance/native-idle-selected-approach-restoration-surface-validation-20261118.json).


## Pendientes

El negativo sin plantilla WALK conserva el cuerpo guardado y no adquiere22; el Host falla y el cierre exterior registra timeout de retirada. Este rechazo no demuestra drain normal ni recuperación aceptada; se conserva el error completo.

Sigue REST/WATCH exterior guardado desde20 genuino, productor/cohort/paradas/relevos ordinarios, cierre/recuperación fallidos, recuperación incremental de3.123 recursos y cadencia/plataforma. A6/A/B/C siguen abiertos; D no iniciado. Las muestras completas y sus picos no permiten declarar ausencia de tirones.
