# f-R4: validar el conjunto de tickets por fase reversible

14 de noviembre de 2026. Continúa el [desglose del relevo preparado](f-r4-prepared-handoff-20261114.md).
**f-R4, e-R3/e-R4 y los once padres A6 siguen abiertos.** La activación gráfica
se reduce; todavía queda una espera visible hasta el primer dibujo nuevo.

## Investigación aplicada

Se leyó [React v19.2.0, ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.js),
en particular `isRenderConsistentWithExternalStores`, `flushMutationEffects` y
`flushLayoutEffects`. Comprueba la consistencia del trabajo concurrente antes de
commit y separa la fase de mutaciones de los efectos que ven el árbol actual.
Se adapta esa separación de fronteras al coordinador existente; no se adopta
React, su scheduler ni su tratamiento de errores. Nuestro rollback sigue siendo
el de los propietarios originales de terreno/bioma.

## Cambio y contrato

El coordinador conjunto recorría todos los tickets después de **cada**
participante en activación, attach y finalización. Con P participantes y T
tickets eran unos `3 × P × T` recorridos estructurales, además de los iniciales.
Los tickets de grupos conservados también recorren sus meshes efectivos.

Ahora comprueba el conjunto completo al entrar al commit y al acabar **cada
fase reversible**: activación, attach y finalización. Son `4 × T` comprobaciones
durante el commit, sin contar las consultas externas de readiness. Se sigue
usando `validAfterAttach` sobre los objetos realmente adjuntos. Cancelación,
aborto de un participante y cierre del coordinador se comprueban después de
cada llamada, para detener inmediatamente el siguiente participante.

Los propietarios opt-in deben ejecutar fases síncronas y reversibles: no pueden
dibujar, notificar ni retirar recursos en medio de ellas. Los propietarios
actuales devuelven retiro/notificación diferidos. No se certifican callbacks
arbitrarios o un propietario que incumpla ese contrato; la guarda existente
contra observers síncronos del árbol permanece. Un ticket alterado por otra
parte se rechaza antes de la fase siguiente y siempre antes de retiro,
notificaciones, recibo admitido o retorno exitoso. El rollback restaura todas
las finalizaciones y attachments de esa fase y cancela los candidatos.

No hay cambios en la igualdad canónica, en la preparación GPU ni en los permisos
físicos. Se conserva la reserva, el orden de publicación y la identidad de cada
recurso; no se crea otra arquitectura de transacciones.

## Evidencia

[Recibo anterior](performance/prepared-handoff-after-20261114.json) y
[recibo con validación por fase](performance/prepared-phase-validation-20261114.json).
Mismo harness WASM y WebGPU NVIDIA, seis mutaciones, tiempo nativo 10 y trabajador
estacionario. En los cambios de terreno:

| Cambio | Activación anterior | Activación por fase | Drenaje → primer dibujo nuevo |
| --- | ---: | ---: | ---: |
| Añadir explanación (cuatro chunks revisados) | 19,1 ms | 11,9 ms | 74,2 ms |
| Restaurar terreno (nueve chunks revisados) | 43,6 ms | 22,8 ms | 86,9 ms |

Los intervalos máximos nativos son 100,0/99,9 ms en estos dos pasos. No se
acredita ausencia de tirones. Se conserva el terreno intacto de 3/8 chunks,
22/50 meshes de props intactos, sus buffers/materiales y el mismo dispositivo.
Las alturas efectivas coinciden con el payload nativo. Cero forks/errores GPU,
sin recetas nuevas durante commit y con cierre/drenaje verificados. El bloqueo
previo de 500 ms mantiene 15 dibujos del mundo anterior sin efecto físico.
Son observaciones dirigidas de dos ejecuciones, no percentiles ni aceptación D.

## Validación y siguiente dependencia

Cinco casos nuevos ejercitan el límite lineal con 2/20 chunks, invalidación
cruzada en cada una de las tres fases y cancelación inmediata entre participantes.
También pasan las pruebas existentes de observers, tickets obsoletos, fallos
tardíos, rollback de propietarios reales, retención de recursos y pipeline.
Selección dirigida: **158 pruebas** sin fallos/skips.

Selección amplia: **971 pruebas en 84 archivos**, concurrencia 2, sin fallos ni
skips: `.cache/native-prepared-phase-regression.tap` y
`.cache/native-prepared-phase-selection.json`. Sintaxis comprobada. La regresión
de los Workers reales regraba dos frames obsoletos conservando 93 buffers de
vértices por paso y el dispositivo, sin errores, con cierre/drenaje verificado:
`.cache/native-prepared-phase-validation-frames.json`. Build WebGPU/remote draw
aprobado en 42,02 s, con las advertencias habituales de tamaño de chunks:
`.cache/native-prepared-phase-build.log`. Quedan el trabajo de activación restante y el camino
del primer render/entrega, además de las familias/streams de f-R4, autoridad
ordinaria, personajes e intenciones y aceptación A–F/B/C. No se retiran las
protecciones ni se cambia el recuento de cierres.
