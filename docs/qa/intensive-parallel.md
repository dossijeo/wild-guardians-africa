# Verificación intensiva con procesos acotados

`node tools/check_intensive_matrix_parallel.mjs` ejecuta las treinta combinaciones nativas con dos procesos ordinarios de Node como máximo. La duración predeterminada sigue siendo cien noches por mundo; `node tools/check_intensive_matrix_parallel.mjs 1 2` es únicamente un diagnóstico de apertura. Se admiten de uno a cuatro procesos. No son subagentes de IA y no modifican las reglas, el reloj, dinero, daños ni recorridos del juego.

Cada caso usa la misma política responsable y mixta de los verificadores anteriores, guarda su PID y la última fila diaria en un status propio, y conserva estado, informe y resumen. Primero escribe el resultado, incluso en derrota, y después exige auditoría, supervivencia de las noches solicitadas y contratación/entregas físicas en cada jornada. Para cien noches exige victoria, día 101, una sola victoria y ninguna incursión pendiente. Un caso fallido no impide investigar los demás.

El ejecutor conserva stdout, stderr y código de salida por caso. Compara los hashes registrados al comenzar cada proceso con los de la matriz. Si las fuentes cambian entre casos, `sourceConsistent` pasa a false y el proceso termina con error; una mezcla de revisiones no se certifica como campaña completa. Los hashes posteriores incluyen también perfiles de `public/content` y manifiestos, además del código y los scripts. No se agregan esos hashes retroactivamente a ejecuciones anteriores.

La primera apertura paralela terminó con código 0, treinta casos passed y fuentes coherentes. Se compararon las treinta serializaciones completas con los estados de la apertura secuencial conservada: todas coinciden exactamente. La prueba y los hashes están en `intensive-parallel-opening-proof.json`. Esta ejecución comenzó antes de incorporar los perfiles/manifiestos al registro; conserva su cabecera original. Su `campaign100` permanece unverified.

La matriz de cien noches posterior sigue pendiente hasta sus resultados terminales. Este ejecutor comprueba simulación; no sustituye renderizado, FPS de teléfono, escucha ni guardado nativo del navegador.
