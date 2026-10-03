# Carga de contratos pagados y cajas transportadas

Cobertura `8827dda`, QA-146 y QA-147. El commit añade pruebas sin modificar
el juego. [44 pruebas dirigidas](qa/paid-reload/directed.txt), cero fallos ni
omisiones, 1.087,3885 ms: continuación nueva, rigs/acciones nativas, VFX de trabajo,
contratos, cajas e identidad/errores de guardado.

## Preparación y comparación

Los cuatro perfiles se contratan por las operaciones reales del juego. Hay
centro/semilla pagados, crédito explícito de QA y postcampaña sin incursiones.
Se crea un segundo centro después de contratar, para comprobar que cargar no
redistribuye el contrato vigente. Navigation es de producción con terreno
preparado plano, sin props; no se acredita navegación de los biomas originales.

La planta se desarrolla mediante desplazamiento y cuidado físico de Game.tick;
no se establece su madurez manualmente. Cada guardado atraviesa SaveRepository
save/load sobre un almacenamiento en memoria y reconstruye una Navigation nueva.
Antes de continuar, el snapshot cargado es idéntico byte por byte al original.

Luego se avanza la partida original y la cargada con los mismos intervalos.
Se comparan todos los campos persistidos, incluidas posiciones, rutas, acciones,
reservas, fases, ledger, RNG y comandos. Sólo se excluye `worker.pathVersion`
en esta comparación posterior: es la época de caché de navegación, que reinicia
al crear una Navigation. No se excluye el camino ni ningún resultado del dominio.
También coincide el resultado de workerPose, incluido el tiempo del clip nativo.

## QA-146: cuidado inicial y contratos

Se guarda durante el primer trabajo combinado, 0,4 s después de entrar en acción.
Tarea, reserva y centro asignado se conservan al cargar. Una nueva orden de
contratación del mismo día devuelve false y no modifica saldo ni contratos.

Después de continuar diez segundos, ambas partidas tienen un único riego inicial
satisfecho, una contratación y un trabajador que sigue en el primer centro.
No se cobra el agua ni otra jornada, ni se mueve el empleado al centro añadido.
Esto se comprueba para mayores/jóvenes y ambos sexos.

## QA-147: caja y entrega

El trabajador madura y recoge físicamente un mijo. Se prepara Suelo fértil al
30 % y se activa Multiplicar cuando el trabajador ya está recogiendo. Se guarda
0,2 s después de empezar el transporte, con una caja impagada y un portador.

La recarga conserva origen de cultivo, especie, perfil que recogió, carrierId,
crateId, valor, posición y fase Carry_Crate. Hombres: 702/25 monedas de valor
(28,08); mujeres: 117/5 (23,4). El saldo entero no sube al cargar o crear la caja.

Tras cuarenta segundos, ambas partidas han entregado una única caja y la magia
ya expiró. Se paga una sola vez: 29 monedas para hombres y 24 para mujeres,
según el redondeo hacia arriba aprobado. Un CropPicked, un CrateDelivered y una
entrada deliver. Guardar/cargar de nuevo y continuar otros cinco segundos no
crea otra caja ni otro ingreso.

Las pruebas existentes de worker-actions cargan los rigs reales y aplican sus
clips con Three, sin decodificar las texturas en Node. Esta nueva continuación
compara fase y dominio; no añade capturas WebGL ni afirma renderizar aquí la
recreación de todos los trabajadores en todos los biomas.

El CI completo de esta nueva cobertura sigue pendiente de comprobación. Build y
paquete de la lógica sin cambios están en [QA de autoguardado](qa-autosave-events.md);
no se repite un build para un commit que sólo añade pruebas.
