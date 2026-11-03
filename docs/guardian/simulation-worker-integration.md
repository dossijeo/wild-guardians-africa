# Migración de la simulación: primer componente de autoridad

Estado actual: la partida normal todavía llama a `Game.advanceReal` desde el fotograma en `src/app/main.js`. El nuevo Worker y su cliente aún no se instancian en ese flujo; esta etapa no proporciona una incursión jugable desacoplada ni cambia el comportamiento de producción.

`src/simulation/simulation-authority.js` reconstruye un estado serializado y una instancia propia de Wild Engine con una lista explícita de regiones, restaura el planificador existente y procesa intervalos de `advanceReal`, pausa, reanudación e instantánea en orden. `simulation-authority-worker.js` lo ejecuta en un Worker y `simulation-authority-client.js` envía una orden a la vez, valida sesión/secuencia y ofrece una cola limitada que rechaza la admisión sin descartar silenciosamente la orden. Las respuestas incluyen instantánea completa y eventos: es un contrato inicial, no el protocolo de presentación final. Una excepción cierra el cliente; todavía no hay recuperación automática ni garantía transaccional tras un fallo de simulación.

La prueba `tools/trees/audit_simulation_authority_worker.mjs` usa el Worker y cliente reales en Edge, con una captura restaurada de incursión de manglares de islotes, 24 regiones suministradas y una referencia local independiente. Siete órdenes de avance, pausa, reanudación e instantánea coinciden en estado serializado y eventos; una secuencia duplicada se rechaza sin cambiar la siguiente instantánea. Otra secuencia pasa por el cliente con cola llena y produce la misma instantánea final. `gpu-animation/simulation-authority-worker-smoke.json` conserva el resultado. Esto no cubre la escena del juego, entrada, cambios del mundo, latencia sostenida, recuperación ni física Rapier.

Obstáculos para una incursión real: (1) transferir la autoridad del estado y las acciones de interfaz sin ejecutar reglas en ambos hilos; (2) transmitir y versionar cambios estructurales y demanda de regiones hacia el Worker y publicar eventos/estado en orden; (3) trasladar el gestor físico actualmente conectado desde `WorldScene` a `nav.beastPhysics`, preservando impactos y recuperación; (4) conectar pausas, tutorial, guardado y cierre a confirmaciones asíncronas; (5) aplicar presentación segura y después trayectorias/animación GPU. El cliente rechaza órdenes cuando se llena: el integrador debe conservarlas y aplicar presión de retorno, sin perder tiempo o entradas. No activar este componente como autoridad de producción hasta que esos pasos estén conectados y probados con una incursión real.

La compilación Vite general pasa en un directorio de salida aislado, pero como el cliente aún no está importado desde la entrada del juego, esa compilación no prueba el empaquetado del Worker para distribución. La ejecución de navegador sí carga el Worker durante desarrollo.

## Primera acción de partida y divergencia de reconstrucción

La autoridad acepta `castShield` como orden secuenciada y ejecuta la regla real `Game.cast` dentro de su mundo nativo. Devuelve el resultado, la instantánea y los eventos confirmados; un mismo ID de acción se acepta solo una vez según la regla existente. El cliente copia la orden al admitirla para que una mutación posterior de la interfaz no cambie una orden ya en cola. El ataque y las demás acciones no están conectados; especialmente, no se habilita ataque mientras no esté trasladado el gestor físico.

En la prueba de incursión restaurada, la secuencia de pausa, reanudación, escudo, escudo duplicado y avance coincidió con una referencia local continua en instantánea y eventos después de cada orden; el primer escudo produjo `SpellActivated` y el duplicado devolvió `false` sin otro evento. Sin embargo, al crear después una **segunda** autoridad desde la instantánea con el escudo activo y compararla con la referencia que nunca se reinició, apareció `/raid/animals/7/raidWait/epoch`: `5,536` frente a `5,540`. Esta diferencia se conserva explícitamente en `gpu-animation/simulation-authority-worker-smoke.json` con `clientQueueMatched:false`. El epoch se usa para decidir si un animal vuelve a buscar objetivo o espera, por lo que no puede descartarse como una diferencia visual. La igualdad tras reconstruir dos mundos desde la misma captura no demuestra equivalencia con un mundo ya en ejecución. Antes de una transferencia en caliente o recuperación hay que preservar o reconstruir las revisiones y dependencias nativas de manera que las decisiones sigan siendo correctas; comparar campañas y eventos posteriores, no solo corregir la cadena serializada.

La orden de escudo aún no está conectada a los controles de la partida. `main.js` sigue avanzando y mutando el estado en el hilo principal; física, cambios de mundo, publicación y guardado asíncrono siguen pendientes. Este experimento no prueba una incursión jugable desacoplada.

## Transferencia de la vigencia de esperas

La diferencia anterior era una revisión compuesta por contadores locales de navegación y sectores; su valor numérico no es portable entre instancias. `raid-wait-handoff.js` captura, para cada animal en espera, su identidad, el token guardado y si ese token coincide con el mundo de origen. Tras reconstruir el planificador, la autoridad comprueba que las entradas corresponden exactamente a la instantánea y traduce las esperas vigentes al token del mundo nuevo; deja explícitamente invalidadas las que ya estaban obsoletas. Una lista incompleta, duplicada o que no corresponde a la captura se rechaza antes de modificar las esperas. El origen debe capturar instantánea y bindings sobre el mismo estado confirmado, sin mutaciones intermedias. Esta operación es opcional y todavía no está conectada al traspaso del juego real.

En la misma captura de manglares, con el escudo activado, una autoridad reconstruida con esos bindings coincidió con el mundo original continuo durante 200 intervalos de 50 ms adicionales. Se compararon todos los campos serializados salvo el número local de `raidWait.epoch`; para ese campo se comprobó por separado que cada espera siguiera vigente o invalidada en ambas instancias, además de comparar los eventos ordenados tras cada intervalo. `gpu-animation/simulation-authority-worker-pre-handoff.json` conserva el resultado anterior con la diferencia; `gpu-animation/simulation-authority-worker-smoke.json` conserva el ensayo nuevo. Las pruebas dirigidas cubren tokens vigentes y obsoletos y rechazo de bindings inconsistentes sin cambios parciales.

Es una sola incursión restaurada con residencia fija y sin física, acciones adicionales durante el tramo, cambios de regiones ni render. No demuestra que todas las demás revisiones nativas, cachés o rutas sobrevivan a una transferencia, ni que el estado físico pueda restaurarse. La partida continúa usando el hilo principal; quedan por conectar las acciones, las regiones, la física y la publicación confirmada antes de poder jugar una incursión desacoplada.

## Primera orden estructural

La autoridad acepta `removeWall` en la misma secuencia que los avances y ejecuta `Game.removeWall` con la navegación de su propio Wild Engine. Devuelve el resultado de la regla y los eventos confirmados; un ID de comando repetido devuelve `false` sin duplicar el reembolso ni el evento. El cliente permite encolarla, pero los controles del juego aún no la envían.

`tools/trees/audit_simulation_authority_wall.mjs` restaura la captura de manglares de islotes, la convierte expresamente a día pacífico sin incursión y carga 24 regiones. En Edge, una referencia local y el Worker ejecutaron la eliminación real de `structure-683`, la orden duplicada y 50 intervalos posteriores; se compararon la instantánea serializada y los eventos tras las 52 órdenes y se observó `WallRemoved`. El resultado está en `gpu-animation/simulation-authority-wall-command.json`. Es una prueba controlada de una eliminación, no una validación de construcción, cambios de regiones durante el movimiento, presentación, entrada ni una incursión real.

La física sigue requiriendo más trabajo: `BeastCombatPhysics` obtiene rigs y objetos de obstáculos de `WorldScene`; mover exclusivamente Rapier omitiría dependencias físicas. La partida normal todavía avanza en el hilo principal y no utiliza esta autoridad. El siguiente paso es trasladar esas dependencias o proporcionar sus datos autoritativos en el Worker y conectar la publicación y los comandos sin mantener dos simulaciones activas.

## Residencia espacial solicitada por la simulación

La autoridad acepta `addChunk` como orden secuenciada, genera la región en su propio Wild Engine y registra sus metadatos a través del flujo espacial existente. Una región ya instalada devuelve `false` sin generarla de nuevo. Las claves se validan como coordenadas canónicas de 32 bits antes de llamar a WASM, evitando que una coordenada fuera de rango se trunque silenciosamente. La comprobación de entrada de incursiones usa ahora las regiones residentes del Worker, igual que la escena usa las suyas.

Cada respuesta expone además `residency.required` y `residency.missing`, obtenidos de las demandas existentes de trabajadores e incursiones sobre el estado del Worker. Son datos para el futuro integrador: todavía no hay un consumidor en la partida que solicite automáticamente las regiones que faltan. Tampoco se ha implementado su retirada; debe respetar las reservas y rutas de actores antes de limitar memoria. La generación se realiza en el Worker sin presupuesto gráfico artificial, pero aún no se mide su latencia en partida.

La prueba de muralla se amplió con dos órdenes para la misma región `6,1`: la primera la incorpora y la segunda devuelve `false`. Durante las 54 órdenes se compararon estado, eventos y la demanda espacial con la referencia local, incluidos los 50 intervalos posteriores; el resultado es `gpu-animation/simulation-authority-wall-command.json`. El escenario es el mismo manglar convertido a día pacífico, sin UI, física ni cambios de residencia durante una incursión activa. La prueba de incursión y el traspaso con espera también siguen pasando, pero no cubren la creación de una nueva oleada con regiones ausentes ni demuestran todavía una partida desacoplada.

## Publicación confirmada sobre la escena

`confirmed-state-receiver.js` aplica instantáneas completas recibidas por el cliente de autoridad a un estado dedicado a presentación. Comprueba sesión, secuencia, identidad de partida, tiempo y orden de IDs de eventos antes de aplicar; reconcilia objetos y listas conservando las identidades existentes por ID, y notifica únicamente a los observadores de presentación mediante `notifyConfirmedPresentationEvent`. Un duplicado o hueco no se aplica. Si un observador falla después de una aplicación parcial, el receptor queda en fallo y no reejecuta los efectos: no hay rollback ni recuperación automática.

`tools/trees/audit_authority_real_scene.mjs` carga la `WorldScene` QA real de manglares de islotes con 25 regiones y 20 bestias. La simulación local queda detenida y el Worker de autoridad avanza diez intervalos de 50 ms; el render sigue ejecutándose mientras llegan las respuestas y el receptor aplica las diez instantáneas en orden. En la ejecución guardada, 20 referencias de animales y sus posiciones en escena coincidieron al final; 12 eventos llegaron a los observadores visuales y ninguno a los observadores de simulación. Se dibujaron 53 fotogramas mientras se esperaban respuestas. El tiempo total de 2167 ms incluye las diez solicitudes, serialización, aplicación y render de la prueba: no es una medición aislada de latencia ni demuestra fluidez. Se renombra un ID cero del fixture QA y se actualizan sus referencias en la escena. Resultado: `gpu-animation/simulation-authority-real-scene.json`.

Esto conecta los componentes con la escena real **en un fixture**, pero no con el bucle ni controles de la partida. La escena mantiene su mundo espacial auxiliar para render; el Worker no incorpora todavía física de impactos, y la prueba no incluye comandos de usuario, cambios de obstáculos, saturación, guardado, reproducción continua ni horizonte visual seguro. Se envían instantáneas completas y JavaScript sigue actualizando posiciones y animaciones individualmente. Antes de activar la ruta en una partida hay que conectar física y comandos, definir recuperación ante error del receptor y evitar que el hilo de presentación vuelva a ejecutar reglas o se adelante al estado confirmado.

## Orden confirmada de escudo en la escena

`tools/trees/audit_authority_scene_shield.mjs` amplía la prueba de `WorldScene` de manglares de islotes con 20 animales: alterna diez avances con una orden `castShield` enviada al Worker. La escena no ejecuta su simulación local y aplica cada una de las once respuestas mediante el receptor de estado confirmado. El Worker acepta el escudo, publica `SpellActivated` y el estado resultante; la escena contiene el escudo y `ShieldVfx` crea la instancia asociada. Los 17 eventos recibidos se notificaron a presentación y ninguno a observadores de simulación; se conservaron las referencias y posiciones de los 20 animales. El render produjo 53 fotogramas mientras se esperaban las respuestas. Resultado: `gpu-animation/simulation-authority-scene-shield.json`.

La orden se envía programáticamente, no mediante los controles reales; la posición procede de una previsualización local. La existencia de una instancia de efecto no demuestra por sí sola su calidad visual ni la sincronización completa de colisiones. El Worker sigue sin física de impactos; la escena conserva su mundo espacial auxiliar, y no se prueban entrada real, guardado, saturación, recuperación, obstáculos cambiantes ni presentación autónoma en GPU. El bucle y los controles de la partida normal siguen usando la simulación principal. El tiempo total de la prueba incluye once mensajes, render y carga de prueba; no es una medición de rendimiento de partida.

## Física de una hiena en el Worker

