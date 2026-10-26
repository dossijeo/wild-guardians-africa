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

## Luces estables activadas por defecto en rama experimental

scene configura4slots antes de crear efectos salvo vfxStableLights=0; desaparece dependencia de parametro1 para corregir escudo. Harnesses aceptan0/1 explicitos,ausencia prueba default. Prueba renderer shield-default:escudo legal aceptado6.52ms,maxintervalo83.055,P95=33.505;1consulta programa26.795ms,sin errores.9tests VFX pasan. Esto no sustituye evidencia previa ABAB/repeticiones/incursion/streaming; solo verifica ruta de configuracion habitual. Pendiente validacion visual de saturacion>4luces,noche y resto de cierre.

## Validacion integrada posterior a luces estables (2026-10-26)

Ejecutado `node --test tests/mangrove-channels.test.js tests/mangrove-water-traversal.test.js tests/raid-entry-residency.test.js tests/raid-approach-residency.test.js tests/vfx-preload.test.js`: 26/26 pasan. Incluye equivalencia de chunks adyacentes en varias semillas entre sincrono/pthreads, recarga guardada, rutas entre orillas por perfil, retencion de terreno para incursiones y propiedad/preparacion de efectos. No sustituye recorridos interactivos de trabajadores.

`npm run build` finaliza codigo 0 (Vite 7.23 s); advertencias de bundle grande e importacion mixta de far-atmosphere. `npm run test:web-package` pasa: 973 archivos, 465431968 bytes, 840 enlaces relativos, 17 GLB runtime. Esto valida paquete web, no ejecucion Tauri ni todas las distribuciones.

Inspeccionada `water-layer-isolation-4096/elevated-without-far-ground.png`: al ocultar proxy regional desaparece suelo fuera del rectangulo detallado, conservando canales/terreno cercanos. Es una prueba diagnostica, no imagen candidata: los objetos quedan suspendidos fuera del terreno residente. Confirma alcance de la representacion regional, no demuestra por si sola la causa de cada junta. Codigo `native-far-ground.js` confirma agua regional pintada mediante mascara sobre terreno, sin superficie de agua equivalente a la cercana. Reducir paso de muestreo o geometria no corrige esa diferencia de material/superficie; siguiente validacion debe tratar esa transicion explicitamente. Estuario y LOD angular siguen sin aprobarse como configuracion por defecto.

## Superficie regional de agua: prueba descartada

Comparacion semilla4096,720p,media,LOD angular,misma camara/target; baseline y regional-water-surface-verified. Prototipo farWaterSurface=1 reutilizo paintedWaterMaterial, reloj compartido y mascara regional en plano3.34m de4vertices, descartando agua pintada del suelo. Verificado objeto visible y reloj activo; sin errores de pagina/consola. 23tests de suelo/mascara/juntas pasan. Inspeccion de capturas normales/elevadas: tono regional excesivamente verdoso y juntas persistentes, no mejora visual suficiente. Retirado del codigo activo; parche negativo y resumen guardados. No benchmark GPU ni afirmacion de rendimiento; no activado por defecto. La mascara y geometria regionales siguen requiriendo una solucion coherente con las riberas cercanas.

## Pendiente condicionado: sustituir modelos base de arboles

El usuario dispone de modelos visualmente mejores con aproximadamente un tercio de triangulos y quiere sustituir los modelos base, incluidos los de primer plano, no limitarlos a LOD lejanos. EJECUCION INACTIVA hasta que el usuario entregue los nuevos archivos. Mientras tanto conservar los actuales y no generar reducciones automaticas para esta tarea. Tras recibirlos: revisar escala/pivote/materiales, integrar como candidatos base, preservar distribucion y comportamiento, comparar apariencia y rendimiento real (geometria, sombras, draw calls, texturas y transparencias) con escenas equivalentes antes de consolidar la sustitucion. No bloquea el objetivo activo de Manglares y magias.

## Magias agricolas durante anochecer

Harness check-agriculture-render admite WG_MAGIC_NIGHT=1: guardado inicia en tiempo288, cuatro comandos legales growth/multiply antes de anochecer y espera uNight>.99. Captura real dusk-validated/magic-night.png inspeccionada: efectos siguen visibles sobre cultivos. Comandos1.955/.815/.365/.295ms;532intervalos rAF,P50=16.675,P95=33.370,P99=49.815,max116.540ms;0consultas getProgramInfoLog,0errores consola/pagina. No son tiemposGPU ni comparativa ABAB. Agriculturales usan worldLights=false, por tanto NO prueban saturacion de4slots (fuentes0 verificadas).

Pruebas negativas conservadas: night-stable intento lanzar de noche y validacion autoritativa lo rechazo correctamente; dusk-stable completo comandos pero asercion final suponia4hechizos vivos aunque alguno expiro durante espera/captura. Corregida expectativa nocturna respetando duraciones, sin modificar reglas del juego; repeticion dusk-validated pasa. Falta saturacion con impactos/escudo y cierre visual del estuario. No modifica modelos de arboles pendientes de entrega.

## Incursion mixta: escudo sobre cultivos e impactos reales

check-beast-raid-ui registra fuentes luminosas activas, slots y contactos por frame; WG_SHIELD_PROTECT_CROPS=1 prioriza suelo de cultivos como candidato al clic real, sin llamar cast directamente. Observacion ampliada mediante WG_SHIELD_OBSERVE_MS.

light-pressure: escudo delante de cultivos,5especies,25s;0contactos,fuentes max2; no es prueba de saturacion. shield-contacts: clic sobre cultivo(87,-9),18s; contacto real max1,fuentes max2,slots max2,0frames con>4fuentes. Clic ida/vuelta78.685ms (incluye automatizacion, NO coste exclusivo del comando).426intervalos rAF,P50=49.87,P95=66.465,P99=66.735,max166.075ms;0consultas programa,0errores. Se conserva video y capturas; captura final posterior a efecto no demuestra impacto por si sola, registro de ShieldVfx si demuestra contacto. No afirmar saturacion ni mejoraGPU con esta prueba. Sigue pendiente comprobar visualmente mas de4fuentes en un escenario pertinente; no forzar reglas autoritativas para conseguirlo.

## Regresion real de guardado/expansion corregida

Nuevo caso trabajador: segundo centro financiado con1000monedas QA pero construido/plantado/contratado mediante comandos normales,semilla37. Primera ejecucion llego y rego sin tocar agua. Segunda ruta final nativa tenia15puntos humedos antes de guardar,pero renderer recargado seguia seco. Causa confirmada: installVillage incluia TODOS los centros activos al reconstruir el rectangulo seco del poblado; un centro remoto ampliaba ese rectangulo al cargar y drenaba canales intermedios. No era un fallo del cruce ni del planificador.

Cambio limitado a mangroveNetwork con centro fundacional almacenado: la huella de terreno usa ese centro original; centros adicionales siguen incorporandose como obstaculos de navegacion mediante su mirror, sin extender la reclamacion de terreno al recargar. Test mangrove-expansion-reload compara alturas/agua en1225puntos tras construir y recargar; rojo antes (98,-20 paso humedo->seco),verde despues.9tests Manglares y47tests de colocacion/centros/poblados pasan.

Renderer real reload-fixed: trabajadora sigue rutas propias con camara y streaming activos;61muestras sobre agua y riego manual completado,backend pthreads sin fallback,0errores. Captura worker-on-water.png inspeccionada y video worker-crossing.webm conservado. Se corrigio tambien el harness para reconocer estado de riego manual (no done). Resultados negativos anteriores conservados; no benchmark GPU/frametime de esta ejecucion funcional. La correccion evita que el layout aprobado cambie al guardar una expansion. Aun pendientes agua lejana/default del estuario y resto de cierre.

## Nuevo estuario activado para partidas nuevas

prepareWildEngineWorld asigna mangroveNetwork=true solo dentro de !loaded. Partidas guardadas conservan flags originales; no se migra su semilla/variante implicitamente. QA puede comparar receta7 mediante WG_NETWORK_VARIANT=7 con reemplazo comprobado; receta8 ya no necesita interceptar codigo.

Prueba real menu->nueva Manglares semilla37 sin override de receta: network=true,channels=false,pthreads sinfallback,aislamientoactivo,0errores.495/3721muestras humedas en region121x121 alrededor del poblado; no representa porcentaje global. Captura normal inspeccionada con poblado seco y canales circundantes. Se uso farAngularLod=1 para evitar impostores en vista elevada; esa opcion aun es opt-in y esta prueba no demuestra default de LOD. Nuevas partidas usan estuario, pero objetivo no cerrado: aspecto del agua regional/juntas pendientes y validacion final de rendimiento integral.

