# f-R4 parcial: reanudación preparada del trabajador original

Fecha: 2026-11-14. Base: `f2c0b9c2c`. Rama: `codex/guardian-3d-animation`.
Continúa el [permiso de reanudación ligado a la asignación real](f-r4-native-resume-attestation-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Flujo implementado

La propuesta C++ tiene ahora una entrada gráfica tipada propia. Su copia conserva
ticket, cuerpo, generaciones, read set de origen, puntos, muestras y curvas de
puerta; no inventa una secuencia futura ni pasa como una ruta asignada. Comparte
la validación de las 16 columnas con la presentación de rutas, manteniendo
separados sus contratos de identidad y autoridad.

El apoyo sobre triángulos residentes y el empaquetado de la textura llaman a los
mismos núcleos privados que las rutas actuales. El shader es el mismo, incluida
su búsqueda binaria, fases y margen Float32. La propuesta solo cambia datos y
la referencia no estructural del uniforme. No aparece otro ejecutor, navegador,
reloj ni modelo de movilidad.

El roster exige el cuerpo suspendido exacto que ya posee. Prepara una variante
del mismo trabajador, sus bancos existentes y un binding reversible. La misma
transacción gráfica que preparaba motores independientes coordina ahora cuerpo
y puertas: tickets comunes, captura del paquete, preparación física GPU y recibo
antes de C++. La cancelación restaura binding, material, raycast y variante; la
textura anterior sigue perteneciendo al cuerpo suspendido.

Al confirmar C++, el bridge entrega la presentación de la asignación realmente
emitida. El roster la contrasta con el recurso preparado y retira el anterior
mediante la cerca existente. La liberación directa adopta el paquete mientras
el preparador puede seguir bloqueado. La selección usa el reloj propio de
reanudación enviado al dibujo. Una liberación tardía de la ruta antigua no
desmonta el trabajador nuevo. Una suspensión posterior puede retener la nueva
textura de ruta sin volver a subir sus datos.

Una escena puede contener una puerta independiente de larga vida y un recurso
de trabajador finito. Cada uniforme conserva su techo de datos, además del
límite de revocación de su asignación; la duración global de escena no amplía
la del cuerpo. El reloj finito C++ sigue siendo la única autoridad temporal.

## Código fuente consultado y decisiones

- [Three r180, RenderObject.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObject.js):
  `getCacheKey`, `getDynamicCacheKey` y `needsGeometryUpdate` distinguen cambios de
  estructura y de atributos. Se conservan graph, geometría y bancos; el horario
  nuevo se transporta como datos. La prueba de generación WGSL compara los
  programas completos de propuesta y asignación, que resultan idénticos.
- [Three r180, AnimationAction.js](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js):
  `_updateTime` limita el tiempo de cada acción a la duración de su clip. Se
  adapta el límite por recurso al uniforme del consumidor; no se usa su reloj
  JS para ejecutar movilidad ni autorizar tiempo.
- [Three r180, WebGPUTextureUtils.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUTextureUtils.js):
  `createSampler` crea un sampler por textura. El horario cambiado necesita una
  textura nueva y recibe su sampler asociado. Los bancos anteriores se retienen;
  no se introduce otra caché o dependencia como optimización ajena al bloqueo.

## Evidencia y alcance

Pasan 240 pruebas dirigidas. La regresión de 151 archivos registra 1697 casos: 1695 aprobados y los dos fallos heredados Carry/Harvest, sin omisiones ni cancelaciones. Build, sintaxis de HTML y los 19 módulos propios aprobados. No cambian los binarios nativos.

El [recibo de validación](performance/native-resume-graphics-validation-20261114.json)
registra selecciones, comandos, resultados y hashes.

El [ensayo NVIDIA](performance/native-worker-world-owner-resumed-20261114.json)
usa `WorldClient`, `WorldWorker`, `WorldSurface`, roster, admisión y dibujante
de producto. Parte de la suspensión preparada ya soportada, restaura el chunk
del sufijo mediante la misma mutación condicionada y prepara la reanudación antes
de asignar en C++. El preparador queda bloqueado durante 1,8 s; el canal directo
confirma y dibuja el recurso nuevo dentro de ese bloqueo. Se registran 54 dibujos durante el bloqueo. El cuerpo recorre
aproximadamente 1,64 m y la entrada normal selecciona el trabajador mostrado.
Se conservan rig CPU, mallas y geometría de la puerta; su apertura coincide con
el motor nativo. El cierre confirma drenaje real.

La preparación cambia 70 recursos: 36 buffers, 16 bind groups, 16 layouts de
bindings y una textura de horario con su sampler. Crea cero shaders, layouts de
pipeline y pipelines. Los recursos posteriores a preparado y los forks
posteriores son cero, también al recuperar el preparador. Esto cubre este cambio
concreto de datos; no reconstruye los 3.123 recursos de una escena completa.

El hardware cubre un trabajador original `olderFemale`, puerta `zarzas`, apoyo
plano nativo de Desierto y transición desde la espera Idle a Walk. Las pruebas
de datos también ejercitan fases de carrera y carga; eso no equivale a aceptación
hardware de todas sus transiciones. No se afirma aquí una detención desde una
marcha ya iniciada: la suspensión inicial de este caso sucede en su espera.

## Siguiente pendiente

La propuesta sigue ligada a una frontera temporal exacta: avanzar C++ mientras
se prepara la hace caducar. Falta la política ordinaria de preparación/reintento
sin detener a los demás actores. Tampoco se ha conectado la alimentación y
ejecución nativas a la partida ordinaria. Siguen pendientes todas las intenciones,
transiciones con acciones y consecuencias, cambios del apoyo actual, persistencia
y aceptación integrada A/B/C. La entrada explícita de este ensayo no sustituye
ese productor. Este incremento no cierra f-R4 ni activa autonomía en producto.