La autoridad permite habilitar expresamente una única hiena por ID. El Worker carga su rig geométrico y clips originales, inicializa Rapier y conecta `BeastCombatPhysics` a la navegación de la simulación. La orden `castAttack` solo admite ese animal y publica también sus transformaciones esqueléticas. Este camino aún no se activa desde la partida. Si hay una estructura intacta distinta de una muralla a menos de diez metros, o aparece otro ragdoll activo, falla de forma explícita porque todavía no dispone de todos los objetos físicos de la escena; no se permite continuar omitiendo esas colisiones. El adaptador usa los lectores geométricos y de clips del ensayo existente y una actualización de pose por paso de simulación: aún debe compararse con `WorldScene` y ampliarse a las demás especies, objetos y contactos.

En `tools/trees/audit_authority_physics.mjs` una captura de incursión de manglares proporciona una hiena real. El Worker y una referencia local ejecutan **el mismo controlador de física nuevo** desde el mismo estado, con un ataque y 400 intervalos de 50 ms. Coincidieron instantáneas, eventos y transformaciones publicadas en las 401 órdenes; hubo 216 intervalos con físico activo y se observaron caída, giro y recuperación, finalizando liberada. Una segunda inicialización situó la hiena junto a un centro y verificó el rechazo por geometría ausente. Datos: `gpu-animation/simulation-authority-physics.json`. Esta prueba compara hilos, no demuestra equivalencia con la física y poses de `WorldScene`, ni cubre varios cuerpos, edificios, entrada real o render de la pose recibida.

El estado vivo puede contener `magicDown.phase="rolling"`, que el validador de guardados actual rechaza. `confirmed-live-state.js` permite validar y publicar esa fase para presentación sin modificarla ni declarar que sea un guardado restaurable. Las respuestas exponen `saveAvailable:false` mientras hay un derribo o impacto pendiente/reciente; la prueba observó esa condición en 221 respuestas y volvió a permitir guardado después de finalizar el impacto. No se implementa todavía la restauración del estado de Rapier: el futuro integrador debe respetar esa señal y no perder una solicitud de guardado. La validación de los demás campos sigue vigente.

La partida normal continúa usando `Game.advanceReal` y la física de `WorldScene` en el hilo principal. Para avanzar hacia una incursión jugable faltan la geometría real de estructuras, todos los rigs y actores, presentación de poses físicas confirmadas, recuperación/guardado físico, acciones y control de residencia; esta prueba limitada no justifica activar el Worker como autoridad general.

Tras finalizar el físico y vencer el impacto, `saveAvailable` vuelve a `true` porque ya no queda un cuerpo activo ni un impacto pendiente; esto solo indica que se cumplen las condiciones actuales de formato y admisión del Worker. La equivalencia de una restauración posterior al impacto todavía debe comprobarse. Los fixtures anteriores comparten ahora los mismos lectores de rig y clips, y una ejecución de su prueba de paridad física existente ha seguido pasando.

## Pose física confirmada sobre `WorldScene`

La autoridad toma la pose después del paso físico. `WorldScene` dispone de una vía opcional que, cuando recibe una pose confirmada para un animal concreto, comprueba identidad y correspondencia completa de huesos antes de aplicar las transformaciones al rig existente; para los demás actores mantiene la ruta normal. La opción no está conectada a la partida normal. El receptor debe instalar la pose junto con el estado confirmado y retirarla al terminar el físico; el fixture reinicia entonces la acción local para volver al comportamiento anterior.

`tools/trees/audit_authority_scene_physics.mjs` usa una `WorldScene` real de manglares de islotes con 20 animales y traslada una hiena a una posición de prueba alejada de estructuras no soportadas. Envía un ataque programático al Worker, aplica 82 publicaciones confirmadas y comprueba 78 poses activas contra las transformaciones efectivamente presentes en el rig de escena. El ciclo pasó por caída, giro y recuperación y terminó liberado; 56 eventos llegaron a presentación y ninguno a observadores de simulación. Hubo 198 fotogramas dibujados mientras se esperaban respuestas, sin errores de escena. Un ID cero de QA se renombró para el puente nativo. Resultado: `gpu-animation/simulation-authority-scene-physics.json`.

Esta prueba demuestra el enlace funcional de una hiena bajo las restricciones del Worker, no equivalencia con la física original de `WorldScene` ni aceptación visual continua. La pose todavía se copia y aplica desde JavaScript en CPU, sin interpolación ni horizonte seguro; no cubre controles de usuario, obstáculos cambiantes, edificios cercanos, varias bestias físicas, recuperación desde guardado o integración en el bucle de partida. El tiempo de fotogramas no se ha evaluado como mejora de rendimiento.

## Cinco especies en la autoridad física

La opción explícita de física ya acepta una bestia de cualquiera de las cinco especies instaladas: hiena, león, facóquero, búfalo y rinoceronte. Sigue admitiendo **un solo cuerpo físico a la vez** y rechaza edificios cercanos sin geometría y otros ragdolls activos. El resto de la partida aún no usa esta opción.

`tools/trees/audit_authority_five_species.mjs` toma cinco animales de la escena QA de manglares de islotes, los sitúa individualmente lejos de edificios no soportados y compara cada impacto del Worker con una referencia local que ejecuta el mismo controlador nuevo. Las cinco secuencias coincidieron en estado, eventos y pose, y completaron caída, giro y recuperación. Es una comparación entre hilos, no con el gestor original de `WorldScene`; resultados en `gpu-animation/simulation-authority-five-species.json`.

Además, `tools/trees/audit_authority_scene_species.mjs` aplicó las poses confirmadas a los modelos reales de la escena para las cuatro especies restantes. León, facóquero, búfalo y rinoceronte completaron el ciclo con 82, 84, 61 y 87 poses activas verificadas respectivamente, sin errores de escena; la hiena se probó por separado en `simulation-authority-scene-physics.json`. Los cuatro informes individuales son `gpu-animation/simulation-authority-scene-{lion,warthog,buffalo,rhino}.json`. Las órdenes son programáticas, cada caso traslada el animal a un sitio de prueba y las poses se aplican en CPU. No son una comparación visual continua ni prueban equivalencia de contacto con `WorldScene`, interacción entre ragdolls, edificios, entrada real, GPU o guardado durante física activa.

El bucle y los controles de la partida normal siguen en el hilo principal. El siguiente obstáculo es proporcionar al Worker la geometría física real de estructuras y la gestión conjunta de actores, y conectar órdenes y publicaciones a la partida sin activar simultáneamente la simulación local.

## Dependencia de geometría de edificios para la autoridad física

La física de producción no obtiene las cajas de edificios del estado autoritativo: `visitBeastSolids` consulta `world.objects` y ejecuta `Box3.setFromObject` sobre el objeto de escena para cada estructura intacta no mural situada a diez metros. `NativeBuilding` incorpora geometría de cuerpo y ceniza y `BuildingEffects` añade una malla de fragmentos al mismo grupo. Las murallas y la vegetación usan otros datos. Por tanto, inferir una caja solo del centro, o enviar una caja sin verificar su correspondencia con el estado y la geometría, no demuestra equivalencia con la física actual. La restricción del prototipo sigue activa y rechaza estos contactos.

Tres vías para resolverlo son: reconstruir en el Worker las geometrías y transformaciones que determinan la caja actual; transferir una descripción geométrica inmutable y versionada de las plantillas para que el Worker calcule sus propios límites al cambiar las estructuras; o transferir límites evaluados en la escena con versiones y comprobaciones estrictas de vigencia. La segunda evita depender de una consulta síncrona a presentación y es la candidata a contrastar primero, siempre que incluya todos los componentes que afectan a `setFromObject`. La tercera puede servir para una comparación inicial, pero no debe convertir la escena en autoridad permanente ni aceptar datos obsoletos. La primera podría reproducir más fielmente el comportamiento, a costa de cargar y mantener más componentes visuales en el Worker. Ninguna está integrada ni validada todavía.

Para retirar la restricción hay que comparar las cajas resultantes con las de `WorldScene` bajo diferentes culturas, orientaciones, alturas y estados, y después contrastar los impactos reales junto a edificios; también faltan varios cuerpos físicos simultáneos, entrada y guardado. Hasta entonces la partida normal continúa ejecutando `Game.advanceReal`, las decisiones de la aplicación y la física de escena en el hilo principal; la pose publicada del experimento se aplica por JavaScript y no representa una trayectoria GPU autónoma.

## Plantilla experimental de geometría de estructuras

`worker-structure-geometry.js` captura una vez las cajas locales y matrices de las geometrías hijas de un edificio nativo ya preparado. El Worker reconstruye objetos ligeros y calcula sus transformaciones a partir del estado de simulación y el terreno, sin consultar la escena en cada paso. La opción se transmite explícitamente al inicializar la autoridad física; si no se proporciona, sigue vigente el rechazo anterior. Si falta una plantilla para una estructura cercana, su geometría no es válida, cambia su cultura o cambia su transformación una vez admitida, el experimento falla en vez de continuar con una caja potencialmente obsoleta. La vía no está conectada a la partida normal.

En el escenario QA de manglares de islotes, `audit_worker_structure_geometry.mjs` comparó la caja reconstruida con `Box3.setFromObject` sobre un centro real mapungubwe, incluidas sus cuatro geometrías, para cinco orientaciones; la diferencia máxima fue cero. `audit_authority_scene_building_physics.mjs` utilizó la plantilla capturada en una autoridad Worker, con una hiena situada a menos de diez metros del centro. El impacto programático completó caída, giro y recuperación y se verificaron 74 poses activas sobre el rig de escena. Estos resultados están en `gpu-animation/worker-structure-geometry.json` y `gpu-animation/simulation-authority-scene-building-physics.json`. La prueba de regresión sin plantilla siguió rechazando el edificio cercano; la comparación entre el Worker y el mismo controlador local siguió coincidiendo durante 401 órdenes.

La prueba cercana no verifica que el cuerpo haya llegado a tocar el edificio ni compara el resultado físico con el gestor original de `WorldScene`. Solo se ha contrastado una cultura y un edificio intacto; faltan cambios de geometría, destrucción y reconstrucción, múltiples culturas y cuerpos, impactos consecutivos, guardado y controles reales. La plantilla aún procede de una escena preparada y no constituye un mecanismo completo de distribución de recursos o actualización de estructuras. La física sigue limitada a un actor, y su pose se copia desde JavaScript. No activar esta ruta como autoridad general hasta resolver esas condiciones.

## Contacto contra edificio y varios cuerpos experimentales

`audit_worker_building_contact.mjs` compara dos mundos Rapier creados a partir del mismo rig real de hiena y de las mismas opciones: uno usa `BeastPhysicsEnvironment` con el objeto original de `WorldScene`, y el otro utiliza la plantilla de geometría reconstruida. En 240 pasos se registraron 70 contactos efectivos con el centro en ambos mundos y el error máximo de pose fue cero. Los dos solvers de esta prueba se ejecutan en el hilo principal: valida el contacto y la equivalencia de esta geometría en ese fixture, no una incursión completa ni un contacto observado a través del Worker. Resultado: `gpu-animation/worker-building-contact.json`.

La autoridad experimental ahora acepta una lista explícita de hasta tres animales y publica sus poses ordenadas en `physicsPoses`; la interfaz anterior de un solo animal conserva `physicsPose`. El controlador comparte un único `BeastCombatPhysics` y mundo Rapier entre los actores admitidos. Los impactos o ragdolls de animales no registrados y la geometría ausente provocan fallo explícito. No hay admisión dinámica, fallback para más actores ni integración en el bucle de juego.

`audit_authority_multiple_physics.mjs` comparó 461 órdenes entre autoridad Worker y el mismo controlador local para hiena y facóquero, con dos ataques normales y sus recuperaciones. La recarga de ataque hizo que no hubiera solapamiento físico. Para probar la interacción simultánea sin cambiar esa regla, `audit_authority_simultaneous_physics.mjs` inyecta dos impactos únicamente en el laboratorio: los dos cuerpos estuvieron activos conjuntamente durante 210 pasos, se detectaron 11 contactos entre ellos y las secuencias de pose y posición coincidieron entre Worker y referencia local durante 238 pasos. Resultados: `gpu-animation/simulation-authority-multiple-physics.json` y `gpu-animation/simulation-authority-simultaneous-physics.json`.

Estas pruebas no comparan la simulación conjunta contra el gestor físico de producción de `WorldScene`, ni validan la combinación de múltiples cuerpos con edificios cambiantes, entrada real, sincronización visual continua, guardado físico o saturación. El juego normal continúa avanzando en el hilo principal y las poses experimentales se aplican en CPU. Antes de una incursión desacoplada hay que admitir actores según eventos reales, conservar los fallbacks de capacidad existentes y conectar comandos, residencia, presentación y guardado sin duplicar autoridad.

## Admisión dinámica experimental

El cliente de autoridad acepta ahora la opción explícita `dynamicPhysics`. El Worker inicia el controlador con un registro vacío y, antes de ejecutar una orden de ataque, carga asíncronamente el rig y los clips del objetivo si aún no está admitido. La orden conserva su secuencia; el cliente mantiene las siguientes en cola hasta recibir la respuesta. El controlador reutiliza el registro para impactos posteriores y comparte el mundo Rapier. Las comprobaciones de geometría se limitan a los actores activos, pendientes o seleccionados para el ataque. La ruta anterior con actores preseleccionados sigue disponible.