Investigacion posterior de variante regional descartada: el agua cercana incluye prepareMangroveBank y prepareNaturalWater, que aportan sedimentos, profundidad optica y cobertura ribereña ademas del material paintedWaterMaterial. El plano descartado no incluia esos pasos. No atribuir su diferencia solo a color/fog; cualquier nueva prueba debe tratar esa diferencia de composicion explicitamente y evitar muestreo masivo sin presupuesto.

## Prototipo regional con profundidad y ribera preparadas por worker

Nueva hipotesis frente al plano descartado: reutilizar tambien prepareMangroveBank y prepareNaturalWater, no solo paintedWaterMaterial. flag farWaterSurface=1 mantiene variante opt-in. El worker codifica profundidad optica y distancia de ribera durante las consultas existentes de la mascara (sin repetir consultas de terreno en hilo principal); RGBA8 a resolucion del mapa regional,217x217=188356bytes adicionales porregion actual, antes de memoria temporal/candidatos. No es medicion VRAM real. Mantiene transferencia y propiedad del candidato, reloj compartido, descarte del area cercana, liberacion de material/mapa con candidato. Perfil de QA se conserva al cambiar calidad para no solicitar una region sin datos requeridos.

Renderer regional-water-bed semilla4096,media720p,normal/elevada,sin errores consola/pagina. Imagen elevada inspeccionada: tono azul y respuesta superficial mas coherentes que plano sin profundidad; persisten diferencias ribereñas/geometricas y juntas. No aprobado ni activado por defecto.10tests formato/transferencia/agua y23tests adicionales de region/candidato pasan (2deformato repetidos,no sumarlos como casos unicos). Falta ABABGPU/CPU,memoria real,streaming,noche,cancelacion/cambioscalidad y comprobacion de uniones. No concluir exito por aspecto parcial ni numero devertices.

## Coste GPU del agua regional: ABAB Intel UHD

Harness WG_WATER_GPU=1 mide drawRenderFrame completo con EXT_disjoint_timer_query_webgl2,60framescalentamiento+240medidos por ejecucion. A1/B1/A2/B2 consecutivos,semilla4096,media1280x720,camara elevada fija,LODangular activo,misma hora100 y simulacion pausada expresamente para aislar dibujo; NO prueba streaming/simulacion activa. ANGLE Intel UHD D3D11,0disjoint,0errores.

GPU medias A1=28.466,B1=29.430,A2=28.075,B2=29.452ms;delta parejas+.965/+1.377ms,media+1.171ms(~4.1%). MedianasGPU27.815/28.543/27.645/28.867ms. CPU envio medios1.988/1.957/1.973/2.052ms:sin ahorro demostrable. Intervalos entre draws medios31.066/31.946/30.715/31.936ms,no equivalen a GPU. P95intervalos46.910/50.995/45.185/47.500ms. Una secuencia de4ejecuciones,limitacion de deriva y ruido conservada.

Mismo suelo6144vertices,mapa217x217; B tiene bed188356bytes,una malla adicional de2triangulos. Ultimo renderInfo registra55vs56draws,957052vs957054triangulos; no asumir que ese contador aislado suma todas las pasadas. Conteos de texturas residentes varian entre ejecuciones y no son medicion deVRAM. No reduccion de geometria/densidad para obtener cifras. Datos completos y resumen regional-water-abab/summary.json. Variante sigue opt-in: incremento de calidad parcial con costeGPU medido,pendiente juntas/ribera y streaming antes de decision final.

## Aislamiento de resolucion regional y propiedad de recursos

Completadas capturas reales semilla4096,720p,media,camara elevada y farWaterSurface+farAngularLod: regional-water-bed-mask2 usa mapa433x433 y749956bytes de lecho frente217x217 y188356bytes; geometria permanece6144vertices. Los cortes rectos visibles persisten. regional-water-bed-geometry8 mantiene mapa217x217 y cambia paso32 a8m:17241vertices frente6144. Tampoco elimina los cortes. Horas de escena07:33/07:36/07:35: comparacion geometrica, no equivalencia fotometrica exacta ni benchmark. Ambas ejecuciones sin errores. No activar mayores resoluciones: evidencia no justifica su coste. Siguiente atribucion debe localizar los cortes entre meshes residentes, recorte de cobertura y puente regional, sin seguir aumentando resolucion por inercia.

Nueva prueba regional-water-lifecycle.test.js ejecuta construccion y hooks reales: reloj prestado, datos de lecho preparados sin consultas nativas, limites residentes actualizables, liberacion unica de geometria/material/lecho/mascara y eliminacion de hijos. Pasa. No sustituye validacion real de context loss ni streaming.

## Atribucion por capas de los cortes de agua

water-surface-isolation: misma sesion semilla4096,media,720p,angularLOD y superficie regional; capturas elevadas sin capa regional, sin agua residente y sin puente. Ocultar puente no elimina el cambio visual. Ocultar capa regional revela exactamente el rectangulo residente; quitar agua residente elimina canales cercanos y conserva los lejanos. Raycasts QA (no equivalentes a fragmentos visibles: no evalúan discard) sitúan pixel740,295 en62.263,3.34,-26.225 sobre superficie regional, mientras400,365 y650,540 intersectan agua residente y regional coplanares (recorte shader decide cual se dibuja). Muestreo autoritativo x62: agua en z-28/-26, seco en-24/-22; no asumir que todo extremo observado es una junta incorrecta. Pendiente comparar mascaras a ambos lados del limite con coordenadas exactas y material/alpha. Ninguna modificacion de produccion ni resolucion activada. Harness incorpora WG_WATER_ISOLATE=1 para repetir la atribucion; cero errores de consola/pagina.

## Suelo bajo orillas transparentes regionales

Corregida incoherencia del prototipo farWaterSurface=1: no descartar terreno bajo superficie transparente ni pintarlo como agua opaca. buildFarSceneData conserva altura y color terrestres cuando prepara el lecho regional; shader de suelo mantiene recorte residente pero no recorte de agua ni sustitucion plana azul. Camino original sin flag intacto. Captura real regional-water-underlay,4096/media/720p, sin errores: diferencia cerca/lejos y cortes aun visibles, no se declara resuelto ni mejora de rendimiento. Requiere atribuir programa/material realmente usado en la superficie regional.

12tests pasan: nuevo regional-water-underlay demuestra altura nativa2.9 bajo agua3.34, paleta terrestre y mascara intacta frente camino previo; lifecycle verifica que shader de suelo retiene el recorte residente sin descartar bajo agua. No activado por defecto ni consolidado artisticamente.

## Programa regional verificado en render real

WG_WATER_PROGRAM=1 inspecciona programas ya compilados (solo QA) y despues colorea magenta los fragmentos regionales. regional-water-program: programa regional64 frente residente27; todos los paintUniforms comparados coinciden. Diff GLSL real: UV regional, muestreo shore desde lecho y recorte regional/residente; no falta el shader global de ondas/iluminacion. Ancestros visibles, drawRange completo; captura magenta confirma cobertura lejana efectiva y recorte residente. Cero errores. Esto descarta material incorrecto/no dibujado, pero no equivalencia de todos los bindings GPU: revisar lecho y texturas compiladas en siguiente comparacion del mismo tramo bajo distintas residencias. Resumen compacto con diff guardado, fuentes completas locales para diagnostico.

## Comparacion sobre el mismo tramo y diferencia de significado de shore

regional-water-bindings confirma mismo UUID del mapa de pendientes256x256, origen, niebla90..480/color y rango de lecho2.17/1.17. regional-water-same-area mantiene camara y sustituye SOLO en QA agua residente por regional: ondas presentes tambien en primer plano, discrepancias principales en cobertura/bordes. No prueba exacta fotometrica (reloj avanza durante500ms de estabilizacion). Sin errores.

Causa concreta encontrada en codigo: near qaBed.B contiene distancia geometrica al borde de triangulos (spatial-prepared-water.inc), mientras vWetShore contiene abs(mask-.61)*52 para sedimento. El prototipo regional usa info.shore tanto para qaBed.B (alpha) como sedimento, confundiendo dos magnitudes. Proxima correccion debe separar ambas, conservar la paleta y obtener distancia geometrica regional en worker; no ajustar iluminacion ni seguir aumentando resolucion. Harness WG_REGIONAL_ALL solo diagnostico, no comportamiento de produccion.

## Separacion de distancia geometrica y sedimento

