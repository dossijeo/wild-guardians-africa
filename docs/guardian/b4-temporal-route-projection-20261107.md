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