`audit_authority_dynamic_physics.mjs` compara una hiena y un facóquero admitidos bajo demanda con una referencia local del mismo controlador: coincidieron estado, eventos y poses durante 461 órdenes, con ambos ataques y recuperaciones completos. En una segunda inicialización, un avance enviado inmediatamente después del ataque permaneció en cola hasta terminar la admisión; el navegador recibió 13 callbacks de animación mientras esperaba. Este número no es una medición de FPS ni demuestra fluidez de una escena en producción. Resultado: `gpu-animation/simulation-authority-dynamic-physics.json`.

`audit_authority_scene_dynamic_physics.mjs` ejecutó además un ataque programático en la `WorldScene` QA de manglares de islotes con 20 animales, cerca de un centro y con su plantilla experimental de geometría. El Worker admitió la hiena bajo demanda, y se verificaron 76 poses activas aplicadas al rig de escena a lo largo de caída, giro y recuperación. El fixture produjo 204 fotogramas mientras esperaba respuestas; no es una comparación de rendimiento ni prueba de contacto con el centro. Resultado: `gpu-animation/simulation-authority-scene-dynamic-physics.json`.

El registro aún conserva rigs admitidos y publica sus poses; no gestiona su retirada ni el ciclo completo de oleadas. El límite de tres cuerpos físicos activos rechaza por ahora un ataque adicional en vez de implementar el fallback precocinado usado por la escena; esta diferencia impide activar la ruta en la partida. Tampoco se admiten automáticamente impactos procedentes de otras fuentes, y un error del Worker termina la sesión del cliente. Faltan equivalencia con el gestor de producción, controles reales, guardado y recuperación física, coordinación de regiones y conexión segura al bucle principal. Las poses siguen en CPU y no existe presentación autónoma en GPU. El juego normal continúa ejecutando la simulación y la física en el hilo principal.

## Fallback precalculado en la física experimental del Worker

El controlador experimental carga ahora el mismo banco de caídas y utiliza `BakedBeastFallbacks`, como `WorldScene`, cuando los tres cuerpos Rapier están ocupados. Las poses del fallback se publican como activas y sus contactos con terreno, estructuras y cuerpos utilizan los componentes existentes. La orden ya no se rechaza únicamente por alcanzar tres cuerpos; el fallback conserva el límite y las decisiones del gestor original. Esto sustituye la limitación sobre ese rechazo descrita en la sección anterior, pero no demuestra todavía equivalencia de la incursión completa.

`audit_authority_fallback_physics.mjs` inyecta cuatro impactos simultáneos en una captura de manglares de islotes: tres animales usan Rapier y uno el fallback. El controlador en Worker y una referencia local del mismo controlador coincidieron durante 226 pasos hasta completar las recuperaciones. Se validó la serialización del estado confirmado y que no se anunciara guardado restaurable durante el físico activo. En este fixture, muestrear poses cada paso o cada cinco pasos produjo el mismo estado de los animales. Los impactos se inyectan solo en el laboratorio y evitan la recarga para crear saturación; el resultado no compara con el gestor de producción de `WorldScene`, ni verifica múltiples fallbacks, cambios de obstáculos, presentación o guardado y restauración en la partida. Resultado: `gpu-animation/simulation-authority-fallback-physics.json`.

Siguen pendientes la gestión del ciclo de oleadas y rigs, la entrada y errores de comandos, recuperación desde guardado, residencia y conexión segura de la autoridad al bucle real. El juego normal sigue simulando y presentando en el hilo principal; esta integración es reversible y no constituye todavía una incursión desacoplada.

## Rechazos ordinarios de magia en la autoridad

La autoridad experimental comprueba los ataques y escudos con la validación existente antes de ejecutar la orden. Si el objetivo dejó de ser válido, la magia está en recarga o la colocación del escudo no es válida, devuelve `value:false` y `rejection` con el motivo, publica la siguiente secuencia y mantiene el Worker disponible. En ataques dinámicos esta comprobación se hace antes de cargar un rig. Las órdenes duplicadas siguen devolviendo `false`. Los errores de protocolo, datos físicos ausentes y otros fallos siguen terminando la sesión: no se interpretan como rechazos normales.

`audit_authority_rejected_spell.mjs` utilizó una captura de manglares de islotes y comprobó, en siete respuestas ordenadas, un objetivo inexistente, un ataque válido, un ataque durante recarga, un avance posterior, un escudo solapado con un animal y una orden duplicada. Los rechazos no cambiaron el estado ni emitieron eventos; tras el primer rechazo el ataque válido funcionó y después del segundo siguió avanzando la simulación. La prueba es programática y no cubre todavía la interfaz de juego. Resultado: `gpu-animation/simulation-authority-rejected-spell.json`.

Esta corrección elimina una causa de cierre de sesión para esas órdenes concretas; no proporciona aún gestión recuperable para todas las acciones o errores. La partida real sigue usando el hilo principal para simulación y controles. Faltan la conexión de las órdenes y publicaciones al bucle de juego, el resto de acciones, guardado y recuperación antes de declarar una incursión desacoplada.

## Órdenes experimentales de cosecha y reparación

La autoridad y su cliente aceptan `harvest` y `requestRepair`. Las mismas validaciones previas que utilizan las funciones de juego determinan si la acción puede ejecutarse; los rechazos normales se publican en orden sin cerrar el Worker. La ejecución conserva las funciones originales, sus eventos y el tratamiento previo de comandos duplicados. Las validaciones se han extraído de esas funciones para que la autoridad pueda comprobarlas sin modificar el estado.

`audit_authority_farm_commands.mjs` comparó ocho órdenes con las funciones `Game` directas a partir de una captura de manglares de islotes modificada a situación pacífica: cosecha válida, reparación válida, objetivos inexistentes, duplicado, pausa y reparación durante la pausa. Coincidieron instantáneas, valores, eventos y mensajes de rechazo. Pasaron además 41 pruebas de juego, cosecha, reparación y cliente. Resultado: `gpu-animation/simulation-authority-farm-commands.json`.

La interfaz todavía llama a las funciones locales; estas órdenes solo están disponibles en el protocolo experimental. No se han migrado siembra, construcción, contratación, todas las variantes de magia ni guardado, y no se ha validado una campaña completa. La simulación y la presentación de la partida normal siguen en el hilo principal.

## Órdenes experimentales de siembra y magia agrícola

El protocolo de la autoridad acepta ahora `plant` y `castAgricultural` para crecimiento y multiplicación. La validación de colocación y la comprobación de presupuesto de siembra se comparten con la función original; las condiciones normales de rechazo devuelven su mensaje sin modificar el estado ni cerrar el Worker. Una región espacial no residente sigue propagándose como fallo, no como rechazo de colocación: aún falta integrar la demanda y recuperación de regiones para esta acción. Las magias reutilizan la validación existente y las garantías de idempotencia.

`audit_authority_plant_spells.mjs` comparó seis órdenes con las funciones `Game` directas desde una captura pacífica modificada de manglares de islotes: una colocación inválida, una siembra válida, crecimiento, multiplicación solapada, una orden duplicada y una multiplicación válida. Coincidieron estado serializado, valores, eventos y mensajes. Pasaron además 47 pruebas de juego, cosecha, reparación, magia y cliente. Resultado: `gpu-animation/simulation-authority-plant-spells.json`.

Son órdenes programáticas de la autoridad experimental: la interfaz aún usa el estado local. No están integradas la construcción, contratación, el resto de controles, el guardado físico ni la recuperación de errores y regiones, y la partida normal continúa avanzando en el hilo principal. Esto no constituye una incursión jugable desacoplada ni una medición de rendimiento.

## Regiones necesarias para sembrar

Antes de ejecutar una siembra, la autoridad experimental consulta la colocación. Si Wild Engine señala regiones de propiedades no residentes, el Worker las incorpora en el orden recibido y repite la validación antes de gastar recursos o crear el cultivo. La respuesta incluye `commandLoadedChunks` cuando ha sido necesario incorporar regiones. Se conserva un límite de seguridad de 64 incorporaciones por orden y se detiene la ejecución si la demanda no progresa; no es un presupuesto de tiempo por fotograma. Las regiones descubiertas solo se cargan en la autoridad: la coordinación completa con la residencia visual aún está pendiente.

`audit_authority_plant_residency.mjs` comparó dos autoridades desde la misma captura pacífica modificada de manglares de islotes, una precargada y otra sin regiones iniciales. En el primer caso de prueba, la autoridad vacía incorporó `2,-1` y `2,0`, sembró y produjo el mismo estado y evento que la precargada. En otro punto incorporó `2,0`, detectó el árbol o roca que impedía sembrar y devolvió el mismo rechazo sin cambiar el estado; después aceptó otra orden. Resultado: `gpu-animation/simulation-authority-plant-residency.json`. También pasaron 30 pruebas de juego y protocolo, las comparaciones de órdenes agrícolas existentes y la regresión de adición explícita de regiones y retirada de muralla.

Esta recuperación cubre la validación de siembra, no toda consulta espacial ni la residencia de presentación, y no demuestra fluidez de una partida. Los fallos de generación o de demanda no progresiva siguen cerrando la sesión experimental. La partida normal continúa simulando en el hilo principal y siguen faltando los controles, guardado y conexión completa de la autoridad.

## Contratación experimental en el Worker

La autoridad acepta `openInitialHiring`, `hire` y `hireAdditional`. Las comprobaciones de disponibilidad, perfiles y fondos se comparten con las funciones originales y los rechazos normales se devuelven ordenadamente sin cerrar la sesión. Las decisiones de contratación, transacciones, creación de trabajadores y planificación siguen ejecutándose en las mismas funciones de juego.

`audit_authority_hiring.mjs` comparó siete órdenes con las funciones directas desde una captura pacífica modificada de manglares de islotes: apertura de contratación, perfil inválido, fondos insuficientes, contratación inicial, duplicado, centro inexistente y contratación adicional. Coincidieron instantáneas, eventos, valores y mensajes. Pasaron además 61 pruebas de juego, límites económicos, reparación y cliente. Resultado: `gpu-animation/simulation-authority-hiring.json`.

Esta ruta sigue siendo programática y no está conectada a los diálogos reales. No se ha probado el trabajo posterior de los contratados ni un guardado o campaña desde esta autoridad. El bucle de partida y la presentación normales siguen en el hilo principal; faltan construcción, controles restantes y conexión de estados y guardado.

## Construcción experimental de cadenas de muralla

La autoridad acepta `buildWallChain` y ejecuta la cotización, la selección de puertas y la construcción con las funciones existentes de juego y Wild Engine. La cotización permanece dentro del Worker y se aplica en la misma orden; no se acepta una cotización preparada desde presentación. Si faltan regiones durante la cotización, la autoridad las incorpora y vuelve a evaluar antes de ejecutar la compra. Los rechazos ordinarios de permiso, trazado, material y presupuesto se devuelven sin cerrar la sesión; los fallos no reconocidos siguen siendo errores de la autoridad.

`audit_authority_build_wall.mjs` partió de una captura pacífica modificada de manglares de islotes sin sus murallas anteriores. Tras restaurar tanto la referencia local como el Worker desde la misma captura, comparó una cadena válida, un duplicado, trazado y material inválidos, y 20 avances posteriores: coincidieron los estados, resultados y eventos. Otra autoridad inicialmente sin regiones residentes cargó `0,-1` y `1,-1` y produjo el mismo estado y evento de construcción. La cadena probada tenía una pieza y ninguna puerta; no demuestra equivalencia de recintos, gestos de usuario ni cambios de barrera durante una incursión. Resultado: `gpu-animation/simulation-authority-build-wall.json`. Pasaron además 60 pruebas de juego, puertas y protocolo.

El gesto de construcción todavía llama directamente al juego local. Faltan pruebas de cadenas complejas y puertas bajo carga, construcción de centros, integración de controles, guardado y una incursión real completa. La simulación y presentación normales continúan en el hilo principal.

## Centros y puertas individuales en la autoridad experimental

`placeStructure` está disponible como orden de la autoridad. La preparación de la colocación se comparte con la función original; el Worker comprueba permiso y presupuesto antes de confirmar con la misma función de juego. También incorpora regiones cuando la consulta de colocación identifica sectores ausentes. Para centros, la comprobación de acceso detecta resultados espaciales desconocidos y falla explícitamente en vez de confundirlos con una ruta imposible.

`audit_authority_place_structure.mjs` comparó una nueva construcción de centro, una puerta individual, una orden duplicada, un centro solapado y diez avances posteriores contra las funciones originales desde una captura pacífica modificada de manglares de islotes. Coincidieron instantáneas, valores y eventos; la posición final del centro incluía el ajuste de colocación del juego. Con una autoridad sin regiones iniciales, la búsqueda de acceso del centro terminó de forma explícita por residencia desconocida: aún no identifica ni carga todos los sectores necesarios y el cliente experimental se cierra. Resultado: `gpu-animation/simulation-authority-place-structure.json`. También pasaron 83 pruebas de juego, economía, puertas y cliente, y la comparación existente de cadenas de muralla.

Esto no conecta la herramienta de construcción real con el Worker. Faltan recuperación de la búsqueda de acceso y de errores, coordinación de regiones visuales, pruebas en incursiones y conexiones de controles y guardado. La partida normal sigue simulando y presentando en el hilo principal.