Implementado en prototipo regional: RG mantiene profundidad, B distancia al contorno triangulado .61 (radio maximo4m), A conserva shore para sedimento. Preparacion en worker reutiliza muestras, sin consultas nuevas ni textura adicional. Dos Float32Array temporales nx*nz; no trabajo por frame. 14tests pasan incluyendo distancia conocida con celdas anisotropicas y regiones totalmente inundadas sin borde rectangular artificial. Capturas regional-water-distance normal/elevada y regional-all sin errores: diferencias de cobertura aun visibles; no consolidado ni benchmark final. Usuario entrega biomas.zip y activa tarea pendiente de arboles; conservar este estado revisable y retomar validacion integral despues de comparar nuevos assets.

## Cobertura continua regional: control real verificado

El mapa regional utilizaba inside binario para alpha, aunque su contorno fisico se obtenia de mask continuo. Esto desplaza cruces interpolados al centro de la celda. Encoder conserva ahora clamp(.5+mask-.61): mismo canal, resolucion, consultas y memoria. Prueba analitica con celda4m y mask .59/.67: cruce esperado1m conservado dentro0.1m tras cuantizar, frente2m binario. 15tests de lecho/terreno/propiedad pasan.

Renderer 4096,media720p,camara normal/elevada,hora fija. Control mediante ruta de contexto (incluye workers), verificado en datos del uniform realmente compilado: binary-verified alpha[0,255]; continuous-verified228niveles. Misma camara,3721muestras autoritativas identicas y reloj de agua65; cero errores. Inspeccion visual elevada: cambio limitado a contornos, persisten uniones y diferencias cerca/lejos. NO afirmar solucion completa,gananciaGPU ni activacion por defecto. Evidencia compacta regional-coverage-comparison.json; capturas locales en regional-water-{binary,continuous}-verified. El siguiente diagnostico debe separar cobertura restante de composicion/oclusion del suelo en la frontera residente, no seguir aumentando densidad.

## Aislamiento de composicion transparente

WG_WATER_COMPOSITION=1 fuerza alpha1 en26materiales de agua, preservando shaderRGB y geometria. Solo diagnostico QA: no se propone eliminar transparencia ni ribera. regional-water-composition,4096/media720p/hora fija/camara elevada,0errores. Inspeccion de opaque-water-diagnostic.png: las diferencias cerca/lejos siguen presentes, aunque cambia el borde como era esperable al retirar alpha. Esto no prueba una causa unica, pero refuta que bastase eliminar la mezcla con el terreno inferior. Proximo contraste: valores del lecho residente y regional sobre las mismas coordenadas, incluyendo profundidad RG y distancia B, sin ajustar colores para esconder diferencias.

El harness conserva controles opt-in de comparacion de arboles, hora fija, mascara binaria via ruta de contexto (workers incluidos), lecturas reales de coverageValues y prueba alpha1. Ninguno altera la ruta de produccion sin sus variables QA. La comparativa de arboles solicitada por el usuario ya fue publicada por separado como unico cambio remoto b72a3ccca; los cambios de objetivo siguen locales.

## Lecho regional: error medido y sesgo de muestreo

Auditando los uniforms compilados sobre 487 puntos mojados comunes: 4m produce error absoluto medio de altura optica de 0.183022m frente al campo nativo; el lecho cercano, 0.006275m. El mapa 2m produce 0.0000018m, pero estos puntos coinciden con sus texels: NO es prueba de calidad de interpolacion ni cierre visual. Se introduce WG_WATER_BED_OFFGRID=1, desplazando puntos .37m/.61m, para comparar ambas resoluciones fuera de sus rejillas. Mismas ecuaciones de decodificacion RG y correccion de centros de texel que natural-water-edges.js. Las primeras carpetas offgrid contienen fallos del harness (offset no recibido); no son evidencia valida. Corregido y relanzado en offgrid-fixed-4m/2m. No cambiar resolucion de produccion antes de conocer el resultado y verificar imagen/coste. Los arboles aprobados estan activos en ambas nuevas ejecuciones.

## Comparacion fuera de rejilla completada

450 puntos comunes desplazados (.37,.61), semilla4096, media720p, reloj fijo, camara elevada identica, nuevos arboles aprobados en ambas variantes. Error absoluto medio de altura optica frente al campo: 4m=0.236857m, 2m=0.120232m; cercano=0.012708m en ambas. Maximo regional1.17m/0.665485m. Cero errores de consola. Resumen regional-water-offgrid-summary.json. Inspeccion de ambas capturas: diferencias pequenas y persisten bordes angulosos/contrastes cerca-lejos. Resolucion2m por si sola NO cierra el problema. La casi exactitud anterior de2m era un sesgo por muestreo alineado. Siguiente aislamiento WG_WATER_DEPTH_TEST solo QA: quitar depthTest de la lamina regional para comprobar si el proxy de terreno oculta agua; no es una solucion propuesta (dibujaria sobre objetos).

## Oclusion confirmada por prueba de profundidad

regional-water-depth-test (4096/media720p,2m mascara): al desactivar exclusivamente depthTest/depthWrite de la lamina regional y dibujarla al final, se recuperan tramos continuos de canales previamente tapados. Una lamina alterada; cero errores. Captura inspeccionada regional-no-depth-test.png: agua superpuesta sobre arboles, comportamiento esperado SOLO diagnostico, inadmisible en produccion. Confirma oclusion de la superficie, no solo diferencias de color/profundidad optica. Se inicia control con malla regional2m y mascara2m conservando depthTest normal; sirve para estimar el limite geometrico antes de disenar refinamiento localizado. No se adopta una malla densa global sin validar coste y memoria. Las pruebas antiguas8m precedian las correcciones de mascara y distancia; este control busca explicitamente comprobar la causa de oclusion ahora aislada.

## Control de geometria y correccion de atribucion

regional-water-ground-2m confirma en report.data.farGround step2/mapStep2 y192849 vertices; cero errores. Captura inspeccionada: no corrige apreciablemente los cortes. No promover ese coste. regional-water-hide-ground oculta SOLO farGround: desaparece suelo lejano pero persisten cortes de canales dentro del rectangulo residente. Por tanto el diagnostico depthTest anterior demuestra oclusion pero NO permite atribuirla exclusivamente al proxy regional. Se corrige esa conclusion. Siguiente auditoria usa rayos verticales sobre mallas ground/farGround realmente instaladas en puntos wet de Wild Engine, compara alturas con waterInfo.level, y oculta suelo cercano en captura aislada. No modifica navegacion ni generacion.

## Contactos de arboles sobre agua

terrain-audit:196puntos mojados,109con suelo residente. Todos los residentes quedan exactamente~2cm bajo lamina; ninguno de196puntos regionales supera el agua, pero16quedan a menos5mm (minimo0.141mm). El ajuste fitFarGroundContacts eleva el lecho a las bases de arboles apoyadas al nivel del agua. Corregido SOLO prototipo regionalWaterBed: contactos mojados usan min(base,field.surface); arboles no se desplazan y contactos secos conservan comportamiento.16tests pasan, incluida regresion de altura/lecho y posicion inmutable del arbol. Auditoria visual/numerica posterior iniciada en regional-water-contact-fixed. No afirmar que este hallazgo explique todos los cortes ni activar prototipo sin validacion.

## Verificacion posterior de contactos

regional-water-contact-fixed: rayos196regionales/109residentes, ningun punto regional a menos5mm del agua (antes16); separacion minima5.742mm, residentes20mm sin cambio. Captura elevada inspeccionada: mejora visual marginal, no resuelve el conjunto. Cero errores. Nueva hipotesis verificable: precision de profundidad con separacion20mm y near0.1/far500. Control WG_WATER_NEAR=1 mantiene FOV/posicion/geometria; report incluye near/far/DEPTH_BITS reales. No cambiar camara normal ni afirmar z-fighting hasta observar el control.

## Precision descartada; auditoria de capas incompleta detectada

regional-water-depth-precision report confirma near1/far500/24bits; captura elevada inspeccionada sin mejora perceptible respecto near0.1. No cambiar camara. Auditoria anterior clasificaba ground/farGround pero NO nativeHorizon. scene.syncChunks mantiene NativeHorizon, con meshes etiquetados terrain/water independientes. No atribuir todas las superficies a dos capas: se inicia aislamiento opt-in WG_WATER_HIDE_HORIZON que captura sin ambas mallas y registra sus vertices/visibilidad. Es una prueba de propiedad/composicion, no una retirada de horizonte propuesta.

## Horizonte descartado con inventario runtime

regional-water-horizon-isolation/horizon-layers.json=[]: NativeHorizon existe como coordinador pero no instala meshes en Manglares. La afirmacion anterior de tercera capa activa era una hipotesis incorrecta; queda refutada. Nuevo diagnostico toma rayos desde10pixeles alrededor de las uniones visibles y registra coordenadas, etiquetas de las superficies y uniforms de agua. Raycasting NO aplica discard/alpha del shader; las intersecciones deben interpretarse junto con mascaras, no como prueba directa de visibilidad.

