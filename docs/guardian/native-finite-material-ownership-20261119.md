# Propiedad de materiales durante la locomoción nativa — 2026-11-19

Continuación A4/e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), después de [admisión nativa y escrituras retenidas](native-active-retained-recovery-20261119.md). Se aborda la intercalación de preparaciones sobre el mismo actor publicado. A6/A/B/C siguen abiertos; D no iniciado y f-R3 conserva su cierre de seguridad.

## Problema y cambio

La preparación nativa finita esperaba recursos Walk/Idle/Run sin tomar el bloqueo de materiales que ya usa la preparación nativa de cuerpos Idle. La admisión histórica tardía tampoco comprobaba una propuesta nativa pendiente. Una prueba sobre el actor GLB y la propuesta C++ reales mantiene pendiente la lectura de Idle, solicita esa admisión ordinaria y observa que el código anterior sustituye los materiales publicados mientras sigue preparándose el candidato nativo.

El camino finito usa ahora el mismo motionPreparing existente: espera la promesa original de una admisión histórica ya pendiente antes de capturar sus materiales y vuelve a validar el propietario; toma el bloqueo después de terminar la preparación inicial de Walk, comprueba que sigue poseyéndolo y lo libera en cancelación, finalización o error solo si le pertenece. La admisión histórica tardía comprueba también nativePending. Se mantienen las verificaciones originales de identidad de material en webgpu-pipeline-admission, la publicación común, el actor, rig, geometrías y protocolo nativo. No se añaden cola, mutex, propietario, reloj, dependencia, permiso ni reintento.

## Referencia de implementación

Se inspeccionó [Three r180 Renderer.compileAsync](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L844-L969) y el camino Idle de este mismo roster antes de implementar. Three recoge y compila los objetos con sus materiales y restaura el árbol de render antes de esperar las promesas de compilación; el roster debe conservar la propiedad de las alternativas durante las esperas que preceden a esa preparación y a su publicación. El método del fuente oficial obtenido coincide con el instalado tras normalizar saltos; el fichero completo instalado difiere, circunstancia registrada con ambos hashes. Se adapta el bloqueo existente de Idle al camino equivalente, sin sustituir la arquitectura ni retirar el guarda admission-stale.

También se inspeccionaron needFinish, onFinish y finishMaybe de [Node 20.19 Writable](https://github.com/nodejs/node/blob/v20.19.0/lib/internal/streams/writable.js): una operación pendiente válida exige esperar su callback real. El campo ready referencia la misma cadena histórica ya existente. La cancelación nativa no acredita finalización antes de que esa cadena drene; después se vuelve a comprobar la señal y la fuente.

El primer intento con solo el guarda pasó sus controles CPU, pero un ensayo GPU terminó en Native motion has no matching source worker antes de la adquisición. Una prueba controlada reprodujo el rechazo temprano cuando la admisión ordinaria aún poseía los materiales; se añadió la espera de su promesa. Los resultados y fuente de ese intento se conservan como intermedios, sin aceptar aquella versión ni atribuir con certeza el predicado exacto de ese ensayo.

## Validación

Con el roster anterior en su URL original: 11 pases y 3 fallos entre 14 casos. Con la corrección pasan los 14 casos. Validación congelada: 938/938 dirigidas en67 archivos, incluida la suite modificada y 4441/4442 seleccionadas en 345 archivos, incluida la suite modificada completa y 1 omisión opcional. Cinco comprobaciones de sintaxis y build completo (57.08 s); 621 inputs, 64 artefactos nativos y 16 archivos ajenos conservan sus hashes.

[Recibo, hashes y archivos de evidencias](performance/native-finite-material-ownership-validation-20261119.json).

Los cuatro casos nuevos comprueban: ninguna sustitución ordinaria mientras el candidato nativo espera y nueva admisión después de cancelarlo; liberación tras fallar la carga de Idle; espera de una admisión ordinaria que ya posee los materiales y cancelación durante esa espera, sin reclamar el slot antes de drenar su callback. Los helpers únicamente permiten proporcionar el reloj histórico y observar la admisión simulada. La propuesta C++, actor y materiales son reales; renderer/admisión son dobles CPU, por lo que esos casos no acreditan compilación hardware ni cadencia.

El diagnóstico final sobre el mismo código (.cache/native-finite-material-ownership-pilot4.json) termina con: page.evaluate: Error: Recovery retired/replaced unchanged GPU resource Buffer:3567. Fases observadas: starting, started, base-ready, native-acquired, native-frame, native-ready, lost, prepared, rebound, attached, current-frame, activated. Rechazos instrumentados de propiedad de materiales: 0; fallos del control fuente: 0; errores GPU de la inspección: 0. Se conservan el resultado rechazado y sus límites; este ensayo no acredita recuperación completa ni elimina estadísticamente el fallo intermitente.

El piloto 9 anterior había registrado Admission material ownership changed sin IDs individuales de materiales. Las pruebas demuestran una intercalación de esa clase; no permiten atribuir retrospectivamente aquella llamada concreta ni demostrar la eliminación estadística de toda carrera hardware. Sigue pendiente justificar cada versión GPU de presentación frente al shadow del productor y separar residencia efectiva de temporales sin referencias. Picking, imagen, drenaje y caso móvil de la recuperación completa, recursos ordinarios en main, consumidor/cohort fallido, pérdida de dispositivo, plataformas y cadencia continúan abiertos. Se heredan las tres exclusiones anteriores de host/timeline y el coste de publicaciones completas en pausa sin aceptarlos.
