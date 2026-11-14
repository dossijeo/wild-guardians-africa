# f-R4 parcial: instancias de cultivos preparadas con el terreno

Fecha: 2026-11-14. Base: `6940240ea`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) y las
[colocaciones originales](f-r4-prepared-placement-20261114.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

Continúa con [terreno preparado con asignaciones nativas conservadas](f-r4-retained-native-terrain-20261114.md); los cierres globales siguen pendientes.

## Cambio efectivo

El propietario normal de cultivos participa ahora en el mismo batch de terreno,
props y colocaciones. Prepara matrices, filas, crecimiento, bendición y metadatos
con el apoyo propuesto antes del efecto físico. Reutiliza el batch admitido cuando
cabe: un cambio de altura conserva malla, geometría, material, atributos y arrays.
La baja compacta todos los canales juntos; la readmisión puede reutilizar ese batch.
Solo una capacidad insuficiente o un grupo ausente reserva otro batch, mediante
la fábrica y el registro de recursos existentes. Se prepara oculto y sustituye
al anterior dentro de la misma transacción.

La captura proyecta los bytes sobre los arrays originales y los restaura en
`finally`, junto con count, visibilidad y metadatos. El picking CPU sigue viendo
la colocación confirmada hasta la publicación. El crecimiento normal no se
reconcilia durante esta captura síncrona; el resto del pase usa el renderer,
sombras y materiales de producto. El lector GPU conserva sus generaciones
previas mediante el mecanismo COW ya existente, sin reconstruir la escena.

La preparación espera modelos, puentes y admisiones pendientes del propietario
normal, y admite cancelación. Acredita cada entidad y sus dos alturas; cambios
del estado, selección o propietario invalidan el read set. Las reservas de arrays
se contabilizan en el registro y se liberan al cancelar o retirar. Un fallo de
otro participante restaura filas y propiedad. No se concede tiempo nativo futuro.

## Código fuente consultado y decisiones

- [Babylon 8.0.0, thinInstanceMesh.ts](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Meshes/thinInstanceMesh.ts):
  `thinInstanceBufferUpdated` y `thinInstancePartialBufferUpdate` actualizan el
  buffer existente; `_thinInstanceUpdateBufferSize` separa crecimiento de capacidad
  de actualización. Se adopta esa separación, con nuestra fábrica y admisión.
- [Three r180, InstanceNode.js](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/InstanceNode.js):
  hasta 1.000 matrices usa un BufferNode uniforme y por encima un buffer intercalado;
  ambos retienen el array recibido. Por eso sustituir `.array` sería incorrecto.
  Se conserva su identidad y el uso Dynamic de instanceMatrix para ambos caminos.
- [Attributes.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js),
  [Geometries.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Geometries.js) y
  [WebGPUAttributeUtils.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUAttributeUtils.js):
  el upload depende de versión/uso y de la llamada de render. Los canales de
  crecimiento/bendición usan versión explícita; conservan `needsUpdate` en cada
  escritura real. No requieren el upload automático de Dynamic en cada pase.

No se incorporan dependencias ni otro propietario, planificador o protocolo GPU.

## Validación y límites

Pasan 99 pruebas dirigidas. La selección amplia de 144 archivos registra
1622 casos: 1620 aprobados y los dos fallos heredados Carry/Harvest,
sin cancelaciones ni omisiones. Build aprobado en 46.16s; 308 scripts
inline y los ocho módulos propios pasan sintaxis. Se conservan los binarios WASM
exactos; no hay cambios C++ ni ABI. El [recibo de validación](performance/native-prepared-crop-validation-20261114.json)
registra comandos, selección, referencias y hashes anteriores al lanzamiento GPU.
El [recibo de hardware](performance/native-prepared-crop-instances-20261114.json)
conserva la evidencia de las ocho mutaciones.

El recibo de hardware usa C++ y los Workers, renderer y modelos originales. Añade
tres cultivos vivos en distintas etapas, incluido el puente, a los ocho cortes
de terreno. Bloquea preparación 1.500 ms antes de cada commit físico. El consumidor
presenta el paquete nuevo durante el bloqueo, sin recursos adicionales ni nuevas
copias COW después de «listo»; el cierre espera el drenaje GPU real.

En los dos cambios de altura se observan por separado la captura futura y los
arrays CPU restaurados. Además se copia y lee la matriz GPU de cada binding
detectado del batch original dentro del propio paquete presentado. Las tres
posiciones coinciden con lo preparado y con el apoyo C++ confirmado a 5e-5 m.
Las dos áreas de readback son instrumentación QA, reservadas antes de esos dos
cambios, y no forman parte del mecanismo de producto. Sus copias son de una sola
ejecución, no de cada repetición del paquete. No hay lectura GPU en gameplay.

La lectura de hardware ejercita el camino uniforme de InstanceNode (batches
pequeños). La conservación del array y de Dynamic mantiene el contrato de su
camino de atributos para más de 1.000 matrices; no se declara validación de ese
tamaño en hardware. Las pruebas de capacidad verifican preparación, cancelación
y retiro, sin atribuirles cobertura de píxeles.

Esto amplía el dominio preparado de cultivos, no cierra f-R4 ni acredita ausencia
de tirones en una partida. Siguen pendientes personajes y asignaciones/retiros
nativos afectados por terreno, los demás dependientes, alimentación y ejecución
ordinarias, todas las intenciones, consecuencias y persistencia. Se mantienen las
protecciones de apoyo y de rutas nativas. Continúa por esas dependencias dentro
del mismo plan A → B → C → D.
