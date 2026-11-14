# Acumulación con poses físicas inactivas

La cola del host compara los propietarios físicos activos antes de acumular
publicaciones. Una lista de poses inactivas producía `[]`, mientras una
publicación sin poses producía una cadena vacía; ambas representan cero
propietarios. Ahora se normalizan al mismo valor. El formato antiguo `[]` se
sigue aceptando. Una aparición o retirada de un propietario activo continúa
siendo una barrera, y los eventos se mantienen en la publicación posterior.

Las pruebas cubren ambas representaciones, eventos y una transición activa,
además de la cola, el receptor y el runtime alojado. Esta acumulación no se
aplica a la cola temporal con confirmación por recepción ni a publicaciones con
trazas globales, que siguen siendo barreras. No se han medido los bytes, la
latencia ni los tiempos de fotograma en una partida.
