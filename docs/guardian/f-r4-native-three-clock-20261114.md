# f-R4: identidad nativa en uniforms de Three

14 de noviembre de 2026. Continúa la
[auditoría de consumidores retenidos](f-r4-retained-terrain-consumers-20261114.md).
**f-R4, e-R3/e-R4 y los once padres A6 siguen abiertos.** Este es el enlace
entre el material de una malla y el control nativo existente; todavía no
acredita locomoción de personajes ni activa autonomía ordinaria.

## Fuente y cambio

Se leyeron [Bindings](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js),
[NodeUniformsGroup](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/NodeUniformsGroup.js)
y [UniformsGroup](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/UniformsGroup.js)
de Three r180, incluyendo las dependencias locales fijadas a 0.180.0.
El layout/offset físico pertenece al grupo de uniforms del motor. Se mantiene
el hook existente `backend.updateBinding`; no se busca un uniform por nombre,
no se deduce su alineación y no se añade otro reloj.

`markRemoteClockNode` acepta ahora una referencia nativa opcional con actor,
secuencia de asignación y handle de ruta (época, sesión, slot y generación).
Copia y congela esos datos al marcar el nodo. El adaptador existente registra
la referencia junto al offset real del buffer y vuelve a registrarla si cambia
el buffer físico. Un llamador no puede modificar después la asignación ni
retaggear ese nodo para otro handle.

Los metadatos siguen fuera de las propiedades enumerables y de la clave TSL.
Los llamadores anteriores de tres argumentos conservan su comportamiento.
El Worker de dibujo ya admite esa referencia con `NativeRouteControl` y acota
el reloj por su fuente causal/revocación: la etiqueta no concede permisos nuevos.
No cambian los protocolos, el renderer, la autoridad o las dependencias.

## Validación y continuación

Siete casos nuevos: referencia capturada y offsets reales, conservación de la
clave estructural, registro en el buffer de reemplazo y seis campos de identidad
inválidos. Se usa `NodeUniformsGroup` real sobre un backend de prueba.
[Recibo](performance/native-three-clock-validation-20261114.json): **22 dirigidas,
127 de regresión**, cero fallos/skips; build WebGPU/remote aprobado en **45,25 s**
con las advertencias habituales. Registros `.cache/native-three-clock-{directed,regression}.tap`
y `.cache/native-three-clock-build.log`.

Continúa el muestreo de la ruta futura y su apoyo 3D, enlazado a las mallas y
animación originales. El movimiento histórico conserva su contrato y no se
presentará una trayectoria futura como una publicación ya observada. Quedan la
preparación/admisión, invalidación y recuperación de esas instancias, efectos
activos y aceptación A–F/B/C sobre autoridad ordinaria.
