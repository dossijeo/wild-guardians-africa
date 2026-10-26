# Manglares, activación de magia y latencia de rutas

Objetivo activo: red de canales y meandros creíble con terrenos secos/embarrados; eliminar bloqueos de escudo y demás magias sin comprometer navegación.

Ampliación solicitada: medir la espera de bestias y trabajadores por rutas y evaluar un endpoint por lotes multihilo. Separar espera de cola, búsqueda nativa, sectores ausentes y publicación. Los resultados deben llevar identidad/destino/revisión para descartar búsquedas obsoletas. No basta con desplazar un bloqueo o permitir atravesar un escudo durante la espera.

Referencia: main d5d48988d, rama de trabajo codex/global-visual-lab. Cambios ajenos preexistentes se conservan.

Inspección inicial (hipótesis, no atribución medida):
- wetlandMask de variante 7 solo conserva dos canales no periódicos; lejos de sus ejes el mundo queda seco. Hace falta una red distribuida, no aumentar únicamente la anchura.
- Escudo: polígono de 64 vértices, refreshPolygon actualiza sectores en todos los perfiles; nav.setState invalida rutas/cachés.
- ShieldVfx crea un efecto en primer uso: investigar coste nativo, shader/driver y rutas separadamente.
- Existe routeActorNativeBatch síncrono; no prueba ejecución paralela. El endpoint threaded de generación no implica que navegación sea thread-safe.

Instrumentación añadida al harness de incursión: WG_MAGIC_PROFILE=1 captura CPU profile, intervalos rAF y long tasks desde antes de seleccionar magia hasta después del escudo mediante UI real. La primera reproducción está en curso; aún no se atribuye causa.

## Primera reproducción medida

Harness final-ten, Chrome/WebGL2, 1280x720, calidad media, clic real en escudo. `shield-before/raid-ui.json`: long task 5364 ms e intervalo rAF máximo 5371 ms. CPU sampling (`magic.cpuprofile`): getProgramInfoLog 4428.745 + 625.934 + 100.236 ms (~5155 ms). Son tiempos síncronos muestreados/espera del driver, NO tiempo GPU. El bloqueo observado está dominado por preparación tardía de programas, no demostrado como navegación. Se debe identificar qué pasada/variante compila y anticiparla/reutilizarla sin ocultar errores ni empeorar carga innecesariamente. Rutas en cola siguen siendo un requisito independiente pendiente de atribución.

## Confirmación por shaders reales

Segunda ejecución: `shield-programs-before`, 37 consultas de programas durante activación, 4911.38 ms síncronos acumulados y máximo intervalo rAF 5054.95 ms. Los shaders más costosos contienen `uniform PointLight pointLights[ 2 ]` e incluyen materiales de animales (`Material_0`, `Mane repairs`, `BakedMaterial`) y del mundo. VfxGpuPreload desactiva sus luces; NativeVfx activa dos PointLight según el efecto. Three incluye el número de luces en la clave de programa incluso para múltiples pasadas. Hipótesis confirmada: cambio global de configuración luminosa al primer escudo dispara variantes de toda la escena.

Siguiente intervención: diseñar luces de VFX con configuración estable durante el mundo, propiedad y liberación explícitas, evitando aumentar variantes con cada efecto simultáneo. Comparar imagen y coste estable; no eliminar luz del escudo como atajo. Mantener las capturas negativas y repetir el mismo harness antes/después. La espera de rutas continúa pendiente y no queda explicada por esta atribución de shaders.

## Prototipo opt-in: luces estables

`?vfxStableLights=1` reserva cuatro luces desde la carga. Una luz sin contribución mantiene visibilidad con intensidad cero; así la clave de programa no cambia. Los efectos aportan sus fuentes a esos slots, seleccionadas por intensidad y distancia de cámara. El escudo aislado conserva ambas posiciones, colores e intensidad. Más de cuatro fuentes simultáneas implica selección: pendiente de validación artística, no aprobado por defecto.