## Uniforms en punto mojado coincidente

pixel-audit punto pantalla700,510/world86.855,20.797: mask.935742, agua chunk y regional a3.339999914. Ambos reloj65, escala.55, amplitud.72, mismos Ink0/1, night0/exposure1,clip0. No hay diferencia de estos uniforms.9de10puntos elegidos eran secos en campo autoritativo; no sirven para atribuir union. Se amplia muestreo a rejilla336rayos de pantalla para seleccionar agua realmente mojada y distinguir interior/exterior residente antes de otro cambio. No inferir visibilidad del raycast sin aplicar descarte del shader.

## Lecho visualizado en shader y regresiones nativas

regional-water-bed-channels: salida QA roja=profundidad/1.17, verde=distancia/4, alpha1. Captura inspeccionada muestra gradientes y canales coherentes, sin una discontinuidad rectangular evidente que explique por si sola la apariencia. No es equivalencia numerica total (se conserva el error de muestreo ya documentado). Reejecutadas10pruebas: canales, estuario pthread/sincrono, chunks adyacentes/semillas, expansion/recarga, travesia por agua y cobertura; todas pasan. Nuevo aislamiento opt-in fuerza fluidVisibility1 SOLO en material de agua para distinguir recepcion de sombras de reflejos/color. No retirar sombras de produccion.

## Sombras descartadas; comparacion espacial directa

shadow-isolation termina0errores; captura sin recepcion de sombras conserva diferencia de apariencia. No promover quitar sombras. Datos de programas capturados: vertex difiere solo varyingUV, fragment solo mascara/sedimento esperado; paintUniforms no difieren. Esto no prueba equivalencia visual entre distancias. Se ejecuta comparacion actual misma zona: screenshot elevado original y regional-all (oculta chunk water, retira descarte residente de lamina regional). Tiempo fijo y camara igual; rejilla de rayos previa permite seleccionar pixeles mojados interiores con agua nativa para medir RGB. Prueba distinta de comparar colores en sitios/direcciones diferentes; anteriores same-area precedian correcciones de lecho/mascara.

## Comparacion misma zona: interior coincide, diferencias en orilla

same-area-current: captura nativa y sustitucion regional con misma camara/hora,0errores. Rejilla de rayos identifica14puntos con agua nativa mask>.95: RGB identico en todos (incluye algunos con follaje delante, limitacion explicita). Al ampliar a29puntos con interseccion nativa: MAE4.3678/255, maximo36.333/255; diferencias concentradas fuera del interior profundo. Capturas inspeccionadas: imagen mantiene ondas en zona cercana al sustituir por regional. No seguir atribuyendo a luces diferentes la comparacion entre zonas a distancias diferentes. Herramienta compare-water-same-area.mjs reproduce medida y declara limitacion de oclusion. Continuar validacion semillas1/37/712,posteriormente coste/movimiento, antes de activar superficie regional; version2m opt-in, sin aumentar malla32m.

## Validacion adicional en curso

Semillas1 y37 completadas con superficie regional,mascara2m,malla32m,media720p,hora fija;0errores. Capturas elevadas inspeccionadas: redes ramificadas,zonas secas,anchuras variables,conservacion vegetacion; no vuelve un lago continuo. Semilla712 sigue en la misma ejecucion serial. Se amplia el harness angular existente con WG_ANGULAR_TRAVEL: objetivo y camara recorren144m y regresan durante24s; registra cola/preparacion/chunks y contadores de texturas/geometrias. No se lanza simultaneamente con capturas para no contaminar medidas. Intervalos rAF no son tiempoGPU niCPUaislado; pendientes A/B y picos/latencia de llegada.

## Revision semilla712 y alcance del benchmark

Captura elevada712 inspeccionada: red de canales ramificados,zonas secas/embarradas,vegetacion conservada;0errores,724/3721puntos del recorte local mojados (no porcentaje global). ABAB water-travel-abab en curso; primer control completo0errores. La simulacion esta pausada: mide streaming/render,NO coste de simulacion activa. GPU se mide DESPUES del recorrido y drenaje de preparacion,con camara de retorno (no exactamente la elevada inicial pese al texto historico de scope en gpu.json). summarize-water-travel.mjs exige240muestrasGPU,sin disjoint,mismaGPU/semilla/camara inicial y cuatro corridas completas; separa rAFduranteviaje,CPUenvio yGPUestable. Contadores renderer.info.memory no son bytesVRAM. Pendiente validacion activa una vez seleccionada configuracion.

## Primeras medidas ABAB y siguiente validacion activa

Corridas0/1 completas: GPU media21.558/21.761ms; triangulos323542/323544,draws92/93 tras recorrido. Solo diferencia esperada de lamina2tri. Movimiento: p9582.94/83.165ms,max149.70/182.965ms,cola maxima13ambas; ultima muestra con6/9trabajos pendientes. No extrapolar GPUestable a fluidez de streaming ni concluir regresion de maxima con una sola pareja. Corrida2 acaba;3sigue. Adaptado harness de escudo repetido con WG_WATER_CANDIDATE=1 para mismas opciones regional/LOD/mascara2m,con simulacion legal activa,tras terminarABAB; no modifica reglas de cooldown ni produccion.

## Requisito visual adicional: sombras lejanas y helechos (2026-10-26)

El usuario solicita sombras legibles también en árboles lejanos (simplificadas o precalculadas son aceptables) y presencia visible de los helechos aprobados en la vista de Manglares en evaluación. Pendiente de implementar y validar; no se considera resuelto con la captura actual.

Inspección: el reporte regional-water-validation-712 confirma holly-fronds, variante C, 189 instancias cercanas y 70 lejanas en su punto de auditoría (anterior a la captura elevada). No demuestra densidad visible en la captura elevada. continuous-grass limita la cobertura a 48 m horizontales desde la cámara en calidad media, 40 m en baja. La selección por tamaño proyectado existe para el LOD, pero no sustituye ese corte de distancia. Revisar la cobertura realmente visible desde la cámara elevada antes de alterar densidad o máscaras de humedad.

native-tree-standby crea los modelos lejanos con castShadow=false. El suelo regional simplificado utiliza MeshBasicMaterial: habilitar solamente castShadow en los árboles no resolvería su recepción de sombras y podría ampliar innecesariamente el coste del shadow map. Evaluar sombras precalculadas de copa/contacto integradas en el suelo regional, coherentes con dirección solar, transición día/noche, agua y límites residentes; evitar duplicarlas con las sombras nativas. Mantener las frondas aprobadas y su LOD, sin sustituirlas por hojas redondas.

La siguiente comparación visual debe auditar cobertura DESPUÉS de colocar cada cámara y registrar instancias, overflow y rango efectivo. Comparar el coste conjunto de sombras y cobertura con la misma semilla/cámara, conservando los nuevos árboles aprobados (Gran Cañón conserva los originales).

### Escudo con agua regional candidata y diagnóstico de helechos elevados

candidate-shield-stream/summary.json: dos activaciones legales con cooldown real, simulación agrícola y cámara móvil, comando 5.845/5.320 ms, cero consultas bloqueantes de programas, ventanas de activación máximo 99.565/83.310 ms. Recorrido completo 4390 intervalos, P95 66.405 ms, P99 83.210 ms, máximo 166.255 ms. No se reproduce el bloqueo de varios segundos; esta ejecución no es A/B ni prueba de targeting UI o incursión.

El harness coloca la cámara elevada a target+(75,95,95): 121 m horizontales al foco frente al límite de cobertura de 48 m. Añadida auditoría posterior a elevar la cámara y prueba WG_FERN_RANGE (48–200 m), que conserva geometría, distribución y LOD aprobados. Ensayo 160 m en ejecución; no activado en producción. Se registran overflow y conteos para no confundir una extensión truncada por capacidad con una cobertura correcta.

Resultado elevated-fern-range, seed712, cero errores: auditoría elevada original confirma 0 instancias. Radio160 devuelve 17062 instancias de LOD (136496 triángulos), sin overflow, pero la captura inspeccionada muestra masas excesivamente oscuras, contraste punteado y discontinuidad atmosférica con el fondo. No promover el radio fijo160. La selección adicional acumula ~51.82 ms CPU (incluye ~46.60 ms de generación de tiles en frío; no sumar ambos): resolver preparación y atmósfera del LOD antes de aumentar cobertura en producción. El shader de fern LOD es ShaderMaterial con colores precocinados y sin integración de niebla; siguiente hipótesis verificable es corregir dicha integración y seleccionar cobertura visible por proyección, sin eliminar densidad aprobada.

