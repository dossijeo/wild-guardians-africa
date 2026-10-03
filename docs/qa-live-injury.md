# Lesiones y recuperación personal en incursiones reales

Base final `dca7657`. [Aceptación nueva](../tests/acceptance-live-injury.test.js):
24 escenarios; [salida dirigida](qa/live-injury/directed.txt): **55/55**, cero
fallos, cancelaciones u omisiones, 1.256,0295 ms, junto con encounters,
locomotion y worker-actions. Node avisa de imports JSON experimentales.

## QA-106, QA-108, QA-109 y QA-110

Los cuatro perfiles por cinco culturas pagan centro y mijo y llegan físicamente
a la tarea inicial. La semilla 19 y una composición explícita de rinoceronte
provocan dos colisiones durante la huida, sin asignar posiciones, trayectorias,
golpes, clip ni lesiones. El crédito de 10.000 monedas, terreno plano sin props,
bounds de 48 m y cupo ordinario agotado son condiciones explícitas. Navigation
y footprints culturales son de producción; no es evidencia de frecuencias de
encuentro ni de todos los obstáculos de biomas.

El ataque libera la tarea laboral. Ambos impactos empujan entre 1,5 y 2 m a
terreno válido y consumen un cupo cada uno; la suma de golpes al trabajador y
golpes/misses agrícolas o estructurales coincide con el presupuesto gastado.
El primer golpe usa Fall y permanece inmóvil durante su caída. Guardar/cargar
con SaveRepository conserva íntegros el dominio y la pose; una pausa de 30 s
congela ese estado. El segundo incapacita, elimina la caída y fija recuperación
hasta el día 4 en la persona. Cargar nuevamente conserva la lesión. La retirada
usa Run a 35 %: en 0,5 s avanza hasta 0,28 m y su fase aumenta 0,175 s, también
en rutas con curvas. Llega a home con exactamente dos impactos, sin agresiones
adicionales ni reposición del cupo de carrera. Worker-actions carga y aplica
todos los clips a los cuatro rigs GLB originales; no hay nueva captura WebGL.

Las pruebas complementarias de encounters verifican barrido de trayectorias,
empuje que rodea una pared y truncamiento cuando no hay recorrido completo
válido. No se permite atravesar una barrera para cumplir artificialmente 1,5 m.

## QA-107, QA-111 y QA-112

Para cada perfil se avanza físicamente hasta el fin de incursión y el amanecer
del día 4, y se guarda antes de contratar dos personas del mismo perfil. La
persona lesionada mantiene su identidad y recuperación; su compañero está sano.
Con cinco tareas pagadas por dos trabajadores, el sano corre y el recuperado
camina sin gastar su cupo. Este último alcanza y completa una siembra y primer
riego reales: exactamente un WaterSatisfied para su cultivo.

Con el cupo establecido explícitamente en cero, una nueva incursión provoca
huida Run a velocidad ordinaria incluso durante recuperación, sin gastar ni
reponer metros. Después del cierre real de la jornada, contratar una sola persona
el día 5 conserva el mismo personId, ya recuperado, y no crea otra identidad ni
incapacita al perfil completo. Los planes naturales adicionales se desactivan
en esta prueba de contratos; las incursiones evaluadas son composiciones explícitas.

QA-105 conserva alcance parcial: las pruebas aisladas verifican una tirada por
encuentro, persistencia al cargar y 60 % sobre 5.000 muestras, pero esta matriz
integrada provoca colisiones obligatorias, no un paso frontal sin colisión.
No hay cambios del runtime ni nueva build en este turno.
