# Manglares, activaciÃ³n de magia y latencia de rutas

Objetivo activo: red de canales y meandros creÃ­ble con terrenos secos/embarrados; eliminar bloqueos de escudo y demÃ¡s magias sin comprometer navegaciÃ³n.

AmpliaciÃ³n solicitada: medir la espera de bestias y trabajadores por rutas y evaluar un endpoint por lotes multihilo. Separar espera de cola, bÃºsqueda nativa, sectores ausentes y publicaciÃ³n. Los resultados deben llevar identidad/destino/revisiÃ³n para descartar bÃºsquedas obsoletas. No basta con desplazar un bloqueo o permitir atravesar un escudo durante la espera.

Referencia: main d5d48988d, rama de trabajo codex/global-visual-lab. Cambios ajenos preexistentes se conservan.

InspecciÃ³n inicial (hipÃ³tesis, no atribuciÃ³n medida):
- wetlandMask de variante 7 solo conserva dos canales no periÃ³dicos; lejos de sus ejes el mundo queda seco. Hace falta una red distribuida, no aumentar Ãºnicamente la anchura.
- Escudo: polÃ­gono de 64 vÃ©rtices, refreshPolygon actualiza sectores en todos los perfiles; nav.setState invalida rutas/cachÃ©s.
- ShieldVfx crea un efecto en primer uso: investigar coste nativo, shader/driver y rutas separadamente.
- Existe routeActorNativeBatch sÃ­ncrono; no prueba ejecuciÃ³n paralela. El endpoint threaded de generaciÃ³n no implica que navegaciÃ³n sea thread-safe.

InstrumentaciÃ³n aÃ±adida al harness de incursiÃ³n: WG_MAGIC_PROFILE=1 captura CPU profile, intervalos rAF y long tasks desde antes de seleccionar magia hasta despuÃ©s del escudo mediante UI real. La primera reproducciÃ³n estÃ¡ en curso; aÃºn no se atribuye causa.

## Primera reproducciÃ³n medida

Harness final-ten, Chrome/WebGL2, 1280x720, calidad media, clic real en escudo. `shield-before/raid-ui.json`: long task 5364 ms e intervalo rAF mÃ¡ximo 5371 ms. CPU sampling (`magic.cpuprofile`): getProgramInfoLog 4428.745 + 625.934 + 100.236 ms (~5155 ms). Son tiempos sÃ­ncronos muestreados/espera del driver, NO tiempo GPU. El bloqueo observado estÃ¡ dominado por preparaciÃ³n tardÃ­a de programas, no demostrado como navegaciÃ³n. Se debe identificar quÃ© pasada/variante compila y anticiparla/reutilizarla sin ocultar errores ni empeorar carga innecesariamente. Rutas en cola siguen siendo un requisito independiente pendiente de atribuciÃ³n.

## ConfirmaciÃ³n por shaders reales

Segunda ejecuciÃ³n: `shield-programs-before`, 37 consultas de programas durante activaciÃ³n, 4911.38 ms sÃ­ncronos acumulados y mÃ¡ximo intervalo rAF 5054.95 ms. Los shaders mÃ¡s costosos contienen `uniform PointLight pointLights[ 2 ]` e incluyen materiales de animales (`Material_0`, `Mane repairs`, `BakedMaterial`) y del mundo. VfxGpuPreload desactiva sus luces; NativeVfx activa dos PointLight segÃºn el efecto. Three incluye el nÃºmero de luces en la clave de programa incluso para mÃºltiples pasadas. HipÃ³tesis confirmada: cambio global de configuraciÃ³n luminosa al primer escudo dispara variantes de toda la escena.

Siguiente intervenciÃ³n: diseÃ±ar luces de VFX con configuraciÃ³n estable durante el mundo, propiedad y liberaciÃ³n explÃ­citas, evitando aumentar variantes con cada efecto simultÃ¡neo. Comparar imagen y coste estable; no eliminar luz del escudo como atajo. Mantener las capturas negativas y repetir el mismo harness antes/despuÃ©s. La espera de rutas continÃºa pendiente y no queda explicada por esta atribuciÃ³n de shaders.

## Prototipo opt-in: luces estables

`?vfxStableLights=1` reserva cuatro luces desde la carga. Una luz sin contribuciÃ³n mantiene visibilidad con intensidad cero; asÃ­ la clave de programa no cambia. Los efectos aportan sus fuentes a esos slots, seleccionadas por intensidad y distancia de cÃ¡mara. El escudo aislado conserva ambas posiciones, colores e intensidad. MÃ¡s de cuatro fuentes simultÃ¡neas implica selecciÃ³n: pendiente de validaciÃ³n artÃ­stica, no aprobado por defecto.

Primera ejecuciÃ³n idÃ©ntica final-ten: mÃ¡ximo rAF 182.995 ms, dos consultas de programa, 161.955 ms acumulados. ComparaciÃ³n anterior: 5054.95 ms / 37 consultas / 4911.38 ms. No es aÃºn ABAB ni prueba de coste GPU sostenido. Programas restantes: humo de destrucciÃ³n RawShaderMaterial (118.375 ms), profundidad de malla skinned con mapa (43.58 ms). Hay que resolver o atribuir su apariciÃ³n y repetir sin confundir daÃ±o simultÃ¡neo con activaciÃ³n del escudo.

17 pruebas existentes/nueva cobertura de precarga y VFX pasan. Test aÃ±adido verifica luz aislada, color/intensidad, origen de render desplazado, desapariciÃ³n sin cambio de conteo y liberaciÃ³n. Runtime normal permanece sin cambios mientras no se indique opt-in.

## Precarga de humo

AÃ±adida preparaciÃ³n explÃ­cita de smokeScene con su configuraciÃ³n real (sin luces de mundo, sombras desactivadas, destino de pantalla). Estado del renderer restaurado antes del await, probado con compilaciÃ³n pendiente. No se generan partÃ­culas ni se altera simulaciÃ³n.

RepeticiÃ³n stable-smoke: una sola consulta tardÃ­a, MeshDepthMaterial skinned, 73.915 ms; desaparece la consulta del humo. MÃ¡ximo intervalo rAF 182.76 ms, sin long tasks >150 ms. Son medidas de una ejecuciÃ³n con sampling y vÃ­deo, todavÃ­a no equivalencia ABAB ni benchmark GPU. Captura raid-shield.png inspeccionada: escudo y grupo visibles, escena coherente; no sustituye comparaciÃ³n fija de efectos mÃºltiples.

AÃ±adidas marcas de tiempo del clic al harness para las siguientes ejecuciones. Pendiente aislar variante de sombra, estabilizar selecciÃ³n de luces simultÃ¡neas y medir coste GPU sostenido. Encontrados reintentos de rutas desconocidas de 4/8 segundos en raids.js; medir causas y sectores, no asumir que un pthread elimina esas polÃ­ticas.