### Integración de niebla del LOD de helechos

Añadida niebla estándar de Three al atlas LOD, con uniforms propios y compartidos con su sombra. La sombra transparente atenúa alpha según niebla (no mezcla RGB con el color de niebla, evitando rectángulos atmosféricos). Se conserva iluminación precocinada y geometría. Cinco pruebas de materiales/daylight/cancelación pasan. Renderer real elevated-fern-fog-complete: cero errores, captura inspeccionada.

La corrección NO elimina las masas oscuras de primer/medio plano: la niebla regional comienza aproximadamente a 160 m, por lo que no puede resolver sombras acumuladas más cerca. No se presenta como solución visual completa ni mejora de rendimiento. Iniciada ablación reversible WG_FERN_SHADOW_DIAGNOSTIC, desactiva únicamente las tarjetas fern-prebaked-shadow para una captura y restaura el hook antes de seguir. Sin cambiar densidad, atlas o iluminación de hojas. Pendiente inspección de elevated-fern-shadow-isolation.

### Sombras: evidencia y prototipo acotado

Inspeccionada elevated-fern-shadow-isolation/elevated-ferns-no-shadow.png: retirar exclusivamente las tarjetas de sombra aclara sustancialmente las masas, aunque persisten áreas oscuras/punteadas en las hojas y sombras nativas. Atribución parcial, no causa única. No se han eliminado las sombras de producción.

Prototipo far-tree-shadow-bake.js (solo QA por WG_TREE_SHADOW_BAKE=1): rasteriza el máximo de huellas elípticas proyectadas en sentido opuesto a una dirección solar fija; oscurece RGB del mapa regional existente, conserva alpha/agua. Un buffer temporal de un byte por texel; cero recursos GPU o draw calls adicionales. Tests verifican límite de oscuridad, duplicados no acumulativos, máscara de agua, proyección y límites. No representa siluetas exactas, no se adapta aún a noche/dirección solar real; por eso NO se conecta a producción. Captura real en curso en far-tree-shadow-bake. El siguiente paso requiere confirmar visualmente el efecto y medir generación; no declarar que el prototipo satisface todavía el requisito de sombras lejanas.

### Máscara regional de sombras: renderer real

Primer bake RGB no servía para esta ruta: mapped=true usa el mapa regional para cobertura/agua, no ese RGB como albedo. Sustituido en QA por máscara R8 independiente aplicada al shader final del suelo, con atenuación por uNight compartido. No cambia RGB/alpha del mapa original; buffer transferible, textura propiedad del candidato, liberación idempotente y precalentamiento en lista farGroundTextures. Nueve tests pasan (incluyen propiedad/transferencia/night uniforme).

far-tree-shadow-mask: captura real sin errores, máscara confirmada en metadata del renderer: 433x433, 187489 bytes base, 30978 texels afectados. No son cifras de VRAM total/driver. La comparación visual inspeccionada muestra un efecto discreto en el fondo; no demuestra aún que el anclaje sea suficiente ni una mejora perceptual definitiva. Pendiente comparar sin máscara dentro de la misma sesión, noche y coste GPU/streaming. No activado en producción.

Corrección de nota anterior sobre niebla: 160 m era el default genérico de farAtmosphere; farVegetationProfile configura fogStart=90, fogEnd=480 para esta ruta. La deducción de ausencia de niebla por estar por debajo de160 no era válida. Se mantiene la evidencia de superposición de sombras del ensayo con/sin tarjetas; auditar valores runtime en próximas capturas.

### Comparación visual de sombras en la misma sesión

far-shadow-same-session: strengths0/.30/.55 mediante uniform compartido, misma cámara, semilla712, día fijo; cero errores. Inspeccionado montaje far-shadow-detail.png (izquierda0, derecha.55): aporta sombras suaves al suelo entre árboles; efecto discreto bajo la niebla. Runtime confirma fogNear90/fogFar480 y uNight0. No se confunde con benchmark GPU: incluso strength0 conserva lectura de máscara. Variante sigue opt-in.

Revalidación: 19 tests pasan entre mangrove-channels, mangrove-expansion-reload, mangrove-water-traversal, continuous-grass-mangrove-water, far-ground-color-map y far-tree-shadow-bake. Incluyen equivalencia de terreno sync/pthreads, continuidad/semillas y recarga expandida, rutas acuáticas sin hacer agua edificable, conservación de máscaras y propiedad de textura. No sustituyen pruebas visuales/nocturnas ni A/B de frametime.

En curso far-shadow-night con tiempo400 y comparación de intensidades; comprobar uNight1 y ausencia de efecto residual solar. Añadido WG_WATER_TIME para fijar fase visual sin avanzar simulación.

### Noche y coste aislado de la máscara

far-shadow-night: captura inspeccionada, uNight=1 confirmado en las tres intensidades0/.3/.55, sin errores. Región(400,90)-(1050,280) compara0 frente.55 con diferencia RGB exactamente0 y sin píxeles distintos (night-difference.json). Evidencia de que el sombreado solar añadido se atenúa a cero de noche en esa región; no prueba todavía transición animada completa ni streaming.

Iniciada secuencia tree-shadow-abab: 4 procesos consecutivos con WG_TREE_SHADOW_BAKE alternado0/1/0/1, semilla712, cámara elevada, tiempo100,720pmedia, mapa2m/terreno32m, superficie de agua candidata, AngularLOD, 60warmup+240GPUquery. SIN ampliación de helechos ni movimiento para aislar coste de máscara. summarize-tree-shadow-abab.mjs valida renderer, cámara, semilla, presencia/ausencia de máscara,240 muestras y ausencia de disjoint, e informa diferencias de geometría/draw calls. Pendiente completar cuatro ejecuciones y analizar; no anticipar resultado.

## Árboles 3D frente a impostores: petición de comprobación previa

No regenerar masivamente los atlas hasta decidir si el approach aporta ventaja real. Solo se creó piloto Manglares slot0 día/noche, sin publicación. Shader AfricanToon aprobado, sol nativo, LOD0,8x8 ángulos/orientaciones, raster512/celda reducido a256 en luz lineal premultiplicada. Faltan tests del filtro y validación de transparencia; no sustituye atlas actuales.

Comparación solicitada: cámara NORMAL, misma población/distancia/densidad, A impostores actuales, B sustituye solo lejanos por modelos3DLOD. QA reutiliza standby angular con peso de tarjeta0, conservando readiness. Primera secuencia impostor-3d-abab es piloto: detectado que standby no reproduce en baseFor la densidad/fade terminal del shader. NO usar sus cifras como comparación equivalente si incluye más árboles. Preparado qa-far-density.mjs para corregir control B en una segunda secuencia, sin modificar producción. Revisar también budgetEvictions y árboles realmente visibles antes de emitir recomendación.

Benchmark anterior de sombras elevado completo: GPU A26.410/B28.442/A25.599/B24.385ms,55draws y589298triángulos iguales. Deltas +2.032/-1.214ms, inconsistente; NO demuestra mejora ni permite atribuir un coste preciso. La cámara normal es ahora referencia principal por instrucción del usuario. Helechos mantienen su alcance aprobado; descartar extensión geométrica a vista de pájaro como requisito.

### Comparación 3D corregida en curso

Piloto impostor-3d-abab terminado sin errores, pero B registró expulsiones por presupuesto en standby (510/215 en dos especies) y no igualaba densidad terminal. No es un sustituto completo ni comparación aceptable. Se conserva como evidencia negativa.

Nueva secuencia impostor-3d-matched: controlB aplica fórmula de densidad/rank/fade del shader también al modelo; test de rango, desvanecimiento y origen pasa. Límite de preparación QA8192 por especie evita el techo1024; población lógica no cambia. Auditoría adicional enumera árboles con densidad positiva aún no preparados y comprueba identidad/transformaciones de toda la población, además de expulsiones/errores. No modifica el juego normal. Benchmark sigue en curso, no hay recomendación todavía. summarize-impostor-3d.mjs rechaza una conclusión equivalente si existen árboles sin preparar o cambia la población/cámara/GPU.

### Primera pareja equivalente de impostores frente a3D

impostor-3d-matched/0-0 y1-1:5349árboles lógicos con idénticas transformaciones (hash independiente b13800b6dc121938d773dc441f0451e651972834303a804c735c4db7feb64792). ControlB sin expulsiones ni árboles con densidad positiva pendientes en las4especies. Ambas capturas normales inspeccionadas, comparación montada comparison-normal.png. Cercanía/poblado conservados; el fondo cambia de los atlas antiguos a los nuevos modelos, limitación artística expresamente registrada.

