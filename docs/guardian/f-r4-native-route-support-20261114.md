# f-R4: recurso completo de ruta nativa y apoyo 3D

14 de noviembre de 2026. Continúa el [enlace de uniforms nativos de Three](f-r4-native-three-clock-20261114.md).
**f-R4, e-R3/e-R4 y los once padres de A6 permanecen abiertos.** Se prepara el
recurso de una asignación; aún falta su reproducción GPU en personajes originales,
admisión/revocación y recuperación en la autoridad ordinaria. No se activa autonomía.

## Investigación aplicada

Se consultó el código fuente fijado de Three r180:
[Mesh.raycast/_computeIntersections](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js)
y [Triangle.getBarycoord/getInterpolation](https://github.com/mrdoob/three.js/blob/r180/src/math/Triangle.js).
El motor interpreta los índices de la geometría residente y las transformaciones de
la malla. Se conserva ese criterio: preparar sobre los mismos triángulos visibles,
comprobar su versión y reutilizar el cálculo existente de `confirmed-terrain-support`.
No se incorpora un segundo mapa de alturas ni una interpolación de extremos que
atraviese varios triángulos. La prueba independiente usa el raycast real de Three.

También se releyeron los propietarios C++ existentes `spatial-route-motion.h`
(`sampleRouteTiming`, `routeTimeAtDistance`) y `spatial-route-reservations.h`
(`reservationKnots`). Sus nudos incluyen giros, extremos de esperas y agotamiento de
carrera: posición y fases son afines entre ellos. La preparación copia esos nudos y
muestras; no vuelve a resolver velocidades, reservas, puertas o navegación en JS.
No hay dependencias nuevas.

## Recurso y propiedad

`captureNativeRoutePresentation(handle)` entrega una copia Float64 con las dieciséis
columnas versionadas de `native-route-presentation.js`: tiempo, X/Z, distancia,
fase, yaw, cursor, llegada y fases/presupuestos de locomoción de trabajador. Conserva
actor, secuencia de asignación, handle completo, frontera nativa, perfil y alcance.
Los estados categóricos pertenecen al intervalo siguiente; se toma su muestra
interior nativa para evitar que el redondeo de la inversión distancia/tiempo deje
el yaw del tramo anterior en un giro. La última fila conserva el estado terminal.

La captura no avanza cuerpos, consultas de navegación, comprobaciones de colisión
ni la secuencia de eventos. Los arrays sobreviven a la reutilización del scratch
WASM y al avance posterior. Un handle revocado/ajeno no permite otra captura.
`copyNativeRouteReference` comparte la validación de identidad con el uniform;
`copyNativeRoutePresentation` valida y copia en la frontera de preparación.
`authorizedAutonomy:false` sigue siendo obligatorio. La copia no es un permiso de
reproducción ni una publicación histórica confirmada.

`prepareNativeRoute(packet, {terrainManifest})` entra en el mismo propietario del
apoyo, con contrato separado del histórico. Subdivide cada intervalo por cruces de
X, Z y diagonal de la cuadrícula canónica y conserva Y por triángulo. Los límites
explícitos rechazan el recurso completo; no se trunca la ruta a 64/256 segmentos.
Los límites históricos y sus condiciones de seguridad se conservan.

La vigencia nativa depende de las mallas, buffers, versiones y revisiones que usa
la ruta. Sustituir un chunk ajeno conserva el certificado; sustituir un chunk usado
o cambiar su atributo lo invalida. No se reconstruyen gráficos durante la captura
o el cálculo de apoyo. Esto no mide aún el coste de preparar/subir la futura tabla
GPU ni sustituye las pruebas de cero creaciones tardías ya documentadas para el mundo.

## Validación y siguiente punto

Dieciséis casos nuevos sobre WASM real: fases/giros, dos esperas de puerta,
revocación, copia frente a scratch/avance, animales, ruta de 130 puntos sin recorte,
apoyo sobre triángulos reales, retención de chunks ajenos, invalidación de usados,
capacidad, datos inválidos, frontera de mundo copiada y ruta ya llegada de duración cero. El apoyo se compara con el raycast de Three entre
cortes; X/Z y las fases se contrastan con el muestreador C++.

La ampliación a 117 archivos produjo 869 pruebas: 863 aprobadas y seis fallos.
Los mismos seis se reprodujeron al restaurar temporalmente los tres archivos de
producción modificados a `ed2f4b5e1`, manteniendo el resto del checkout: falta del
motivo `clock` en `confirmed-motion-preview`, timeout del handshake de
`confirmed-presentation-timeline`, hash del banco AO y tres llamadas de herramientas
de contorno a APIs ausentes (`smoothPath`/`approachGroupBlocked`). No se alteran
fixtures ni esos propietarios para ocultarlos. La comparación de base conserva
24 aprobadas y seis fallos en 30 casos; `.cache/native-route-support-baseline.tap`.

La regresión dirigida de 21 archivos aprueba **241 pruebas**, cero fallos/skips;
la versión final de apoyo aprueba **9/9**. Build WebGPU/remote aprobado en
**43,45 s**, con los avisos habituales de imports mixtos y chunks grandes.
Resultados completos en el [recibo](performance/native-route-support-validation-20261114.json).
Registros locales `.cache/native-route-{presentation-regression,terrain-support-directed}.tap`
y `.cache/native-route-support-build.log`; la regresión dirigida se conserva en
`.cache/native-route-support-directed-regression.tap`.

El siguiente punto es consumir este recurso completo en GPU, con el reloj finito
ligado a la misma asignación y las mallas/animación originales. No presentar la
ruta futura como trace histórico, añadir posiciones periódicas desde JS ni crear
otro ejecutor. Siguen pendientes los efectos activos, el ciclo de vida completo
de entidades/intenciones, guardado/recuperación y la aceptación integrada A–F/B/C.