## DiagnÃ³stico espacial de Manglares

Nuevo survey-mangrove-network.mjs muestrea el WASM autoritativo (sin modificarlo), con poblado en (60,0), 480x480 metros, paso 2 m, semillas 1/37/712/4096. Agua: 2.413/2.439/2.340/2.406 %. En las regiones con |x|>100 e |z|>100: 0 % en las cuatro. Mapa seed-37.png inspeccionado: dos lÃ­neas estrechas atravesando una superficie mayoritariamente seca. La fÃ³rmula no define una red distribuida. El proxy de barro del mapa es mÃ¡scara >0.2 fuera del agua, no clasificaciÃ³n del material final. Se necesitan cauces principales y secundarios repartidos espacialmente, con anchuras y mÃ¡rgenes variables, conservando identidad de generaciÃ³n para partidas existentes.

La primera ejecuciÃ³n de atribuciÃ³n de objeto de sombra fallÃ³ por una referencia QA no instalada; no es un error del juego. Corregida la inyecciÃ³n exclusivamente en el harness y repeticiÃ³n en curso. No usar esa ejecuciÃ³n fallida para rendimiento.

AtribuciÃ³n corregida: clickStart 43507.525 ms, clickEnd 43570.430 ms. Ãšnica consulta tardÃ­a a 48871.075 ms (~5.3 s despuÃ©s): SkinnedMesh Mesh_0_1 / Mesh_0 / Armature, fuente Material_0, MeshDepthMaterial DoubleSide, espera 84.735 ms. Por tanto no atribuir ese evento al clic del escudo. La preparaciÃ³n residual de sombras y la latencia directa de magia son mÃ©tricas distintas. MÃ¡ximo rAF de la ventana completa 182.85 ms.

## Primera red estuarina (variante 8, NO activada)

C++ implementa lÃ­mites de celdas irregulares deformados por ruido, con anchura variable y mÃ¡rgenes hÃºmedos. Variante nativa 8 y bandera persistida mangroveNetwork, independiente de legacy 4 y canales 7. Propagada a estados, workers y validaciÃ³n de sesiÃ³n; el hilo de preparaciÃ³n copia su bandera. Las partidas nuevas siguen usando variante 7 hasta validar arte/jugabilidad. Recompilados WASM sÃ­ncrono y pthread.

Survey cuatro semillas: 18.23â€“20.40 % agua en 480x480 m y 15.01â€“20.15 % en regiones exteriores (antes 0 %). Cuatro tests pasan, incluidos legacy, snapshot, rÃ©plica lejana y geometrÃ­a de agua pthread equivalente.

InspecciÃ³n seed-37.png: red distribuida, pero bordes demasiado rectos y celdas poligonales evidentes; no cumple aÃºn la referencia de meandros naturales. Conservar como iteraciÃ³n diagnÃ³stica y aumentar deformaciÃ³n orgÃ¡nica/jerarquÃ­a de ramificaciones. Pendientes capturas reales, navegaciÃ³n entre partes secas, costes de generaciÃ³n y memoria. No presentar la cobertura numÃ©rica como aprobaciÃ³n artÃ­stica.

## Meandros a dos escalas

DeformaciÃ³n de la red con ruido a 0.015/0.042, amplitudes 86/18 m. Cobertura cuatro semillas 18.86â€“20.28 %, zonas exteriores 16.95â€“20.79 %. MÃ¡scara tiene una cota conservadora explÃ­cita de pendiente para los certificados de navegaciÃ³n. Los cuatro tests legacy/snapshot/far/pthread siguen pasando.

Mapa seed37 inspeccionado: elimina la mayorÃ­a de tramos rectos y genera curvas, ensanchamientos e intersecciones. Primera captura real semilla37: 495/3721 muestras con agua alrededor del poblado (~13.3 %), sin errores de pÃ¡gina. Cauces visibles en primer fondo y horizonte, poblado sin inundaciÃ³n. TodavÃ­a falta prueba de accesibilidad y utilidad de las masas secas, costes nativos y revisiÃ³n artÃ­stica multi-semilla; no activar por defecto.

Harness de capturas ampliado con cierre del tutorial y vista elevada. Serie real 1/37/712 en curso, sesiÃ³n de ejecuciÃ³n 38423. No se atribuyen resultados a capturas aÃºn pendientes.

## ValidaciÃ³n de emplazamientos

Prueba real del buscador nativo sobre semillas 1/37/712/4096 y todos los packs culturales: encuentra un emplazamiento vÃ¡lido con doce parcelas Ãºtiles y sus rutas de trabajadores. Pasa en 10.46 s de suite (no benchmark comparativo). No demuestra aÃºn acceso de incursiones desde todas las masas de tierra ni campaÃ±as largas.

LimitaciÃ³n detectada en QA visual: las primeras capturas llamadas elevated estaban siendo reajustadas por la cÃ¡mara guiada del tutorial. No cuentan como panorÃ¡micas. Harness corregido: cinematic=true Ãºnicamente para la captura, ocultar presentaciÃ³n del tutor sin avanzar pasos, posiciÃ³n elevada explÃ­cita sin clamp de OrbitControls. Se repetirÃ¡n esas vistas; las capturas normales anteriores sÃ­ muestran el terreno real.

## Acceso terrestre hostil obligatorio

ExtraÃ­do el buscador geomÃ©trico comÃºn naturalLandAccess del wrapper de Gran CaÃ±Ã³n, conservando su comportamiento anterior. La variante estuarina exige ahora una ruta positiva desde 32 m hacia las parcelas con el radio publicado del rinoceronte (1.55 m). No abre pasos artificiales ni ignora agua. La bÃºsqueda de emplazamiento rechaza candidatos sin ese testigo.

Cuatro semillas/todos los packs culturales pasan la condiciÃ³n aÃ±adida. Tanda completa: 19/19 pruebas de defensa natural de CaÃ±Ã³n, emplazamientos iniciales y variantes Manglares. Error inicial de reutilizaciÃ³n (riverX existe pero no devuelve coordenadas vÃ¡lidas fuera de CaÃ±Ã³n) corregido limitando el seguimiento de esa ribera al bioma correspondiente.

PanorÃ¡mica corregida seed1 inspeccionada: muestra distribuciÃ³n extensa de canales y islas; orillas angulosas en el fondo siguen pendientes de diagnÃ³stico de representaciÃ³n distante. Acceso de 32 m es una condiciÃ³n de arranque, no prueba de incursiÃ³n completa ni de conectividad universal entre islas.

## RevisiÃ³n de panorÃ¡micas y robustez de QA

