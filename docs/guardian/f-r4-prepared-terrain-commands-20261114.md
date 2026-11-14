# f-R4 parcial: comandos preparados de terreno y props

Fecha: 2026-11-14. Base: `3aea6ea8b`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) y los
[comandos preparados de puerta](f-r4-prepared-world-commands-20261114.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

Continúa con [colocaciones preparadas sobre los objetos originales](f-r4-prepared-placement-20261114.md); los cierres globales siguen pendientes.

## Cambio efectivo

La propuesta del canal de terreno graba ahora su paquete de dibujo antes del
efecto físico. El mismo coordinador selecciona temporalmente los objetos
preparados de terreno, bioma y poblados, conserva los objetos/slots sin cambios
y oculta las piezas sustituidas. Restaura padres y visibilidad en `finally`,
antes de cualquier espera. No activa revisiones lógicas, notifica ni retira
recursos para grabar. La escena y el picking conservan su estado confirmado.

Cada propietario describe sus objetos nuevos y sustituidos. No se infiere una
escena nueva ni se clonan los objetos intactos. Los poblados usan sus candidatos
admitidos existentes; los slots de props conservados siguen en sus grupos
originales. La captura rechaza propietarios sin selección, objetos ajenos,
observadores síncronos y callbacks asíncronos; una cancelación o un intento
de commit reentrante restaura la selección antes de liberar los propietarios.

WorldSurface usa su kernel de render, actualiza los pases de sombra y entrega
el paquete al mismo consumidor `prepare-world-frame`. Espera su ACK de uploads.
La respuesta `terrainProposalReady` transporta esa frontera al publicador y al
bridge. La quiescencia común exige entonces ese paquete exacto, también en el
recibo. La confirmación física directa puede adoptar el dibujo mientras el
preparador está bloqueado; la publicación confirmada posterior sigue siendo
propietaria de la adopción lógica de la escena. El handle conserva el bloqueo
del productor hasta que el consumidor acredita el dibujo real. No añade canales,
Workers, dispositivos ni otro coordinador.

El canal sigue aceptando preparadores heredados sin esa prueba para sus usos
anteriores; no se les atribuye la garantía nueva. Una prueba presente con otro
ticket se rechaza. La ruta normal del surface remoto sí devuelve el paquete.

## Apoyos y asignaciones todavía pendientes

No basta cambiar el suelo bajo una entidad conservando su colocación anterior.
Antes de admitir el batch se comparan los apoyos de trabajadores, animales,
cultivos, estructuras y cajas independientes en los chunks propuestos. Si cambian
y ese propietario aún no prepara su colocación, la propuesta falla antes del
efecto físico. Los poblados tienen su selección preparada existente. Las cajas
transportadas siguen el apoyo de su trabajador. Esta protección no convierte
todos los propietarios de contenido en participantes preparados.

Se rechazan también propuestas de terreno con rutas gráficas nativas activas
o preparándose: falta preparar su asignación futura y la retirada/replanificación
correspondiente. Las entradas de ruta y de motor de puerta no pueden competir
con una propuesta de terreno retenida. Estos rechazos son límites explícitos
de disponibilidad; no cierran la integración ordinaria ni la migración.

## Código fuente consultado

- Babylon.js **8.0.0**, [ObjectRenderer.render y _prepareRenderingManager](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Rendering/objectRenderer.ts):
  el pase selecciona una lista de objetos y comprueba su preparación antes de
  entregarlos al rendering manager. [RenderTargetTexture](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Materials/Textures/renderTargetTexture.ts)
  delega esa selección en el mismo object renderer. Se adapta la separación
  entre selección de dibujo y propiedad lógica; no se introduce otro renderer.
- Three **r180**, [Renderer.compileAsync](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js):
  conserva y restaura contexto, renderId y función de objetos al preparar el
  trabajo. Aquí la selección de objetos tiene alcance síncrono y restauración
  obligatoria incluso si la grabación falla. Se mantiene el coordinador y la
  admisión de Three ya instalados, sin dependencias nuevas.

## Evidencia y continuación

El [recibo de validación](performance/native-terrain-commands-validation-20261114.json)
recoge selección, comandos, resultados y hashes de los archivos propios.
Pasan 103 pruebas dirigidas y 1.536 de 1.538 casos en 136 archivos de
regresión; solo fallan los dos casos heredados Carry/Harvest, sin omisiones.
Build aprobado en 45.71s; 308 scripts inline y 18 módulos propios sin errores
de sintaxis. Se reutilizan los binarios WASM exactos; no hay cambios C++ ni ABI.

El [corte en GPU NVIDIA](performance/native-prepared-terrain-cutover-20261114.json)
ejercita C++ y los Workers de producto: retirada/readmisión de chunk,
retirada/restauración de prop y dos revisiones de terreno. En cada caso bloquea
el preparador 1.500 ms después de «listo» y antes del commit. El consumidor
presenta la secuencia preparada del ticket nuevo durante el bloqueo, sin otro
paquete ni factories/forks después de «listo». Conserva el Worker y sus nueve
chunks al terminar, con un personaje original estacionario y drenaje al cerrar.
La retirada del chunk ocupado se rechaza en el preflight nativo, antes de
llegar al guard gráfico, sin cambiar la frontera física. El guard de apoyo se
valida por separado con pruebas unitarias; no se atribuye esa negativa GPU a
un guard que no llegó a ejecutarse.
La comprobación de buffers y mallas intactas sigue en el ensayo de delta del
mismo surface; estas pruebas no certifican ausencia de tirones en una partida.

El entry point QA de continuación anterior usa ahora este corte: con un paquete
preparado retenido ya no se graba el frame de cámara que aquel ensayo intentaba
retener después de «listo». La seguridad de frames obsoletos y uploads retenidos
sigue cubierta por las pruebas del consumidor remoto.

Siguiente dependencia: preparar las colocaciones afectadas de los demás
propietarios y el relevo/asignación nativa de entidades, integrados en la misma
frontera y en el feed ordinario. Siguen pendientes productor/ejecutor de todas
las intenciones, consecuencias, persistencia/restauración y aceptación A/B/C.
El tiempo del fixture permanece en 10; no acredita locomoción autónoma durante
una mutación ni aceptación de todos los formatos, efectos o biomas.