Primera pareja GPU23.589→24.176ms, CPUenvío3.669→2.627ms,85→60draws,255866→623690triángulos. NO decidir con esta pareja; segunda repetición aún en curso. No hay presunción de que menos triángulos implique automáticamente másFPS, especialmente con el coste de preparación/transición de impostores.

Comparación impostor-3d-matched completada, equivalencia de población/cámara y preparación completa comprobadas. Informe README.md con GPU/CPU/intervalos, capturas y límites. Mantener impostores provisionalmente: GPU mejor en ambas parejas, ventaja total variable, menor CPU con3D. No afirmar mejora uniforme deFPS ni extrapolar a todos los biomas. Se conserva el piloto de atlas sin publicar; no se ha iniciado regeneración masiva.


### Integración de superficie regional y revalidación normal

Activada la configuración previamente ensayada solo en el perfil Manglares: farWaterSurface=1, farAngularLod=1, máscara regional2m y malla32m. Conserva holly/fixed512 y controles explícitos. production-regional-normal (semilla37, sin flags de candidato en URL): captura inspeccionada, superficie regional visible, mapa433x433, máscara2m/malla32m,0errores. No activa atlas nuevos ni sombras regionales experimentales.

Revalidación actual:84tests de canales/recarga/rutas/escudo/política agrícola,12de perfiles/agua regional y30de VFX pasan. No extrapolar estos tests a rendimiento.

production-shield-stream: dos comandos legales, cooldown real, simulación y recorrido144m/40s por activación. Comandos8.080/4.940ms;5359intervalos, P9549.830ms,P9966.465ms,máximo216.280ms.24consultas de programas,914.475ms acumulados,máxima183.825ms (native-obstruction-blend). No vuelve el bloqueo de5segundos, pero no está libre de compilación tardía. Las ventanas de activación se solapan con streaming: NO atribuir automáticamente esas consultas al escudo. Control sin magia en curso para separar causas. No se marca el objetivo completo.


Control production-stream-control completo sin magia:1consulta169.745ms en native-obstruction-blend, máximo intervalo199.540ms,P9549.650ms,0errores. Reproduce la mayor espera inicial también sin escudo. No demuestra que las24consultas de la corrida con magia sean todas ajenas al escudo: distinta duración(1vs2recorridos) y residencia inicial20vs25chunks. Debe estabilizarse la preparación inicial y comparar ventanas equivalentes antes de atribuir el resto. El motor sigue sin bloqueo multisegundo; queda compilación tardía de ocultación y atribución del exceso de consultas. Se corrige scope del resumidor para identificar explícitamente controles sin lanzamiento.


### Corrección de alcance: fixture agrícola y prueba de Manglares

La inspección del estado guardado y runtime demuestra que agriculture/fixture.json es SABANA. production-shield-stream, production-stream-control y candidate-shield-stream usan ese fixture: sus tiempos son válidos para Sabana, NO validan la nueva superficie regional de Manglares. La anterior conclusión de validación conjunta era incorrecta. Los resúmenes ahora incluyen biome explícito.

obstruction-program-history:89programas consultados en carga,1tardío; no hubo shader de fade idéntico antes. Su diferencia frente al opaco es la retirada de OPAQUE y la sustitución de cobertura por alpha. No prueba un fallo de precalentamiento en Manglares: streamingOptions solo lo activa por defecto en Manglares, y este runtime era Sabana. Mantener aislada esa mejora de Sabana.

Repetición correcta en curso: estuary-agriculture/fixture.json verificado biome=manglares, mangroveNetwork=true,seed712,4plantas; WG_EXPECT_BIOME=manglares obliga a fallar ante otra escena. Harness registra visualSearch, streamingOptions y número de superficies regionales reales. Sin overrides de candidato,2casts con cooldown real y streaming144m/40s. Pendiente resultado.


### Resultado verificado: escudo con streaming en Manglares

production-estuary-shield-verified confirma biome=manglares, perfil holly/fixed512, farWaterSurface/farAngularLod activos, una superficie regional y warmObstruction/retainPrograms activos. Dos comandos legales aceptados con cooldown real:6.250/3.555ms. Simulación agrícola activa y recorrido144m/40s por activación;38/33chunks únicos observados.4601intervalos: P50=33.015ms,P95=50.090ms,P99=83.155ms,máximo116.450ms. Cero esperas de programas registradas y cero errores. Ventanas de2s tras activación: máximos116.425/99.790ms.

Esta corrida sí verifica el perfil actual de Manglares, a diferencia del fixture de Sabana corregido arriba. No demuestra ausencia de todos los tirones: conserva intervalos de más de100ms. Es una corrida instrumentada, sin GPU aislada ni ABAB; los comandos llaman Game.cast y no prueban selección por puntero/incursión. No declarar cerrado el objetivo. Resumen reproducible mediante summarize-magic-repeat.mjs; fuentes raid-ui.json y program-waits.json conservadas. Próximo gate: control sin magia con mismo fixture/recorrido y validación UI en incursión.


### Control Manglares con intervalo equivalente

production-estuary-control-verified: mismo fixture de Manglares,144m/40s por recorrido,2recorridos separados90segundos de simulación. Sin magia,0errores/0esperas de programas.4857intervalos: P50=16.800ms,P95=49.960ms,P99=83.030ms,máximo116.345ms. Ventanas iniciales2s máximos66.460/66.575ms. Frente a la corrida con escudo: P50=33.015ms,P95=50.090ms,P99=83.155ms,máximo116.450ms; ventanas116.425/99.790ms.

Los picos globales también existen sin magia. NO concluir coste nulo del escudo: mediana y ventanas iniciales difieren; esta pareja no es ABAB ni GPU aislada. Residencia inicial22/25chunks en control vs21/25 con escudo, recorrido observa40/40 vs38/33chunks. Queda repetir intercalado para separar variabilidad de coste real. El harness de control ahora conserva90s de separación en simulación y el de incursión verifica biome contra el fixture y WG_EXPECT_BIOME.


### Incursión y escudo por interfaz, perfil actual

production-estuary-raid-ui-verified: fixture estuary-raid confirmado biome=manglares. Incursión nativa con warthog,hyena,buffalo,lion,rhino; menú Magia→Escudo y un clic de ratón aceptado, escudo presente en estado después. Captura raid-shield.png inspeccionada: cúpula sobre cultivos, animales presentes y helechos conservados.0errores/0esperas de programas.333intervalos: P95=66.475ms,P99=99.685ms,máximo166.300ms. Roundtrip de clic140.700ms incluye automatización/presentación: NO tiempo CPU aislado de Game.cast. Observación posterior12s.

No reaparece bloqueo multisegundo en esta corrida, pero no equivale a ausencia de tirones ni sustituye ABAB/mediciónGPU. Mantener objetivo abierto para atribución de picos y cobertura de demás magias.


### Magias agrícolas en Manglares confirmado

production-estuary-agriculture-verified ejecuta growth/multiply/growth/multiply sobre cuatro plantas legales del fixture estuary-agriculture. Bioma confirmado por assertion. Cuatro comandos aceptados, tiempos [0.985, 0.425, 0.315, 0.36]ms; efectos visibles con sprites y permanencia en escena, captura magic-3.png inspeccionada.492intervalos: P95=33.510ms,P99=49.985ms,máximo133.355ms.0consultas getProgramInfoLog y0errores. No hay bloqueo multisegundo. Comandos directos Game.cast, no clic UI; corrida instrumentada única, no ABAB/GPU aislada. Añadida comprobación de bioma al harness agrícola para evitar extrapolar Sabana a Manglares.


### Atribución CPU de la incursión actual

production-estuary-raid-ui-verified/cpu-attribution.json: perfil15.568s. Tiempo muestreado inclusivo vfx.js2394.654ms, vfx-native.js1831.769ms, simulación202.955ms, WASM404.642ms, GC215.378ms. Categorías solapadas, NO sumables. fxTri465.372ms self, preparación de geometría dinámica relevante.4longtasks54/57/54/74ms; máximo intervalo166ms no equivale a bloqueoJS de166ms. No hay alineación temporal CDP/performance validada: no adjudicar el peor frame a fxTri ni confundir muestreo con GPU. El summarizer histórico basado en líneas fijas reportaba gameTick0; ese cero no acredita ausencia de coste de simulación. Nuevo informe agrupa por rutas reales. Próxima hipótesis verificable: reducir asignaciones/reconstrucción de geometríaVFX preservando exactamente sus vértices/tiempo y medir renderer completo; antes revisar cache packedTime ya existente.


### Prototipo aislado de triángulos VFX