## Recuperación de sectores para el acceso a centros

Cuando la consulta nativa de acceso a un centro devuelve un resultado desconocido, la autoridad experimental solicita los sectores aún no residentes del rectángulo entre sus extremos con el mismo margen de 48 unidades utilizado por la búsqueda provisional y vuelve a evaluar. Si todos esos sectores ya están presentes, conserva el resultado de la búsqueda existente; si la demanda supera el límite de seguridad o no progresa, sigue fallando explícitamente. El límite es de sectores, no de tiempo de renderizado. Esta recuperación sustituye el fallo del caso de residencia vacía descrito en la sección anterior.

En `audit_authority_place_structure.mjs`, una autoridad sin regiones iniciales incorporó 16 sectores y completó el mismo centro que la referencia precargada, con estado y eventos idénticos; después aceptó otra orden. El mismo ensayo también comparó una puerta, una colocación inválida y diez avances con la referencia. Pasaron 46 pruebas de juego, puertas y protocolo y la comparación de residencia de siembra. Resultado actualizado: `gpu-animation/simulation-authority-place-structure.json`.

Es una comprobación programática de un centro en manglares. Faltan rutas inaccesibles y largas, varias aldeas, otros biomas, límites de demanda y la coordinación con regiones visuales. Cargar el corredor no demuestra que la navegación completa ya esté migrada. Los controles y el bucle normal de partida siguen en el hilo principal.

## Recepción conjunta de estado y poses en `WorldScene`

`WorldScene.createConfirmedReceiver` crea un receptor para una sesión de autoridad. Comprueba el orden de publicación, valida las poses y su asociación con animales activos antes de modificar la escena, aplica el estado confirmado y actualiza las poses antes de notificar eventos de presentación. Descarta publicaciones obsoletas y huecos, y reinicia la acción local de un rig al retirar su pose física. Si la reconciliación o un observador falla, el receptor queda en fallo; todavía no hay rollback ni recuperación automática. Los rigs que aún no están cargados se comprueban completamente al aplicar su pose.

`audit_authority_scene_receiver.mjs` utilizó este punto de entrada en la `WorldScene` QA de manglares de islotes con 20 animales. Un ataque programático sobre una hiena admitida por el Worker completó caída, giro y recuperación; se verificaron 95 poses activas, 68 eventos llegaron a presentación y ninguno a los observadores de simulación. Los 239 fotogramas dibujados mientras se esperaban respuestas no son una comparación de rendimiento. Pasaron 11 pruebas del receptor, poses y cliente, incluidos mensajes desordenados, rig incompatible y orden de eventos. Resultado: `gpu-animation/simulation-authority-scene-receiver.json`.

La escena normal aún no crea este receptor ni delega el avance de `Game.advanceReal`. La prueba no usa controles reales ni varios cuerpos, y las poses se aplican en CPU. Quedan la integración de comandos y pausas, residencia visual, guardado, recuperación ante fallo, reproducción temporal y la comparación física y funcional de una incursión completa.

## Coordinación temporal independiente del render

`WorldScene.createWorkerRuntime` conecta el cliente de autoridad y el receptor confirmado mediante una cola ordenada. Un temporizador de JavaScript acumula el tiempo real en pasos de simulación y los envía al Worker sin esperar a `requestAnimationFrame`; los comandos de usuario se intercalan después de los pasos ya devengados. Las regiones demandadas por la autoridad se incorporan antes de continuar con los pasos pendientes. El estado de diagnóstico informa de pasos y regiones pendientes. Cerrar o fallar el coordinador rechaza las órdenes pendientes; no hay recuperación automática. El temporizador todavía vive en el hilo principal: el cálculo de `advanceReal` y física se ejecuta en el Worker, pero aún no existe un reloj autónomo dentro de él.

`audit_worker_game_runtime_pause.mjs` usó un reloj determinista con el Worker real: procesó los pasos anteriores a una pausa, mantuvo exactamente el tiempo de simulación durante ella y reanudó los pasos posteriores. `audit_worker_game_runtime_scene.mjs` usó el coordinador sobre la `WorldScene` QA de manglares de islotes, con 20 animales y simulación local detenida: un ataque programático completó caída, giro y recuperación mientras el render continuaba; se observaron 186 fotogramas con pose física y ningún evento fue enviado a observadores de simulación locales. Los resultados están en `gpu-animation/worker-game-runtime-pause.json` y `gpu-animation/worker-game-runtime-scene.json`. Pasaron 11 pruebas de cola, receptor y cliente, incluida la cancelación de una orden en vuelo. Los fotogramas contados no son una comparación de FPS ni demuestran ausencia de tirones.

El coordinador aún no se instancia desde el bucle normal ni conecta los controles, tutorial, microeventos, sincronización espacial de presentación o guardado. Durante una pausa sigue enviando pasos que el juego descarta; no se ha optimizado esa carga. La señal `saveAvailable` se refiere a la última publicación confirmada: un futuro guardado debe solicitar una barrera ordenada y resolver la física activa, no guardar a ciegas. Los datos se publican como instantáneas completas y las poses se aplican en CPU; faltan trayectorias seguras y animación GPU. La partida normal todavía llama a `Game.advanceReal` en el hilo principal.

La conexión futura de los controles debe materializar en datos las posiciones de origen y contacto antes de enviar una orden: el flujo actual de `onPick` pasa una función para calcular el origen y esa función no es transferible al Worker. Las mutaciones del tutorial y los microeventos también deben pasar a la autoridad o a un contrato explícito antes de activar el coordinador en la partida normal.

## Selección de magia transferible

La selección de objetivo de `castPickedSpell`, utilizada por la aplicación actual, se comparte ahora con `pickedSpellCommand`. Este último transforma el origen y el contacto visual en datos transferibles para las órdenes de ataque, escudo, crecimiento y multiplicación; la autoridad sigue validando la acción contra su propio estado. La ruta local conserva la evaluación diferida de la función de origen. En la ruta transferible el origen debe calcularse antes de enviar la orden, por lo que puede hacerse trabajo visual incluso si la autoridad la rechaza; esta diferencia debe tenerse en cuenta al conectar el control real.

`audit_worker_picked_spell.mjs` comparó un ataque seleccionado programáticamente en una captura de manglares de islotes con `castPickedSpell` directo: el estado, el origen, el contacto y los eventos coincidieron al enviar la orden al Worker. Pasaron además 42 pruebas de selección, magia agrícola, combate y controles. Resultado: `gpu-animation/worker-picked-spell.json`.

No se ha conectado `pickedSpellCommand` a `onPick` ni se ha probado un gesto real con autoridad Worker. El bucle normal aún usa `Game.advanceReal` y los controles locales; tutorial, microeventos, guardado y sincronización de presentación siguen pendientes.

## Despacho de magia desde una selección de escena

`dispatchPickedSpell` conserva la ruta local síncrona y, cuando recibe un coordinador Worker, envía la orden transferible y espera su publicación confirmada antes de devolver el resultado o el rechazo. `onPick` de la aplicación utiliza este despachador y protege la respuesta tardía frente a un cambio de partida o escena. La ruta Worker exige además que la escena proporcione `workerSave`; mientras no exista ese contrato, se rechaza antes de enviar el ataque para no guardar una copia de presentación como si fuera la autoridad. La aplicación normal todavía no crea ni instala el coordinador o ese guardado.

`audit_worker_pointer_attack.mjs` probó un clic real sobre una hiena en la `WorldScene` QA de manglares de islotes, con la simulación local detenida y el coordinador Worker instalado en la escena. El picking y el despachador compartido enviaron el ataque al Worker; se confirmó `GuardianMagicHit`, se entregaron dos eventos visuales y ninguno a observadores de simulación local. El control superpuesto del laboratorio se deshabilitó para el puntero y se comprobó que el clic alcanzara el lienzo. Resultado: `gpu-animation/worker-pointer-attack.json`. Pasaron 39 pruebas de magia, selección y coordinación, y se comprobó la sintaxis de la aplicación y del laboratorio.

La prueba no usa el bucle normal de la aplicación, ni prueba guardado, recuperación completa, tutorial o microeventos. La escena de QA no implementa el contrato `workerSave` de la aplicación. El origen visual se calcula antes de la confirmación del Worker; la UI y el guardado deben integrarse de forma ordenada antes de habilitar esta ruta en una partida. `Game.advanceReal` sigue ejecutándose en el hilo principal de la partida normal y las poses aún se aplican en CPU.
# Worker save checkpoint (experimental)

`createWorkerSaveCoordinator` requests a snapshot through the runtime command
queue, captures that confirmed state independently of later presentation
updates, and orders asynchronous repository writes. It checks the slot and
refuses snapshots reported as unavailable during active impact physics; it does
not wait for a paused simulation to advance. The caller must handle that
rejection and retry explicitly. A real Worker browser test covers ordered pause,
save and resume; unit tests cover concurrent writes and failures.

This is infrastructure only: the production game has not switched its save
path or simulation to the Worker. Active Rapier state is not serialised, and
restoring a running raid with identical future navigation and physics has not
been established. The checkpoint therefore must not be advertised as complete
save/restore support or used to enable the Worker in the main game yet.

Worker checkpoints now retain the validity of native raid-wait bindings. The
new Worker validates and remaps them against its own native revisions, then
removes the handoff data from the live state. A browser test restored the
island-mangrove raid checkpoint and matched an uninterrupted Worker for 30
ticks. That capture contained no active waits; current and stale waits are
covered separately by handoff tests, not by this end-to-end comparison. Active
physics, longer campaigns and production UI save/restore remain unverified.

The main scene's placement handler can now dispatch planting and individual
structures to an installed Worker runtime. Touch planting finds its nearby
valid point inside the authority, including loading missing regions, and the
normal local path remains available. A real Worker test compares the adjusted
planting state and events against the original placement decision in a peaceful
island-mangrove capture. The application does not yet install that runtime;
this is not a claim that the production game is Worker-driven. Other UI
commands, tutorial mutations and save/restore still need integration.

The wall-stroke handler also has a Worker path. The authority derives the
piece limit from its own balance when the command is executed, rather than
trusting the potentially stale presentation state. Programmatic Worker tests
cover matching construction and events, missing resident chunks, duplicates,
invalid input and the hiring reserve. A real pointer gesture and an active
raid with changing barriers remain to be tested in the integrated game.

Context-menu wall removal and repair, and repair from the hiring dialog, now
have a conditional Worker dispatch. Missing or paused wall-removal commands
return normal rejections instead of terminating the authority. Browser tests
compare repair and removal with direct game commands in a peaceful mangrove
fixture, including 50 intervals after removal. These tests do not cover the
actual menus or prove that menu pauses have been migrated to the Worker.

The hiring dialog and initial-hiring trigger can now submit to an installed
Worker runtime. The selection stays in the dialog until confirmed; a pending
initial trigger is deduplicated and the confirmation button waits for the
ordered reply. The existing Worker test compares initial and additional hiring
against direct game commands, including costs and invalid requests. The dialog
itself and its menu pause have not yet been exercised with a Worker runtime;
the ordinary game continues to use its original synchronous path.

Menu, visibility and graphics-context pauses now have a Worker dispatch path.
It submits pause and resume in order without editing the presentation state or
discarding a command based on an older publication. The deterministic Worker
clock test checks that elapsed simulation time stays fixed while paused. Result
screens, tutorial pauses and error handling are not migrated, and actual UI
interactions have not yet been verified with the runtime installed.

The actionable tutorial-hand pause is now a Worker command: presentation sends
only whether guidance targets are available, and the authority decides from
its own game state whether to pause. A new-game Worker test covers stopping,
open selection, an intervening menu pause and resumption. Tutorial message
selection, profile recording, reading and dismissal still execute locally;
the full tutorial remains an integration blocker.

An optional authoritative tutorial controller now accepts profile history,
updates, presentation, dismissal, skipping and presentation-time commands. It
returns profile records separately for persistence and rejects dismissals for
an obsolete message. A real Worker test compares the initial introduction,
its dismissal and timed guidance with the existing controller. The game UI
does not yet connect this controller to voice, persistent profile storage or
its per-frame tutorial flow; longer lessons and interruptions need validation.

The application now has a conditional bridge for an installed Worker runtime:
it forwards tutorial commands, supplies the currently narrated message and
persists confirmed profile records through `TutorialProfile`. It also skips
the local `Game.advanceReal` call while the Worker runtime is present. A real
Worker test covers the bridge with the actual profile implementation and an
in-memory storage backend. Runtime installation, full UI and voice, temporal
ordering under load, tutorial interruptions and real raids are not validated;
the ordinary game remains on its original execution path.

### Real-game development activation

The development-only `qa-worker-game` switch installs the Worker runtime after
loading the real scene. `qa-worker-start` starts a new savanna game and
`qa-worker-raid` loads the existing day-31 savanna pre-raid capture. These are
diagnostic switches, not production activation. Runtime teardown now disposes
the Worker with the scene. The application supplies the scene's active bounds
and raid camera view to the Worker at initialization and updates them when
they change; without this information the tested 13-animal raid could not find
its exterior entry and waited indefinitely.