Primera ejecución idéntica final-ten: máximo rAF 182.995 ms, dos consultas de programa, 161.955 ms acumulados. Comparación anterior: 5054.95 ms / 37 consultas / 4911.38 ms. No es aún ABAB ni prueba de coste GPU sostenido. Programas restantes: humo de destrucción RawShaderMaterial (118.375 ms), profundidad de malla skinned con mapa (43.58 ms). Hay que resolver o atribuir su aparición y repetir sin confundir daño simultáneo con activación del escudo.

17 pruebas existentes/nueva cobertura de precarga y VFX pasan. Test añadido verifica luz aislada, color/intensidad, origen de render desplazado, desaparición sin cambio de conteo y liberación. Runtime normal permanece sin cambios mientras no se indique opt-in.

## Precarga de humo

Añadida preparación explícita de smokeScene con su configuración real (sin luces de mundo, sombras desactivadas, destino de pantalla). Estado del renderer restaurado antes del await, probado con compilación pendiente. No se generan partículas ni se altera simulación.

Repetición stable-smoke: una sola consulta tardía, MeshDepthMaterial skinned, 73.915 ms; desaparece la consulta del humo. Máximo intervalo rAF 182.76 ms, sin long tasks >150 ms. Son medidas de una ejecución con sampling y vídeo, todavía no equivalencia ABAB ni benchmark GPU. Captura raid-shield.png inspeccionada: escudo y grupo visibles, escena coherente; no sustituye comparación fija de efectos múltiples.

Añadidas marcas de tiempo del clic al harness para las siguientes ejecuciones. Pendiente aislar variante de sombra, estabilizar selección de luces simultáneas y medir coste GPU sostenido. Encontrados reintentos de rutas desconocidas de 4/8 segundos en raids.js; medir causas y sectores, no asumir que un pthread elimina esas políticas.

## Diagnóstico espacial de Manglares

Nuevo survey-mangrove-network.mjs muestrea el WASM autoritativo (sin modificarlo), con poblado en (60,0), 480x480 metros, paso 2 m, semillas 1/37/712/4096. Agua: 2.413/2.439/2.340/2.406 %. En las regiones con |x|>100 e |z|>100: 0 % en las cuatro. Mapa seed-37.png inspeccionado: dos líneas estrechas atravesando una superficie mayoritariamente seca. La fórmula no define una red distribuida. El proxy de barro del mapa es máscara >0.2 fuera del agua, no clasificación del material final. Se necesitan cauces principales y secundarios repartidos espacialmente, con anchuras y márgenes variables, conservando identidad de generación para partidas existentes.

La primera ejecución de atribución de objeto de sombra falló por una referencia QA no instalada; no es un error del juego. Corregida la inyección exclusivamente en el harness y repetición en curso. No usar esa ejecución fallida para rendimiento.

Atribución corregida: clickStart 43507.525 ms, clickEnd 43570.430 ms. Única consulta tardía a 48871.075 ms (~5.3 s después): SkinnedMesh Mesh_0_1 / Mesh_0 / Armature, fuente Material_0, MeshDepthMaterial DoubleSide, espera 84.735 ms. Por tanto no atribuir ese evento al clic del escudo. La preparación residual de sombras y la latencia directa de magia son métricas distintas. Máximo rAF de la ventana completa 182.85 ms.

## Primera red estuarina (variante 8, NO activada)

C++ implementa límites de celdas irregulares deformados por ruido, con anchura variable y márgenes húmedos. Variante nativa 8 y bandera persistida mangroveNetwork, independiente de legacy 4 y canales 7. Propagada a estados, workers y validación de sesión; el hilo de preparación copia su bandera. Las partidas nuevas siguen usando variante 7 hasta validar arte/jugabilidad. Recompilados WASM síncrono y pthread.

Survey cuatro semillas: 18.23–20.40 % agua en 480x480 m y 15.01–20.15 % en regiones exteriores (antes 0 %). Cuatro tests pasan, incluidos legacy, snapshot, réplica lejana y geometría de agua pthread equivalente.

