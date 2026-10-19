# Revisión desde partidas reales

18 capturas: Sabana, Gran Río y Gran Cañón, semilla 712, Mapungubwe, calidad media, 1280×720; original, relleno local y relleno con sombras del terreno, día/noche. El menú real inicia cada partida. No se insertan edificios, cultivos ni enemigos.

El script intercepta únicamente el módulo servido para exponer una referencia QA al WorldScene (sin cambiar el archivo del repositorio). Pausa mediante la API existente, fija hora 150/350 y conserva la cámara inicial de campaña entre variantes. Se mantienen HUD y mensaje tutorial visibles. Esto verifica renderizado de una partida inicial pausada: no es una prueba de navegación, combate, transiciones de chunks ni compra. `captures.json` registra encuadres y errores de red con URL.

En Sabana y Gran Río, el relleno local mejora el apoyo de los edificios y las sombras sobre el claro de aldea. El césped sigue siendo una textura uniforme a esta distancia: no confundir sombreado con vegetación volumétrica.

En Cañón, la cámara normal de inicio mira a lo largo del río y permite ver la sombra de la pared sin la obstrucción dominante de la fixture amplia. Activar casters de terreno recupera una sombra continua sobre la ribera y el agua. La noche conserva la distinción de edificios, suelo y cauce, pero reduce detalle en fachadas oscuras; no se ha aprobado aún para uso general. La textura estratificada de paredes y el agua siguen muy por debajo de las referencias.

El primer intento terminó tras Sabana por una carrera de carga del iframe del menú. Se añadió espera al evento de navegación y se repitieron los tres biomas. No usar el intento incompleto como prueba final.