Reproducible browser checks: `tools/experiments/audit_worker_main_game.mjs`
starts the real game and uses the actual UI to pause, resume, build a center,
plant and hire one worker. `tools/experiments/audit_worker_main_raid.mjs`
loads the capture, observes 13 animals enter, and uses a real pointer attack
that produces a confirmed `GuardianMagicHit`. Both were run with headless Edge
and SwiftShader enabled; these are functional checks, not GPU benchmarks.

This does not establish production readiness. In the original experimental
path the runtime clock and presentation reconciliation run on the main thread; ordinary
actor presentation and skeletal animation remain CPU-driven. Microevents,
several game actions, result screens, active-physics save/restore, full
determinism, saturation, multiple impacts and all biomes remain unverified.
The tutorial currently causes frequent Worker publications. No claim of a
global frame-time improvement follows from these tests.

With the optional `--complete` argument, `audit_worker_main_raid.mjs` also
waits for the actual `RaidEnded` event. In one headless Edge/SwiftShader run,
the day-31 savanna capture spawned 13 animals, accepted a pointer attack and
reached `RaidEnded` at simulation elapsed 176.69 s without a reported Worker
fault. This is one functional run, not a deterministic A/B comparison or proof
of contact fidelity, active-physics saving, other scenarios or performance.
The test observed thousands of ordered Worker publications during the raid;
the cause and total frame impact have not yet been measured.

The optional `--save-check` test exposed a control saturation failure after an
attack: the runtime queue rejected the menu pause when ordinary commands filled
its admission limit. A bounded reserve now admits pause, resume and snapshot
commands while preserving FIFO order; a unit test exercises saturation and the
reserve limit. A subsequent real-game run admitted the pause, but 186 earlier
simulation steps were already queued: it took effect roughly 9.35 simulation
seconds after the observed hit, after the physical fall had ended. Therefore
`--save-check` still fails its active-physics timing assertion. The reserve is a
correctness guard, not a solution for this response latency or a demonstration
that active-physics save and restore works. Reducing the backlog and measuring
end-to-end command latency are required before this path can be enabled.

### Experimental catch-up batches

The response backlog was examined as an integration blocker. Three approaches
were considered: move the authoritative clock and command ordering fully into
the Worker (the target architecture, but a larger change); replace full
snapshots with a versioned delta/event stream (requires a new recovery and
publication contract); or combine adjacent already-queued fixed steps into one
Worker request. The third is a reversible experiment, not a substitute for the
first two. It keeps each 0.05 s simulation step, preserves intervening command
order, and stops at a missing residency demand. Its configurable batch limit is
a responsiveness/safety bound, not a rendering frame budget. The default
remains one step; `qa-worker-batch=16` opts in for development only.

Two real Workers matched state, event order and residency for 100 steps of the
island-mangrove raid, including a separate run with an active hyena ragdoll and
matching final physics poses. A runtime unit test checks that a partial batch
loads missing terrain before continuing and before a queued pause. This does not
establish equivalence of intermediate visual events or multi-actor physics.

For an exploratory comparison, `audit_worker_main_raid.mjs --save-check` was
run alternately with `QA_BATCH=16` and `QA_BATCH=1`, twice each, on the same
headless Edge/SwiftShader setup. Pause confirmation took 3.430 and 3.657 s for
16 steps, versus 9.189 and 8.326 s for one step. All four runs rejected a save
during the fall and stored a checkpoint after recovery. These are four samples
of response latency, not a frame-time or GPU benchmark; inputs and click timing
were not deterministically replayed. Seconds of pause latency remain
unacceptable, active physics still cannot be saved, and no p95/p99, full raid
equivalence or global performance improvement has been established. Keep this
experiment opt-in until those conditions are addressed.

#### Diagnostic correction

The pause timings above are exploratory and must not be treated as a clean
performance comparison. The test's automatic search for a clickable animal
itself performs repeated scene picking on the presentation thread. After
reducing the search, one 16-step run still spent 1.93 s locating a pixel. Its
queue already held 78 simulation steps and 21 camera-view commands before the
search; afterwards it held 51 steps and 33 view commands. When the attack was
confirmed it held 71 steps and 75 view commands. A separate one-step run saw
123 view commands queued at attack confirmation. Thus both a pre-existing
backlog and test-generated work are present; the earlier pause figures cannot
be attributed solely to the application.

#### Experimental unchanged-view acknowledgements

For the camera backlog, three designs were considered: stop sending views while
no entry is expected (requires proving that an immediate follow-on wave cannot
need the current view); coalesce queued views (can change which view an
intervening simulation step sees); or retain every ordered view change while
acknowledging a view-only command without reserializing unchanged game state.
The third is implemented behind `qa-worker-view-ack` for evaluation. The
receiver checks the session, command sequence, game sequence, elapsed time,
pause reasons and absence of events and physics poses before accepting it.
The next state-changing command still publishes the complete confirmed state.

`tests/browser/worker-view-ack-benchmark.html` executes the same 100 view
changes and simulation steps in four alternating real Worker runs, with one
active hyena ragdoll. Full responses took 3191 and 3310 ms overall and about
115.3 million view-response JSON characters; compact responses took 2163 and
2188 ms and about 41,000 characters. The full snapshot, ordered events and final physics pose matched.
The view command's measured Worker execution total fell from about 888–895 ms
to 188–195 ms. These are isolated Worker measurements with no scene rendering
or GPU timing. A real-game exploratory run completed an attack and safe save,
but its pixel search alone took 3.03 s; its 2.56 s pause confirmation is not a
clean comparison with the previous samples. Keep the option experimental until
camera motion, complete raids, frame p95/p99 and end-to-end latency are tested
with a nonblocking, reproducible input trace.

An additional exploratory ABBA run uses `--direct --save-check`, which selects
the attack through the real UI and invokes its existing input handler for the
same animal without the expensive pixel search. All runs use `QA_BATCH=16`;
`QA_VIEW_ACK=0` is A and `QA_VIEW_ACK=1` is B. In order A/B/B/A, attack
confirmation took 3.343/2.339/1.799/3.603 s; pause confirmation took
3.782/1.692/0.837/3.894 s. Before attack, the A runs had 20 and 24 pending
steps; B had 13 and 8. All four reached the safe post-recovery checkpoint.
During attack confirmation, requestAnimationFrame p95 gaps were
66.7/66.7/99.9/66.7 ms and p99 gaps were 733/733/800/767 ms, with only
74/44/25/79 samples respectively. These are diagnostic observations from the
same headless Edge/SwiftShader environment, not GTX 1660 or isolated GPU
measurements. The simulation time and camera at input were not exactly
replayed, and the direct hook bypasses pointer picking. Therefore the results
suggest a response-latency benefit but do not establish deterministic visual
equivalence or a global frame-time improvement. The option remains off by
default, and the remaining response latency is still too high.

### Experimental Worker-hosted clock

The hosted game now defaults to a two-step publication window: with the
existing 50 ms simulation step, the coordinator normally requests two steps
and one accumulated publication every 100 ms. A command admits already
elapsed steps immediately and stays ordered after them; larger backlogs may use
up to 16 steps per request. `qa-worker-window=1` and `qa-worker-batch=1`
retain the previous behavior. This changes presentation update cadence and
adds up to one extra 50 ms step of state latency; autonomous visual trajectory
interpolation is not yet integrated. The Worker game remains opt-in.

A deterministic mangrove comparison of 100 single steps against ten batches
matched snapshots, all ten emitted events in order, residency and final active
physics poses. A separate real opt-in savanna raid with 13 animals accepted an
attack, paused and stored a safe post-recovery checkpoint; it did not complete
the entire wave or establish visual equivalence. In that short headless
Edge/SwiftShader run, diagnostic peak unacknowledged publications was 60,
attack confirmation 1.52 s and pause confirmation 291 ms; this is not a
controlled before/after benchmark, a GTX 1660 measurement or a hard backlog
bound. Eventful publications still accumulate if presentation stalls for long
enough; a bounded lossless event/state protocol remains necessary.

The additional opt-in `qa-worker-coalesce` path keeps one publication in
flight and coalesces consecutive queued advance snapshots when earlier states
have no events and the set of actors with active physical poses is unchanged.
A trailing eventful snapshot can absorb those quiet states while keeping its
events and its own state together; an eventful snapshot cannot be discarded or
merged into a later one. Changes in active pose owners and command responses
remain ordered barriers. The simulation Worker does not
wait for acknowledgements. A unit test reduces 1,000 quiet pending ticks to one
snapshot and verifies barriers; a real two-Worker test with a 500 ms main-thread
block coalesced five ticks and retained pause/resume. A separate headless real
savanna raid accepted an attack, pause and a post-recovery save. That run also
observed an outbox of 85 items during active physics and a 900 ms maximum frame
gap in 22 samples, before active-pose coalescing was added. Results are not a
controlled comparison and do not establish an FPS benefit. A later two-Worker
mangrove test with an active hyena physics rig and the scene receiver coalesced
five publications during a 500 ms main-thread block and drained the queue;
it rendered no frames and did not establish visual equivalence. Unit tests
also verify that an event following coalesced quiet states is delivered once
with its corresponding confirmed state. Frequent
events, changes of active pose owners and command barriers can still grow
without bound, so the option remains experimental and does not yet satisfy a
bounded, lossless backlog requirement. No GPU trajectory presentation is
integrated.

With diagnostics enabled, the host outbox now records pending publications,
event-bearing publications, tick publications, unchanged confirmations and
UTF-16 code units in queued snapshot strings. Peaks are observed during queue
operations and can include a snapshot immediately sent; they exclude the
in-flight message, event and physics objects, runtime queues and browser
overhead. In one headless savanna raid, a sample before attack showed ten
queued publications: four ticks, four unchanged confirmations and two other
command publications; none contained events. Their snapshot strings totaled
831,095 code units, and the run's peak was 2,080,034 code units. The run
accepted attack, pause and safe post-recovery save. This single SwiftShader
run is diagnostic only. Command barriers and unchanged camera confirmations
can separate otherwise mergeable ticks; discarding them would require a
separate ordering design and validation of camera-dependent raid decisions.
This instrumentation is disabled without diagnostics.

With `qa-worker-fold-view` in addition to compact view acknowledgements and
coalescing, an unchanged camera confirmation can share the immediately
preceding queued quiet tick's snapshot after checking slot, state sequence,
time, pauses and save availability. The camera command still runs in its
original simulation order, and its caller receives the original compact
receipt after the matching state is confirmed. It never folds across a command
barrier or a prior eventful state. A deterministic two-Worker mangrove test
executed 100 ticks and 34 view changes, folded 33 confirmations and preserved
all ten events and their observed states. A headless real savanna raid also
accepted attack, pause and a safe post-recovery save; its diagnostic run
folded 31 views by the pause. That run is not a controlled performance or
visual comparison, and the queue remains unbounded for eventful states and
command barriers. The option stays experimental.

The same deterministic comparison now also supports `?views&physics`: two
real mangrove Workers received the same attack, 100 ticks and 34 view changes.
They matched every authoritative snapshot, event and physics pose per tick;
after withholding presentation until the end, the merged receiver matched
each event's observed state and the final physical pose. Ninety-six ticks had
active physics and 33 view confirmations were folded. This is one animal and
no rendered frames, so it does not establish visual continuity, multi-animal
equivalence, frame-time improvement or a bounded event-heavy queue.

With `?views&physics&multi`, the same test now loads a hyena and a warthog,
performs two attacks separated by the existing 12-second cooldown, and
compares 300 ticks, every event and both physical pose arrays. Two real Workers
matched; the delayed presentation delivered 114 publications, coalesced 288
and folded 96 view acknowledgements. The two physical effects did not overlap
(zero simultaneously active ticks), so this does not validate simultaneous
multi-body impacts. There is still no rendering or full UI in this test.

`tests/browser/worker-coalesced-events-parity.html` compares two real mangrove
simulation Workers for 100 identical ticks, holding the coalesced presentation
until the end. It delivered three publications instead of 100, preserved all
ten retreat-related events in order and matched the full state observed by
each event observer as well as the final state. This deterministic check has
no physical rigs, rendering, player commands or game UI; it does not bound
event-heavy backlog or establish a frame-time improvement.

An additional experiment packed up to four consecutive event-bearing
publications into one transport message while applying their states in
separate tasks. It preserved ordering in a synthetic test but retained all
snapshots, so it did not bound memory. One headless savanna raid run used 33
such batches before the attack; attack confirmation took 1.74 s and pause
confirmation 309 ms. A separate run without transport packing took 1.32 s
and 222 ms. The captures used Edge headless/SwiftShader, only 20 and 8 frame
samples during confirmation, and the input time and camera were not exactly
replayed; they do not establish a causal performance difference. Because this
experiment did not demonstrate a global benefit, it was removed. The existing
tick consolidation and event-preserving queue remain experimental.

A separate local experiment replaced consecutive pending camera-view commands
only when no simulation step or other command intervened, retaining every
caller's response. Its ordering unit test passed, but in one headless savanna
raid with coalescing enabled only one view was eliminated: most queued views
were separated by simulation steps. That run accepted an attack and a safe
post-recovery save, but its 21 frame samples and non-replayed inputs cannot
establish a performance improvement. The change was discarded. Removing views
across ticks would change which camera is available for raid-entry decisions
and requires a separate functional design and deterministic validation.

