# Recuperación de regresos bloqueados por pendiente marginal

En el guardado nativo Sabana/Musgum de e461b550 había trabajadores que no
podían regresar porque su posición fraccionaria superaba ligeramente la
pendiente 0,5. El diagnóstico previo está en `../watering-large-farm-return`.
No se ha establecido el mecanismo histórico que los dejó allí.

La recuperación se intenta únicamente si falla la ruta ordinaria de un
trabajador fleeing/returning/incapacitated, sin ignorar edificios. Conserva el
límite 0,5 para las rutas normales. Solo acepta un origen con pendiente máxima
de 0,51, una salida de hasta 0,5 m cuya violación no aumenta, muestras como
máximo cada 0,025 m, barridos nativos contra props, estructuras y puertas, y
una ruta ordinaria desde el extremo válido al destino original. Conserva la
excepción de agua de Gran Cañón y prohíbe líquidos en los demás biomas.
No traslada entidades: locomoción, velocidad, gates y colisiones dinámicas
siguen controlando su desplazamiento. Los intentos fallidos se memorizan por
origen/destino/radio/época, con un máximo de 4096 claves por navegador.

0,51 limita la excepción al 2 % del umbral de pendiente. Es un margen de
recuperación, no un nuevo máximo edificable o transitable. No sirve para
atravesar acantilados, agua, obstáculos ni llegar a una tarea de cultivo.
La verificación por muestras no acredita continuidad matemática entre ellas.

Continuación ordinaria de 900 ticks de 0,1 s, contratación pagada de 112
trabajadoras mayores, sin cambiar posiciones, RNG, velocidades, crecimiento
ni colisiones: los 27 trabajadores registrados pasan a terreno transitable
en el primer tick y todos llegan al poblado antes del tick 677 (máximo 676).
Se comprueba el límite de desplazamiento por tick. Tres incapacitados tardan
más por la velocidad reducida existente; una primera ventana de 300 ticks
resultó insuficiente para confirmar su llegada, seguida por observación de
600 ticks (24 llegaron, tres seguían avanzando) y la ejecución final de 900.
Las dos ventanas anteriores no se archivaron como pruebas satisfactorias.

El observador separado conserva todo el estado serializado del runtime
original después de cada uno de sus 100 ticks. Las consultas fallidas bajan
de 3100 a 31; las 122 rutas de riego y sus contadores permanecen iguales.
Los hashes de trayectoria cambian intencionadamente al recuperar esos
regresos. No es un benchmark GPU/CPU ni aceptación de las cien noches del
juego actual. Los procesos CPU de campañas previas seguían activos.

Pruebas dirigidas: movimiento sin teletransporte, tareas sin excepción,
pendiente excesiva, agua, estructuras, falta de ruta al poblado, empeoramiento
intermedio, memorización de fallos y restauración de ruta durante la salida.
El build de Vite termina exit 0. Los archivos exactos y hashes están en el
recibo. Verificar: `node docs/qa/worker-slope-recovery/verify.mjs`.

67 pruebas de regresión dirigidas pasan; las once pruebas finales de la nueva
recuperación también pasan (incluyen dos añadidas después del primer grupo).
El paquete web se valida: 701 archivos, 859 enlaces relativos, 20 GLB runtime.
La suite completa fue lanzada una sola vez, sesión 94839, y termina exit 0:
3153 pruebas pasan, cero fallos, skipped o todo. Se han comprobado los bytes
de Game y worker-slope-recovery frente a las fuentes archivadas del ensayo.
El log completo y su hash quedan archivados. La duración de 1066739 ms bajo
carga CPU concurrente no se interpreta como benchmark de rendimiento.
Incluye campañas de la suite, pero no sustituye la aceptación de fincas densas
de cien noches en la matriz completa de biomas/culturas, que sigue pendiente.

Pendiente: determinar el origen de estos conectores históricos y reproducir
el atasco independiente de Gran Cañón; esta corrección no lo declara resuelto.

## Reproducción de un conector que pasa por alto pendiente

Seguimiento sobre main a52ceb6d, sin cambiar producción. Un sondeo local
construye conectores alrededor de los orígenes históricos, sobre el terreno
y obstáculos nativos. El intento 1094 encuentra un tramo de 0,1 m:
(112,754572642; 9,807730669) → (112,825283321; 9,878441347).
Ambos extremos pasan walkable con radio 0,28 y segmentClear acepta el tramo.
Un trabajador de prueba, status walking, avanza físicamente 0,05 m usando
walkTo y la velocidad original: llega a (112,789927981; 9,843086008), que
falla walkable. No se utiliza la recuperación nueva en ese estado.

Esto reproduce un mecanismo de entrada en terreno inválido por aliasing del
muestreo: un tramo menor de 0,25 m comprueba únicamente los extremos. No
demuestra que el trabajador histórico siguiera ese conector. El actor y el
tramo son construidos para el diagnóstico; no es una continuación ordinaria
de la campaña ni un benchmark. Script e informe exactos añadidos al recibo.

La recuperación es una mitigación de regresos ya bloqueados. La prevención
requiere comprobar también posiciones intermedias sin multiplicar el coste
de todos los recorridos. Antes de integrar esa comprobación hay que comparar
candidatos de muestreo/validación y medir su coste en la finca densa.
