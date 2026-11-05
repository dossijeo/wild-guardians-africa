# Consulta experimental de origen del guardián

`qa-guardian-origin` prepara en segundo plano, dentro del Worker autoritativo, la metadata de bounds del bioma y las alturas de las cinco etapas de cada cultivo. No descarga geometría ni bloquea las órdenes mientras carga. El manifiesto de alturas se genera con `tools/experiments/bake_crop_stage_heights.mjs public/content/crop-stage-heights.json`; el generador verifica el SHA-256 del GLB y el cargador rechaza si la referencia en `models.json` no coincide. La interpolación es la misma del batch de cultivos.

La consulta `qaGuardianOrigin` es de lectura. Recibe cámara, exclusiones y volúmenes publicados por WebGPU, exige época y secuencia exactas y cobertura de todos los edificios, y consulta props y terreno a Wild Engine. Si faltan metadata, chunks, edificios o la publicación está obsoleta, rechaza la consulta. El Worker gráfico proporciona `guardianContextForQa`; la vista temprana expone `wildGuardiansGuardianOriginQa(targetId)` para conectar la captura y la consulta sin una espera síncrona de render. Cambios de cámara durante la consulta hacen que la interfaz descarte el resultado.

La prueba con Worker y Wild Engine reales compara el origen con el planificador existente, comprueba que no se modifique el estado ni se emitan eventos y rechaza una publicación anterior. Usa envolventes sintéticas de edificios, no una incursión. La prueba WebGPU de la vista QA obtuvo una posición para un centro con edificios y terreno reales antes del cambio a carga asíncrona; queda pendiente repetirla con el código final y comparar contra la escena original. Ninguna de estas pruebas habilita Attack ni demuestra paridad de combate o picking completo.

```powershell
.\.cache\tooling\node20.exe --test tests/guardian-origin-query.test.js tests/crop-authored-height.test.js tests/guardian-prop-volumes.test.js tests/guardian-placement.test.js tests/webgpu-world-client.test.js
```

Con Vite en 5194 y Playwright disponible mediante `NODE_PATH`:

```powershell
.\.cache\tooling\node20.exe tools/experiments/audit_guardian_origin_worker.mjs
.\.cache\tooling\node20.exe tools/experiments/audit_guardian_origin_ui.mjs
```

La segunda prueba debe ejecutarse con GPU disponible y fuentes congeladas. La captura visual y la consulta son todavía pasos separados: una respuesta calculada anteriormente no puede aplicarse a un Attack posterior sin una validación atómica de la frontera autoritativa. El flujo de combate sigue deshabilitado en la vista temprana.