`qa-worker-clock` moves the existing runtime's clock, step queue, command
admission and residency coordination into a dedicated Worker. That Worker
owns a nested simulation Worker, which remains the only game authority. The
main thread receives ordered publications without the coordinator waiting for
rendering; command responses follow their corresponding publication. The
previous experimental runtime remains available. The extra Worker and its
message traffic are not a proposed final topology without further measurement.

`tests/browser/worker-hosted-runtime.html` deliberately blocks the main thread
for 500 ms; the Worker clock continues and pause/resume preserve simulation
time. Unit tests cover message ordering, failure and disposal. In the real
game, `QA_CLOCK=1` passed the new-game UI sequence (pause, center, crop and
hire). With `QA_BATCH=16 QA_VIEW_ACK=1`, the day-31 savanna raid spawned 13
animals, accepted a direct-handler attack, rejected an unsafe save during the
fall, stored a safe checkpoint after recovery and emitted `RaidEnded` at
elapsed 135.37 s. This is one functional full-raid run, not a determinism or
collision-equivalence audit.

Two exploratory direct-handler runs of the same setup measured Worker attack
preparation at 816 and 754 ms and the maximum observed requestAnimationFrame
gap during confirmation at 100 and 167 ms (23 and 19 samples). Pause
confirmation was 193 and 146 ms. Headless Edge used SwiftShader; inputs and
camera were not deterministically replayed, there is no separate GPU timing,
and the samples are far too short for reliable p95/p99. This suggests the
clock no longer requires a matching presentation stall in these runs, but is
not evidence of a production-wide frame-time improvement. Publications are
still reconciled and characters animated on the main thread, and unconsumed
publications can accumulate. Active-physics save/restore, all other game
actions, microevents, other biomes, sustained saturation and GPU presentation
remain incomplete. The option stays development-only.

The presentation adapter now checks that startup and successful command
responses never overtake their confirmed publication. An out-of-order response
fails the experimental runtime rather than allowing the UI to act on an
unconfirmed result. Unit tests exercise both cases. This check does not bound
the publication backlog: snapshots can carry ordered game events and physics
poses, and the scene receiver applies both before acknowledging a publication.
Dropping intermediate snapshots without a separate, lossless event and pose
protocol would therefore risk changing presentation or action ordering.

With hosted runtime diagnostics enabled, the presentation acknowledges each
successfully applied publication. The coordinator reports the current and
peak number sent but not yet acknowledged; it never waits for these messages.
This is diagnostic traffic, disabled without `diagnostics`, and the reported
count includes acknowledgement transit time. In one Edge headless test of the
two real Workers, a deliberate 500 ms main-thread block produced a peak of
nine unacknowledged publications while simulation advanced 0.55 s. Pause and
resume still succeeded. This test has no renderer or active physics and does
not establish a production memory bound. The count exposes backlog; it does
not limit it or justify dropping events or snapshots.

The coordinator now sends a command completion as the sequence number of its
already delivered publication instead of cloning the entire result twice. The
presentation resolves the command with that same confirmed publication and
fails closed if the sequence is not the most recently applied one. This also
applies to the initial response; snapshots, events, poses and save data remain
available to the caller. The change removes the redundant coordinator-to-main
copy for commands; it does not reduce regular tick publications or bound the
backlog. Sixteen focused tests and the real-Worker stall test passed. A
headless day-31 savanna run with 13 animals also accepted an attack, rejected
the unsafe save during physics and stored a safe checkpoint after recovery.
The diagnostic peak was 119 unacknowledged publications in that run; this
includes transit and startup, and is not a memory measurement. There is no
controlled before/after timing comparison, so no FPS improvement is claimed.

The experimental game now submits awakening blessings to the authoritative
Worker rather than mutating the presentation copy. The existing mangrove
command comparison checks a plant blessing and its event, invalid target,
recharge, pause and duplicate against direct game execution, including the
confirmed snapshot. This does not exercise the player UI or a blessed wall in
the Worker. Village founding and microevent economy still have main-thread
authority paths and prevent production activation.

The result dialog now sends its pause to the Worker, and the victory-to-
postgame transition resumes the result pause and enters postgame in one
ordered Worker command. A browser test compares the complete confirmed state,
`PostgameStarted` event and hiring pause with direct execution on a restored
synthetic mangrove victory; it does not exercise the dialog or a real campaign.
Village founding remains local: it can mutate the ledger and village list
before recomputing center routes, so retrying it after missing spatial chunks
would risk partial effects. The eventual Worker implementation must establish
all required residency or make the whole command transactional before applying
those mutations. This experiment does not yet provide that guarantee.

Until that transaction exists, confirming a village in the experimental Worker
game now reports that the action is unavailable before mutating local state or
charging the player. The ordinary game path is unchanged. This is an explicit
temporary limitation, not an implementation of Worker village founding.

The proposed provisional `nav.setState` approach was tested against Wild
Engine and removed: native prop suppression is irreversible inside a session,
so restoring the JavaScript arrays fails with “A spatial prop suppression
cannot be undone within a session”. A regression test in
`tests/spatial-postgame-village.test.js` reproduces this on a real desert
settlement, and the original founding/reload test continues to pass. A safe
design must avoid committing suppressions while testing routes, for example
using a native provisional overlay with equivalent route selection or an
isolated disposable spatial session. Neither option has yet established
equivalence or bounded cost; founding remains on the existing path.

`prepareVillageIsolated` is an experimental disposable-session preflight.
It reconstructs a native world from a snapshot and retries missing-region
errors in a fresh session, with a configurable cap on added regions. A real
desert postgame test found the same suajili village as the live session and
matched its serialized result, both with all regions loaded and with the site
region missing initially. The live state and a building-site walkability
check remained unchanged. The same test now checks insufficient funds,
duplicate command idempotency and rejection when the missing-region limit is
zero. One full-residency preflight took 1.9–2.3 s in
individual local Node runs; these are not a benchmark or render-thread timing.
The preflight now also returns events observed in its successful attempt, and
the native test checks their order and contents against live founding. An
attempt retried after a missing region returns the same events, and a repeated
command emits none. Failed attempts dispose their event observers along with
their isolated sessions.
The test covers one site and one center, not Worker integration, concurrent
world changes, all cultures or a guarantee that later execution on the live
session cannot request more regions. Promoting its result would also need to
preserve the existing authority's active physics, tutorial controller, native
intent state, event subscriptions, view and command sequence; a snapshot alone
does not establish that. It remains disconnected from gameplay.

The native postgame preflight test was updated for the current rule that new
villages share the game culture; it now starts and founds suajili villages and
also checks rejection of another culture. Both native tests pass, including
missing-chunk retries, duplicate commands and equality of the isolated and
committed snapshots and events. The measured isolated preparation in this run
was 1,973 ms; it remains a single diagnostic, not a performance benchmark.
Three integration choices remain: replay against the live authority after
preflight, which cannot yet rule out a partial native mutation; replace the live
session with the isolated result, which must preserve physics and subscriptions;
or apply a verified transaction plan containing the exact village, suppressions
and center assignments, which requires an atomic native commit. None is yet
safe enough to remove the Worker UI guard.

The native postgame test now injects `SpatialChunkUnavailable` specifically
after the village has been installed and before center rerouting completes.
In the disposable session the village and 50,000-coin debit were already
present, but the command ID and `VillageFounded` event were absent. The live
authority remained unchanged. This is an injected failure, not evidence that a
particular live site actually requests that missing chunk; it demonstrates why
retrying the existing mutating command is not a safe Worker transaction.

An isolated preparation can now provide its resulting center assignments to an
experimental application path. It checks that the authoritative serialized
state still equals the preparation input and validates the center list before
charging, then avoids center route queries after native installation. In the
native desert fixture this produced the same complete state and ordered events
as the original, even with post-install route calls forced to fail; a stale plan
was rejected. Nineteen native and village acceptance tests passed. This does not
make `nav.setState` atomic or prove the plan against different native residency,
physics, multiple centers or concurrent Worker commands. It is not connected to
the Worker UI, and the existing guard remains in place.

The experimental application additionally requires an exact match between the
resident chunk keys reported by the caller and those used by the successful
isolated preparation, and checks the center assignments against that result.
The native test rejects missing and extra chunks and altered assignments before
changing the authoritative state. Matching keys are not proof that native
revisions or chunk contents match, and the caller must supply the true resident
set. Native installation is still not atomic; this remains disconnected from
the Worker command path.

Reapplying an already committed village plan now follows the original command
idempotency rule: it returns false without charging or touching native state,
even if the old plan's state or resident chunks are stale. The native postgame
test verifies this after a successful prepared application. New commands still
require all preparation checks; the Worker UI remains guarded.

An experimental `foundVillage` authority command now performs isolated
preparation, loads its required missing chunks, applies the prepared center
assignments and checks the complete resulting snapshot and ordered events before
publication. A mismatch or application exception fails the Worker rather than
publishing a partial result; this is fail-closed, not rollback or automatic
recovery. Active physics and cinematic pauses reject the command. The UI uses
it only with `qa-worker-village`; otherwise its existing Worker guard remains.
The native authority test covers a missing site chunk, duplicate replay and a
different-culture rejection. `tools/experiments/audit_worker_village.mjs --ui`
also confirmed founding and IndexedDB save through the actual UI in one
synthetic desert postgame, with direct QA placement. It does not cover active
physics, real pointer placement, other cultures, concurrent input, recovery
after a failed commit, a full campaign or render-frame performance. Preview
originally ran on the presentation thread; the command is not production-ready.

With `qa-worker-village`, the full placement preview now runs as an ordered
Worker command. The presentation immediately draws an approximate layout in a
neutral color and disables confirmation while validation is pending; an obsolete
reply is ignored if the tool, world or proposal has changed. The final founding
command still revalidates against the latest state. The native test matched the
preview and unchanged state against the original, and the synthetic desert UI
test confirmed two successive provisional previews, the final Worker approval,
founding at the second site and IndexedDB save. This does not measure frame-time
improvement or test explicit cancellation, different biomes or real pointer
placement. Drawing the provisional meshes and
sampling their terrain heights still happen on the presentation thread.

An A/B/B/A headless Edge comparison using the same synthetic desert fixture
and two direct QA placements measured the second preview handler at 16.68 and
16.53 ms with local validation, versus 6.22 and 7.22 ms with Worker validation.
The time until the final confirmation button was enabled varied substantially:
162/1,121 ms locally versus 1,215/1,273 ms with the Worker. During the short
measurement window the largest observed frame intervals were 933–967 ms locally
and 900–933 ms with the Worker. Frame samples were sparse (6–39 per run), and
include asset preparation and contention; these are not reliable p95/p99 or a
general gameplay benchmark. They demonstrate less synchronous handler work in
this fixture but do not demonstrate smoother rendering or lower validation
latency. The `qa-worker-local-village-preview` flag exists only to reproduce
the comparison. GPU identity was not recorded for these runs.

When a microevent holds night speed, the game now sends the corresponding
fast-forward policy to the installed Worker runtime, and restores it when the
hold ends. Only changes are sent. Unit tests cover policy transitions and the
existing local clock behavior; a real-Worker microevent test and exact timing
under presentation stalls remain outstanding. This does not migrate the
microevent director, ticket or economy authority, which still prevents the
Worker game from being production ready.

The authority client and simulation Worker now accept experimental
`microReserve`, `microSettle` and `microDisable` commands, using the existing
economy functions and ordered publications. A real Worker test compares
reservation, reward, repeated settlement, ignored event, paused settlement
and disable against direct execution in a synthetic mangrove state; 57 related
unit tests pass. The visual director still reserves and settles locally, and
income tracking, persistent scheduling and UI/save coordination are not yet
connected. These commands are therefore not wired to gameplay and do not
yet establish correct microevents in the Worker game.

An opt-in `microIncome` policy tracks delivery and dawn events inside the
simulation authority and reconciles skipped days after advances. It is off by
default and is not persisted; a future director integration must enable it
after startup. A synthetic peaceful mangrove dawn matched direct simulation
state and events, including rollover of 125 coins; 58 related unit tests
passed. Actual crate delivery, batched multi-day advances, policy changes, UI
and saved-session restart remain unverified. The existing visual director still
tracks income locally, so enabling the policy in the game before that director
is migrated would duplicate responsibility.

`createWorkerMicroeventEconomy` provides an asynchronous command adapter.
`tests/browser/worker-microevent-save.html` exercises it with the hosted
simulation Workers and the actual ordered save coordinator: it checkpoints a
reservation, settles a reward, checkpoints the result, reloads the serialized
state and checks that repeating settlement cannot pay again. This uses an
in-memory repository and directly invokes the adapter; it does not yet connect
the visual director, migrate income accounting or validate UI cancellation.

The additional development-only `qa-worker-microevents` flag connects the
visual controller to the Worker economy in the Worker game. It uses separate
local scheduling memory, waits for a reservation before displaying an event,
settles through the Worker before requesting a save, and leaves income tracking
to the Worker. Unit tests cover ordered reserve/save/settle and cancellation
while saving; the existing 56 microevent tests pass. Scheduling history, RNG
and cooldowns are now sent to the authority at reservation and settlement. A
forced visual event completed in the real opt-in game and cleared its ticket;
the test used programmatic completion and produced no reward. A later run of
`tools/experiments/audit_worker_main_microevent.mjs` also reloaded the saved
history and cooldown through the browser save repository. This path remains
off by default: cancellation on disposal, deliveries, accelerated time,
gesture input and full-session reload need end-to-end validation. It is not equivalent
gameplay yet.

