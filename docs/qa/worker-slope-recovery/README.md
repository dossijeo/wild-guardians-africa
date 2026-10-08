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
La suite completa fue lanzada una sola vez, sesión 94839; en la observación
del recibo permanecen vivos los procesos de active-farm y campaign, sin
resultado terminal todavía. No se declara pasada ni se reinicia por tardar.

Pendiente: determinar el origen de estos conectores históricos y reproducir
el atasco independiente de Gran Cañón; esta corrección no lo declara resuelto.