Serie overview: semilla1 completada y revisada; semilla37 agotÃ³ 240 s de espera de mundo mientras se editaban mÃ³dulos del servidor HMR. No afirmar que sea un fallo de generaciÃ³n ni descartar esa posibilidad sin repetir. Servidor QA separado en 5220, HMR desactivado. Primer intento allÃ­ agotÃ³ 30 s en page.goto antes de entrar al juego (sin pageerrors); preservado failure.json. Harness ahora distingue navegaciÃ³n inicial (DOMContentLoaded, 90 s) y preparaciÃ³n del mundo (240 s), conserva texto/captura/errores al fallar y espera las rutas interceptadas antes de cerrar contexto. RepeticiÃ³n activa 57503.

AÃ±adido benchmark-estuary-generation.mjs para comparar coste CPU nativo por chunk en secuencia 7/8/7/8; aÃºn NO ejecutado para evitar concurrencia con capturas. No mide GPU ni frametime. Mantenerlo separado de la validaciÃ³n de fluidez.

## Cambio solicitado: canales transitables (2026-10-26)

El usuario pide que bestias y trabajadores crucen el agua de Manglares para mantener incursiones y expansiÃ³n. Esto reemplaza el requisito experimental de acceso exclusivamente terrestre entre islas; no autoriza construir/cultivar sobre agua ni eliminar helechos.

AuditorÃ­a confirmada:
- `spatial-savanna.cpp::terrainValid` actualmente exime del bloqueo por agua Ãºnicamente a trabajadores en Gran CaÃ±Ã³n. Las bestias de Gran CaÃ±Ã³n siguen bloqueadas; conservar esa regla fuera de Manglares.
- La altura de desplazamiento debe actualizarse conjuntamente en navegaciÃ³n JS, `spatial-navigation-movement.js` y las consultas nativas de servicio de trabajadores (`spatial-intent-state.cpp::waterHeight`).
- `lazy-sectors.cpp::cutFaceNatural` y `cutFaceNaturalWithoutSolid` certifican humedales como cierre natural. Deben dejar de hacerlo al permitir trÃ¡nsito, o podrÃ­an declarar protegido un recinto accesible por el agua.
- Conservar comprobaciones independientes de colocaciÃ³n: agua transitable no equivale a terreno edificable/cultivable. Conservar colisiones con props, edificios, murallas y escudos segÃºn perfil.
- ValidaciÃ³n requerida: rutas reales entre ambas orillas para trabajadores y las cinco especies; alturas visibles correctas; escudos/murallas siguen bloqueando bestias; guardado/carga y equivalencia pthreads; incursiÃ³n mÃºltiple y expansiÃ³n. No basta cambiar el rechazo de agua.

La captura pendiente `network-overview-37-nohmr-retry` terminÃ³ correctamente: 495/3721 muestras hÃºmedas, 25 meshes de agua, sin errores registrados. Falta validar helechos y cruce acuÃ¡tico en el renderer. El cambio de transitabilidad todavÃ­a no estÃ¡ implementado.

## Paso por agua implementado: primera validaciÃ³n

La navegaciÃ³n nativa permite agua de Manglares para todos los perfiles y calcula pendientes sobre la superficie transitable (mÃ¡ximo entre suelo y nivel 3.34). Gran CaÃ±Ã³n conserva su regla anterior. Actualizadas alturas JS, comprobaciones fÃ­sicas de cada paso y altura de servicio de trabajadores. Los certificados nativos ya no consideran agua de Manglares un cierre defensivo; la colocaciÃ³n de edificios/cultivos conserva sus restricciones de agua. No se modifica distribuciÃ³n ni densidad de helechos.

Recompilados WASM sÃ­ncrono y pthread. Dos tests nuevos pasan: segmentos fÃ­sicos sumergidos para trabajador y los cinco radios de bestia, barrera que bloquea y vuelve a liberar el paso, altura y rechazo de construcciÃ³n. Los doce tests existentes de defensa de CaÃ±Ã³n y recetas/snapshot/pthreads de Manglares tambiÃ©n pasan. Primer intento del test nuevo fallÃ³ por pedir un conector local de 4 m (API limitada a 1.5 m), corregido a 1 m; no era un fallo de navegaciÃ³n. Esto solo demuestra segmentos cortos, no aÃºn recorridos completos entre orillas ni incursiones reales.

Pendiente antes de cerrar este cambio: ruta larga cruzando canales, recinto abierto por agua, movimiento visible de grupos/trabajadores, guardado/carga con perfiles de navegaciÃ³n y equivalencia pthread completa. ContinÃºan pendientes validaciÃ³n artÃ­stica de helechos y rendimiento de magias/rutas del objetivo global.


## Rutas completas entre orillas

Añadida prueba nativa con terreno y props reales, semilla37, nueve chunks residentes, origen seco (-24,-40) y destino seco (0,-40). Los seis perfiles encuentran ruta que entra en agua; cada segmento se valida con el comprobador físico continuo. Las rutas son idénticas tras restaurar snapshot y en el runtime pthread. Tres tests de tránsito pasan; añadido también rechazo explícito del certificado de cierre natural por humedal. Esto valida consultas nativas, todavía no simulación de una incursión ni animación/renderizado.


## Incursión mixta nativa y alerta de vegetación

Nuevo check-estuary-native-raid.mjs crea un poblado real en variante8/semilla37, carga 49 chunks con la sesión de juego y lanza una incursión de jabalí, hiena, búfalo, león y rinoceronte. Los cinco animales entraron en agua y se produjo StructureHit tras 497 pasos de 0.1 s. Resultado en native-estuary-raid.json. Es simulación nativa con obstáculos reales, no vídeo ni medida de frametime.

Inspeccionada captura network-overview-37-nohmr-retry/world.png: canales visibles, pero casi ningún helecho cerca del poblado. No se acepta como preservación artística. El perfil aprobado sigue seleccionando mangroveFerns=holly; pendiente inspeccionar estadísticas de continuous-grass, máscaras y selección antes de tocar densidad o atribuirlo al nuevo agua.


## Diagnóstico de presencia de helechos

Captura real fern-diagnosis-37 completada sin errores. Audit confirma holly-fronds, variante C activa, calidad media, espaciado .65, 225 matas cercanas y 57 lejanas (282 total), 7656 triángulos; 6183 candidatos y 5481 excluidos por máscaras. El asset aprobado y LOD están activos: no atribuir la escasez a sustitución por hojas antiguas. Falta separar cobertura, desgaste/poblado, pendiente, exclusión acuática y alcance de cámara. Comparación equivalente con variante7 iniciada en sesión91103, todavía pendiente; no cambiar densidad sin esa evidencia.


## Dirección frondosa solicitada

Comparación misma cámara/poblado variante7 y8: ambas 225 matas cercanas +57 lejanas; no pérdida de cobertura seleccionada en esa vista. Captura fern-channel-37 fuera del poblado (105,50) inspeccionada: masa densa de frondas conservada alrededor del canal; arbolado sigue claramente disperso. Usuario solicita mayor densidad general según nuevo mockup. Primera prueba de dosel SOLO variante8: espaciado de árboles 13.5 ->8.5 m, umbral de hábitat de mangles .56 ->.20 para ocupar márgenes húmedas. No cambia helechos, despeje de asentamientos ni colisiones. Compilación53712 en curso; requiere captura y repetir pruebas de rutas/incursión, no activar por defecto todavía.


