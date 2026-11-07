# Cosecha precocinada de trabajadores

La presentación Worker solicita bajo demanda un banco compartido `Harvest` para los cuatro perfiles. La acción conserva el rig CPU como alternativa y el resultado de la cosecha permanece en la simulación. Se admite el material sobre el rig y la trayectoria existentes; las poses de cosecha no usan una fase histórica de locomoción obsoleta.

Cuando se activa la recuperación histórica experimental, los tramos de cosecha inmóvil con tarea, objetivo y fase confirmados pueden reproducirse en GPU hasta el límite del horizonte confirmado. Los cambios de tarea o los eventos impiden admitir un tramo ambiguo; una interrupción conserva la fase alcanzada. Fuera de esa ruta, la fase permanece ligada a las publicaciones confirmadas. La simulación conserva la autoridad sobre el cultivo y sus efectos.

Una prueba con Wild Engine/WASM compara una campaña preparada contra una referencia sin instrumentación y comprueba la cosecha y su transición a transporte con `CropPicked`. El generador `tools/guardian/build-worker-gpu-walk.mjs --clip=Harvest --check` verifica los cuatro bakes; las pruebas cubren poses, transición, selección, sombras y cancelación. Quedan pendientes la ejecución gráfica y comparación visual en partida, el rechazo real de comandos y las mediciones de rendimiento; estas pruebas no demuestran todavía la migración completa de acciones.
