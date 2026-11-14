# f-R4: consumidores de terreno que ya conservan sus recursos

14 de noviembre de 2026. Auditoría posterior a las
[aldeas preparadas](f-r4-prepared-village-support-20261114.md).
**A6, f-R4 y e-R3/e-R4 siguen abiertos.** Se verifica el apoyo de centros,
muros, cultivos y cajas en el pipeline existente; este incremento cambia QA y
documentación, sin añadir otro mecanismo de sustitución a producción.

## Código contrastado y decisión

Se consultaron las implementaciones fijadas de Three r180:
[Bindings.getForRender/_update](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js)
separa creación de bindings de actualización de uniforms;
[Attributes.update](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js)
actualiza un buffer existente cuando cambia la versión o usa DynamicDrawUsage.
Las matrices y datos de instancia pueden cambiar conservando geometría,
material y layout de programa.

También se contrastó
[wgpu v26.0.1 LifetimeTracker/triage_submissions](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs),
que mantiene referencias de comandos hasta completar sus submits. Una sospecha
inicial sobre pins del frame obsoleto no justificó cambiar nuestro transporte:
la prueba real mostró que estos propietarios actualizan sus datos dentro del
paquete del frame nuevo, después del hold validado, sin copias tardías. Se
conservan las protecciones de snapshots, uploads y replay existentes.

En producto, `settlements.sync` actualiza transforms de centros/muros,
`crop-roster.writeBatch` conserva lotes/atributos y `crate-roster.update`
conserva su modelo. El callback de terreno ya los reconcilia con la residencia
confirmada. La excepción de layout de aldea sí necesitó el incremento anterior.
Estos propietarios se reutilizan; no hay dependencias ni colas nuevas.

## Evidencia real

Tres escenarios del harness nativo, mismo renderer/dispositivo/Worker por
escenario, ocho mutaciones cada uno y preparación bloqueada como antes:

- [Centro y muro intactos](performance/native-retained-consumers-structures-20261114.json).
- [Centro y muro con 40 % de daño](performance/native-retained-consumers-damaged-20261114.json).
- [Conjunto dañado, cultivos y caja](performance/native-retained-consumers-economy-20261114.json): tres plantas de mijo, dos etapas y el bridge 21, y una caja suelta con procedencia de cosecha válida. El bootstrap espera los consumidores y texturas reales.

Los pasos 8/9 modifican y restauran alturas reales de todos esos consumidores.
Centros, muros y caja mantienen raíces, meshes, geometrías, materiales y todos
sus IDs GPU; los lotes de cultivos mantienen capacidad, geometría, material e
IDs, cambiando sus matrices de instancia. Los registros contienen alturas y
matrices antes/después. Las aldeas siguen usando su preparación previa.

**24 mutaciones: cero factories dentro del primer render y cero mensajes de
creación recibidos hasta su ACK**, sin errores GPU. Las copias internas de
uniforms/bind groups del preparador se contabilizan aparte y terminan antes de
solicitar quiescencia; no se copian buffers geométricos. Los bloqueos de 500 ms
mantienen el dibujo del mundo anterior. Los tres cierres certifican drenaje.
[Captura del conjunto](performance/native-retained-consumers-20261114.png).

El acercamiento adicional de cámara cambia el LOD de vegetación. Inicia
**96 creaciones de preparación**, incluidos ocho pipelines **asíncronos**.
Esas preparaciones se contabilizan separadamente: todos los renders intermedios
crean cero recursos, y después de readiness/fence el primer dibujo estable
crea cero recursos y recibe cero mensajes nuevos. El mundo físico no cambia.
Se conserva el gate estricto anterior de las mutaciones físicas y de las otras
dos vistas. No se confunde trabajo asíncrono de admisión de LOD con compilación
dentro de render, ni se afirma ausencia de asignaciones al cambiar de LOD.

## Validación y límites

[Resumen verificable](performance/native-retained-consumers-validation-20261114.json):
**104 pruebas dirigidas**, cero fallos/skips; sintaxis de ambos archivos QA
comprobada y tres ejecuciones Vite/WebGPU reales. La producción auditada es
`cb29ec41c`; este commit no modifica su código ni presenta su build anterior
como una compilación nueva.

Reproducción con Node 20/Playwright/Edge y `QA_BASE_URL=http://127.0.0.1:5181`:
`tools/experiments/audit_webgpu_temporal_ground.mjs`, con
`QA_NATIVE_STRUCTURES=true`, `QA_NATIVE_STRUCTURES_DAMAGED=true` o
`QA_NATIVE_ECONOMY=true`. El último puede combinarse con estructuras dañadas.

Son fixtures de contrato de recursos, con placements QA y un trabajador
estacionario a tiempo nativo fijo. El centro tiene cuerpo/ceniza dañados; no
emite humo/debris en esta muestra. Faltan efectos realmente activos, cambios de
familia/topología, apoyos/personajes en movimiento, intenciones y autoridad
ordinaria, y aceptación A–F/B/C. El siguiente paso no vuelve a sustituir estos
recursos ya conservados: conecta las clases pendientes con el mismo contrato.