## Primera captura del dosel más denso

canopy-dense-37/world.png completada sin errores e inspeccionada. Más arbolado, helechos presentes, pero predominan palmeras/árboles de hoja larga: no alcanza aún las agrupaciones de copa ancha del mockup. Siguiente hipótesis: selección de especies por margen húmeda, no seguir aumentando indiscriminadamente instancias.

Incursión densa guardada por separado en native-estuary-raid-dense.json: cinco especies entran en agua, ataque tras474 pasos. Se conserva informe anterior. Siete tests pasan; ampliada equivalencia de variante8 pthread a posiciones del terreno, instancias visibles y props de colisión, además del agua. Coste GPU/framerate de densidad todavía no medido.


## Dosel de copas anchas y coste nativo

Variante8 selecciona 65–90 % de mangles de copa ancha/grandes raíces en grupos correlacionados por ruido; conserva palmeras ocasionales, identidades de celdas y colisiones. Admite mangles sobre islas emergidas además de márgenes húmedas; recetas4/7 intactas. Incursión cinco especies cruza agua y ataca tras501 pasos. Siete tests de rutas/snapshot/pthread pasan. Captura canopy-broadleaf-37 en curso (63406), todavía no juzgada.

Benchmark nativo A/B/A/B ejecutado sin otro benchmark concurrente: variante7 ~1.82–4.44 ms/chunk, variante8 ~8.27–10.25 ms/chunk, cinco coordenadas repetidas. Ambas producen distinto mundo y más agua/árboles en8; no aisla coste del dosel. Es CPU Node síncrono sin perfiles de navegación, no GPU, no frametime y no prueba de streaming fluido. Informe native-generation-abab.json conservado. Hace falta atribuir coste de máscara y validar integración asíncrona real.


## Captura de copas y retorno a magia

canopy-broadleaf-37/world.png inspeccionada: copas amplias agrupadas y frondas continuas, canal legible; candidata más cercana al mockup que la variante de palmeras. No equivale a aprobación final multi-semilla ni rendimiento medido.

Corregido prototipo de luces estables: ignora efectos cuyo ancestro está oculto o que pertenecen a un grupo desconectado de la escena. Ocho tests VFX pasan, incluida ocultación/reconexión sin variar número/visibilidad de PointLights. Continúa opt-in. Iniciada repetición real perfilada con fixture final-ten, salida shield-stable-visibility; pendiente resultado.


## Repetición escudo con visibilidad jerárquica

shield-stable-visibility completada con diez bestias, sin errores. Clic instrumentado30.295ms; única espera getProgramInfoLog72.08ms en MeshDepthMaterial/SkinnedMesh,5382ms después del clic. No reaparece la recompilación masiva al activar escudo. Resumen compacto guardado junto al perfil/vídeo. Sigue siendo una ejecución instrumentada, no ABAB ni coste GPU sostenido.

Detectado primer intervalo rAF negativo por mezclar performance.now inicial con timestamp de callback. Harness corregido para empezar a medir entre dos callbacks; el resumen de esta ejecución excluye únicamente esa muestra inicial y conserva datos crudos.


## Comparación intercalada del escudo iniciada

Sesión49829 ejecuta A1/B1/A2/B2 secuenciales sobre final-ten, Chrome nuevo por ejecución, mismo viewport1280x720/calidadmedia y profiling+vídeo en todas. A mantiene luces originales, B activa vfxStableLights. No se modifica renderer durante la serie. Script summarize-shield-abab calcula percentiles, máximo del intervalo que solapa el clic (incluye bloqueos que terminan después del primer segundo), esperas de programas y errores; registra tiempo simulado y número de actores para detectar divergencia antes del clic. Serie aún en curso, sin resultados atribuidos. No mide GPU ni demuestra coste sostenido; el avance de simulación puede variar con el tiempo de preparación.


## A/B/A parcial: bloqueo reproducido dos veces

A1: máximo5154.925ms,36 consultas,4942.635ms de espera de programas. B1: máximo166.2ms, máximo que solapa activación149.63ms,1 consulta89.595ms. A2: máximo5454.19ms,36 consultas,5203.505ms de espera. P95 ~83ms en los tres: no mejora sostenida demostrada. Diez actores antes del clic y elapsed314.278/314.284/314.300, desviación pequeña pero no igualdad exacta de simulación. B2 sigue activo en49829.

Auditoría de otras magias: AgricultureVfx desactiva worldLights por defecto y softParticleDepth para crecimiento/multiplicar; no debería provocar el mismo cambio de número de luces ni captura extra de profundidad. Esto es evidencia de código, no sustituye ejecución real de ambas magias.


## A/B/A/B completo

Las cuatro ejecuciones terminan sin errores. A1/A2: máximo5154.925/5454.19ms,36 consultas cada una,4942.635/5203.505ms de espera. B1/B2: máximo166.2/166.35ms, máximo en activación149.63/116.385ms,1 consulta cada una89.595/122.87ms. P50 ~49.95ms en todas. P95 A82.945/82.985, B83.21/66.655: variabilidad, no concluir mejora sostenida. Tiempo simulado antes del clic314.278–314.300s,10 actores en todas. Resumen shield-abab/summary.json; perfiles, shaders y vídeos crudos en carpetas A1/B1/A2/B2.

61 pruebas de agricultura VFX y movimiento/escudo pasan, incluidas expiración, reload, amanecer/anochecer y bloqueo físico del escudo. No son pruebas WebGL reales de crecimiento/multiplicación. La fixture final-ten tiene una planta muerta y está en día1/noche: no sirve directamente para esas magias; preparar escenario agrícola legal separado.


## Escenario agrícola real preparado

create-agriculture-render-fixture genera apertura nativa y cuatro plantas de mijo pagadas con contratación normal. Progresión controlada a día5/hora100 para desbloqueo; no es campaña natural. Valida Game.cast de las cuatro aplicaciones en copia deserializada sin aplicar efectos al snapshot que carga el renderer.

check-agriculture-render carga esa partida en renderer real, invoca comando Game.cast legal sobre cada planta (growth/multiply/growth/multiply), espera y captura cada efecto. Mide comandos, rAF y getProgramInfoLog con el mismo instrumental del escudo. No valida puntería UI, no debe confundirse con prueba de clic. Ejecución6737 en curso; pendiente resultado.


## Primera ejecución agrícola y limitación visual

Cuatro comandos aceptados:1.315/.690/.285/.330ms, sin consultas getProgramInfoLog, máximo rAF99.68ms y P9533.405ms. Simulación avanza y duraciones de hechizos decrecen. Captura magic-3 inspeccionada: planos de siembra pequeños, efectos no suficientemente discernibles para aceptación visual. No afirmar equivalencia de efectos por ausencia de compilación.

