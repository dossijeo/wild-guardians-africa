# Regreso físico y reconstrucción de necesidades

Base comprobada: `1ddee01`. [Suite nueva](../tests/acceptance-raid-return.test.js):
veinte escenarios, cuatro necesidades en cada una de las cinco culturas.
[Salida conjunta](qa/raid-return/directed.txt): **63/63**, cero fallos,
cancelaciones u omisiones, 4.261,315 ms. Incluye incursiones guardadas,
reparaciones y reparto/retorno laboral. No se suman repeticiones anteriores.

## QA-104

Se construyen y pagan un centro cultural nativo y una muralla, se contratan dos
trabajadoras mayores, y se paga un mijo. Las condiciones de siembra, checkpoint
de agua, madurez, solicitud de cosecha y transporte se alcanzan mediante
Game.tick y acciones legales; no se fuerzan crecimiento, agua, poses ni tareas.
En el escenario de riego, el siguiente checkpoint se alcanza durante el ataque;
en el de cajas, la incursión interrumpe un transporte real y deja su caja suelta.

La composición explícita de un facóquero y seis plátanos pagados de mayor valor
permiten que el mijo sobreviva. El animal selecciona y destruye los plátanos con
su presupuesto real, lo agota y sale físicamente. No se fuerza objetivo, cupos,
animación ni retirada. El crédito inicial de 10.000 monedas y terreno plano sin
props son condiciones de QA. Navigation, footprints culturales y colisiones de
estructuras son de producción; se comprueba cada segmento de desplazamiento de
trabajadores. Esto no acredita probabilidades naturales ni escenas de biomas.

Una reparación solicitada sobre daño preparado de 30 puntos se cancela al
empezar la incursión. No se aplica ni se cobra durante el ataque o el regreso,
ni reaparece tras reconstruir las colas o cargar.

Al salir el último animal se verifica un RaidEnded, reservas vacías, ausencia de
derrota, mismo personal y contratación, y regreso físico al centro. No se ha
completado trabajo agrícola durante la huida. Existe exactamente una tarea
sin propietario para la necesidad viva original y ninguna tarea duplicada por
tipo/objetivo en la cola reconstruida. La orden lógica de cosecha persiste; la
caja interrumpida carece de transportista hasta que se vuelve a recoger.

Se guarda en SaveRepository mientras el personal regresa y se carga con una
Navigation nueva. Sin reconstrucciones manuales de colas ni teletransportes,
las trabajadoras alcanzan y completan la tarea: un riego, una cosecha y entrega,
o recogida y entrega de la caja original, según el escenario. La entrega tiene
una sola entrada económica y no se paga otra contratación. Para la siembra,
el crecimiento permanece en cero hasta completar su trabajo inicial y empieza
en el paso siguiente; no se exige crecimiento dentro del mismo paso del riego.

El [informe de carga de incursiones](qa-raid-reload.md) complementa estas pruebas
con 150 finales, aviso original game_attack_over solicitado una sola vez y sin
repetición del historial al cargar. Se cierra QA-104 en su comportamiento lógico
y despacho sonoro; no se reclama una nueva escucha ni inspección WebGL en este
turno. Son pruebas de aceptación, sin modificaciones del runtime ni nueva build.
