# Puertas nativas: espera, cruce y transporte

Revisión en navegador del 2 de octubre de 2026, sobre la simulación de
`387cc8c`. El visor `tests/browser/gate-crossing.html` coloca el centro nativo
en x = −6; su posición antigua x = −3,4 solapaba la puerta tras recuperar la
escala original. El terreno es plano y no hay obstáculos procedurales. Centro,
semilla, puerta y contratación se pagan mediante los comandos de producción.

## Cruce

Se ejecutaron las doce combinaciones de zarzas, empalizada y adobe reforzado
con hombre/mujer mayor y hombre/mujer joven. Todas esperan ante la hoja con
apertura inicial 17 %, conservan el estado al recargar en memoria, cruzan y
dejan la puerta cerrada al alejarse. No cambian su saldo y el comprobador de
segmentos barridos registra cero movimientos inválidos. Los recorridos
terminan entre 14,2 y 14,6 segundos simulados.

Resultado de las doce ejecuciones:
[informe de cruce](../test-results/native-gate-scale-report.json).
Se inspeccionaron capturas de las tres geometrías y las poses originales:

- [Espera ante madera](../test-results/native-gate-wait-scale.png)
- [Zarzas](../test-results/native-gate-zarzas-scale.png)
- [Empalizada](../test-results/native-gate-empalizada-scale.png)
- [Adobe reforzado](../test-results/native-gate-reforzado-scale.png)

## Cosecha y entrega

El modo de transporte sitúa el centro al otro lado de la puerta respecto del
cultivo. El trabajador completa siembra, primer riego y crecimiento; se ordena
la cosecha solo cuando madura. En las doce combinaciones vuelve con una caja
real, espera ante la hoja y conserva caja, portador y saldo al recargar.

En la espera se observa una caja, un portador y cero ingresos. Al llegar al
punto de entrega del centro se observa una caja entregada, cero portadores y
un ingreso. La ganancia es 11 monedas para perfiles masculinos y 9 para
femeninos, con el redondeo aprobado en el cobro. Recargar después de entregar
y repetir el botón de avance conserva el saldo y el único ingreso.
Todas las ejecuciones registran cero segmentos inválidos y cero cobros
prematuros; las entregas ocurren entre 176,1 y 179,8 segundos simulados.

Resultados y evidencia:

- [Doce transportes, recargas y repetición](../test-results/native-gate-crate-report.json)
- [Espera con caja sin cobrar](../test-results/native-gate-crate-wait.png)
- [Entrega única tras recargar y repetir](../test-results/native-gate-crate-delivered.png)

Esta ejecución aporta evidencia aislada del motor y del render para QA-064
(recogida sin cobro), QA-065 (ingreso único tras recarga/repetición) y QA-147
(una caja y un portador al restaurar). No reemplaza la comprobación de esos
casos desde la interfaz completa de una partida.

## Verificación y límites

`node --test tests/gates.test.js` pasa 14/14 pruebas: pausas, fases guardadas,
ocupación al cerrar, empuje, portales, doce perfiles/materiales y cajas
cosechadas. La regresión de producción sobre `387cc8c` pasa 501/501 en
[GitHub Actions](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37010383490),
con build y paquete web aprobados. Este cambio posterior solo amplía el visor
y su evidencia; no cambia el motor de puertas.

El primer ensayo de transporte intentó ordenar cosecha durante la pausa QA y
el guard de producción lo rechazó. Se corrigió el visor para reanudar antes
del comando y pausar después; las doce repeticiones finales no generan errores
nuevos. La automatización espera a que termine de cargar cada perfil antes de
leer su saldo, evitando atribuirle la cifra del perfil anterior.

Se acredita suelo plano, tres materiales con hoja móvil y cuatro perfiles.
No se acredita aquí rendimiento móvil, cruces en todos los biomas, colapso
simultáneo ni la presentación de agua, lava, noche o el shader de la partida.