probe-vfx-triangle-allocation.mjs reemplaza temporalmente fxTri por cálculo escalar de normales y escritura sin arrays/iteradores por vértice. No cambia src/rendering/vfx-native.js ni producción.126casos (18efectos×7tiempos) generan Float32Array exactamente iguales. Microprueba Node300generacionesescudo tras20calentamientos A/B/A/B:1025.046/658.063/935.227/750.116ms. Solo evidencia de coste de geometría aislado, NO FPS ni GPU. Candidato reproducible guardado en vfx-triangle-candidate/vfx-native.mjs. Gate siguiente: inyectarlo solo mediante rutaQA en renderer y comparar misma incursión intercalada sin alterar contenido, con capturas. No adoptarlo por microbenchmark.


### Triángulos VFX: A/B/A/B en renderer real

compare-vfx-triangle-renderer.mjs ejecuta cuatro incursiones mismo fixture Manglares,media720p,12s tras escudoUI,perfiladorCPU activo en todas. B sirve candidato mediante rutaQA y confirma candidateLoads=1; A usa producción. Cuatro ejecuciones sin errores ni consultas de programas. P95 A1/B1/A2/B2=66.520/50.195/66.265/50.175ms; P99=83.250/83.385/83.005/83.260ms; máximo=183.030/133.160/183.045/166.375ms. Mediana~49.8ms no mejora. Captura B2 inspeccionada conserva escudo/animales/helechos; simulación viva tiene poses/tiempos ligeramente distintos, no comparación pixel-idéntica. Equivalencia exacta de geometría se acredita por126casos previos. Resultado favorable en P95, no mejora integral garantizada: repetir sin samplingCPU antes de adoptar. No activado en producción.


### Decisión: no adoptar candidato fxTri

Repetición A/B/A/B sin samplingCPU (cpuSampling=false acreditado) no confirma mejora: P95 A1/B1/A2/B2=50.060/50.170/50.140/66.350ms;P99=66.475/66.525/66.660/66.695ms;máximos166.250/166.385/166.140/166.215ms;medianas~49.8ms.4corridas sin errores ni consultas de programas. Candidato cargado únicamente en B. El beneficio observado con perfilador no se sostiene bajo instrumentación reducida. Decisión NO ADOPTAR: producción y generador siguen originales. Se cierra este experimento, conservando candidato reproducible, equivalencia126casos y resultados negativos. No seguir microajustando fxTri sin nueva hipótesis. El objetivo global continúa; esta prueba no resuelve los picos restantes ni invalida la corrección de luces estables contra bloqueos multisegundo.


### Cobertura de semillas de receta actual

La prueba histórica100semillas solo cubría mangroveChannels (variante7). Añadida prueba específica mangroveNetwork (variante8) sobre100semillas, dos regiones480×480m centradas(60,0)y(1200,-1600),rejilla12m. Cada región debe conservar entre5%y45%agua: límites amplios contra mundo seco/lago gigante, no criterio de aprobación artística ni medida de conectividad. Pasa. Ejecutados conjuntamente mangrove-channels,mangrove-expansion-reload,mangrove-water-traversal:10tests pasan. Incluyen4semillas×4chunks vecinos comparando agua/terreno/instancias/props sync-pthread y recarga, rutas entreorillas para perfiles de actores, barreras sólidas y agua no edificable. No extrapolar100semillas a renderizado ni equivalenciapthread: estas coberturas son diferentes.


### Magias agrícolas al anochecer, Manglares confirmado

production-estuary-night-verified: fixture estuary-agriculture, WG_MAGIC_NIGHT=1, biome=manglares verificado.4comandos growth/multiply aceptados:1.765/.400/.315/.925ms.515intervalos P95=33.450ms,P99=49.945ms,máximo132.905ms.0consultasprogramas/0errores. uNight=1 confirmado,3efectos aún activos al capturar y4slots de luz estable. magic-night.png inspeccionada: efectos legibles, suelo y helechos conservados. El número3 es el estado al momento final, no cuatro efectos simultáneos exigidos para siempre. Corrida única con comandos legales directos, no pruebaUI agrícola ni tiemposGPU.


### Auditoría de correctitud y captura actual4096

77tests shield-placement-collision,shield-expiry,acceptance-raid-motion-shield,agriculture-vfx,shield-vfx pasan. No sustituyen rendimiento/render real. Captura actual production-seed-4096-verified/elevated.png inspeccionada, sin tutorial,perfil producción ysinatlas candidato: red distribuida visible, múltiples brazos y tierra seca/barro;0errores. Rejilla local120m alrededorpoblado316/3721muestras mojadas, no extrapolar porcentaje a todoelmundo. La vista elevada aún evidencia algunos bordes angulares/remates abruptos alrededorárea seca delpoblado; no declarar continuidad visual perfecta por tests de datos. Debe distinguirse recorte intencional delpoblado de discretización regional antes del cierre visual.


### Recorte por poblado: hipótesis insuficiente

attribute-estuary-settlement-mask.mjs compara receta4096 con/sin addSettlement(60,0,14,12),16641muestras paso0.5m. Solo5muestras antesmojadas quedan secas,0cambios fuera delsoporterectangular6m. Confirma forma settlementBlend, NO explica los grandes remates observados ni reproduce necesariamente todoslosasentamientosruntime. No cambiar generación por esta evidencia. Revisar oclusión entre terreno regional y lámina. Corregida etiquetaQA farMaskStep: usaba4pordefecto aunque farGround.mapStep realera2; próximosinformes derivan pasos delrecursoinspeccionado, no delentorno. Evidenciasanteriores conservar data.farGround como fuenteautoritativa.

### Aislamiento actual de oclusión tras instalar los atlas aprobados

Dos capturas reales nuevas, semilla4096, media720p, hora100 fija, mismos defaults y LODangular. current-depth-isolation compara elevación normal con depthTest=false SOLO en la lámina regional. Aparecen brazos de agua que estaban ocultos en la región exterior al poblado. Esto demuestra oclusión de parte de la red, no ausencia de generación; la prueba sin profundidad también dibuja agua sobre árboles y no es una solución aceptable.

current-far-occlusion oculta únicamente meshes farGround. Desaparece el terreno exterior y quedan visibles cauces regionales antes tapados. El rectángulo residente y sus remates persisten: no atribuir todos los extremos al suelo regional ni afirmar que el problema completo está resuelto. Ambas corridas terminan sin errores. La malla regional usa muestras de altura espaciadas32m mientras cobertura acuática usa2m; la hipótesis siguiente es resolver altura/oclusiones de canales estrechos sin multiplicar uniformemente toda la malla ni alterar generación autoritativa. No cambios de producción realizados en esta atribución.

### Resolución de malla y alturas: evidencia negativa adicional

current-fine-ground: semilla4096, media720p, hora100, LODangular, máscara2m y geometría4m. El renderer informa52449vértices,mapWidth433,bedBytes749956. Captura elevada inspeccionada: los remates abruptos persisten; aumentar geometría no resuelve el defecto y no se adopta.

current-wide-terrain-audit: rejilla480x480m a paso16m alrededor del target, desplazada para no coincidir con vértices.179muestras autoritativas mojadas,179intersecciones far y46near; ninguna altura intersectada está por encima o igual al nivel de agua.25meshesnear y2far. La captura elevada y report terminan sin errores. El raycast mide geometría CPU e ignora descartes/transformaciones de fragmento; no prueba equivalencia del depth buffer ni continuidad por sí solo. Debilita una explicación basada únicamente en alturas estáticas o resolución gruesa. Próximo diagnóstico: profundidades/materiales efectivos y máscaras de publicación en los píxeles del corte, conservando los casos de aislamiento. No modificar la generación autoritativa a partir de estos resultados negativos.

### Muestreo de remates en pantalla

current-cut-pixel-audit completa336rayos con cámara elevada actual,4096/media720p/hora100,0errores. Puntos620,260 y620,300 son secos en autoridad(mask0);740,300 mask~.59 sigue fuera del umbral. Esto no demuestra que el remate completo sea correcto: la rejilla40px no resuelve su borde. Se añade WG_WATER_PIXELS para seleccionar rayos concretos sin cambiar producción ni cámara. current-cut-targeted en ejecución examina16puntos a10px sobre dos remates. No extrapolar las intersecciones de la lámina regional: ignoran su descarte por máscara.

current-cut-targeted finaliza0errores. Remate izquierdo:400–430px,y360 están mojados(mask.98,1,1,.85);440px cae a.18 y450px a0. Por tanto ese final visible coincide con una caída real del campo, no debe prolongarse artificialmente solo en renderer. El barrido superior590–680px,y280 permanece seco(max.58): no atraviesa el núcleo del cauce y no sirve para atribuir ese borde. Pendiente mapear la topología alrededor del remate izquierdo y contrastar la presencia de ramificaciones/cauces ciegos naturales con otras semillas.

