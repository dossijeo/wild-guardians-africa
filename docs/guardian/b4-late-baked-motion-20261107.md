# Animación precocinada tardía con trayectoria GPU

Una bestia que ya tiene una trayectoria GPU puede incorporar más tarde su caminata precocinada sin sustituir el rig. La extensión compone los dos grafos sobre las nuevas mallas, prepara las alternativas antes de publicarlas y conserva la transformación temporal en el proxy de selección. Las cargas de textura se propagan a las réplicas y la cancelación retira los recursos pendientes.

La batería local incluye 150 pruebas de admisión, cancelación, picking, movimientos históricos y rigs, además de generación WGSL de color y sombra con un rig real sin dispositivo. Esto no demuestra compilación física, equivalencia visual ni rendimiento en la GPU. Quedan pendientes las demás acciones y transiciones de B4 y la validación integrada de C.

La misma instalación tardía se ha conectado para trabajadores con trayectoria activa, reutilizando la extensión de materiales y manteniendo su rig y selección. Una batería adicional de 132 pruebas incluye un rig real y generación WGSL de color y sombra; tampoco sustituye la validación en GPU y partida.

El alta inicial de un animal seleccionado para movimiento histórico ya no espera la descarga del banco de caminata antes de crear y admitir el rig. La vía diferida solicita el banco después de publicar el actor y lo instala sobre el mismo rig y vínculo de trayectoria cuando ambos siguen vigentes. Si el actor desaparece durante la descarga, no se instala el resultado. Un error mantiene el rig CPU y la siguiente transición de estado puede volver a solicitar el banco; no hay todavía reintento periódico durante un estado inmóvil. Las pruebas usan admisión y descarga simuladas: quedan pendientes dibujo real, continuidad perceptiva y medición de latencia.

El alta inicial de trabajadores seleccionados para movimiento histórico tampoco espera ya la descarga ni la admisión de su caminata precocinada. Primero se admite el rig con su vínculo de trayectoria; la solicitud posterior usa la instalación diferida existente y conserva el mismo actor y la misma vinculación. Si el trabajador se retira antes de terminar la descarga, el resultado se descarta. Las pruebas del roster y de las acciones usan renderizadores simulados; la continuidad visual y la latencia en WebGPU real siguen pendientes.

Si la caminata termina de cargarse durante una pose física o reconciliación visual, su instalación se aplaza y se vuelve a solicitar cuando el animal está disponible, incluso si su estado lógico no cambia. El final de una reconciliación que ocurre entre publicaciones también reactiva la instalación; no se reintenta mientras persiste la pose incompatible. Las pruebas cubren ambos recorridos con rig y banco simulados. Los fallos de descarga reales mantienen su política anterior y no se confunden con esta cancelación por estado.

La descarga de caminata de una bestia ya no ocupa el turno de instalación del rig: su carrera o ataque pueden solicitarse mientras se espera el archivo. La instalación sigue siendo serial; si el archivo llega durante otra admisión, se conserva hasta que esta termina. Una pose física puede aplazarlo sin volver a descargarlo. El inicio de historial sigue esperando la carga y las instalaciones pendientes. Las pruebas retienen la descarga y la admisión de ataque para comprobar el orden, además de comparar una incursión con Wild Engine/WASM. No se ha medido aún la latencia ni la continuidad visual en GPU real.

En trabajadores, la descarga de caminata también es independiente de la preparación de la acción vigente. Cosecha, caída y recuperación pueden solicitarse mientras llega el archivo; las instalaciones sobre el rig siguen serializadas. El archivo descargado se conserva si otra instalación o la preparación de trayectoria está pendiente y se usa al liberarse esa barrera. El historial sigue esperando las preparaciones pendientes. Las pruebas retienen ambas operaciones, comprueban cancelación y secuencia, y ejercitan escenarios de autoridad WASM; no miden rendimiento ni paridad visual en GPU.

Una descarga de caminata pendiente ya no bloquea un intervalo histórico de carrera o ataque cuya animación GPU ya está activa y certificada. La descarga no modifica el rig; si termina durante el intervalo, la instalación se pospone hasta finalizar o cancelar el historial. Si no hay animación GPU activa se mantiene la barrera anterior. La prueba retiene la descarga, comprueba rechazo sin el clip y aceptación con él, y verifica que la instalación no ocurre durante el intervalo. No acredita fluidez ni comportamiento del dispositivo WebGPU real.

Una descarga de caminata pendiente tampoco bloquea el historial de un trabajador si ya reproduce una acción GPU certificada, como carrera, trabajo, caída o recuperación. La instalación de la caminata permanece diferida mientras ese historial está activo; sin una acción GPU disponible se conserva la barrera. Las pruebas cubren una carrera con descarga retenida, cancelación y posterior instalación, además de escenarios de autoridad y acciones. No sustituyen la validación visual ni mediciones en WebGPU real.

La excepción para descargas pendientes distingue ahora el tipo de tramo: una pose estacionaria de ataque, reposo o trabajo no autoriza una trayectoria móvil. Para movimiento se exige una carrera GPU o, en trabajadores, transporte GPU; las demás acciones solo pueden habilitar intervalos estacionarios y siguen sujetas a sus certificados específicos. Las pruebas reproducen el caso de pose incompatible con caminata pendiente en ambos rosters. La validación en partida permanece pendiente.

La carrera precocinada de bestias conserva ahora el recurso descargado si una pose física, impacto provisional o reconciliación impide su admisión. No se informa como error una cancelación por esa incompatibilidad; el rig anterior sigue visible y la instalación se reintenta cuando termina, incluso entre publicaciones. Una candidatura interrumpida durante su admisión vuelve a comprobar la identidad y la pose antes de publicarse. Las pruebas cubren ambos casos con banco y rig simulados, sin demostrar todavía continuidad visual ni rendimiento en GPU real.
# Deferred animal attacks

An attack bake whose admission is cancelled while a confirmed physical pose,
provisional fall or reconciliation owns the animal can be retried once the
actor is safe again. The retry still requires the same live attack and clip;
an action superseded during admission cannot publish its old pose. The
existing bake bank shares the loaded resource and genuine load or preparation
errors remain reported instead of being retried continuously.

Contract tests cover the physical/reconciliation wait and action replacement,
using simulated admission. This does not establish visual parity, real GPU
timing, or that every exceptional action uses a baked animation.

Si una pose física empieza y termina mientras la admisión anterior todavía se
está cancelando, el roster conserva esa transición y vuelve a solicitar la
acción vigente al finalizar la cancelación. Sin una nueva transición no realiza
reintentos automáticos en bucle. Las pruebas simulan ambas carreras; quedan
pendientes la ejecución en dispositivo y la continuidad visual.

La misma barrera de disponibilidad protege ahora la admisión tardía de marcha
y carrera: si una caída terminó antes de finalizar la cancelación anterior, se
reutiliza el recurso descargado y se vuelve a solicitar la instalación. Las
pruebas cubren las dos acciones y verifican que un aborto sin otra transición
no genere un bucle. No se ha validado la continuidad en GPU real ni medido un
ahorro de tiempo de fotograma.
