# Límites económicos y prioridad de la última incursión

Pruebas `85d89d8`, 3 de octubre de 2026. Se mantienen las reglas D141 y
los mínimos de la sección 17.2 del Plan Maestro, además de la prioridad C07
confirmada por el usuario. No se cambia balance ni lógica de producción.

[acceptance-economic-boundaries.test.js](../tests/acceptance-economic-boundaries.test.js)
usa Game, SaveRepository y Navigation reales. El terreno es explícitamente plano,
sin props, con región residente de un chunk. Las fincas se financian inicialmente
para comprar el centro y las semillas; después se fija el saldo del límite que
se desea comprobar. No demuestra colocación en terreno procedural ni equilibrio
de una campaña natural. Los ataques tienen un grupo Rhino preparado, sin cambiar
golpes, posición, animación o retiro: no acredita que la tirada natural de una
finca vacía seleccione ese animal.

## QA-129/130: 799 y 800 al terminar el ataque

Las cinco culturas sufren el ataque físico al único centro. Sus golpes reales
lo dejan sin operatividad, y el animal se retira al no quedar un objetivo válido
y sale por navegación.
Con 799, RaidEnded precede a un único GameOver inmediato; guardar/cargar conserva
la derrota y el reloj bloqueado. Con 800, el ataque no causa esa derrota.
Durante la noche, construir un sustituto se rechaza sin mutación ni cobro; al
llegar al siguiente amanecer, la finca vacía pierde por no disponer de 905.

Otro ensayo por cultura termina el grupo explícito durante el día. Con 800
se puede comprar un centro de sustitución por 800, sin una segunda contratación
ni GameOver inmediato. Se prueba el permiso a esa hora, no la tirada diurna del
10 %. Un centro en caída ya no es operativo; no se exige esperar a que acabe
su presentación para evaluar la pérdida del último centro, conforme a D141.

## QA-131: mínimos al amanecer

**225 combinaciones:** cinco culturas × tres estados de centro (intacto,
en caída, ruina) × cinco recursos (ninguno, planta viva, planta muerta, caja
recuperable, caja entregada) × saldo mínimo−1/mínimo/mínimo+1.

| Infraestructura y recursos | Mínimo aprobado |
| --- | ---: |
| Centro operativo, recurso vivo o caja recuperable | 100 |
| Centro operativo, sin recursos | 105 |
| Sin centro operativo, recurso vivo o caja recuperable | 900 |
| Sin centro operativo, sin recursos | 905 |

Cada estado se guarda/carga antes de cruzar el amanecer, y ambas continuaciones
son idénticas. Por debajo del mínimo hay un único GameOver y no se abre contratación.
En el mínimo o por encima se abre contratación y el saldo queda intacto. Plantas
muertas, cajas entregadas y centros en caída no abaratan el umbral.

## QA-132: selección cara recordada

Con un cultivo vivo y 100 monedas se abre contratación aunque la selección
recordada sea más cara. Intentar pagarla falla sin cambiar el estado. Tras cargar,
elegir una trabajadora mayor cuesta exactamente 100, produce un contrato y
permite continuar; repetir la contratación no cobra ni duplica.
Se acredita el dominio. **Parcial:** falta probar específicamente el ajuste de
esa selección recordada en el diálogo real; no se da por visto con esta prueba Node.

## QA-133: riesgo real del cultivo lento

Finca de postcampaña sin ataques/eventos, una semilla de plátano ya pagada,
centro operativo y saldo inicial 100. Contratar a una trabajadora mayor agota
el saldo. La trabajadora camina y completa el cuidado real; no se teletransporta
ni se simula una entrega. En el siguiente amanecer el progreso es
**262,10 de 570 segundos de luz**, con tres riegos manuales completados,
cero cajas y saldo cero: GameOver antes de obtener ingresos.

Este contraejemplo demuestra que el mínimo aprobado admite iniciar la jornada
pero **no garantiza solvencia hasta cosechar un cultivo lento**. No se cambia
la regla ni se presenta como una prueba matemática de viabilidad de varias jornadas.
El riesgo queda registrado, tal como exige QA-133. El resultado detallado aparece
en el diagnóstico de [targeted-final.txt](qa/economic-boundaries/targeted-final.txt).

## QA-134 y C07: noche 100 y ataque que cruza el amanecer

Iniciar la noche 100 no da victoria: se conserva completedNights=99. Un ensayo
sin ataque llega a 599,9 sin victoria y sólo gana al cerrar la noche completa.
Las cinco culturas también sufren un ataque real que comienza en 599,5: al
alcanzar 600 quedan día 100, noche 99 completada, sin contratación ni resultado.
Se espera físicamente al último animal. RaidEnded precede a la resolución final:

- 799: derrota inmediata, no se cierra noche 100 y no hay victoria.
- 800: se cierra noche 100, pero pierde por el mínimo de 905 antes de evaluar victoria.
- 905: sobrevive a ambas comprobaciones, gana una vez y no abre contratación antes.

Los resultados terminales sobreviven al guardado y permanecen bloqueados. La
narración y continuación opcional son el caso independiente QA-135, aún pendiente.

## Validación

[Suite dirigida](qa/economic-boundaries/directed.txt): **84/84**, cero fallos,
28.138,5269 ms, con reloj, autoguardado, recuperación de ranuras y retiro nativo
en manglares. Tras añadir la comprobación del inicio de noche 100 y el diagnóstico
del plátano, [cobertura final](qa/economic-boundaries/targeted-final.txt): **23/23**,
cero fallos/cancelaciones/omisiones, 725,2537 ms. No se suman como casos distintos.
La [CI del commit 85d89d8](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37115782703)
terminó correctamente: **876/876**, cero fallos, 398.285,452411 ms, verificaciones,
build y paquete web aprobados. [Log](qa/economic-boundaries/ci-log.txt),
[estado](qa/economic-boundaries/ci.json).

La CI anterior de cultivos `99cee68` ya terminó: **853/853**, cero fallos,
219.903,649006 ms, verificación de assets/plan/rutas, build y paquete web.
[Log](qa/crop-native-reload/ci-log.txt), [estado](qa/crop-native-reload/ci.json).
