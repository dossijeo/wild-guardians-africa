# Reservas, paseos y trabajadores desplazados

Cobertura final `04691f2`, 3 de octubre de 2026. Casos QA-047/048,
QA-053/054/055 y QA-060/061 del Plan Maestro. No se modifica gameplay.

[acceptance-worker-routing.test.js](../tests/acceptance-worker-routing.test.js)
usa Game y Navigation de producción, con terreno explícitamente plano, sin props,
región residente de dos chunks de lado y crédito inicial de QA. Los trabajadores
se contratan pagando sus perfiles, caminan desde el poblado, llegan a su centro
y completan acciones; el test no asigna sus coordenadas ni falsifica recogidas,
entregas o final de incursión. No acredita terrenos procedurales ni rendimiento.

## QA-047/048: tareas y propietario único

Dos trabajadores pagados producen posiciones distintas mediante sus paseos
reales. Dos órdenes de plantar generan una tarea antigua y otra nueva: la antigua
se reserva al trabajador libre más cercano, y la nueva al otro. Se comprueban
ambos enlaces task.workerId/worker.taskId. Evaluar repetidamente las reservas
no modifica el estado ni crea un segundo propietario. Ambos completan su primer
riego físico exactamente una vez.

Se cultiva hasta madurar y se cosecha mediante acción real. La caja tiene un
único portador; reconstruir colas no genera tarea de caja mientras está portada.
La API nativa dropCarriedCrate interrumpe ese transporte, deja la caja en su posición
actual y genera su necesidad de recogida. Los dos trabajadores pueden evaluarla,
pero sólo uno recibe la reserva y luego la carga. Las evaluaciones repetidas no
cambian la adjudicación. Al final hay una sola entrega y un solo ingreso deliver.
No se simulan hilos concurrentes: se prueba la reserva atómica del modelo
secuencial real del juego.

## QA-060/061: los cuatro perfiles

Una persona pagada de cada perfil entra físicamente, alterna Idle/Alert y sale
a un paseo mediante Walk_Skip de su catálogo nativo. Cada paso permanece a
velocidad de caminar, sin carrera; la ruta está dentro de ocho metros del centro.
El paseo usa su RNG independiente y no consume el RNG de eventos/ataques.

Una orden real de plantar durante el paseo lo cancela antes de otro paso ambiental:
la posición queda exactamente igual, se conserva el presupuesto de carrera y se
reserva la tarea. El siguiente movimiento comienza desde esa posición y respeta
la velocidad calibrada. Después completa el primer riego una sola vez. Los nombres
y fases se calculan mediante workerPose; no se afirma una nueva captura WebGL
de los cuatro rigs, cuya carga/acciones se prueban por separado.

## QA-053: centro superviviente del mismo poblado

Por cada una de las cinco culturas, cuatro personas pagadas llegan a dos centros.
Se prepara la pérdida del primero mediante hitStructure: sus 1.000 puntos de daño
inician el colapso nativo. Es una condición controlada, no una atribución de esos
daños al facóquero posterior. Se inicia una incursión explícita de facóquero;
huida, animaciones, golpes, navegación y retiro se ejecutan sin modificar al animal.

Al salir, los desplazados se reasignan al centro local superviviente según sus
vacantes. El personal residente conserva el centro, el libro monetario queda
idéntico y sólo existe la contratación original. Se conservan los IDs y contractDay.
Repetir recoverDisplacedWorkers no duplica eventos ni mueve posiciones. Todos
regresan por navegación y quedan disponibles. Construir entonces otro centro
vacío cuesta 800, pero no mueve a los empleados ya asignados del superviviente.

## QA-054/055: volver al poblado y recuperar el contrato

Las cinco culturas también pierden su único centro local. Tras la salida física
del animal, los trabajadores conservan displacedDay y regresan caminando/corriendo
al poblado, hasta home en su entrada original. Guardar/cargar mantiene los mismos
IDs de trabajador y persona. Comprar un sustituto por 800 recupera a esos mismos
empleados, con el mismo día de contrato, sin pagar otra jornada; llegan físicamente
al nuevo centro. La contratación original y los eventos de reasignación no se duplican.

Otro ensayo por cultura prepara un segundo poblado y le construye un centro
transitable. La pérdida del único centro local no envía empleados a ese destino
ajeno aunque siga operativo: mantienen su poblado, llegan a home en su entrada
y no se emite ninguna reasignación. El segundo poblado es una condición explícita
para comprobar localidad, no una campaña natural donde expansión postgame y ataques
convivan. Las exclusiones por lesión, jornada acabada y contrato expirado tienen
además cobertura dirigida en displaced-workers/contracts.

## Validación y alcance

[Suite dirigida](qa/worker-routing/directed.txt): **66/66**, cero fallos,
cancelaciones u omisiones, 4.841,1621 ms; incluye reparto laboral, contratos,
guardados pagados, paseos y desplazados. Tras añadir la protección del personal
normal al construir otro centro y la caja interrumpida, [cobertura final](qa/worker-routing/targeted-final.txt):
**20/20**, cero fallos/cancelaciones/omisiones, 1.648,272 ms. No se suman ambas
salidas como pruebas distintas. La nueva CI de `04691f2` sigue en curso.

La CI económica anterior `85d89d8` terminó correctamente: **876/876**, cero fallos,
398.285,452411 ms, verificaciones, build y paquete web aprobados.
[Log](qa/economic-boundaries/ci-log.txt), [estado](qa/economic-boundaries/ci.json).
Estas pruebas no cierran la auditoría global: presentación de lesiones, VFX,
UI, audio, postgame y otros casos conservan su estado independiente.