In the experimental Worker game, a due campaign cinematic now requests an
ordered `cinematicStart` before playback, adding an independent pause. Its
completion records the chapter and removes that pause in one Worker command;
other pause causes are retained. Saving is unavailable while that transient
cinematic pause is active, and becomes available again when it finishes,
subject to the existing physics restrictions. Invalid and repeated acts are rejected. A
real Worker test compared state with direct operations in a synthetic day-11
mangrove, including an attempted advance while paused. Twelve unit tests passed.
`tools/experiments/audit_worker_main_cinematic.mjs` also exercises the real
opt-in game with two Workers and a synthetic savanna milestone. It waits for
the cinematic UI, checks a 600 ms pause and save unavailability, skips the
cinematic and reloads the saved chapter through `BrowserSaveRepository`.
Both runs passed; the temporary cinematic pause was absent after reload and
the hiring pause remained. This does not validate the complete rendered
cinematic, save/restore while it is active, failure recovery, victory
cinematic, or a complete campaign. An
asynchronous start can still arrive after the exact presentation frame that
detected the milestone; this is not evidence of deterministic timing parity.

Optional `qa-worker-diagnostics` records time inside the simulation Worker.
In these individual runs the animal's asynchronous physics admission took
721 ms (16-step run) and 702 ms (one-step run); execution of the subsequent
attack command, including its publication, took 8.1 and 5.6 ms respectively.
The observed click-to-confirmation times were 3.66 and 9.27 s. During those
intervals the measured requestAnimationFrame gaps had p95 around 66.7 ms and
maxima of 1.17 s and 700 ms respectively, on headless Edge with SwiftShader.
Those short, non-replayed samples neither isolate GPU time nor prove that the
Worker itself caused the frame gaps. They do show that per-camera-update
publications are a concrete integration cost to investigate while preserving
the view needed for raid entries and the ordering of simulation commands.

The application save function now uses ordered Worker checkpoints whenever a
runtime is installed, including the action paths that requested a Worker save.
An unavailable active-physics checkpoint reports failure and prevents the
menu-exit path from claiming success. A browser test exercises the save adapter
with a real Worker and restores its checkpoint; it does not cover active physics
or the production UI. The ordinary game still does not install the runtime.

Experimental Worker presentation: Grow and Multiply start the guardian when the
command is submitted, before the Worker responds. The target effect waits for
its matching `SpellActivated.commandId`; rejection cancels the provisional
summon. A provisional pose uses presentation time and holds while waiting, and
a matching late event continues it instead of starting another summon. This is
wired into the actual Worker-enabled input path. A headless browser test uses a
peaceful fixture and direct crop input handler to check confirmation and an
overlapping rejected cast; it is not a visual comparison or latency measurement.
It does not cover
buildings, awakenings, or speculative attack physics. The ordinary game
still uses the non-Worker path.

The Worker input path now draws a provisional crop at the selected point without
adding it to the simulation, picking, or collision data. A confirmed CropPlaced
event identifies the command and the renderer interpolates to the authoritative
position over 200 ms; a rejected command removes the preview. Unit tests cover
interpolation and rejection. A headless browser test uses the peaceful fixture
and submits on an occupied crop, confirming that the Worker selects an adjusted
position and only one authoritative crop appears. This is not a visual quality
or performance comparison.

Wall strokes in the opt-in Worker game now use a translucent, softly pulsing
render-only preview built from shared wall geometry. The preview follows the
stroke sampling and current capacity, but cannot anticipate Worker-side blocked
pieces or automatic gates; it is removed on confirmation or rejection. A
headless peaceful-fixture test covers one accepted stroke and one stroke with no
accepted pieces, without pointer gestures, visual comparison or performance
measurements. Individual walls, gates and work centers also have presentation-only
translucent previews. The center uses the nearest village's loaded appearance,
which can differ from the Worker-selected site or culture. A browser test checks
an accepted individual gate and a rejected overlapping center in a peaceful fixture
with an increased starting balance. It does not cover an accepted center, real
pointer input or visual equivalence. Awakening and attack previews are experimental.

An awakening starts a provisional ritual and target marker while its Worker
command is pending. A headless peaceful-fixture test with a prepared charge
issued two confirmations before the first response: initially the crop remained
unblessed and the charge remained full; the Worker committed one blessing and
the duplicate provisional ritual was removed. Unit tests also cover rejection
cleanup. This uses direct input and does not establish visual equivalence.

Attack now uses the existing 1.74-second gesture marker rather than the former
12-second global cooldown. The authority rejects targets in impact, falling,
rolling or recovery and accepts a different standing animal after the gesture.
In a headless opt-in Worker raid, two different beasts were hit while the first
was still falling, and a further attempt on that beast while rolling did not
change its health. The guardian begins provisionally, but speculative animal
ragdoll is not implemented: the animal still reacts after confirmation. This
test uses direct input and SwiftShader, without visual or performance comparison;
the publication queue reached 141 pending messages in this run.
Presentation now rejects a known downed, recovering or still-pending target
before creating a provisional guardian attack. A later headless Worker raid
confirmed that clicking the rolling first beast did not start a provisional
summon or change its health, while attacks against two distinct beasts worked.
The Worker still revalidates commands against its own state.

New village founding uses the culture selected for the game, enforced in the
simulation as well as the UI. Existing mixed-culture saves retain their villages,
so their center previews can still differ from the selected authoritative site.

The experimental hosted game now enables compact camera acknowledgements,
coalescing and view folding by default; `qa-worker-legacy-publications` restores
the earlier path. The regular non-Worker game is unchanged. A deterministic
two-Worker mangrove comparison with two species and physics repeated 300 ticks,
96 folded views and 288 coalesced publications; events, their observed states
and final poses matched, but there were no simultaneous active ragdolls or frames.
Two separate headless savanna smoke runs confirmed the same target attack with
both settings. Their sparse frame samples (17 versus 8), different simulation
times and SwiftShader cannot establish a performance improvement: the maxima
were 333 ms and 1,200 ms respectively. The compact run observed 17 queued items
at its attack sample and a 93-sequence peak backlog; eventful and command
barriers remain unbounded. Do not treat these numbers as a controlled benchmark
or the queue problem as solved.

An additional `qa-worker-background-views` experiment sends camera metadata
without allocating a presentation-side command promise or returning individual
view receipts. The visual camera continues to update locally; view commands
still execute in simulation order before any subsequent tick or action. Only
adjacent unchanged view publications are merged, or absorbed into a following
tick; command responses and event-bearing states remain barriers. Two Workers
executed 300 ticks and 300 ordered views with physics on two species: all event
observations and final poses matched, with 17 published states and 585 merges.
The test has no rendered frames and no simultaneous ragdolls. A separate
headless savanna raid accepted an attack with the experiment enabled, with seven
queued items at one sample and a 1,300 ms maximum in eight measured frames;
this is not an A/B performance result. Camera gestures, eventful saturation and
hardware rendering still require validation; the experiment remains opt-in.

A later headless savanna raid used a real right-button camera drag immediately
after submitting an attack through the input handler. The camera eye changed
from approximately (109.09, 26.85, 49.09) to (81.47, 26.85, 32.77), and the
impact was unconfirmed both before and after the drag. Worker attack preparation
reported 881 ms and the attack was subsequently confirmed. This demonstrates
that this gesture can change the visual camera while the attack is pending; it
does not prove smooth presentation. Fourteen sampled frame intervals included a
733 ms maximum, under SwiftShader, with no comparison or GPU timing. The test
does not simulate every camera gesture or impose a controlled Worker delay.

Hardware check: Edge headless reported `ANGLE (NVIDIA, NVIDIA GeForce GTX 1660
(0x00002184) Direct3D11 vs_5_0 ps_5_0, D3D11)` and `nvidia-smi` reported driver
581.29. Four sequential 12-second post-impact samples used the same day-31
savanna capture, 13 animals, 32 workers and the Worker game: standard camera
receipts, background views, background views, standard receipts. Each attack
used the direct input handler. The respective rAF interval summaries (count,
mean, p95, p99, max, ms) were (358, 33.613, 33.455, 33.485, 66.795),
(358, 33.613, 33.445, 33.485, 66.790), (358, 33.706, 33.445, 33.490,
99.960), and (357, 33.800, 33.440, 66.645, 66.775). The near-33 ms cadence
may be imposed by the headless environment. Attack samples themselves were much
shorter; the latter three runs reported 7–13 intervals and maxima of 800–1167
ms, which are not useful p95/p99 estimates. Worker admission reported roughly
738–844 ms. These runs verify the hardware-backed browser and establish a
limited reference; they do not measure GPU execution time, control the camera
path or exact simulation evolution, prove visual equivalence, or demonstrate a
performance gain. Reproduce with `QA_NATIVE_GPU=1`, `QA_EXPECT_GPU=GTX 1660`,
`QA_CLOCK=1`, `QA_BATCH=16`, `QA_BACKGROUND_VIEWS=0/1` and
`audit_worker_main_raid.mjs --direct --sustain`.

The Worker checkpoint now permits a confirmed projectile before its impact
marker, while no physical body exists. On restore the simulation Worker detects
the pending impact, initializes physics and loads the affected animal rig before
continuing. The actual save coordinator and two real Workers reproduced 60
mangrove ticks after a checkpoint at 0.15 seconds into the projectile; all
observed events, state and physical poses matched, with 59 active-pose ticks.
An opt-in savanna game run on the GTX 1660 also confirmed that a save remains
refused during the actual fall and succeeds after recovery. This does not save
or restore an active Rapier world, and the pre-impact case has not yet been
tested through the full game's save/load UI or across multiple simultaneous
impacts. Active fall, roll and recovery checkpoints remain unavailable.

An independent in-memory Rapier solver checkpoint now stores the binary world
snapshot, actor/body/joint handles, obstacle handles, roll controller state and
recovery-collider set. Node tests restored two animals interacting with each
other and obstacles in falling, rolling and kinematic phases, then matched
their physical poses step-for-step for 120 solver steps. This is a solver test,
not a save format. A further in-memory experiment reconnects bone bindings and
environment collider maps and restores the actual fall/roll manager. One hyena
continued with matching logical positions and physical poses for 120 steps; a
second test restored a roll and matched its transition into authored recovery.
This has not captured an already-running recovery or baked fallback, and lacks
JSON/binary persistence, Worker integration, complete corrupt-input hardening,
multi-actor manager tests and full game replay. The active-physics save gate is
unchanged.

The simulation Worker can now explicitly export an experimental in-memory
fall/roll checkpoint with a snapshot and initialize a second Worker from it.
Structured clone preserves the Rapier bytes and controller values; this is not
a persisted save and does not change `saveAvailable`. In a mangrove test one
restored falling hyena matched an uninterrupted Worker for 60 ticks, and one
restored rolling hyena matched for 120 ticks through recovery and release,
including state, events and published poses. An initial test exposed a root
orientation mismatch: restoring Euler representation as well as orientation
fixed the discrepancy in that scenario. Multiple simultaneous actors, baked
fallbacks, checkpoints taken during recovery, disk encoding, full UI load and
corrupt inputs remain unverified. The ordinary game still blocks active-physics
saves.

The experimental Worker checkpoint now has a JSON-compatible codec for Rapier
bytes and non-finite roll-controller markers; it is still not written to the
game's save repository. Two mangrove Workers matched state, events and every
published pose for 60 ticks after a JSON round trip with two simultaneously
active animals (833,445 UTF-8 bytes). A separate rolling checkpoint matched for
120 ticks through recovery and release (448,971 bytes). These are single
headless scenarios, not measurements of storage latency or peak memory. Active
recovery checkpoints, baked fallbacks and complete corrupt-data hardening remain
open; the production save gate remains unchanged.

The opt-in `qa-worker-physics-save` path now asks the authority for an encoded
checkpoint and writes supported falling/rolling states through the ordered save
coordinator. The worker rebuilds physics from the stored data on load and removes
the checkpoint from subsequent live snapshots. A savanna game test saved during
a fall through the actual pause menu into IndexedDB, reloaded the slot and found
the same animal still under physical control at the saved simulation time. A
subsequent attempt to open the file without the experimental option was rejected
before writing, leaving the checkpoint intact. Two-Worker mangrove comparisons
also round-tripped stored JSON for simultaneous falls and for rolling through
recovery. The UI test used direct attack input and SwiftShader, and did not
compare a whole resumed campaign or rendering. Saving during an already-running
recovery or baked fallback remains blocked. The feature is development-only and
does not enable active-physics saving in the normal game.

The experimental checkpoint now also captures an already-running authored
recovery, including pose samples, contact reference and kinematic state. A
two-Worker mangrove test restored a checkpoint 0.75 seconds into recovery and
matched state, events and physics poses for 120 ticks; the animal remained under
physical control for 65 of them. A separate savanna UI test saved and reloaded
during recovery and verified that opening the slot without the experimental
option left the checkpoint intact. This does not validate every species, crowd,
obstacle or visual transition. Procedural recoveries and baked fallbacks remain
unsupported and must still reject active-physics saves; normal saves are
unchanged.

