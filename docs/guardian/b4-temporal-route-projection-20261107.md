# Rutas proyectadas en publicaciones temporales

Las publicaciones de avance que incluyen una traza temporal pueden utilizar
ahora la proyección `head-v1` ya existente: la copia de presentación conserva
el siguiente waypoint y omite los posteriores. La autoridad mantiene las rutas
completas. La traza de movimiento, las muestras de cada actor, el reloj, los
eventos y las poses no se modifican. Las trazas individuales, invalidaciones,
checkpoints de terreno y comandos de guardado conservan la ruta completa.

El receptor acepta la combinación de traza global y rutas proyectadas, pero
sigue validando la traza contra los estados anterior y posterior. Las pruebas
comparan tres publicaciones de Wild Engine frente a una autoridad con rutas
completas, incluidos eventos, reloj y trazas; comprueban además el checkpoint,
la vista previa temporal y el transporte incremental en un Worker real. Pasan
también los contratos de recuperación histórica. Falta comprobar una partida
WebGPU completa y su recuperación en navegador.

En una publicación del fixture `manglares-123-d10-raid-state`, el snapshot JSON
completo ocupó 1.012.149 bytes y el proyectado 910.868; la traza fue idéntica
y ocupó 273.379 bytes. Son tamaños serializados de una sola muestra, no bytes
efectivamente transferidos con la codificación incremental ni tiempos de CPU,
GPU o fotograma. No se atribuye una mejora global de fluidez sin medirla en C.

Una comprobación posterior reprodujo cuatro publicaciones del mismo fixture con
el codificador incremental real: el tamaño JSON del sobre completo, con rutas
originales y proyectadas respectivamente, fue 1.468.983/1.343.272 bytes en la
primera y 440.407/314.995, 438.869/313.518 y 439.010/314.065 bytes en las tres
siguientes. Las tres últimas eran deltas y los eventos coincidieron. Estas
cifras describen la representación JSON del sobre, no el tamaño real de la
clonación estructurada entre Workers ni su latencia.

La prueba `confirmed-presentation-timeline.test.js` reproduce además una
publicación temporal proyectada de la autoridad real en el receptor de
recuperación y verifica la traza, los eventos y un checkpoint posterior con
rutas completas. La recuperación completa con el Worker gráfico y WebGPU en
navegador sigue sin estar validada.