Harness ampliado con cámara cercana a las plantas, inspección de efectos activos/sprites/visibilidad y aserciones. Repetición close-render90530 en curso, preservando primera ejecución.


## Efectos agrícolas visibles

close-render completado: captura magic-3 inspeccionada, cuatro auras/cintas visibles sobre plantas recién sembradas. Cuatro efectos presentes en escena con16sprites cada uno y tiempo creciente;0luces locales. Comandos1.23/.47/.21/.175ms. Resumen con frametimes/compilaciones guardado; no equivale a coste GPU aislado.

Iniciada captura secuencial de dosel amplio en semillas1 y712, mismo punto105,50 y calidadmedia, para validar nueva densidad más allá de37. Sin cambios de runtime durante capturas.


## Regresión/limitación detectada en semilla4096

Incursiones densas: semillas1 y712 cruzan agua con cinco especies y atacan tras525/567pasos. Semilla4096 genera incursión, pero todas quedan en waiting/unknown y termina a910pasos sin contacto ni agua. Conservar informe negativo. Harness inicialmente fija49chunks; añadido modo WG_RAID_STREAM para servir raidConnectivityDemand y captura profunda de raidWait (antes compartía referencias mutables). Repetición4096 con ese modo tampoco alcanza objetivo. No atribuir aún a densidad ni dar validación multi-semilla por cerrada: investigar qué consulta produce unknown y por qué no se satisface la demanda. Informe negativo adicional *4096-stream.json. Capturas de semillas continúan en60946.

## Dosel denso: revision visual y limite de residencia en QA

Inspeccionadas capturas reales canopy-broadleaf-1/world.png y canopy-broadleaf-712/world.png: copas anchas agrupadas, helechos continuos y canales visibles. Las dos ejecuciones finalizan sin errores. La camara cercana permite comprobar cobertura, pero no sustituye la comparacion panoramica exacta con el mockup ni una medida GPU.

Diagnostico adicional semilla4096: mismo harness con WG_RAID_CHUNK_RADIUS=4 (81 chunks iniciales en vez de49), manteniendo demanda de streaming, obtiene StructureHit tras1222 pasos y tres actores cruzando agua. Esto demuestra que el escenario no es intrinsecamente intransitable; ampliar residencia cambia el resultado. No demuestra que la demanda del juego real este corregida ni que la latencia de rutas sea aceptable. Conservar los dos resultados negativos anteriores. Investigar el halo requerido y la propagacion de demanda antes de activar la variante por defecto.

Reproduccion: WG_RAID_SEED=4096 WG_RAID_STREAM=1 WG_RAID_CHUNK_RADIUS=4 node tools/experiments/check-estuary-native-raid.mjs (variables de entorno). Informe native-estuary-raid-broadleaf-4096-halo.json. La densidad sigue siendo candidata experimental; rendimiento completo pendiente.

## Atribucion de espera en incursiones, semilla4096

Instrumentado raidSelectionStats en harness. Con49chunks y servicio de raidConnectivityDemand:60selecciones,60legacyFallbacks.unsupported y60resultados unknown; demand vacio,0consultas regionales,49chunks residentes al terminar. El harness no reproduce el planificador completo de intents del juego; no atribuir el fallo directamente a la ruta de produccion. Revisar propagacion de unknown en fallback y equivalencia con runtime.

Prueba negativa: anadir anillo de origen a requestRaidConnectivity no cambio el resultado (910pasos,0cruces,sin ataque). Cambio runtime retirado; no conservar heuristica sin utilidad demostrada.16tests spatial-navigation-movement pasan. Informe origin-demand preserva prueba negativa; demand-audit contiene instrumental nuevo. El objetivo sigue pendiente.

## Correccion de demanda y densidad preservada

Conectado harness opcional WG_RAID_NATIVE_INTENTS=1 al createEventDrivenTaskPlanner, reset y observadores como main. Reproduce espera4096 sin demanda: no era solo ausencia de planner. reachableApproach descartaba SpatialChunkUnavailable sin solicitar residencia. Ahora transmite demanda, conserva result.missing en el adaptador y la heuristica considera tambien vecinos del origen, antes solo destino/corredor.

Combinacion completa:49chunks iniciales,4solicitados (5,0..3),53residentes;3actores cruzan agua y StructureHit tras1203pasos. Antes911sin movimiento/ataque. No se modifica densidad ni colisiones. Propagar demanda sin vecinos de origen tampoco resolvia; informes negativos preservados. No implica validar latencia real ni todas las semillas.

Nueva preferencia del usuario: si es necesario, dejar pasos entre arboles para bestias/trabajadores; preservar copas y helechos. Pendiente medir conectividad para rinoceronte y verificar camara real, sin reducir densidad indiscriminadamente.

## Repeticion con intents nativos y recuperacion de cobertura de tests

Cuatro semillas con WG_RAID_NATIVE_INTENTS=1 y WG_RAID_STREAM=1:1/37/712/4096 alcanzan StructureHit tras525/501/567/1203pasos;5/5/5/3actores detectados en agua antes del primer impacto. No afirmar que todos alcanzan destino: harness termina al primer impacto.4096 aun tarda mucho mas; investigar latencia/desvios y espacio entre arboles. No es benchmark de frametime.

Detectado en revision de commit que el archivo nuevo raid-entry-residency.test.js coincidia con un test preexistente y lo habia reemplazado. Restaurado integro desde el padre del commit y trasladadas las dos pruebas nuevas a raid-approach-residency.test.js. Ambas suites ejecutadas:9/9 pasan. La correccion recupera cobertura original; no ocultar esa omision del commit previo.

## Escudo repetido: prueba renderer iniciada

check-shield-repeat-render.mjs deriva del harness agricola validado y ejecuta3comandos legales de escudo en la misma posicion. Espera expiracion y cooldown real90s entre aplicaciones, sin adelantar reloj, con simulacion/render/video/perfil activos. Escena agricola sin incursiones: complementa el ABAB de primer uso con diez bestias, no lo sustituye. Primer comando aceptado5.59ms; pendiente resultado completo y analisis de intervalos/compilaciones. Sesion3053, salida shield-repeat-render. Luces estables siguen opt-in.

## Tres escudos con recarga real completados

shield-repeat-render termina sin errores. Comandos en elapsed3.286/93.296/183.306s, cooldown0 y sin escudo anterior en las tres aplicaciones. CPU comando5.590/5.680/6.405ms. Maximo intervalo rAF en ventana de activacion2s:66.495/49.800/33.485ms. Toda la ejecucion8705muestras:P5016.665,P9533.37,P9933.51,max99.57ms. Primera activacion una consulta getProgramInfoLog25.595ms MeshBasicMaterial; repeticiones ninguna. No reaparece bloqueo de segundos. Captura shield-1 inspeccionada: cupula visible correcta.

