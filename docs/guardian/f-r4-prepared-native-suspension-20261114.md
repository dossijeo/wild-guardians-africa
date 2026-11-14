# f-R4 parcial: cuerpo y puerta suspendidos antes del cambio de mundo

Fecha: 2026-11-14. Base: `bd93105c2`. Rama: `codex/guardian-3d-animation`.
Continúa la [autoridad del cuerpo suspendido](f-r4-native-suspended-body-control-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Los once padres A6 y e-R3/e-R4/f-R4 siguen abiertos.

Continúa con [propuesta nativa de reanudación](f-r4-native-resume-proposal-20261114.md); su admisión gráfica sigue pendiente.

## Cambio efectivo

Las consecuencias de parada de la propuesta nativa cruzan ahora el canal de
terreno existente. Se copian y se cargan a su reserva de bytes. El surface, roster
y coordinador preparan los materiales de un trabajador suspendible y la apertura
fija de sus puertas en la misma transacción de terreno/bioma/objetos. El preparador
graba el paquete futuro y restaura materiales y selección visibles antes de ceder
el control. Se conserva la quiescencia y la confirmación directa de cuerpos del
incremento anterior; el paquete preparado no autoriza su propio dibujo.

La presentación suspendida retiene la misma textura inmutable de ruta y una
única entrada de memoria en el registro. Cada presentación suelta su referencia
después del drenaje existente. No copia la textura, reconstruye el rig ni sube
otra polilínea. La pose y fases ejecutadas son parámetros uniformes; una rama
común evita recorrer la tabla cuando el cuerpo está detenido. Idle puede seguir
con tiempo C++ después del final de la ruta retirada; las fases de locomoción y
Carry permanecen fijas. Su amplio límite de residencia no concede tiempo futuro.

El apoyo del cuerpo fijado utiliza el punto ejecutado y el comprobador de los
triángulos existente. No depende del terreno del sufijo retirado ni de las
coordenadas JS antiguas del trabajador. El dominio de este incremento conserva
ese triángulo de apoyo. Los participantes comprueban su geometría, arrays,
versiones y época; los cambios al apoyo actual siguen rechazándose.

Los tickets de admisión pueden comprobar, con opción explícita del publicador
atómico, el conjunto exacto de materiales que ya compilaron. Mantienen la
comparación de geometría, atributos, otros materiales, iluminación, padres y
pases. Sus comprobaciones ordinarias conservan el estado anterior. Esto permite
validar después del attach sin exigir que vuelva a estar instalado el material
que el mismo commit acaba de sustituir.

Un release tardío de la asignación retirada no desmonta el cuerpo suspendido.
La adopción lógica conserva el roster y su pose GPU; una revocación posterior
del cuerpo deja de autorizar nuevos dibujos por el control directo existente.

## Código consultado y decisiones

- [Babylon 8.0.0, InternalTexture](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Materials/Textures/internalTexture.ts):
  `incrementReferences` y `dispose` conservan un recurso hasta su última
  referencia. Se adapta ese patrón a una textura ya registrada, sin registrar
  otra copia ni añadir Babylon como dependencia.
- [Three r180, RenderObject](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObject.js):
  claves de material y contexto dinámico separan contenido uniforme y estructura.
  Se mantienen programas iguales y se compara el conjunto preparado exacto al
  publicar; no se introduce otra caché de programas.
- [Recast 1.6.0, RecastRasterization.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/Recast/Source/RecastRasterization.cpp):
  `dividePoly` comparte la intersección entre ambas salidas y conserva vértices
  ya existentes; `rasterizeTri` corta por planos de la cuadrícula. Se aplica ese
  criterio al comprobador existente: una intersección compartida conserva su
  coordenada de plano y los extremos/tiempos nativos exactos. Evita que un corte
  z=24 se reconstruya como 23,999999999999996 y consulte el chunk incorrecto.
  No se añade un epsilon a alturas ni se omite su comprobación.

La arquitectura, los bancos, el coordinador, la preparación de material y los
fences son los existentes del repositorio. No se añaden dependencias.

## Validación

Pasan 224 pruebas dirigidas. La selección amplia de 147 archivos registra
1.658 casos: 1.656 aprobados y los dos fallos heredados Carry/Harvest, sin
omisiones ni cancelaciones. El archivo de soporte geométrico se incluye en
las dirigidas, fuera de la selección amplia heredada. Build aprobado en
44.84s; 308 scripts inline de 366 HTML y los 22 módulos propios
pasan sintaxis. No cambian los binarios WASM. El
[recibo de validación](performance/native-suspended-world-cutover-validation-20261114.json)
registra selecciones, comandos y hashes anteriores al ensayo final. El
[recibo GPU](performance/native-worker-world-owner-suspended-terrain-20261114.json) conserva las fronteras y referencias enviadas.

La prueba GPU usa WorldClient → WorldWorker → WorldSurface → roster y
coordinador ordinarios, con autoridad C++ controlada por la fixture. Retira un
chunk del tramo futuro mientras el trabajador original espera la apertura de
su puerta. Prepara cuerpo y puerta antes del efecto, bloquea el preparador
1.500 ms y confirma la retirada durante el bloqueo. El dibujante reproduce el
paquete nuevo sin otra intervención del preparador. El reloj ejecutado C++ se
adelanta después al final de la ruta retirada y lo supera; el cuerpo permanece
fijado, la selección normal lo encuentra y la puerta conserva la apertura C++.
Los snapshots JS no transportan posiciones periódicas del cuerpo.

El ensayo final NVIDIA Turing registra 45 fotogramas del mundo nuevo durante
el bloqueo; el reloj enviado va de 57.896297 a 59.056297, después del
final retirado 56.896297. Solo se preparan 68 recursos nuevos: 36 buffers,
16 bind groups y 16 layouts. Cero texturas, samplers, módulos shader o pipelines
nuevos. Después de la señal de preparado no hay creaciones ni forks adicionales.
La selección acierta el trabajador original y el cierre espera el drenaje real.

Las imágenes de [dibujo bloqueado](performance/native-worker-world-owner-suspended-terrain-20261114-suspended-blocked.png)
y [adopción confirmada](performance/native-worker-world-owner-suspended-terrain-20261114-suspended-confirmed.png)
permiten ver al trabajador y puerta originales. No se afirma que sean un
readback de vértices: las pruebas unitarias contrastan los parámetros y el
muestreo GPU, y el recibo recoge reloj, referencias realmente enviadas, selección,
conservación de geometría y ausencia de preparación posterior.

## Pendiente

Este caso de hardware suspende el cuerpo durante una espera inicial; no acredita
por sí solo una transición visible caminando → Idle, Carry suspendido, varios
trabajadores, cualquier acción o cualquier apoyo. Se rechazan efectos NeedsPlan,
actores sin presentación nativa coincidente, apoyos alterados y motores sin
una consecuencia gráfica conocida. Cancelar/restaurar participantes se prueba
en componentes, sin atribuirle aceptación integrada de fallos del producto.

Quedan reanudación/asignación preparada antes del movimiento, transiciones y
acciones/consecuencias restantes, alimentación y ejecución ordinarias de todas
las intenciones, persistencia y aceptación integrada. No se cierra f-R4 ni A/B/C.
