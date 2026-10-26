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