Es una ejecucion instrumentada de escena agricola Sabana, no GPU aislado ni ABAB ni incursiones; complementa ABAB anterior con diez bestias. No demuestra coste GPU sostenido de cuatro luces, streaming simultaneo o todos los perfiles. Prototipo sigue opt-in hasta cerrar esas validaciones. Resumen reproducible con summarize-magic-repeat.mjs; raw/perfil/video conservados localmente.

## Pendiente posterior solicitado: overlays de pantalla completa

Tras cerrar Manglares y bloqueos de magia, revisar duracion y legibilidad de overlays de magia, dano critico, victoria y similares. Objetivo perceptivo solicitado:2-3segundos, evitando aspecto de flash. Definir entrada/permanencia/salida y politica de sustitucion, renovacion o prioridad cuando llegan eventos cercanos, sin acumular capas ni prolongar indefinidamente el efecto. Validar magias encadenadas, dano+magia, victoria y salida/cambio de mundo. No implementado aun; no desplazar el objetivo activo.

## Coste sostenido de slots: ABAB GPU iniciado

measure-stable-lights-gpu.mjs mide drawRenderFrame completo mediante EXT_disjoint_timer_query_webgl2,60frames calentamiento y240consultas por brazo, chequeo disjoint y renderer real. A/B/A/B separados cargan misma fixture agricola, calidadmedia720p; B activa slots, A original, sin escudo activo. Simulacion permanece activa y video en ambos, por lo que registrar snapshots antes/despues y no asumir igualdad exacta. Sesion16190 en curso; ningun resultado aun. No modificar runtime durante serie.

## GPU sostenida sin magia: ABAB completo Intel UHD

Cuatro ejecuciones sin errores, EXT_disjoint_timer_query_webgl2 valido, disjoint=false,240consultas cada una sobre drawRenderFrame. GPU media A1/B1/A2/B2=22.533/21.558/20.606/21.304ms; mediana21.522/20.947/20.552/20.956ms. CPU envio medio3.201/3.141/3.274/3.279ms. No hay penalizacion consistente grande, pero tampoco mejora demostrada: A deriva entre repeticiones y B2 supera A2 ~0.70ms. No concluir coste cero ni ganancia. Mismo fixture con simulacion activa, elapsed inicial1.991-2.082s y finales9.482-10.230s; ventanas no son estados temporales exactamente iguales.

Scope: Sabana agricola media720p sin escudo activo, video en todos; no incluye coste total simulacion/frametime ni valida biomas complejos o multiples fuentes. Resumen compacto stable-lights-gpu/summary.json y raw locales. Siguiente: comprobar fuentes simultaneas/cambios de seleccion y streaming antes de activar slots por defecto.

## Estabilidad de seleccion de fuentes simultaneas

Prototipo opt-in: histéresis20% en puntuacion de fuentes ya elegidas; no altera intensidad/color fisicos, numero de slots ni shaders. Set reutilizable, descartado cuando fuente oculta/desconectada/inactiva. Validacion count entero1..8. Nueva prueba con un slot y dos fuentes verifica que diferencia10% no cambia seleccion,30% si, intensidad original intacta y ocultacion limpia inmediatamente.9tests VFX pasan.

Limite: evita oscilaciones cerca de empate, pero sustitucion por fuente claramente mayor sigue instantanea. No considerar validacion visual de multiples efectos completa ni extrapolar ABAB anterior a nueva politica bajo saturacion. Pendiente escena real con mas fuentes que slots, movimiento y streaming.

## Escudo con streaming simultaneo iniciado

Harness repeat admite WG_MAGIC_STREAM=1: recorrido ida/vuelta96m en16s iniciado justo antes del comando, manteniendo bucle de presentacion normal y syncChunks existente. Registra claves instaladas cada100ms y exige que aparezcan chunks nuevos. Dos escudos con cooldown real, perfiles/video activos, luces estables con histeresis. Sesion80808, shield-stream-render, pendiente resultado. No afirma pthreads a partir del nombre: verificar runtime de esta distribucion aparte. Es escenario agricola Sabana; no equivale a incursiones Manglares.

## Streaming + escudo: resultado y control iniciado

Dos aplicaciones completan sin errores: comandos6.145/4.985ms; maximo ventana activacion249.395/116.345ms. Total4686intervalos,P9516? Correccion: P9533.49ms,P9966.45ms,max249.395ms.30consultas getProgramInfoLog suman1176.095ms,max214.82ms. La mayor corresponde native-obstruction-blend MeshStandardMaterial a329ms del primer comando; otras smooth-far-opaque hasta93.84ms. No atribuir todos los picos al escudo. No vuelve bloqueo de segundos, pero persisten tirones.

Streaming comprobado por claves:26/29chunks unicos en recorridos frente25iniciales,15/16al terminar. No prueba throughput optimo ni ausencia de suelo temporalmente pendiente. Iniciado control mismo recorrido sin Game.cast (WG_MAGIC_NO_CAST=1,1recorrido), sesion96461 salida shield-stream-control. Diferenciar coste de movimiento del de magia antes de ampliar correccion. Resumen completo local con samples; no interpretar como comparacion GPU.

## Control sin magia: pico independiente de activacion

Control mismo recorrido sin Game.cast termina ok,sin errores.645intervalos:P9549.885,P9966.525,max249.42ms. Una consulta getProgramInfoLog217.895ms en native-obstruction-blend MeshStandardMaterial. Coincide con pico249.395ms y espera214.82ms de primera activacion con recorrido. Evidencia de preparacion tardia de transparencia durante movimiento, no del cambio de luces al activar escudo. Es una pareja de recorridos, no ABAB; no extrapolar frecuencias de tirones ni rendimiento sostenido. Otros30programas en prueba larga no se reproducen en este control corto; falta atribucion para ellos.

Resumen compacto de ambos preservado, raw/profiles/videos locales. No se declara ausencia de tirones. Siguiente validacion del objetivo: escena real Manglares con generacion nueva y navegacion; defaults siguen pendientes hasta cierre artistico/funcional.

## Pendiente posterior solicitado: apoyo del totem en menu

Revisar composicion de inicio para anclar pie del totem a una capa de suelo cercana que comparta su movimiento/profundidad durante acercamiento. Conservar parallax del fondo lejano y animacion al elegir opcion; evitar apariencia flotante o deslizamiento de base. Validar reposo, acercamiento, regreso y formatos de pantalla. Tarea posterior al objetivo activo, aun no implementada.

## Fixture Manglares nuevo y magia conjunta

Apertura experimental admite mangroveNetwork antes de findSpatialStart (no cambia defaults). Fixture estuary-agriculture crea4cultivos pagados y trabajador sobre receta8, verifica comandos agricolas en copia, conserva snapshot versionado. Progresion dia5 controlada, no campaña natural. Harness magia permite seleccionar fixture por WG_MAGIC_FIXTURE.