### Causa topológica demostrada con el poblado real (corrige hipótesis anteriores)

attribute-estuary-runtime-settlement.mjs reconstruye la reserva seca usando los footprints reales del snapshot, incluido el centro planificado, igual que spatial-game-session. Semilla4096: hx28.4049987793,hz15.724272728, NO14/12 de la prueba anterior. Los16puntos de current-cut-targeted coinciden con el runtime dentro1e-5. En la ventana120x120m,paso0.5m, elimina1065de5850muestras originalmente mojadas(área~266.25m²); porcentaje local, no global.

Mapa nativo natural/poblado inspeccionado en actual-settlement-attribution/map.png: la reserva rectangular corta ramificaciones que antes estaban conectadas. El muestreo horizontal del remate izquierdo atraviesa una orilla natural, pero NO prueba que el ramal termine naturalmente; el mapa muestra que su continuación sí queda eliminada por el poblado. Queda corregida esa extrapolación. El barrido superior tiene naturalmask~1 y runtime0 en varios puntos: desaparición autoritativa por reserva seca, no exclusivamente oclusiónGPU.

La comparación antigua14/12 no representaba el poblado real y no permitía descartar su influencia. Próximo cambio debe preservar suelo seco bajo edificios y navegabilidad, evitando que un rectángulo sobredimensionado desconecte el estuario. Evaluar geometría de reserva ajustada a footprints o desvío local de cauces, con versionado de guardados y equivalencia pthreads; no rellenar agua solo en renderer. No se ha cambiado generación en esta atribución.

### Prototipo de reservas por edificio: mejora visible, aún no adoptado

compare-estuary-building-pads.mjs reutiliza las11reservas AABB de footprints que ya admite Gran Cañón. En semilla4096, ventana120x120m/paso.5: elimina176muestras mojadas frente1065delrectángulo; conserva más red. Perímetros de edificios y centro muestreados a9puntos/arista: ninguno mojado. No prueba navegación completa ni sequedad de todas las futuras semillas. Mapa building-pad-experiment/map.png inspeccionado: conexión superior/izquierda recuperada; persistencia de estrechamiento junto al centro derecho.

WG_WATER_BUILDING_PADS=1 cambia únicamente la receta de sites mediante route QA. building-pad-game/elevated.png real,media720p,4096,hora100,LODangular: conexión superior reaparece, edificios visibles secos,0errores. Sigue un remate inferior visible que requiere comparar máscaras near/far en esa configuración. No declarar continuidad visual final. El muestreo local mojado sube316→370/3721; no hay lago generalizado en esta captura.

Coste negativo: aplicar11addSettlement separados tarda256–306ms en dos ejecuciones Node de diagnóstico (no benchmark de presentación). Código confirma refreshSettlementChunks por cada llamada, repoblando el mismo chunk y navegación varias veces. Si se adopta, requiere publicación de reservas en lote y una única invalidación/reconstrucción; no trasladar este bucle síncrono al juego. Guardados existentes deben conservar receta previa mediante versión explícita. No se ha modificado código productivo.

### Registro nativo de reservas en lote

Nueva API acotada applySettlements(sites,{replace}) y exports spatial_settlement_batch_ptr/spatial_apply_settlement_batch. Hasta256reservas, validación completa antes de mutar, un único refreshSettlementChunks y una revisión de terreno para el lote; resultados pthread preparados con revisión anterior se rechazan. No cambia aún la receta de poblados productiva ni los guardados. Elimina regeneraciones repetidas, no promete que la reconstrucción única sea asíncrona.

Compilados standalone y pthreads con /opt/emsdk Emscripten6.0.12. El primer intento con /usr/bin/em++ produjo runtime ESM incompatible con Node(__dirname); descartado y reemplazado por build del SDK. Tests finales:3batch(equivalencia geometría/campo, reemplazo/rechazo, cancelación de resultados pthread obsoletos),3travesía/navegación y1expansión/recarga pasan.

benchmark-settlement-batch.mjs,11sites reales,ABABABAB,mismo snapshotfinal de geometría: A216.86–223.74ms,B19.43–23.42ms. Una instancia/chunk residente, navegación todavía no construida, Node; NO es benchmark de frametime ni de expansión con simulación. building-pad-experiment/batch-benchmark.json contiene corridas finales. Las cifras anteriores236–376/21–27usaban compilador distinto; no mezclarlas con esta serie. Pendiente conectar lote al candidato de receta, validar streaming/partidas, guardar versión de receta y solucionar el remate inferior visual.

### Integración versionada del candidato y prueba pthread real

spatial-game-session reconoce mangroveSettlementVersion=1 solo en Manglares network. Usa reservas por footprint y applySettlements una vez por poblado; recipeausente conserva rectángulo anterior, resto de biomas conserva ruta previa. No activada por defecto: WG_WATER_BUILDING_PADS ahora inyecta el campo versionado en nueva partida en vez de reemplazar la lógica de sites. snapshots valida valor1/bioma/network y rechaza versiones desconocidas. Fixture de campaña admite versión y pasa receta al runtime nativo.

5tests pasan: expansión/recarga en legacy y versión1, equivalencia batch, entradas inválidas/reemplazo, rechazo publicación pthread obsoleta. Ambos casos de recarga verifican persistencia de versión y rechazo de versión2. building-pad-batched-game en Chrome real termina0errores,backend pthreads/crossOriginIsolatedtrue, snapshot versión1. Captura elevada inspeccionada: mantiene conexión superior recuperada y edificios secos; remate inferior persiste.370/3721muestras locales mojadas igual al candidato individual. Sin afirmar ahorro de frametime de esta captura; tiempo de instalación real pendiente de instrumentación. Captura y validation.json versionados; report completo permanece local.

### Remate inferior atribuido al halo del centro; cuatro semillas verificadas

mangrove-building-pads.test.js: semillas1,37,712,4096 pasan perímetros secos de edificios/centro y equivalencia de agua/posiciones de terreno tras save/load en9chunks por semilla. No sustituye incursiones ni capturas multisemilla.

building-pad-lower-cut completa0errores en pthreads. Su primer barrido cruzaba una orilla lateral; no usarlo para afirmar que el remate es natural. project-estuary-authority.mjs reconstruye cámara42° y valida12rayos contra coordenadas runtime con error<1e-5. Proyección completa de máscara nativa, sin objetos ni alpha/render, reproduce el corte inferior.

Barrido siguiendo el cauce: píxeles770,460 hasta820,428.75 tienen máscara natural~.90–1, pero máscara con reservas .10–.55. Única influencia: site10, centro planificado. Distancia fuera de su rectángulo1.20–3.20m; settlementBlend extiende6m la exclusión de agua, cerrando el cauce aunque ya esté fuera de la reserva seca. Report y projected.png inspeccionados. Próximo diseño: separar la franja hidráulica de la nivelación/limpieza de vegetación, reducir exclusión fuera del edificio manteniendo su soporte seco y versionar esa receta en todas las réplicas/pthreads/guardados. No acortar globalmente el halo de otras culturas/biomas por este caso.

### Transición hidráulica separada: canal inferior reconectado

Settlement incorpora waterFalloff (default6). Lote ABI pasa5floats/site y valida .25..6m antes de mutar. wetlandMask usa el falloff individual; el camino6 conserva la expresión histórica exacta. Nivelación/clearRadius/halo de vegetación no cambian. La cota Lipschitz incorpora1.5/falloff para no invalidar certificaciones de agua. Struct copiado a trabajos pthread incluye el campo; snapshot nativo versión6 y terreno versión2 lo preservan, omitiéndolo en receta6para mantener formatos anteriores. Far replica y horizon worker restauran reservas con ese campo.

Receta de partida mangroveSettlementVersion=2 usa1m, versión1 conserva6m; partidas sin campo conservan reserva original. QA activa2; aún no default. No migrar guardados silenciosamente. Standalone/pthreads recompilados con SDK6.0.12.

20tests únicos pasan:4batch(incluye agua nueva, snapshots/far, validación y pthread con falloff1),4semillas edificios/recarga,3versiones expansión/recarga,6réplicas biomas y3travesía. Verificación pendiente: capturas multisemilla/movimiento/incursiones con versión2, costes completos y normal/cerca con helechos.

building-pad-hydraulic-v2/elevated.png inspeccionada: canal inferior conectado a su bifurcación derecha y conexión superior conservada; no corte donde antes estaba halo del centro. Chrome real4096,media720p,hora100,backend pthreads,versión2,crossOriginIsolatedtrue,0errores.379/3721muestras locales mojadas (v1:370); no extrapolar ratio al mundo. Art/materiales/atlas no modificados. No cierre global por una sola captura.
