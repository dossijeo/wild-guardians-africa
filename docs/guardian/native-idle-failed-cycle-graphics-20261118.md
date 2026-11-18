# Actor residente para REST de WALK fallido — 2026-11-18

Continuación de `b53118ba0`, dentro de A6-04.f-R3/e-R3. El roster admite el primer 21 desde un WALK pendiente real y conserva el actor que ya estaba cargado. No requiere un permiso 20/22 anterior. Este avance cubre el actor, los bancos originales y su código TSL; la admisión del fallo en Surface/puertos/Host/GPU sigue pendiente. A6/A/B/C permanecen abiertos; D no se inicia.

## Investigación aplicada

Se leyó el código instalado de [Three r180, `Mesh.copy`](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L110-L129): conserva la geometría y el material por referencia. También [SkeletonUtils.clone](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388-L423) distingue el remapeo de huesos de los recursos compartidos. Se aplica esa separación al actor residente y a las variantes nativas ya existentes. Este relevo no necesita otro rig, clon, banco, registro ni dependencia. Los hashes de los fuentes leídos están en la evidencia.

## Implementación

- Se extrae la comprobación semántica existente del WALK frío a `pendingIdleStrollMatches`. La fuente fallida y la admisión fría 22 usan la misma validación de propietario, perfil, centro, pose, modo WALK, nacimiento, destino, tipo local/aproximación, RNG y retry. El renderer no consulta ni decide caminos; los permisos los siguen otorgando el control y el recibo nativo.
- Solo el primer `native-idle-stroll-failed-source` permite no tener `nativeState` anterior. Los sucesores siguen exigiendo el 21 anterior y los demás orígenes conservan sus pruebas específicas. Una asociación incompatible no se usa para fabricar un origen inicial o una llegada.
- La guarda de variante anterior se aplica cuando esa variante existe. Finalizar retira el propietario nativo anterior cuando lo hay; en el primer relevo libera únicamente el antiguo binding/motion ordinario mediante la retirada diferida existente.
- Preparar, activar, deshacer y cancelar reutilizan el actor original, su raíz, mallas, geometrías/índices y bancos Walk/Run/Idle/Alert. No cambian DTO, WASM, código de materiales ni grafo TSL.

## Validación

- **24 pruebas nuevas**. Cuatro perfiles en normal/pthread adquieren su primer 21 desde la posición fraccionaria guardada real, sin 20/22 en la nueva autoridad. Se comprueban identidad de actor/raíz/geometrías/índices, bancos/datos/versiones y una sola adquisición del modelo; cuerpo y RNG global intactos.
- Cancelación restaura materiales/visibilidad y propietarios; retirada, nacimiento, tipo, RNG, destino, pose, marcador y tarea ajena invalidan la candidatura. También pasan la fuente LOCAL, referencia incompatible, retarget tardío, REST/WATCH sucesores reales, asociación de cuerpo incompatible, picking con relojes enviados de prueba y compilación de color/sombra con bancos originales y tags de origen estrictos.
- **194 dirigidas en ocho archivos**, cero fallos/omisiones. Selección amplia: **3155 pasan de 3156 en 269 archivos**, una comparación opcional omitida, cero fallos/cancelaciones. Se conservan las siete exclusiones históricas; no se presenta como toda la suite del repositorio. Build correcto en **47.75 s**.
- Roster anterior cargado en solo lectura: **cuatro fallos esperados y 20 casos filtrados**. La primera batería produjo 23/24; se corrigió la expectativa negativa sobre la secuencia frente al cuerpo incompatible, sin cambiar producción para hacerla pasar. La batería final pasa 24/24.
- **446 inputs probados / 64 nativos exactos**, sin rebuild WASM. Los 16 archivos ajenos y el worker pthread no seguido permanecen intactos.
- Renderer, admisión y relojes de picking son simulados. El compilador TSL, GLB, bancos, terreno y kernel nativo son reales. No se ha ejecutado una nueva captura hardware para este origen y no se asignan a él los resultados de regresiones gráficas anteriores.

[Referencias, selección, hashes y sonda de continuidad](performance/native-idle-failed-cycle-graphics-validation-20261118.json).

## Discontinuidad reproducida y siguiente punto

La sonda usa el actor GLB original y sus proxies de picking, con relojes enviados explícitos de prueba. Tras **0,7 s de espera** al final de un 21, el siguiente programa del mismo clip reinicia desde el elapsed semántico retenido: Idle pasa de 0,95 a 0,25 s y Alert de 1,70 a 1,00 s. En 124 vértices muestreados, el salto máximo es de unos **13,6 mm en REST y 50,0 mm en WATCH**. El cuerpo físico no cambia. Es un defecto reproducido del relevo cosmético, no una prueba de continuidad aprobada ni una captura Surface/GPU.

El siguiente mecanismo debe conservar la fase del clip entre programas usando el control/reloj y la propiedad existentes, sin prolongar el horizonte físico ni modificar remaining/RNG. Se ha leído `AnimationAction._updateTime` de Three r180 (acumula el tiempo actual y hace wrap al repetir); su adaptación y la validación del reloj realmente enviado quedan para esa corrección. Después debe demostrarse el primer fallo y sus reintentos mediante Surface/puertos/Host/hardware, con picking y recursos incrementales.

Siguen pendientes la aproximación 22 seleccionada con remaining, REST/WATCH exterior guardado desde el cuerpo inicial genuino, productor/cohort, recuperación incremental de los 3.123 recursos y aceptación de cadencia/plataforma. Ningún gate integral se cierra aquí.