Iniciado renderer Manglares receta8 con dos escudos,cooldown real y recorrido streaming96m, luces estables:sesion95059,estuary-shield-stream. Pendiente resultado visual/perfil; no declarar validacion por preparar fixture.

## Manglares conjunto: primera prueba no acredita streaming

95059 termina con asercion Camera must introduce new chunks. Snapshot confirma biome=manglares,mangroveNetwork=true.21claves iniciales y21unicas,13finales: hubo retirada pero no instalacion nueva observada. Primer comando aceptado4.97ms; ninguna espera registrada de programas. Captura shield-0 muestra helechos densos y copas, pero escudo fuera del encuadre al mover camara; no valida su aspecto. Tutorial agricola reaparece durante recorrido; revisar interferencia en siguiente prueba. No descartar fallo ni declarar streaming correcto.

Harness parametriza distancia/tiempo manteniendo valores anteriores por defecto. Repeticion144m/40s,2activaciones, salida estuary-shield-stream-long, sesion70152. Hipotesis: mas permanencia permite observar entrega; si no, investigar pipeline, no relajar asercion.

## Manglares conjunto: recorrido largo completado

70152 termina ok sin errores,2escudos con recarga real y streaming144m/40s. Snapshot conserva mangroveNetwork. Comandos4.695/3.910ms; maximos de activacion99.755/99.805ms;3997intervalos totales,P5066? Correccion: P5033.225ms,P9566.55ms,P9999.78ms,max149.67ms.0consultas getProgramInfoLog registradas. Recorridos38/34chunks unicos frente21/25iniciales;16/15al retorno. Confirma generacion/instalacion durante prueba, no demuestra que todas las regiones deseadas esten listas a tiempo ni coste GPU. No se altero cooldown ni reloj; tutorial reaparece pero ambas aplicaciones se completan.

Resumen estuary-shield-stream-long/summary.json. Sigue pendiente panorama final multi-semilla, navegacion/trabajadores en renderer, confirmar runtime pthread del navegador, densidad/rutas rinoceronte y politica final de fuentes antes de defaults. No extrapolar esta prueba agricola a incursiones activas.

## Incursion renderer sobre receta nueva iniciada

create-estuary-raid-render-fixture construye apertura nativa Manglares712 receta8,4cultivos y trabajador pagados, progreso QA dia5 y grupo5especies mediante spawnRaid. Snapshot deserialize confirma mangroveNetwork. No altera manualmente rutas/posiciones de animales. Harness beast acepta WG_BEAST_FIXTURE para cargar esta partida y observar grupo antes del clic real de escudo. Sesion9173,estuary-raid/render, pendiente resultado/capturas. No equiparar fixture con campaña natural.

## Incursion real Manglares: grupo y escudo

9173 termina ok,0errores,receta8 conservada. Cinco rigs presentes; captura group-7 inspeccionada (copas/helechos/agua y animales visibles). Rutas:4especies caminan inicialmente; rinoceronte waiting/unknown hasta despues de~15s, luego walking hacia centro. No declarar latencia resuelta. Al final lion/rhino/buffalo caminando,hyena fuera,warthog retirandose. No prueba cruce de agua de todos desde esta camara.

Clic de escudo real roundtrip73.945ms;0consultas getProgramInfoLog;163intervalos instrumentados despues de observacion de grupo,P9566.48ms,max149.615ms. No es perfil de toda la incursion ni GPU aislado. Resumen compacto estuary-raid/render/summary.json;video y capturas locales. Pendiente espera inicial del rinoceronte y movimiento de trabajador, entre otros gates finales.

## Rinoceronte: reserva ocupada no es ruta desconocida

Audit-estuary-raid-wait carga misma fixture,49chunks,planner nativo y Game.tick completo40s. planAttackCrop rinoceronte devuelve occupied,unknownCauseMask0,0siteTrials a0.1/8.2/16.3/24.3s:4cultivos reservados por4companeros. No era cola de calculo de ruta. A32.3s pasa none y busca estructura; trabajador permanece en centro en esta fixture, no prueba expansion.

Corregido targetFor: occupied conserva waitReason=contention; updateRaid encola con esa razon, cuya epoca incluye liberaciones de reservas/progreso. Unknown genuino conserva politica anterior. No roba reservas ni altera densidad.42tests de seleccion/contencion pasan,incluida nueva prueba de despertar al cambiar lease revision. No afirmar mejora de frametime ni reducir espera legitima por recursos ocupados. Auditoria guardada tras cambio; secuencia de consultas sigue igual en esta fixture donde no hay disponibilidad temprana.

## Equivalencia nativa ampliada

Nueva prueba recorre semillas1/37/712/4096 y cuatro chunks contiguos(2,1)(3,1)(2,2)(3,2). Compara agua,terrain.positions,instances y props entre generacion sincronica y preparacion/publicacion pthread; consultas de superficie siguen disponibles mientras prepara. Restaura snapshot para cada chunk y compara agua e instancias.8tests de canales/travesia pasan. Es equivalencia de datos en chunks vecinos, no prueba visual exhaustiva de todas las juntas ni de campañas completas.

Iniciada captura real semilla4096 copas anchas/receta8 a105,50, salida canopy-broadleaf-4096,sesion81260; pendiente inspeccion. No cambian defaults aun.

## Captura elevada4096 inspeccionada

Render termina sin errores. Canales ramificados e islas visibles, poblado despejado, no lago gigante en area central. Sin embargo vista elevada muestra tramos angulosos y agua lejana plana con fronteras muy marcadas; no considerarla equivalencia artistica cerrada con referencia cartografica. Revisar curvatura/LOD de ribera y tiempo de estabilizacion de captura antes de defaults. Helechos a esta distancia no se distinguen individualmente; conservar validacion cercana anterior.

## Mascara lejana de 2 metros: prueba negativa

El productor far-scene-data muestrea waterInfo.inside binario cada4m y far-ground usa interpolacion lineal con smoothstep(.45,.55); su agua es color plano sin respuesta de agua cercana. Prueba QA semilla4096,misma vista105,50,solo mascara2m: termina sin errores,652/3721 muestras humedas. Inspeccion elevada sigue mostrando bordes angulosos y agua plana; no adoptar mayor resolucion como solucion suficiente ni modificar defaults. Falta separar geometria proxy32m y forma nativa de la mascara. Esta ejecucion confirma spatialSession.runtime.backend=pthreads,fallbackReason=null,crossOriginIsolated=true. Sin medicion GPU en esta prueba. Capturas en far-mask-step2-4096; resumen compacto versionado.

## Proxy lejano8m: hipotesis de geometria insuficiente

