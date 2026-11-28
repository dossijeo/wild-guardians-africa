# Journal de presentación y ataque del guardián

La autoridad publica por comando un journal separado, sin consumir la secuencia de juego. Registra en orden referencias a SpellActivated, CropPicked, CropDestroyed y RaidEnded, y las salidas individuales de animales. La cola mantiene las publicaciones con hechos como fronteras; no es aún una consolidación de publicaciones con eventos. El receptor valida referencias completas y ordenadas, salidas duplicadas y contradicciones con el estado confirmado. Los clientes antiguos sin journal mantienen la consulta de estado.

El guardián WebGPU usa el journal y los eventos completos de cada publicación. Una salida o destrucción en la publicación del lanzamiento impide iniciarlo; una salida posterior no cancela un gesto que ya se inició. La autoridad y las reglas de combate no cambian.

Una excepción del Worker de autoridad provoca el fallo del cliente, el rechazo de su cola y la terminación del Worker; no hay una publicación posterior de hechos parciales. La API directa de autoridad no garantiza rollback ni cierre tras una excepción y no se utiliza como canal recuperable en este flujo.

## Validación

En Windows con Node 20 del repositorio:

```powershell
.\.cache\tooling\node20.exe --test tests/confirmed-animal-pose.test.js tests/webgpu-confirmed-animal.test.js tests/confirmed-presentation-stream.test.js tests/confirmed-state-receiver.test.js tests/host-publication-queue.test.js tests/presentation-lifecycle.test.js tests/webgpu-guardian-attack.test.js tests/simulation-authority-client.test.js
```

58 pruebas pasan, incluidas secuencias de salida en publicación igual/posterior, journal incompleto o duplicado, eventos antiguos, error del Worker y comprobación estricta de huesos auxiliares. El test de stream usa componentes reales con backend simulado; no reemplaza una prueba gráfica.

Con Vite en 127.0.0.1:5175 y Playwright disponible mediante NODE_PATH:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
.\.cache\tooling\node20.exe tools/experiments/audit_live_webgpu_guardian_attack.mjs
```

La ejecución del 4 de noviembre de 2026 sobre la incursión QA informó backend WebGPU, gesto provisional (1 fotograma observado), confirmación autoritativa, impacto sobre animal-371 y rechazo de otro ataque mientras caído. Se usó la opción QA de retardo de autoridad de 5 s. El [resultado de la prueba](guardian-journal-live-result.txt), el [fallo previo de rig](guardian-rig-diagnostic-result.txt) y la [comparación de modelos](guardian-rig-model-comparison.json) se conservan junto a este informe. No se ha medido paridad de píxeles ni rendimiento. No se realizó una comparación A/B con journal desactivado.

La primera ejecución con objetivo válido falló por `Confirmed animal rig mismatch`: la física añade dos huesos auxiliares de puntera, mientras el rig visual tenía 21 huesos y el físico 23. La ruta WebGPU ya los omitía; se unificó esa normalización estricta para validación y aplicación de pose. Solo se omiten los dos nombres auxiliares cuando el rig visual carece de ellos; se rechazan duplicados, transformaciones inválidas y otras discrepancias. El log de diagnóstico local es `.cache/guardian-rig-diagnostic.log`. Una comparación de los cinco GLB canónicos antes del ragdoll encontró idénticos nombres y orden en ambos cargadores; su salida local es `.cache/animal-rig-comparison.json`.
