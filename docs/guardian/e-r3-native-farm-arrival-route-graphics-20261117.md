# Farm23 en el actor y banco originales de trabajadores

Continúa el [cliente/Host de llegada](e-r3-native-farm-arrival-route-remote-20261117.md) según el [plan principal](integrated-gpu-migration-plan-20261104.md). El roster ya prepara y adopta Farm23 sobre el actor cargado. Se conservan su raíz, mallas, geometrías e índices; se preparan únicamente la variante de movimiento y sus recursos asociados. WorldSurface y la capacidad del draw Worker siguen pendientes de conectar y validar. Game/productor ordinarios permanecen cerrados; A6/A/B/C abiertos, D sin iniciar.

## Código consultado y decisión

Antes de implementar se inspeccionan las implementaciones reales de Three r180: [`Mesh.copy`](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L110) comparte la geometría del objeto fuente, mientras [`SkeletonUtils.clone`](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388) clona el esqueleto y remapea los huesos a los nodos clonados. Las copias oficiales consultadas coinciden por SHA-256 con la versión instalada. Sus hashes constan en la evidencia.

El banco original ya resuelve la construcción inicial del actor. La llegada se incorpora al preparador compartido de movimiento y a sus variantes de materiales, activación, rollback y retirada bajo el fence existente. No se solicita otro modelo al banco ni se clona otra raíz para cada intención. No se introduce dependencia, registro, reloj, cola o mecanismo de preparación paralelo.

## Implementación

`prepareNativeFarmArrivalProposal` usa el programa nativo23 y el terreno existente. Exige un trabajador realmente `arriving`, sin adquisición nativa previa, con perfil, centro, contrato, pose y destino de servicio correspondientes a la petición. El endpoint seleccionado por el corredor sigue siendo el emitido por la fuente; no se confunde con el servicio del centro. No se fabrica una historia Task/Home/Idle para aprovechar sus preparadores.

La preparación usa los bancos originales Walk/Run/Idle y el mismo actor. El cuerpo físico y la petición nativa permanecen pendientes hasta el commit de la fuente. Activación y rollback intercambian las variantes preparadas; la cancelación o retirada del trabajador libera el candidato. El retarget no publicado conserva actor y recurso de movimiento y devuelve el contrato booleano del preparador compartido.

La finalización exige el recurso23 comprometido y su asociación nativa exacta, incluyendo la igualdad entre el recibo de recursos y el binding recibido. Instala el origen de ejecución real y sella el movimiento antes de retirar los propietarios previos mediante el mecanismo existente. Una adquisición física ya realizada no se presenta como revertida cuando falla una validación gráfica posterior.

## Validación y límites

La [evidencia reproducible](performance/native-farm-arrival-route-graphics-validation-20261117.json) registra las 17 pruebas nuevas, regresión compartida, build, referencias y hashes. Las pruebas cargan los GLB y bakes publicados reales, terreno y motor nativos. Cubren los cuatro perfiles andando/corriendo, adopción tardía, cancelación, retirada, fuente/centro incorrectos, asociación alterada, retarget, llegada cero y pthread. Cada preparación conserva una única adquisición del banco y las identidades originales de raíz, geometrías e índices. El picking usa los cuerpos originales a posiciones nativas; los programas TSL de color y sombra se compilan sobre las mallas y materiales auténticos y transportan el reloj Farm tipado.

El renderer, la admisión de pipelines y las retiradas diferidas del fixture son dobles; el builder de shaders no envía trabajo a un dispositivo. El commit físico del helper usa la ABI nativa confiada y su frontera real, **no un recibo GPU inventado**. El reloj de picking es explícito del componente, no una imagen enviada por hardware. Esta evidencia no certifica todavía WorldSurface, los dos puertos con Workers reales ni continuidad gráfica integrada.

Un loader ESM de sólo lectura elimina únicamente la comparación del destino de servicio contra el centro real del estado confirmado. El caso con una fuente alterada deja de rechazarse y falla. No modifica el árbol de código ni los WASM. La regresión final se ejecuta con el código íntegro; el fallo intencionado del control negativo no forma parte de sus resultados.

Los 64 inputs/artefactos nativos y los 16 archivos locales ajenos permanecen exactos, sin recompilar C++. No se repite hardware. La reutilización acreditada aquí se limita al actor/banco del roster; no acredita recuperación incremental integral de los 3.123 recursos ni ausencia de tirones. El máximo global histórico de 66,72 ms y la subida tardía de 17,66 ms siguen abiertos.

Se continúa con WorldSurface y el paquete retenido de ambos puertos, antes de anunciar la capacidad del draw Worker y medir hardware. Después quedan relevos durante movimiento y finales Idle/Task/Home, alternativas/cohort, prioridad Task original incluso al madurar cultivos durante el tick, contratos/puertas/raid, productor integral, guardado UI y recuperación incremental completa, según el orden A/A6 → B1–B7 → C.