Comparacion semilla4096,vista105,50,mascara4m original,proxy8m frente32m. Captura elevada sigue mostrando quiebros y agua plana. Repeticion instrumentada verifica mesh instalado:step8,mapStep4,17271vertices,mapWidth217;pthread activo,sin errores. No aumentar geometria por defecto: no resuelve el defecto. Harness ahora registra parametros solicitados y datos realmente instalados para evitar conclusiones basadas solo en overrides. Falta revisar forma nativa del cauce y respuesta visual del agua; ninguna mejora de rendimiento afirmada.

## Correccion de criterio de captura solicitada por usuario

Las vistas elevadas dominadas por impostores sirven solo para diagnosticar trazado, no para validar calidad final. Retomar camara habitual con arboles3D y helechos cercanos e impostores exclusivamente lejanos. Inspeccion de far-geometry-step8-audit/world.png detecta ademas arbol borroso en primer plano derecho: pendiente identificar representacion/LOD y estabilizacion de streaming; no asumir que el problema ocurre solo al elevar camara. No aceptar comparativas artisticas ni de rendimiento con primer plano sustituido por impostores.

## Pendiente posterior: LOD de trabajadores y bestias

Solicitud del usuario: auditar si los actores ya disponen de LOD para camaras alejadas. Si falta, evaluar versiones low poly conservando rig, animaciones, silueta y legibilidad de incursiones. Seleccionar por tamano proyectado y validar transiciones, varias bestias/trabajadores simultaneos y ahorro CPU/GPU real; no afirmar existencia de LOD sin inspeccion. Tarea posterior, no desplaza Manglares/magias ni correccion angular de impostores.

### Auditoria rapida de LOD de actores

scene.actor y AnimalPreload cargan/clonan un unico GLB por perfil/especie, sin seleccion geometrica LOD por distancia. Los9GLB referenciados por worker-actions y modelos Bestiario no declaran MSFT_lod ni nodos LOD. Triangulos indexados totales del archivo: trabajadores youngMale41927,olderMale40781,olderFemale45115,youngFemale38837 (incluye25meshes,entre ellos herramientas; no equivale a triangulos visibles simultaneamente). Bestias bufalo15743,facoquero15711,hiena16104,leon15896,rinoceronte14182. No se ha generado ni simplificado geometria. Usuario prefiere suministrar variantes low poly antes de cualquier reduccion automatica; esperar esos assets para esta tarea posterior. No afirmar ausencia de archivos alternativos ajenos a los catalogos auditados.

## Prototipo angular y correccion de impostor cercano

farAngularLod=1 coordina CPU/GLSL: peso de tarjeta disminuye entre20y35grados sobre raiz,con readiness aplicada al final para evitar huecos. Standby usa LOD existente y permite preparacion fuera del rectangulo cercano si angulo lo requiere,hasta fadeEnd. No activado por defecto. Se encontro segundo problema: presencia fisica de datos no implica cobertura grafica seleccionada; para opcion angular se usa cobertura efectiva al elegir/satisfacer standby. Captura normal angular-lod-residency/world.png muestra arbol derecho antes borroso ahora3D,106arboles cercanos registrados listos,sin errores. Espera explicita a preparacion terminada antes de captura. Vista elevada usa geometria adicional real segun contadores. No cerrado: faltan movimiento,histeresis/presupuesto,costeGPU y otros5biomas. No simplificacion automatica de actores.

## Recorrido angular: fallo de retencion reproducido

Dos ciclos de camara en24s producen errores Standby tree budget exceeded:11en especie0 y5en especie1. P50=49.82ms,P95=99.75,P99=116.46,max149.30; intervalos rAF,no GPU. La union de reserva antigua y solicitud nueva sobrepasa1024 aunque cada solicitud respete limite. Correccion opt-in angular prioriza solicitudes actuales y elimina historial sobrante manteniendo limite; no cambia identidad,transforms,fences ni rama estable.25tests standby pasan con nueva prueba de eviccion y reutilizacion sin recompilar. Repeticion renderer en angular-lod-motion-bounded pendiente.

Repeticion angular-lod-motion-bounded finaliza sin errores/colas:493frames,P50=49.80,P95=83.40,P99=116.41,max133.05ms. No ABAB ni GPU: no afirmar mejora estadistica. Bancos finales999/951/229/194arboles dentro1024; captura regreso inspeccionada con3D/helechos cercanos. Persisten98/100/89/79preparaciones acumuladas por especie en este flujo: demasiado recambio durante movimiento, pendiente reducir antes de default.

## Atribucion de reconstrucciones angular

Contadores en mismo recorrido:peticiones271/279/217/218,reemplazos pendientes114/120/61/45,cambiosLOD481/542/149/89,identidad0y recursos0 para todas especies. Preparaciones97/97/89/79. No atribuir a invalidacion shader/contexto. Prototipo agrupa peticiones pendientes angular porID,ultima transformacion/LOD gana para mismoID; conserva solicitudes independientes de productores fisico/logico.26tests pasan, incluyendo ambos productores mientras fence previo sigue pendiente. Resultado renderer coalesced pendiente; no default.

Coalesced NEGATIVO:preparaciones98/98/85/82 frente97/97/89/79,cambiosLOD650/697/177/110 aumentan. P95=99.805ms vs99.775,P99=116.46 vs116.62,max149.655 vs133.09. Una ejecucion por variante no prueba regresion estadistica,pero no aporta señal favorable. Retirado agrupado y test exclusivo; conservar contadores de atribucion. Proximo foco:estabilidad de seleccionLOD,no nuevas colas.

## Histeresis geometrica del standby angular

Banda12% alrededor umbrales nativos38/85m ajustados por calidad; solo identidades exactas pueden conservar LOD previo.38tests dirigidos pasan. Recorrido sin errores:preparaciones90/95/73/69(total327 vs362),cambiosLOD446/470/114/66(total1096 vs1261). P95=99.76ms,P99=116.54,max132.98:sin mejora perceptible demostrada frente referencia. Mantener en prototipo por estabilidad,no como optimizacion FPS comprobada. No seguir microajustes indefinidos; falta validar otras vistas/biomas y presupuesto integral antes de default.

## Comprobacion estatica angular en otros cinco biomas

Harness configurable por WG_WATER_BIOME, verifica estado biome real. Sabana,GranRio,Volcanes,Desierto,GranCanon semilla712/calidadmedia720p completan menu/nueva partida/preparacionnormal/elevada,sin errores de pagina. Capturas normales de primeros4 inspeccionadas y elevadas de5; se ve geometria cercana y fondo separado. No aprobar toda la imagen: proxy de suelo/agua lejana sigue plano y juntas visibles en vistas elevadas,independiente del cambio de arboles. Resumen porbioma guardado. No benchmark de movimiento,ni noche/calidadbaja,ni equivalencia AB artistica completa. Primera ejecucion Sabana fallo por firma locator.evaluate del harness, corregida y repetida; conservar failure original.
