# Reintento compartido de caminata precocinada

Los trabajadores utilizan ahora el mismo planificador de reintentos que las bestias para recuperar fallos transitorios de descarga sin esperar a un cambio de estado. Cada roster mantiene un único temporizador, con hasta tres reintentos a 5, 10 y 20 segundos; el reloj es monotónico. El catálogo sigue compartiendo la descarga por perfil y el rig anterior permanece disponible hasta que se admite la animación. La retirada del actor o el cierre del roster cancelan su solicitud.

El mecanismo solo cubre fallos de descarga de la caminata; no cambia la política de admisión gráfica ni la de otros clips. Las pruebas de rosters y catálogo utilizan renderizadores simulados. La continuidad visual y el ahorro de CPU, GPU o tiempo de fotograma siguen pendientes de validación en una partida real.