Inspección seed-37.png: red distribuida, pero bordes demasiado rectos y celdas poligonales evidentes; no cumple aún la referencia de meandros naturales. Conservar como iteración diagnóstica y aumentar deformación orgánica/jerarquía de ramificaciones. Pendientes capturas reales, navegación entre partes secas, costes de generación y memoria. No presentar la cobertura numérica como aprobación artística.

## Meandros a dos escalas

Deformación de la red con ruido a 0.015/0.042, amplitudes 86/18 m. Cobertura cuatro semillas 18.86–20.28 %, zonas exteriores 16.95–20.79 %. Máscara tiene una cota conservadora explícita de pendiente para los certificados de navegación. Los cuatro tests legacy/snapshot/far/pthread siguen pasando.

Mapa seed37 inspeccionado: elimina la mayoría de tramos rectos y genera curvas, ensanchamientos e intersecciones. Primera captura real semilla37: 495/3721 muestras con agua alrededor del poblado (~13.3 %), sin errores de página. Cauces visibles en primer fondo y horizonte, poblado sin inundación. Todavía falta prueba de accesibilidad y utilidad de las masas secas, costes nativos y revisión artística multi-semilla; no activar por defecto.

Harness de capturas ampliado con cierre del tutorial y vista elevada. Serie real 1/37/712 en curso, sesión de ejecución 38423. No se atribuyen resultados a capturas aún pendientes.

## Validación de emplazamientos

Prueba real del buscador nativo sobre semillas 1/37/712/4096 y todos los packs culturales: encuentra un emplazamiento válido con doce parcelas útiles y sus rutas de trabajadores. Pasa en 10.46 s de suite (no benchmark comparativo). No demuestra aún acceso de incursiones desde todas las masas de tierra ni campañas largas.

Limitación detectada en QA visual: las primeras capturas llamadas elevated estaban siendo reajustadas por la cámara guiada del tutorial. No cuentan como panorámicas. Harness corregido: cinematic=true únicamente para la captura, ocultar presentación del tutor sin avanzar pasos, posición elevada explícita sin clamp de OrbitControls. Se repetirán esas vistas; las capturas normales anteriores sí muestran el terreno real.

## Acceso terrestre hostil obligatorio

Extraído el buscador geométrico común naturalLandAccess del wrapper de Gran Cañón, conservando su comportamiento anterior. La variante estuarina exige ahora una ruta positiva desde 32 m hacia las parcelas con el radio publicado del rinoceronte (1.55 m). No abre pasos artificiales ni ignora agua. La búsqueda de emplazamiento rechaza candidatos sin ese testigo.

Cuatro semillas/todos los packs culturales pasan la condición añadida. Tanda completa: 19/19 pruebas de defensa natural de Cañón, emplazamientos iniciales y variantes Manglares. Error inicial de reutilización (riverX existe pero no devuelve coordenadas válidas fuera de Cañón) corregido limitando el seguimiento de esa ribera al bioma correspondiente.

Panorámica corregida seed1 inspeccionada: muestra distribución extensa de canales y islas; orillas angulosas en el fondo siguen pendientes de diagnóstico de representación distante. Acceso de 32 m es una condición de arranque, no prueba de incursión completa ni de conectividad universal entre islas.

## Revisión de panorámicas y robustez de QA

Serie overview: semilla1 completada y revisada; semilla37 agotó 240 s de espera de mundo mientras se editaban módulos del servidor HMR. No afirmar que sea un fallo de generación ni descartar esa posibilidad sin repetir. Servidor QA separado en 5220, HMR desactivado. Primer intento allí agotó 30 s en page.goto antes de entrar al juego (sin pageerrors); preservado failure.json. Harness ahora distingue navegación inicial (DOMContentLoaded, 90 s) y preparación del mundo (240 s), conserva texto/captura/errores al fallar y espera las rutas interceptadas antes de cerrar contexto. Repetición activa 57503.

Añadido benchmark-estuary-generation.mjs para comparar coste CPU nativo por chunk en secuencia 7/8/7/8; aún NO ejecutado para evitar concurrencia con capturas. No mide GPU ni frametime. Mantenerlo separado de la validación de fluidez.
