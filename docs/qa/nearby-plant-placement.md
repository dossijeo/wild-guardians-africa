# Brotes cerca del toque

El juego y el diorama de carga comparten una búsqueda local con radio máximo de 1,6 unidades del mundo. Primero prueban el toque exacto, sin redondearlo a una cuadrícula. Conservan la separación existente: 1,1 en juego y 1,5 en carga. Las plantas muertas no ocupan espacio.

Para plantas se prueban sus límites circulares y las intersecciones entre límites, ordenados por distancia al toque. Para geometría arbitraria se añaden ocho anillos con 32 direcciones y se refina el primer candidato válido en su dirección con doce pasos. Es una aproximación acotada al punto válido más cercano: no promete un mínimo matemático global sobre terreno discontinuo ni encontrar un hueco menor que la resolución angular. Toda posición final conserva la validación geométrica y el límite de desplazamiento.

La búsqueda ocurre únicamente al pulsar, nunca cada frame. No crea plantas, modifica navegación, cobra ni encola durante la búsqueda. En juego, el comando nativo vuelve a validar y conserva presupuesto, supresión de props, FIFO, guardado e idempotencia. Si no hay hueco local se mantiene el error original. En carga se conservan capacidad, límites de parcela, crecimiento y sonido solo al aceptar un brote.

En modo plantar, tocar una planta permite buscar espacio próximo; las interacciones fuera de ese modo conservan su comportamiento. No cambia las mecánicas económicas ni los comandos estrictos utilizados por las campañas.

Pruebas automatizadas: precisión exacta, planta muerta, distancia mínima circular y entre dos plantas, terreno bloqueado, límite local, borde de parcela, capacidad, interrupción, crecimiento y cobro/FIFO nativos. La validación automatizada no sustituye una prueba táctil en dispositivo físico.
