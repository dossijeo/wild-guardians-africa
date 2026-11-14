# f-R4 parcial: colocaciones preparadas sobre los objetos originales

Fecha: 2026-11-14. Base: `39555b89f`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) y los
[comandos preparados de terreno](f-r4-prepared-terrain-commands-20261114.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

Continúa con [instancias de cultivos preparadas con el terreno](f-r4-prepared-crop-instances-20261114.md); los cierres globales siguen pendientes.

## Cambio efectivo

Los centros, muros sin puerta y cajas independientes preparan ahora su posición
y visibilidad con el terreno propuesto, sobre los mismos grupos, geometrías,
materiales y leases ya admitidos. No se reconstruye el modelo para cambiar su
altura. Si desaparece el apoyo, se prepara la ocultación y se conserva el objeto
para una readmisión posterior. Solo se crea el participante cuando cambia el apoyo.

El coordinador existente admite colocaciones locales en la selección del pase.
Las aplica antes de grabar el paquete y restaura posición y matrices mundiales
de los descendientes en `finally`. La escena CPU y el picking conservan así su
colocación confirmada hasta la publicación. Un callback que sobrescribe la
posición propuesta invalida la captura antes del efecto físico.

El participante comparte las fases de activación, attach, finalización, rollback
y retiro del mismo batch. Revalida propietario, entidad, padre, posición,
orientación y escala. Cancelar no libera la malla ni su banco. El rollback de un
batch fallido restaura también las matrices usadas por raycast; una reserva ya
retirada no puede deshacer una colocación publicada.

Cada participante acredita la entidad original y su transición concreta de apoyo
anterior/propuesto. El guard existente solo acepta esa cobertura si el propietario
sigue vigente y coinciden entidad, coordenadas y alturas; un ID igual en otro
objeto o una altura diferente no bastan. Los dependientes se preparan antes de
comprobar la cobertura completa; si queda una entidad sin preparar, se cancelan
también las reservas ya obtenidas, sin activar el batch ni cambiar la física.

La procedencia de cosecha de una caja puede referirse a una planta ya cosechada.
Ese historial y las cajas entregadas no necesitan colocaciones: esos objetos no
están en el roster dibujado. Se conserva la validación de procedencia del snapshot.

## Código fuente consultado

- Godot **4.5.1-stable**, [RendererSceneCull::instance_set_transform](https://github.com/godotengine/godot/blob/4.5.1-stable/servers/rendering/renderer_scene_cull.cpp):
  descarta transformaciones idénticas, valida valores finitos y marca la instancia
  para actualizar límites sin sustituir su geometría. Se adapta la separación
  entre recurso admitido y colocación mutable al propietario y batch existentes.
- Three **r180**, [ModelNode.update](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/ModelNode.js)
  y [Object3DNode.update](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/Object3DNode.js):
  el objeto del frame proporciona `matrixWorld` al uniforme del modelo. Por eso
  se actualizan las matrices antes de grabar y al restaurar, conservando los
  mismos materiales. La versión de uniformes y su fence siguen en el consumidor
  remoto ya implementado; no se añaden dependencias ni otro mecanismo de envío.

## Evidencia y límites

[Recibo de validación](performance/native-prepared-placement-validation-20261114.json).
Pasan 93 pruebas dirigidas. La selección amplia de 139 archivos registra 1.566
casos: 1.564 aprobados, los dos fallos heredados Carry/Harvest y cero omisiones.
El caso adicional de readmisión se incluye en los 93 dirigidos finales, sin
sumarlo al recuento amplio. Build aprobado en 43.24s; 308 scripts inline y
15 módulos propios sin errores de sintaxis. Se reutilizan los binarios WASM
exactos; no hay cambios C++ ni ABI.
Las pruebas cubren preparación sin efecto, matrices de selección, cancelación,
propietario sustituido, readmisión, ocultación, fallo después de finalizar otro
participante y conservación del modelo/banco de cajas.

El [recibo NVIDIA con C++ y Workers de producto](performance/native-prepared-placements-20261114.json)
añade un centro dañado, un muro y una caja originales al corte de terreno.
Realiza ocho mutaciones y bloquea el preparador 1.500 ms antes de cada commit.
En las dos revisiones que cambian el apoyo, los tres objetos conservan sus IDs,
geometrías y materiales. El renderer graba la altura propuesta mientras la escena
CPU mantiene la anterior. El consumidor presenta exactamente ese paquete durante
el bloqueo, sin otra preparación ni recursos persistentes nuevos después de «listo».

Las alturas de centro/muro/caja pasan de aproximadamente 14,293/14,524/14,408 a
14,973 m y vuelven después a sus valores originales. Tras confirmar se comparan
con el muestreo C++ y las colocaciones adoptadas con tolerancia de 3e-5 m, acorde
con los datos Float32. La prueba distingue matrices grabadas, escena CPU, secuencia
GPU y terreno nativo; no es una comparación automática de siluetas en píxeles.
El cierre espera el drenaje real del consumidor.

El fixture QA conserva ahora el error original si falla la limpieza. La observación
de posiciones se identifica por objeto de Three: un wrapper y su pared hija pueden
compartir legítimamente el ID de entidad. No se modifica ese contrato de producto.

Quedan sin preparar cambios de apoyo en cultivos vivos y personajes, las nuevas
asignaciones/retiros de rutas nativas y los demás dependientes de terreno. Sus
protecciones siguen activas; no se amplía el dominio físico de las puertas.
El participante de colocación actual exige grupos admitidos, padre Scene y matrices
automáticas. El ensayo usa Desierto, tiempo nativo 10 y un trabajador estacionario;
no acredita todos los biomas/efectos, locomoción durante la mutación, productor y
ejecutor ordinarios, consecuencias, guardado/restauración ni ausencia de tirones.

Siguiente dependencia: preparar los datos de instancia de cultivos y las
asignaciones nativas afectadas, en esta misma transacción y con el feed ordinario.
La aceptación A/B/C y los cierres globales siguen pendientes.
