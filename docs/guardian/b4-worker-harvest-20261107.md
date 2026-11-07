# Cosecha precocinada de trabajadores

La presentación Worker solicita bajo demanda un banco compartido `Harvest` para los cuatro perfiles. La acción conserva el rig CPU como alternativa y el resultado de la cosecha permanece en la simulación. Se admite el material sobre el rig y la trayectoria existentes; las poses de cosecha no usan una fase histórica de locomoción obsoleta.

La fase visual de cosecha se actualiza con las publicaciones confirmadas y queda fija entre ellas: todavía no es reproducción autónoma completa. El generador `tools/guardian/build-worker-gpu-walk.mjs --clip=Harvest --check` verifica los cuatro bakes; las pruebas cubren poses, transición, selección, sombras y cancelación sin demostrar ejecución gráfica ni equivalencia visual en partida. El rendimiento y el horizonte temporal de acciones siguen pendientes.
