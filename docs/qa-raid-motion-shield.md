# Movimiento de incursiones, Escudo y último cupo

Base `26b80c6`. [Aceptación nueva](../tests/acceptance-raid-motion-shield.test.js):
55 escenarios. [Salida dirigida](qa/raid-motion-shield/directed.txt): **106/106**,
cero fallos, cancelaciones u omisiones, 9.438,085 ms. Incluye separación física,
GLB/rigs y clips nativos de las cinco bestias, expiración del Escudo y sus VFX.
Node emite el aviso experimental de imports JSON.

## QA-098

Veinticinco incursiones reales, cinco especies por cinco culturas: centro y
mijo pagados, composición explícita, movimiento exclusivamente por Game.tick.
Se comprueban los clips Running al entrar y retirarse y Walking dentro de la
finca. Cada segmento físico respeta Navigation. Hay al menos dos muestras de
velocidad completa de cada fase: 3,8 m/s para entrada/salida y 1,5 m/s para paseo.
También se comparan todas las fases de movimiento y sus límites por paso, sin
aceleración al rodear estructuras. El paso que cambia de caminar a retirarse
por agotamiento se evalúa a velocidad de salida, pues esa transición precede
al desplazamiento del mismo paso. Todas las incursiones salen y emiten un final.

## QA-101

Otras veinticinco incursiones alcanzan físicamente la proximidad del cultivo.
Se lanza un Escudo legal de radio 1,95 m antes del solapamiento. Duración 20 s
y cooldown 90 s empiezan al lanzamiento. Cada segmento de aproximación mantiene
fuera del volumen protegido el cuerpo completo, incluido el radio del animal.
La animación se inicia a radio Escudo + radio nativo + 0,1 m del centro del poder.

Se guarda en SaveRepository al comenzar la animación y se reconstruye Navigation.
La pausa de 30 s conserva íntegros duración, cooldown, clip y dominio. Continuar
el original y la carga produce instantáneas completas idénticas en cada paso
hasta el golpe: un AnimalLogicalHit con la identidad del Escudo, un cupo gastado,
cultivo vivo, centro con vida intacta y ningún CropDestroyed/StructureHit. La
pose nativa coincide tras el golpe. El Escudo sigue activo; este caso verifica
el golpe protegido, no que cubra todo el presupuesto de cualquier incursión.

## QA-100

Cinco casos culturales de la semilla 21 pagan centro, mijo y trabajadora mayor,
y avanzan hasta su tarea inicial. Un facóquero explícito con su presupuesto
natural de dos golpes la golpea dos veces en encuentros físicos/frontal reales;
no se asignan posiciones, heridas, cupos ni clip. El último cupo se agota cuando
una animación agrícola todavía tiene tiempo restante. Completarla no genera
daño adicional ni un miss ficticio: ambos cupos ya se gastaron en la trabajadora.

Se guarda con presupuesto cero y se continúa con Navigation nueva. Original y
carga coinciden en todos los campos hasta la salida. El barrido relativo de
ambos actores mantiene la separación de sus radios durante toda la retirada,
sin un tercer golpe ni atravesar a la incapacitada. El cultivo sigue vivo, hay
un WorkerHit, un WorkerIncapacitated y un RaidEnded. La suite de actor-motion
complementa este caso real con los radios nativos de las cinco especies y
pasillos bloqueados, manteniendo el presupuesto agotado.

Los fixtures tienen crédito de 10.000 monedas, terreno plano sin props y bounds
de 96 m (48 m en el caso del último cupo). No se reclama la matriz de obstáculos
de biomas ni nuevas capturas WebGL. Son pruebas de aceptación sin cambios del
runtime ni nueva build. La CI completa de las defensas `37119943304` continuaba
en curso al registrar este informe; no se le atribuye un resultado todavía.
