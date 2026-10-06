# Tareas pendientes posteriores a la Jam

## Barrido completo del catálogo SFX (pedido el 5 de octubre de 2026)

- Revisar los 126 efectos sonoros del catálogo y registrar para cada ID sus acciones asignadas y puntos de reproducción.
- Identificar efectos sin asignar y completar su vinculación a la acción correcta, respetando el catálogo y los labs de referencia.
- Verificar la reproducción en el juego: condiciones de activación, ausencia de disparos fuera de contexto, repeticiones indebidas y duplicados.
- Comprobar precarga, rutas relativas y liberación de recursos; mantener las optimizaciones de audio existentes.
- Dejar una matriz de cobertura y pruebas reproducibles antes de marcar la tarea como terminada.

Estado: inventario de los 126 efectos registrado en [la matriz de cobertura](qa/sfx-catalog-post-jam/inventory.md): 88 tienen asignaciones de código y 38 siguen sin asignar en gameplay. Los bytes originales de todos coinciden por hash. [SFX 121/122 verificados](qa/sfx-structure-alerts/README.md): primer daño a un centro por incursión y transición de muralla a estado crítico, con avisos agrupados. [SFX 120 verificado](qa/sfx-raid-arrival/README.md): primera entrada física en la finca, una vez por incursión. [SFX 123 verificado](qa/sfx-worker-injury/README.md): incapacidad real tras el segundo golpe, con aviso agrupado y silencio al cargar historial; veinte casos nativos y 414 pruebas ampliadas de audio correctos. [SFX 109 verificado](qa/sfx-tutorial-complete/README.md): finalización real del tutorial básico tras entregar la primera caja, siete casos Web Audio nativos y supresión de historial/descargas tardías. [SFX 044 verificado](qa/sfx-wall-creak/README.md): crujido espacial al cruzar daño crítico de murallas, 50 combinaciones de impactos y diez casos Web Audio. [SFX 031/032/033 verificados](qa/sfx-wall-build/README.md): colocación de murallas según material, diez casos Web Audio y 137 pruebas ampliadas; sin duplicados por módulo ni descargas tardías. Pendientes: revisar contextos, completar usos compatibles y verificar reproducción/escucha; la matriz no acredita estos pasos.

Las ondas de pisadas en el agua del Gran Cañón son **VFX**. El usuario autorizó después vincular el SFX 012 (Pasos barro) a dichas pisadas y el SFX 006 (Agua de río) al ambiente del río; esta asignación concreta no sustituye el barrido completo pendiente.

## Recompresión de audio a Opus (pedido el 5 de octubre de 2026)

- Abordar junto con el barrido SFX la conversión de los 126 efectos y de toda la banda sonora a `.opus`, a partir de los originales disponibles para evitar pérdidas acumuladas.
- Comparar tamaño y calidad; preservar duración, canales, volumen, transitorios, puntos de bucle y sincronización de contactos/animaciones.
- Adaptar catálogos, rutas relativas, precarga, caché en disco y streaming de ventanas musicales; verificar búsqueda temporal y transiciones sin cargar o descodificar pistas inactivas.
- Probar decodificación y reproducción en la versión web de itch.io, Chrome móvil y Windows/Tauri antes de sustituir los recursos distribuidos.
- Registrar ahorro total y por archivo, parámetros de conversión y pruebas de regresión; conservar los originales fuera del paquete de distribución.

Estado: [conversión experimental de los 147 audios medida](qa/opus-conversion/README.md): 25,13 % menos de bytes y 294 comparaciones de descodificación Web Audio correctas. Los candidatos están fuera del runtime. [Ventanas Opus experimentales](qa/opus-music-windows/README.md): 1.100 comparaciones de señal correctas a 44,1/48 kHz y caché en disco verificada; todavía fuera del runtime. [Transporte Opus renderizado](qa/opus-music-transport/README.md): 108 casos de saltos, bucles, offsets, capas y resultados correctos a ambas frecuencias. [Lecturas Opus desde archivo único](qa/opus-window-recipes/README.md): ruta opcional incorporada al pool, 550 reconstrucciones idénticas por bytes y 1.100 comparaciones nativas correctas; [Activación musical y paquete web](qa/opus-runtime/README.md): 21 Opus y dos índices, 550 reconstrucciones, 36 pruebas dirigidas y cinco casos nativos desde ruta anidada; ahorro del paquete de 11,57 MB sin duplicados musicales. [SFX Opus distribuidos y exportados desde el lab](qa/sfx-opus-runtime/README.md): 126 recursos, metadatos y ZIP nativo verificados; 98 pruebas dirigidas y 252 casos Web Audio. Pendientes: escucha, coste/RAM en partida, fallback, pruebas móvil/itch.io/Tauri e integración distribuida sin duplicados.

