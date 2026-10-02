# Retirada y separación física de actores

El Plan Maestro, §11.4 y QA-100, exige que un animal sin golpes se retire
sin atacar al trabajador ni interpenetrarlo. Las huellas nativas ya medían el
cuerpo de las cinco bestias, pero `walkTo` solo consultaba obstáculos estáticos.

El controlador consulta los cuerpos de los otros animales. Los trabajadores
separan su movimiento de bestias retirándose o agotadas; los incapacitados
también permanecen fuera del cuerpo de animales activos. Los encuentros de
trabajadores sanos con animales que aún pueden atacar conservan la tirada del
60 %, el golpe obligatorio en interpenetración y el empuje de 1,5–2 unidades.
No se añade otra tirada, golpe ni gasto de cupo para obtener separación.

Cada segmento de movimiento comprueba la distancia al cuerpo. Un desvío local
usa nodos exteriores al disco de separación y segmentos validados por la
navegación de producción: terreno, estructuras, rocas y barrera. Mantiene el
destino y consume la misma distancia/velocidad/fase de locomoción. Si no cabe
pasar o el destino está ocupado, espera conservando la ruta. Los solapamientos
de guardados antiguos pueden escapar continuamente, sin teletransporte y sin
avanzar hacia el centro del otro cuerpo. Las rutas del desvío se serializan
como los demás puntos del trayecto.

La elección de aproximación también descarta posiciones ocupadas por otros
cuerpos. Si un animal ocupa una aproximación previamente elegida, se busca
otra. El diagnóstico de ocho cultivos encontró tres facóqueros detenidos en
la noche 32; sus coordenadas y aproximaciones se conservan en la prueba de
regresión para comprobar que esa incursión completa ataques y retirada.

## Evidencia

Las trece pruebas de `tests/actor-motion.test.js` cubren cada especie nativa,
segmentos barridos, velocidad máxima, ausencia de daño/azar adicional, corredor
estrecho, cruce de dos animales, guardado durante el desvío, incapacitados,
escapatoria de solapamientos antiguos, espera sin gasto de carrera y el grupo
de tres facóqueros. Pasan 13/13. La ejecución dirigida con encuentros y
navegación pasa 39/39 antes de añadir la última prueba de reserva.

La revisión visual utiliza `tests/browser/actor-clearance.html`: terreno plano,
trabajador original, las cinco bestias a escala 1, African Toon y controlador
de producción. Es un ensayo aislado, no una incursión natural de campaña.
Todas completan retirada con cero segmentos inválidos, golpes y cupo adicional;
el facóquero conserva su desvío tras recargar en memoria. Márgenes mínimos
medidos entre discos: facóquero 0,011; hiena 0,007; búfalo 0,008; león 0,006;
rinoceronte 0,019 unidades. Consola final sin avisos ni errores.

- [Facóquero](../test-results/native-retreat-worker-clearance.png)
- [Hiena](../test-results/native-retreat-hyena-clearance.png)
- [Búfalo](../test-results/native-retreat-buffalo-clearance.png)
- [León](../test-results/native-retreat-lion-clearance.png)
- [Rinoceronte](../test-results/native-retreat-rhino-clearance.png)

La estrategia del diagnóstico agrícola prioriza Escudo sobre cultivos vivos
y reserva la protección del centro para salud inferior al 50 % o ausencia de
cultivos vivos. Al perder toda la cosecha permite reiniciar la siembra con los
fondos disponibles, en vez de inmovilizarlos para el salario siguiente. Son
comandos legales del jugador automático, sin alterar precios, saldo, reloj,
probabilidades, riegos ni daño. Con esa estrategia la campaña de girasol pasó
las aserciones originales de cien noches, entregas diarias y salarios; el
ensayo mixto señaló el bloqueo de aproximación que se corrigió después.
La regresión integrada posterior pasa 500/500 pruebas sin omisiones en
318,471 s (`test-results/tests-actor-clearance-final.txt`), incluidas ambas
campañas activas con todas sus aserciones originales. La prueba adicional de
espera/reserva pasa dentro de las 13/13 dirigidas finales; la suite actual tiene
501 pruebas. Build final y paquete web aprobados: 546 archivos, 789 enlaces
relativos y 20 GLB de runtime. El ZIP para itch.io conserva CRC verificados.

## Límites

La huella envuelve el cuerpo calibrado, no todos los brazos y armas de cada
pose. Esto no acredita contactos óseos precisos, separación entre trabajadores
contratados en un mismo punto, todos los grupos en estrechamientos ni rendimiento
móvil. Las aproximaciones a cultivos ocupadas temporalmente pueden cambiar la
selección de objetivo y el desarrollo de la incursión, respetando sus cupos.
