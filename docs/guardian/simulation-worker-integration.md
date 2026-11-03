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
