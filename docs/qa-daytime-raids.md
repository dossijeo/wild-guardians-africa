# Candidato diurno y calendario independiente

Base `854a03a`. [Aceptación](../tests/acceptance-daytime-raids.test.js):
70 escenarios; [salida conjunta](qa/daytime-raids/directed.txt): **94/94**, cero
fallos, cancelaciones u omisiones, 5.643,0988 ms, con planificación y navegación.
Estas pruebas no modifican el runtime ni requieren una nueva build.

## QA-102

Sesenta casos combinan cinco culturas, cuatro semillas y tres momentos de
cruce. Se pagan el centro y todos los cultivos mediante comandos reales:
41 plátanos más algodón producen exactamente 10.000 de atracción; 41 plátanos,
cuatro girasoles, dos sorgos y mijo producen exactamente 9.999. Plantar otro
mijo cruza a 10.008. No se asigna directamente el valor de atracción.

PlanDay genera su candidato real entre 115/2,4 y 535/2,4 segundos. Game.tick
alcanza el instante anterior y cruza el candidato: se evalúan exactamente
10.000, el cruce justo antes, o el cruce posterior. Se comprueba el resultado
contra el siguiente valor del PRNG y el umbral 0,1. Las semillas 1 y 4 aceptan;
712 y 123456789 rechazan. Una atracción de 9.999 no consume la tirada de ataque.
Cruzar el umbral después no vuelve a evaluar el candidato, ni siquiera al
continuar toda la tarde hasta el segundo 299. Un rechazo por probabilidad
consume una sola tirada y no vuelve a intentarlo.

SaveRepository y Navigation nuevas cargan justo antes del candidato. Tras
cruzarlo, las instantáneas completas coinciden, incluyendo RNG, composición,
presupuestos, posiciones y versión de navegación. Los ataques aceptados son
diurnos y sus composiciones respetan la ocupación de amenaza legal; el oracle
exhaustivo de composiciones de la suite complementaria cubre cada presupuesto.

## QA-103

Diez escenarios (semillas 1 y 4 por las cinco culturas) sufren un ataque diurno
real, completan su navegación, daño y salida, y alcanzan la noche mediante el
reloj. La planificación nocturna usa la atracción viva resultante del ataque;
no se fuerza su probabilidad, instante ni composición. En ambos seeds ocurre
también una incursión nocturna con identidad diferente y daytime=false.

Se guarda después de planificar la noche. La carga reproduce el inicio nocturno
con igualdad completa y sin repetir el ataque diurno. Ambas incursiones salen
físicamente: dos RaidSpawned, dos RaidEnded y un NightStarted en el mismo día 3,
sin derrota y sin modificar manualmente los planes entre ambos eventos.

Los fixtures tienen crédito explícito de 20.000 monedas, terreno plano sin props,
bounds de 96 m y ningún trabajador. Se utilizan footprints culturales y Navigation
de producción; no acredita todas las obstrucciones de biomas ni rendimiento WebGL.

## Desviación pendiente en QA-096

La revisión de la sección 13.7 del plan descubre un alcance aún no implementado:
los conjuntos defensivos deben competir por valor agregado y reservarse como
conjunto. Actualmente targetFor reserva cada muro como structure:id.
Un centro pagado y una cadena adobe pagada de cinco piezas, con tres facóqueros
explícitos y movimiento nativo, producen simultáneamente dos objetivos de esa
misma cadena (structure-3 y structure-4). Las piezas son distintas, pero no hay
exclusividad de conjunto. QA-096 sigue pendiente de corregir y probar; este
informe no considera suficiente la exclusividad de IDs individuales.