Camera controls update locally during rendering and do not wait for simulation
acknowledgements. The navigation view is separately sent to the authority because
it can affect raid entry and residency. In the current hosted experiment those
updates normally enter the ordered command queue; the optional background-view
path also submits them into that queue. Replacing queued views across simulation
ticks or gameplay commands could change simulation outcomes, so latest-only
coalescing and any priority changes need deterministic tests before integration.

The opt-in background-view path now replaces consecutive pending views only when
no tick or gameplay command separates them, retaining the last view at that
boundary. The runtime test covers multiple views separated by a player action
and an elapsed tick, as well as their completion order. This does not overtake
an in-flight operation or eliminate all queued camera updates, and is not yet a
real-game latency or performance result. The ordinary hosted game continues to
use ordered view commands until that path has broader validation.

Follow-up validation: `tests/browser/worker-camera-view-parity.html` compared
two real mangrove authority Workers for 100 ticks, sending three successive
views to one and only the last to the other before each tick. Snapshots, events
and residency matched at every tick (10 events total). A day-31 savanna game
with `qa-worker-clock`, `qa-worker-background-views` and batch size 16 accepted
an attack while the camera moved, without a Worker fault. Edge reported ANGLE
on a GeForce GTX 1660. This was one headless run with an attack invoked through
the QA input handler, not a reproducible A/B benchmark: the gesture took 800 ms,
attack confirmation 2,127 ms, and the 14 sampled frame intervals had a maximum
and p99 of 1,133 ms. The test does not measure input-to-first-camera-frame or
prove that the new grouping was exercised. These severe pauses remain unresolved;
do not interpret this smoke test as a responsiveness or performance improvement.

First-impact admission currently awaits a fresh rig and clip load before the
authority executes `castAttack`; each loader fetches and decodes the species GLB
independently. The reproducible isolated probe
`tests/browser/worker-physics-admission-cost.html` measured three preparations
on the browser main thread: hyena 208–291 ms and buffalo 666–749 ms. This is
not the actual Worker execution time or a direct decomposition of the previous
gameplay result; caching, concurrency and resource contention differ. It does
show that animal admission is substantial work to schedule before an interaction,
and that per-instance full rig and clip reconstruction should not be assumed
necessary. Candidate approaches are preparing eligible animals outside the
authoritative command path, sharing immutable species clip data, or transferring
prebuilt rig data from a separate preparation Worker. Any integration must keep
simulation ordering and rejection semantics, and compare readiness, memory,
latency and real frame times; simply running this preparation on the render
thread would introduce a new source of stutter.

An isolated experiment reused prepared clips by species across independent
animal mixers; rigs remained per animal. In an alternating isolated
main-thread comparison, repeat hyena admission took 126/125 ms with prepared
clips versus 350/259 ms without; buffalo took 377/408 ms versus 645/634 ms.
Three sampled walking poses matched exactly. These four measurements per species
are not a Worker or full-game A/B benchmark, do not validate every animation or
measure memory, and do not remove the first animal's preparation delay. The
existing dynamic physics test failed to complete its second impact, so the
sharing change was not retained in the Worker pending a representative functional
test. The failure alone does not establish that clip sharing caused it.
Repeating the test after reverting sharing produced the same failure: the
second actor never entered physical simulation within 500 steps. The fixture
needs updating or diagnosis before it can validate chained attacks.

The two-attack test was still waiting on the removed global cooldown; it now
waits for the actual guardian gesture and checks that the second command is
accepted. This exposed a separate live-state failure when a physical recovery
exceeded the 12-second save-format limit. Confirmed live publications now allow
long physical recoveries while retaining finite values and the other snapshot
checks; ordinary save validation remains unchanged. With this correction the
mangrove comparison completed 277 ordered commands, including 181 steps with
both animals physically active, with matching Worker and reference states,
events and poses. It does not prove visual equivalence or body-contact coverage.
Long active-physics checkpoints can still be rejected by the save format; this
change does not claim they are restorable. Clip sharing remains unintegrated.

The experimental save format now permits a physical recovery longer than 12
seconds when a Worker physics checkpoint is present. Ordinary saves retain the
previous limit and all numeric checks. In the `long-save` variant of the
two-animal mangrove test, the save coordinator captured a recovery after its
extended deadline exceeded 12 seconds; after restoring a second Worker, state,
events and active presentation poses matched for 40 ticks. Inactive pose data
is not compared because the scene receiver explicitly discards it; its ordering
and tiny transform values differed after restoring. This does not validate the
browser save UI, all recovery types, corrupt checkpoints, or a complete campaign;
procedural and baked fallbacks remain unsupported.

Clip sharing is now available behind `qa-worker-shared-clips`, disabled by
default. The `same-species` variant of
`tests/browser/simulation-authority-dynamic-physics.html` compares a Worker
sharing warthog clips against the original controller loading them separately.
For 227 ordered commands the state, events and poses matched, including 169
steps with both physical bodies active. This is one mangrove fixture and does
not validate other species, save/restore, presentation or real-game performance.
The option should remain experimental until those comparisons are complete.

`tools/experiments/audit_worker_shared_clips_raid.mjs` exercises two same-species
attacks through the game input handler in the day-31 savanna Worker fixture.
In one A/B/B/A headless sequence the second warthog's reported Worker preparation
times were 912 and 754 ms without sharing, versus 497 and 488 ms with sharing;
confirmation times were 1,277/846 versus 620/838 ms. Both attacks were confirmed
in all four runs. These few runs support reduced repeated admission work, but do
not establish frame-time improvement, first-attack improvement, memory cost,
visual equivalence, or performance across species and machines. The first attack
still performs full preparation, and the experiment remains opt-in.

An opt-in `trackPathMotion` Worker command now records the actual segments
executed by `movePath` for one animal or worker; it does not change the actor's
logical state. The stream reports tick-end simulation time, command boundaries
and whether observed segment endpoints connect to the final position. It is an
observation, not a collision certificate: Rapier motion and other position
changes are not covered. The host combines
adjacent traces only when actor and boundary match, retaining segment order; at
4,096 segments it stops combining, so a stalled renderer can still accumulate
publications. A two-Worker mangrove comparison matched state and events over 30
batched advances and recorded 383 segments. A day-31 savanna game using
`qa-worker-path-trace` received a trace from animal-368 and completed an attack;
Edge reported a GTX 1660. The trace is not used for rendering, no GPU movement or
skeleton migration is claimed, and its CPU, transfer and frame-time overhead
remain unmeasured.

Observed path segments from `walkTo` now also include start and end simulation
times calculated from the tick interval, actual distance and movement speed.
The clock preserves waypoint turns and a worker's transition from running to
walking; unused tick time is not invented as movement. Segments generated by
other paths without a clock are explicitly marked untimed. Three locomotion
cases and a two-Worker mangrove comparison validate those boundaries without
changing the simulated state; the latter recorded 383 timed segments over 30
batched advances. These timings model movement within a tick, not a proof of
continuous safety against simultaneously moving actors or changing geometry.
Rapier, interruption ordering, playback, safe horizons and GPU presentation
are still unimplemented. Do not extrapolate from
this stream or enable visual playback based only on `timed`/`continuous`.
The real-game savanna QA run also accepted observed path publications and
completed an attack on the tracked animal with Edge reporting a GTX 1660; it
did not verify the visual trajectory or compare frame times.

Ambient worker walking now receives the same simulation-time clock when its
state is available; calls without simulation time remain explicitly untimed.
While path observation is enabled, non-advance gameplay commands conservatively
publish an invalidation at their confirmed time and position, including pauses,
attacks and stopping the observation. Snapshot, view and preview commands do
not. The scene records the invalidation only after accepting the corresponding
publication and clears the matching last trace. This is diagnostic plumbing,
not an event dependency index: rejected commands can invalidate too, and
structural changes or collisions occurring inside an advance are not yet
certified. The 30-command real Worker comparison checked pause and stop
ordering; 53 focused tests passed. No GPU playback or performance gain is
claimed.
An additional day-31 savanna game run received a `castAttack` invalidation for
the tracked animal and confirmed the hit; Edge reported a GTX 1660. This used
direct QA input and does not establish collision-safe playback or frame-time
independence.

The trace now carries a conservative batch boundary when an advance emits a
game event or contains untimed or unobserved movement: it points to the start
of the affected batch, and the scene retains the invalidation instead of
adopting that trace as its latest candidate. Trace endpoints are checked
against the confirmed state and simulation clock. This does not certify dynamic
body separation, and invalidating for every event is deliberately broader than
a spatial dependency index; it must not drive production replanning.

In a 30-advance mangrove comparison, two batches carried event boundaries and
the observed and unobserved Workers retained matching state and events. A
single day-31 savanna run recorded 24 invalidations before filtering, including
18 tutorial commands; two later runs recorded six and five, including none for
tutorial commands whose suspended/running state did not change. Those runs
still contained four and three broad simulation-event boundaries. They differ in timing,
the diagnostic history retains at most 64 entries, and neither is a performance
or full-game frequency benchmark. They justify avoiding unconditional tutorial
invalidations, not declaring an absence of invalidation storms. Twenty-four
focused tests passed; GPU playback and a safe dynamic-body horizon remain open.

Batch invalidations now also report event types, whether an event directly
references the observed actor and whether the navigation topology revision
changed. In one day-31 savanna QA run, three event boundaries contained
`AnimalTargetUnavailable`; one also contained crop damage/destruction and a
logical hit. None directly named the observed animal and none changed the
reported topology revision. This does **not** prove they are irrelevant:
another body may change its route or a crop event may alter future behavior.
The choices are to discard only proven informational events, to infer relevance
from actor IDs and topology alone, or to track spatial and temporal dependencies
of all bodies. The second is insufficient for the collision guarantee; the
first needs per-event proof and the third remains necessary for general playback.
The conservative boundary is unchanged and does not trigger replanning. This
single run used direct QA input on Edge reporting a GTX 1660, not a full-campaign
frequency, collision or performance benchmark.

### Experimental synchronized body traces

The opt-in `trackPathMotion` diagnostic can capture movement segments for a selected actor and the other bodies in the same simulation interval. Publications fold only contiguous compatible traces; changed rosters, discontinuities, or the 4096-segment limit preserve separate publications. Unobserved movement and structural changes invalidate the diagnostic conservatively. The trace does not drive presentation or certify collision safety. Roster changes are checked after each advanceReal step in a batched command and remain invalidated even if the roster later returns to its initial value. A body created and removed within a single advanceReal step is not independently guaranteed to be detected.

A deterministic mangrove comparison of two real Workers over 30 commands retained identical states and events: 383 selected-actor segments and 10,624 peer segments, with no observed peer gaps. The peer arrays occupied 1,827,881 JSON characters (not a measurement of structured-clone transfer bytes). A separate opt-in day-31 savanna game run on a GTX 1660 received an accepted sample with 44 peers and 30 peer segments; this was not a deterministic comparison. The diagnostic run reached a peak publication backlog of 105 and an attack response of 885 ms, with substantial concurrent instrumentation and no baseline. These numbers do not establish a performance regression or improvement, but demonstrate that the raw capture is unsuitable for production without bounding and measuring its cost.

Next steps are to reduce and bound transferred dependencies, detect roster changes reliably inside an interval, and establish a safe horizon before any autonomous presentation can consume these data. Physics, gameplay authority, GPU playback, and production behavior remain unchanged by this opt-in diagnostic.

An opt-in Worker microevent director now reconciles a persisted reservation before admitting another event: a visual interaction cannot survive a reload, so the authority cancels that exact ticket without awarding money or reserving a loss. The adapter waits for this ordered cancellation before its own commands. A real hosted-Worker test restored a checkpoint containing a reservation, immediately requested another event, verified the replacement ticket and absence of a reward for the abandoned ticket, and separately checked the normal reward and duplicate-settlement behavior. This is a synthetic mangrove test with an in-memory repository, not a full game UI reload or a performance measurement. The visual director's save callback also checks that it still owns the current world and state, so late asynchronous work cannot save a subsequently opened game. The Worker microevent path remains experimental.

The abandoned-reservation recovery was also exercised through the real opt-in game: a forced visual event saved `micro:1` to BrowserSaveRepository, the page loaded that slot again, and the director's Worker economy adapter cancelled the old ticket without a reward before accepting `micro:2`. Reproduce with `QA_RECOVER_PENDING=1` and `tools/experiments/audit_worker_main_microevent.mjs`. This validates an actual browser save/load and the adapter in the game, but the second reservation was requested programmatically, not completed through a gesture; it does not establish production readiness or a performance improvement.

A quiet Worker publication carrying `motionInvalidation` is now an ordered barrier in the host queue. Previously it could be absorbed into the next tick and lose the invalidation when no gameplay event was present. A regression test covers an invalidated peer trace followed by quiet and eventful ticks, while retaining event order. This preserves safety information for future presentation consumers; it does not bound a stream of repeated invalidations or enable GPU playback. The experimental trace can still increase backlog, and no performance improvement is claimed.