## Imágenes WebP y Tinify (pedido el 5 de octubre de 2026)

- Inventariar todas las imágenes del juego, incluidas HUD, menús, retratos, texturas y referencias internas de modelos; convertirlas a WebP y optimizarlas mediante la API de Tinify.
- Seguir la [referencia HTTP oficial](https://tinify.com/developers/reference/http): subida por HTTPS a `/shrink` y conversión con `convert.type: image/webp`. Controlar cuota, errores y reintentos; reutilizar resultados por hash para evitar conversiones repetidas.
- Usar la credencial facilitada por el usuario mediante configuración privada o variable `TINIFY_API_KEY`; nunca incluirla en Git, assets del navegador, capturas, informes ni logs.
- Conservar dimensiones, transparencia y orientación. Revisar específicamente mapas de datos del shader, normales y máscaras para evitar artefactos de compresión o cambios de espacio de color.
- Actualizar todas las referencias y verificar carga completa de HUD/contratación, culturas, biomas y modelos, además del paquete de itch.io y Windows.
- Comparar imágenes y tamaños antes/después; documentar cualquier caso que requiera WebP sin pérdida para preservar el resultado del juego.

Estado: [inventario inicial medido](qa/image-inventory/README.md): 225 imágenes distribuidas (162 independientes y 63 embebidas), 219.365.411 bytes codificados y seis pruebas de clasificación correctas. Quedan 65 usos sin clasificar tras reconocer los 42 assets del HUD. [Tres pilotos Tinify reales](qa/tinify-color-pilot/README.md) conservan dimensiones y alpha, con 17 pruebas dirigidas correctas y 2.294.345 bytes de ahorro potencial; [Primeras tres variantes integradas](qa/tinify-runtime/README.md): 12 pruebas correctas, ruta anidada y comparación día/noche del Desierto; 2.290.672 bytes menos en el paquete sin duplicar originales. [Dos mapas de datos sin pérdida integrados](qa/lossless-data-runtime/README.md): 18 pruebas y WebGL2 nativo con cero diferencias en 33.554.432 canales, 1.029.145 bytes menos de paquete. [Cinco mapas PNG del terreno adicionales](qa/lossless-ground-runtime/README.md): 23 pruebas dirigidas y siete variantes de datos comprobadas en WebGL2 con cero diferencias; otros 1.091.342 bytes menos de paquete. [Máscara gris del menú y clasificación ampliada](qa/menu-mask-webp/README.md): 28 pruebas, descodificación nativa con/sin conversión de color y diorama cargado desde ruta anidada. Ya no se distribuyen PNG; quedan 15 usos sin clasificar, los JPEG/WebP restantes, mapas embebidos y aceptación más amplia/móvil/Windows.

Preflight posterior: [98 imágenes de color elegibles](qa/tinify-preflight/README.md), 24,46 MB codificados antes de optimizar, con 42 pruebas dirigidas correctas. Otras 53 imágenes independientes requieren revisión; los perfiles ICC, profundidad superior a ocho bits, orientación y usos de datos se comprueban antes de contactar con Tinify. Esta selección no acredita ahorro ni aceptación visual.

Siguiente variante integrada: [suelo de Gran Cañón](qa/tinify-canyon-ground/README.md), 1,53 MB menos de paquete, 43 pruebas dirigidas correctas y doce imágenes cargadas desde ruta anidada. Comparación real de día/noche en Mapungubwe sin cambios evidentes de patrón; pendiente ampliar el alcance visual/móvil/Windows.

Siguiente lote integrado: [cuatro retratos de contratación Tinify](qa/tinify-worker-portraits/README.md), alpha/dimensiones conservados, 50 pruebas y comparación nativa; 47.575 bytes menos de paquete. Preflight actualizado: 93 imágenes de color elegibles, 53 que requieren revisión y dieciséis variantes integradas. No acredita RAM/FPS ni aceptación móvil/Tauri.

Último lote: [seis atlas de color de props de bioma](qa/tinify-biome-atlases/README.md), doce comparaciones nativas día/noche y 22 variantes cargadas desde ruta anidada. Ahorro neto de paquete: 6.056.158 bytes; 87 imágenes de color y 53 de revisión siguen pendientes. No acredita mejora de RAM/FPS ni aceptación móvil/Tauri.

## Vegetación lejana mediante impostores (pedido el 5 de octubre de 2026)

- Seguir los 25 puntos de [Wild Guardians — Far Vegetation Impostor System](far-vegetation-impostor-system.md).
- Objetivo principal: poblar el horizonte y reducir el popping más allá de los chunks, con datos procedurales deterministas ligeros y sin cargar GLB/chunks completos para árboles lejanos.
- Primera prueba aislada: un árbol de Sabana, atlas precalculado de ocho vistas, billboard cilíndrico, orientación procedural conservada, transición con dithering, iluminación día-noche y fog.
- Validar rotación, aproximación bidireccional, desplazamiento lateral, cuatro fases de luz y horizonte con cientos/miles de instancias; medir CPU/GPU/RAM y tamaño distribuido.
- Integrar los demás biomas y estudiar una segunda fase solo después de superar los criterios visuales y de coste. Distancias, densidad y resolución configurables; los ejemplos no son valores definitivos.

Estado: [primer atlas offline de acacia generado y verificado](qa/far-vegetation-atlas/README.md), ocho vistas y WebP de 255780 bytes. [Visor aislado de ocho billboards y transición 3D](qa/far-vegetation-transition/README.md) añadido, con anclaje, rotación, mezcla angular, dithering y retención del modelo. Pendientes luces/materiales reales, integración procedural y medidas/aceptación del sistema. No está activo en gameplay.

## Ritmo económico con restricciones de fluidos reactivadas

La [campaña nativa de Manglares/Saheliana sobre 7a14cb9](qa/intensive-mangrove-shield-100/README.md) termina 100 noches con victoria, pero registra 58,17 % de tiempo diurno sin acciones disponibles: 15.455 segundos por presupuesto y 1.995 al final de turno. El flujo operativo neto es solo 403 monedas en cien noches.

[Diagnóstico de cinco campañas](qa/farm-margin-baseline/README.md): márgenes de solo 0,3–1,8 % e inactividad diurna del 58–64 %, con un candidato de ingresos derivado de entregas exactas y pérdidas desproporcionadas de algodón/plátano identificadas. [Primer ajuste de ingresos aplicado](qa/harvest-margin-candidate/README.md), con 173 pruebas correctas y derrota por mala gestión preservada. Pendiente: medir cien noches con este ajuste y revisar los parámetros reales del juego para permitir expansión rápida y reducir la inactividad, con la estrategia responsable preservada y ensayos de mala gestión que todavía puedan perder. La victoria aislada no satisface la petición de ritmo/actividad del usuario. La estrategia responsable y sus registros anteriores se conservan; el ajuste todavía no acredita el ritmo solicitado.


Avance experimental: [horizonte de mil acacias adicionales medido](qa/far-vegetation-horizon/README.md), ocho lotes nativos, cinco pruebas dirigidas y selección cercana sin reconstrucción con cámara quieta. Coste incremental GPU aproximado de 0,49 ms en este visor; todavía fuera de gameplay, sin acreditar móvil, RAM o integración procedural/iluminación real.


Avance experimental de iluminación: [modelo con material real y atlas con grading artístico compartido](qa/far-vegetation-lighting/README.md), cuatro fases del reloj, comparación a cámara fija y ocho lotes GPU. Persisten diferencias de contraste/detalle y el coste requiere más evaluación; no se activa en gameplay ni acredita la transición final.


## Coste de colas con historial grande

[Mantenimiento de tareas bloqueadas optimizado](qa/busy-task-targets/README.md): 65 pruebas dirigidas y 15.600 pasos nativos equivalentes en seis biomas. Mediana aislada sintética de 130,88 a 2,59 ms; no acredita FPS ni resuelve los picos de A* pendientes. Las campañas largas ya iniciadas conservan sus fuentes congeladas.


[Búsquedas de entidades por trabajador optimizadas](qa/worker-entity-lookups/README.md): índices locales solo para consultas repetidas en colecciones grandes, 68 pruebas y 15.600 pasos nativos equivalentes, trayectoria integrada idéntica. Mediana sintética grande de 27,49 a 4,10 ms; sin mejora global significativa acreditada para la finca pequeña ni medidas de FPS/RAM/móvil.


[Continuación de tres fincas avanzadas reales comparada](qa/late-farm-worker-lookups/README.md): 12.201–20.443 cultivos históricos, contratación pagada y recorridos físicos preservados; mediana de simular 100 ms reducida aproximadamente 39/45/38 %. Muestras individuales y estados completos en nueve checkpoints por caso. No acredita FPS, móvil o campañas actuales de cien noches.


[Destino de paseo optimizado](qa/idle-anchor-history/README.md): las plantas vivas evitan calcular distancias a cultivos históricos; respuestas iguales en tres fincas archivadas y 15.600 pasos nativos completos equivalentes. Medianas aisladas de cien consultas: 165→53 / 197→70 / 258→70 ms. Sin evidencia de FPS o ahorro cuando no hay plantas vivas.


[Corrección del paseo tras cosecha completa](qa/idle-anchor-shared/README.md): el selector de dos pasadas se sustituye por un subconjunto vivo compartido por actualización, con fallback histórico original. Incluye diagnósticos rechazados, coste de preparación y cambios de vida durante el paso. La medición de cien consultas con vivos baja a 3–8 ms; sin vivos no se acredita ahorro (−2,3 % a +6,1 %).


[Primera finca avanzada real renderizada comparada](qa/late-farm-render/README.md): cuatro lotes A/B/B/A, mismas entregas y estado final, 800 muestras CPU/GPU. La simulación mejora pero el render mantiene GPU ~63–64 ms y ~1.731 draw calls/~6,05 millones de triángulos por frame con pases sumados. Intervalos RAF ~84–91 ms; no acredita ganancia grande/general de FPS. Siguiente paso: atribuir el coste por categorías y pases.


[Envíos reales atribuidos](qa/late-farm-submissions/README.md) y [herramientas ocultas de trabajadores optimizadas](qa/worker-hidden-tools/README.md): se evita enviar meshes que los clips nativos reducen a escala 1e-5, conservando herramientas activas y recorridos físicos. 62 pruebas, build y cuatro lotes nativos con estado final idéntico; mediana de llamadas 1.731→637 y GPU ~63–65→60 ms en esta finca. Sin mejora estable de FPS acreditada. Pendiente: coste sostenido GPU (cultivos/props/materiales y pases), móvil y aceptación amplia; no considerar terminadas las optimizaciones.


[Preparación de profundidad limitada a subárboles visibles](qa/visible-depth-traversal/README.md): 21 pruebas dirigidas, build y cinco pares nativos de Manglares/Gran Cañón con profundidad idéntica y estado lógico preservado. Menos meshes preparados; sin mejora de FPS o RAM medida. Pendientes aceptación más amplia y reducción del coste GPU.


[Índices de VFX de trabajo diferidos](qa/lazy-work-vfx/README.md): se omite el historial mientras no hay trabajo activo válido, manteniendo polvo de reparación y datos frescos. 37 pruebas, build y 400 entradas de presentación equivalentes. En una medición aislada de diez llamadas sin actividad pasa de ~23–26 ms a <0,03 ms; riego activo sin ganancia. Pendiente efecto en frametime y aceptación amplia. QA-014 sigue pendiente: dos pestañas IAB no producían ocultación real.
