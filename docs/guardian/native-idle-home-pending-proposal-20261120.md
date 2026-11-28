# Home desde Idle con propuesta pendiente — 2026-11-20

Incremento de A2/A4/e-R3/f-R4 subordinado al plan integrado. No habilita el productor ordinario de Idle desde liquidación ni cierra A6.

Al vencer el contrato durante una propuesta de mundo pendiente, `Game.tick` pedía Home desde el ciclo21 adquirido y el kernel devolvía `-4`. El puente lanzaba una excepción: el reloj no avanzaba, pese a conservarse el cuerpo válido. La misma petición desde liquidación17 ya podía sustituir su sucesor preparado21/22.

Se elimina únicamente la exclusión por propuesta preparada en `nav_intent_idle_cycle_home_request`. Se conservan la exclusión de preview/transacción abierta y las comprobaciones de sesión, secuencia, actor, cuerpo, fuente y tareas. Home19 declara el destino sobre el cuerpo adquirido; no adquiere ruta ni permiso gráfico. El ticket ajeno permanece intacto y el sucesor Idle propio queda obsoleto por sus comprobaciones existentes. La petición Home idéntica es idempotente incluso si su ruta ya está preparada; otro destino devuelve `-3` sin cambiar ticket, secuencia ni fuente.

Antes de diseñar el cambio se leyó [DetourCrowd v1.6.0, requestMoveTarget y updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607): actualizar el destino del mismo agente se separa de obtener capacidad para la ruta. Se adapta esa separación, manteniendo el protocolo físico de Wild Guardians. No hay dependencia, dueño, cola, temporizador o reloj nuevos. Se descartó un prototipo de deferir Home en JavaScript: mantenía Idle vencido y fallaba la guarda de `Game`; continuar por esa vía habría requerido ampliarla. La implementación final conserva `Game` por bytes.

## Validación

- 22 casos nuevos en los dos módulos nativos: petición directa y tick, ticket ajeno, sucesor propio obsoleto, liquidación17→21/22, cuerpo retirado, fin de turno de cuatro perfiles e idempotencia. Los casos por contrato mantienen un compañero real en movimiento; los de hora aíslan al actor en un checkpoint semántico frío antes de crear el propietario. No prueban el retorno del compañero Task al acabar su propio turno.
- 107/107 pruebas dirigidas de Home, Idle, control, gráficos y transporte pasan con los DTO finales y los WASM instalados. Los fixtures usan admisión nativa confiable, puertos y GPU simulada; no son una aceptación de GPU física.
- Standalone y pthread canónicos recompilados desde las fuentes originales:63,922s y70,386s; imports/exports idénticos,749/770exports. El wrapper pthread y su worker previo permanecen idénticos. Advertencia pthread+memory-growth heredada de los flags canónicos, sin nuevos avisos.
- Selección amplia5061/5062 en385archivos:una omisión opcional histórica, cero fallos/cancelaciones,731,677s. Build122,010s y tres sintaxis correctos.9.054inputs congelados permanecen exactos;732entradas de validación,1002dependencias de ejecución y64entradas nativas coherentes.16archivos ajenos y38A5 preservados. Se mantiene la selección histórica; no se presenta como suite completa.

Los ensayos aislados anteriores y sus negativos se conservan separados: fallo del loader Windows, selección errónea de WASM del fixture, reutilización de runtime entre mundos y compañero Task alcanzando un límite de retorno todavía no soportado no se cuentan como validaciones satisfactorias. El wrapper de una compilación provisional falló tras guardar un compilador exitoso por una variable de salida; no se repitió esa compilación ni se ocultó el registro. Las compilaciones canónicas y las pruebas integradas posteriores no usan los loaders ni snapshots provisionales.

[Recibo de validación](performance/native-idle-home-pending-proposal-20261120-validation.json) y [manifiesto de archivos](performance/native-idle-home-pending-proposal-20261120/manifest.json). El recibo fija comandos, variables, hashes y alcance. El código y los WASM originales anteriores se recuperan desde48f4ce709; las compilaciones canónicas generan de nuevo ambos módulos, no reutilizan el prototipo.

## Continuación

La recuperación incremental sana de3.123 recursos y la corrección de transporte/primer uso ya están publicadas; no se vuelven a atribuir a este cambio. Sigue abierto el relevo causal que perdió una oportunidad bajo `nativeMutationHold`:49,415ms no acredita fluidez aunque esté por debajo del umbral diagnóstico de50ms. Hay que atribuir fence/commit/comunicación, mantener las guardas y medir plazos de presentación. El productor Idle desde17, la pérdida real de dispositivo y la cobertura integrada restante siguen pendientes; A6/A/B/C abiertos y D no iniciado.

La [referencia operativa](MIGRATION-OPERATIONS.md) conserva el reparto indicado por el usuario: el implementador detecta y comunica incidencias de cadencia; el agente de corrección investiga y entrega una solución; se contrasta antes de ampliar la dependencia. Este incremento nativo no es esa corrección de cadencia.
