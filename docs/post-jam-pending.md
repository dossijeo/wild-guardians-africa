# Tareas pendientes posteriores a la Jam

[Reutilización de buffers al redimensionar lotes](qa/asset-group-production/README.md):
integración limitada a cambios de capacidad; matrices/cobertura/envíos
iguales,121 frente a171 bufferData al aparecer el búfalo en Gran Río/Musgum.
Ciclo WebGL acaba con cero buffers observados pendientes;60 pruebas dirigidas,
build y paquete pasan. Suite completa termina con3.117 pruebas correctas;
la evidencia conserva controles y negativos. No se acredita mejora general de FPS.

[Asignaciones de lotes durante aparición](qa/asset-group-appearance/README.md):
Gran Río/Musgum alta recrea15 lotes por capacidad (13 crecen/2 menguan), añade6
claves y retira3 claves de visibilidad;171 bufferData en el primer render.
Observador QA y12 pruebas, producción sin cambios. Evitar solo reducciones no
basta en este caso: investigar conservación de buffers estáticos al redimensionar,
con propiedad/liberación, imagen y coste incluidos antes de adoptar el candidato.

[Montañas HQ integradas y paquete verificado](qa/hq-main-integration/README.md):
PR #7 mergeada, seis atlas byte-exactos y ZIP sin ZIP anidado. Validate game del
merge pasa 3.104 tests; Windows termina correctamente, incluidos WebView2 y
minimización/restauración nativa (runtime68447e14, no commits posteriores). Las
notas inferiores conservan etapas históricas rechazadas/apagadas y no describen
el estado actual de activación. Siguen pendientes aceptación temporal/móvil y
coste amplio; la integración no cierra esas comprobaciones.

[Precarga actual en otras culturas/calidades](qa/preload-current-cultures/README.md):
Gran Río/Etíope baja y Musgum alta alcanzan primer golpe real del búfalo, sin
compile/link ni nuevas descargas GLB, con actor visible y cero esperas. El primer
render conserva subidas de buffers y llega a42,2ms en el caso alta. No acredita
ausencia global de tirones, todas las combinaciones ni teléfono físico; próximo
diagnóstico: atribuir trabajo de aparición con coste de chunks/LOD/subidas.

[Montañas HQ: alternativa sin mipmaps](qa/hq-mountain-no-mips/README.md):
146 poses nativas día/noche y cuatro capturas conservan el acabado. No basta
para elegir filtro: verificar niveles efectivos y parpadeo/móvil; el negativo
CPU de mezcla entre celdas desde mip5 permanece registrado.

[Montañas HQ: pilotos de los otros cinco biomas](qa/hq-mountain-biome-pilots/README.md):
730 poses nativas día/noche sin errores, diez capturas revisadas. Gran Río,
Manglares, Volcanes y Desierto siguen una dirección artística aceptable; revisar
contacto y composición final. Cañón necesita cámara elevada: sus paredes ocultan
el atlas en la vista inicial, por lo que no se acepta visualmente todavía.

[Montañas HQ: cuatro siluetas Sabana](qa/hq-mountain-four-arcs/README.md):
dirección de composición aceptable en vistas día/noche y valles abiertos;
dos giros nativos de 73 poses sin errores, estado invariado. Falta filtrado
entre celdas, móvil/coste e integración de los demás biomas; fondos sin activar.

[Piloto de montañas HQ con arcos](qa/hq-mountain-arc-pilot/README.md):
Sabana conserva proporciones y elimina simetría por espejo. La mezcla existente
de bruma en la base mejora el contacto; bajar 30 m recorta laderas y se descarta.
Dos giros nativos sin errores, vistas diurnas/nocturnas y negativos conservados.
Continuar composición de cuatro siluetas antes de los demás biomas; no activado.

[Campaña Sabana/Saheliana: cien noches archivadas](qa/intensive-sabana-saheliana-e461b550/README.md):
segundo caso terminal de la matriz congelada, ocho especies, contratación y
entregas físicas diarias; contabilidad y resumen completos reconciliados.
25,40 % de jornada sin acciones sigue siendo un asunto de diseño. Los hashes
prueban fuentes congeladas e461b550; el HEAD ambiental del hijo no identifica
su código. No es replay de main ni cierre de la matriz de treinta casos.

[Montañas HQ: primera integración visual rechazada](qa/hq-mountain-sabana-negative/README.md):
Sabana carga y gira día/noche sin errores, pero el empalme por reflejo produce
simetría artificial. Conservar fuentes/evidencia y terminar una composición
natural de 360° antes de promover los seis fondos; también revisar proporciones.

[Impostores y horizonte integrados en main](qa/far-merge-e4afdcbd/README.md): PR #6
revisada/mergeada/pull, 44 atlas reproducibles exactos, CI de rama web/Windows
aprobada y 208 pruebas combinadas + build/paquete correctos. Montañas HQ siguen
en rama separada para aceptación de costuras/composición/luz y coste; la matriz
intensiva y aceptación física más amplia continúan pendientes.

[SFX del gesto de muralla 094/095](qa/wall-gesture-audio/README.md): arrastre una
vez al superar umbral, release una vez, cancelación y protección de decode tardío;
101 pruebas dirigidas y voces nativas Opus aceptadas en navegador. Matriz vigente:
99 asignados y 27 reservas. Sigue pendiente la escucha/contexto del barrido completo.

[Montañas de horizonte HQ generadas](../assets-source/far-backdrops-hq/README.md):
seis candidatos imagegen por bioma, fuentes originales y prompts conservados.
Relieve natural sin facetas low poly. Antes de sustituir los fondos: corregir
costura 360°, reencuadrar Desierto sin recortar picos, exportar WebP a presupuesto
equivalente y comprobar alpha/mips, escala, bruma y luz día/noche en el juego.
No están activados; generación de fuentes no equivale a aceptación integrada.

[Filtro topológico para caras traseras](qa/mesh-sidedness-audit/README.md): 406 entradas de props/poblados, cinco controles sintéticos; cuatro candidatos pequeños y ningún prop válido en todos sus LODs según el filtro conservador. No se modifica `DoubleSide` ni se consideran rotos los modelos rechazados. Pendientes imagen/sombras por categoría y beneficio medido; priorizar dibujo/shader/profundidad antes que un cambio global no acreditado.

[Índice de cultivos comprobado en finca renderizada](qa/active-crops-rendered/README.md): 800 muestras y queries, estado/eventos/rutas/envíos idénticos. CPU simulación mediana 2,1–2,2 a 0,95–1,0 ms; RAF permanece ~70 ms y render sigue dominante. Framebuffer 1600×900, distinto del ensayo anterior de audio; no comparar absolutos entre ellos. Próxima prioridad: coste de dibujo/materiales/pases y fincas actuales mayores, sin atribuir mejora general de FPS a este ahorro.

[Índice activo de cultivos aplicado al crecimiento](qa/active-crops-index/README.md): conserva historial/guardado/FIFO y retira entradas del índice al recoger o destruir. 75 pruebas dirigidas y build; tres estados históricos nativos con estado final completo idéntico y menor mediana CPU del recorrido. No acredita FPS ni mejora de p95 constante; pendientes frametime integrado, memoria/móvil y campañas actuales completas.

[Coste del historial de cultivos aislado](qa/crop-history-comparison/README.md): cuatro calibraciones y ocho pasadas sobre Sabana histórica, estado final completo idéntico. Mediana de medianas CPU por tick 1,860 ms con historial / 1,213 ms excluyendo temporalmente registros muertos; no acredita FPS ni autoriza borrar historial. Próximo candidato: índice de plantas activas con invalidación de ciclo de vida y comparación de nacimientos, muertes, entrega y guardado antes de integrar.

[Campaña intensiva Sabana/Mapungubwe terminada](qa/intensive-sabana-mapungubwe-e461b550/README.md): revisión congelada e461b550, ocho cultivos, 100 noches, entrega física diaria y hasta 1.407 plantas vivas. Archivo y resumen recalculados en main; no equivale a repetir con navegación actual ni completar la matriz. Inactividad de estrategia 18,16% del tiempo diurno, aún por reducir; otras combinaciones y Gran Cañón siguen pendientes.

[Índice de audio medido en finca renderizada](qa/audio-task-frame-native/README.md): 800 muestras, cuatro continuaciones pagadas con estado/rutas/cues/envíos idénticos. La mediana de audio queda en 0,2 ms en ambos brazos y no aparece mejora consistente de frametime. Observadores con voces null, sin reproducción/descodificación; no extrapolar el ahorro aislado a FPS. Pendiente coste GPU sostenido y poblaciones mayores.

[Índice de audio compartido durante actividad](qa/audio-task-frame/README.md): tres sistemas agrícolas reutilizan una FIFO local a la llamada, con validación viva de descargas tardías. 431 pruebas y build; cuatro perfiles pagan y entregan sobre terreno nativo con cues/liberaciones idénticos. CPU aislada menor durante actividad, pequeño coste del coordinador en reposo; efecto en frametime/móvil pendiente.

[Respaldo de pantalla según política del iframe](qa/wake-policy/README.md): evita solicitudes nativas destinadas al rechazo e inicia directamente el vídeo desde el gesto. 16 pruebas, build y rutas nativa/iframe reales correctas; aceptación física de pantalla encendida confirmada por el usuario el 7 de octubre en el Pixel con la Jam publicada en itch.io ([registro](qa/pixel-screen-awake-physical.md)). Wake Lock deja de ser prioridad salvo regresión.

[Índices de audio agrícola diferidos](qa/farm-audio-idle-index/README.md): regadera/contactos omiten la FIFO sin trabajadores actuando, manteniendo limpieza de voces y transporte de cajas. 423 pruebas de audio y build correctos; cuatro lotes CPU por caso muestran ahorro aislado en reposo/caminata/transporte/huida y pequeñas diferencias desfavorables durante actividad. No acredita FPS, reproducción móvil ni cierre del barrido SFX.

## Barrido completo del catálogo SFX (pedido el 5 de octubre de 2026)

Recuento contrastado el 7 de octubre sobre `3e6648da`: **96 asignados y 30 sin asignar en gameplay**. `node tools/audit_sfx_catalog.mjs --check` confirma que la matriz de los 126 IDs está vigente y que los 126 originales conservan sus bytes. `node tools/verify_sfx_runtime.mjs` verifica hashes, exportaciones, muestras Opus y paridad de decisiones entre los manifiestos originales/comprimidos. Los SFX 114 (reembolso positivo de muralla) y 115 (contratación con coste positivo) ya están incorporados. El párrafo histórico inferior describe la etapa de 94/32; no es el recuento actual. Siguen pendientes la escucha/contextos restantes y las reservas justificadas: la validación de archivos no demuestra reproducción de cada efecto.

- Revisar los 126 efectos sonoros del catálogo y registrar para cada ID sus acciones asignadas y puntos de reproducción.
- Identificar efectos sin asignar y completar su vinculación a la acción correcta, respetando el catálogo y los labs de referencia.
- Verificar la reproducción en el juego: condiciones de activación, ausencia de disparos fuera de contexto, repeticiones indebidas y duplicados.
- Comprobar precarga, rutas relativas y liberación de recursos; mantener las optimizaciones de audio existentes.
- Dejar una matriz de cobertura y pruebas reproducibles antes de marcar la tarea como terminada.

Estado: inventario de los 126 efectos registrado en [la matriz de cobertura](qa/sfx-catalog-post-jam/inventory.md): 94 tienen asignaciones de código y 32 siguen sin asignar en gameplay; la recogida física de caja incorpora el [SFX 117](qa/sfx-crate-pickup/README.md). Los bytes originales de todos coinciden por hash. [SFX 121/122 verificados](qa/sfx-structure-alerts/README.md): primer daño a un centro por incursión y transición de muralla a estado crítico, con avisos agrupados. [SFX 120 verificado](qa/sfx-raid-arrival/README.md): primera entrada física en la finca, una vez por incursión. [SFX 123 verificado](qa/sfx-worker-injury/README.md): incapacidad real tras el segundo golpe, con aviso agrupado y silencio al cargar historial; veinte casos nativos y 414 pruebas ampliadas de audio correctos. [SFX 109 verificado](qa/sfx-tutorial-complete/README.md): finalización real del tutorial básico tras entregar la primera caja, siete casos Web Audio nativos y supresión de historial/descargas tardías. [SFX 044 verificado](qa/sfx-wall-creak/README.md): crujido espacial al cruzar daño crítico de murallas, 50 combinaciones de impactos y diez casos Web Audio. [SFX 031/032/033 verificados](qa/sfx-wall-build/README.md): colocación de murallas según material, diez casos Web Audio y 137 pruebas ampliadas; sin duplicados por módulo ni descargas tardías. [SFX 099 verificado](qa/sfx-power-ready/README.md): aviso agrupado al terminar realmente una recarga, con 113 pruebas y reproducción Web Audio a ambas frecuencias; sin replay al cargar o cerrar. Pendientes: revisar contextos, completar usos compatibles y verificar reproducción/escucha; la matriz no acredita estos pasos.

Las ondas de pisadas en el agua del Gran Cañón son **VFX**. El usuario autorizó después vincular el SFX 012 (Pasos barro) a dichas pisadas y el SFX 006 (Agua de río) al ambiente del río; esta asignación concreta no sustituye el barrido completo pendiente.

## Recompresión de audio a Opus (pedido el 5 de octubre de 2026)

- Abordar junto con el barrido SFX la conversión de los 126 efectos y de toda la banda sonora a `.opus`, a partir de los originales disponibles para evitar pérdidas acumuladas.
- Comparar tamaño y calidad; preservar duración, canales, volumen, transitorios, puntos de bucle y sincronización de contactos/animaciones.
- Adaptar catálogos, rutas relativas, precarga, caché en disco y streaming de ventanas musicales; verificar búsqueda temporal y transiciones sin cargar o descodificar pistas inactivas.
- Probar decodificación y reproducción en la versión web de itch.io, Chrome móvil y Windows/Tauri antes de sustituir los recursos distribuidos.
- Registrar ahorro total y por archivo, parámetros de conversión y pruebas de regresión; conservar los originales fuera del paquete de distribución.

Estado: [conversión experimental de los 147 audios medida](qa/opus-conversion/README.md): 25,13 % menos de bytes y 294 comparaciones de descodificación Web Audio correctas. Los candidatos están fuera del runtime. [Ventanas Opus experimentales](qa/opus-music-windows/README.md): 1.100 comparaciones de señal correctas a 44,1/48 kHz y caché en disco verificada; todavía fuera del runtime. [Transporte Opus renderizado](qa/opus-music-transport/README.md): 108 casos de saltos, bucles, offsets, capas y resultados correctos a ambas frecuencias. [Lecturas Opus desde archivo único](qa/opus-window-recipes/README.md): ruta opcional incorporada al pool, 550 reconstrucciones idénticas por bytes y 1.100 comparaciones nativas correctas; [Activación musical y paquete web](qa/opus-runtime/README.md): 21 Opus y dos índices, 550 reconstrucciones, 36 pruebas dirigidas y cinco casos nativos desde ruta anidada; ahorro del paquete de 11,57 MB sin duplicados musicales. [SFX Opus distribuidos y exportados desde el lab](qa/sfx-opus-runtime/README.md): 126 recursos, metadatos y ZIP nativo verificados; 98 pruebas dirigidas y 252 casos Web Audio. Pendientes: escucha, coste/RAM en partida, fallback, pruebas móvil/itch.io/Tauri e integración distribuida sin duplicados.

## Imágenes WebP y Tinify (pedido el 5 de octubre de 2026)

Estado actual en `dadf056d`: [recetas y candidatas contrastadas](qa/tinify-building-runtime/color-approval-status.json). Hay 14 colores embebidos aprobados e instalados (cinco bestias, cuatro trabajadores de gameplay y cinco casas). Del lote histórico de 16 candidatas quedan cinco pendientes de revisión nativa —diorama del menú y cuatro variantes de labs de trabajadores— y dos colores de cultivos rechazados por calidad. Las cifras de preparación/lotes inferiores son históricas; no deben interpretarse como 16 colores todavía pendientes. Normales/datos mantienen sus gates específicos.

Estado embebido actual: [lote completo preparado](qa/embedded-color-batch-preparation/README.md). Las cinco bestias tienen sus colores revisados instalados; quedan 16 colores con entradas PNG sin pérdida preparadas desde originales y 42 normales/datos para revisión específica. Los PNG intermedios están en caché, fuera del paquete. Treinta pruebas correctas; todavía no hay conversiones nuevas ni ahorro adicional en esta entrega.

Resultado del lote: [16 candidatas Tinify comprobadas](qa/embedded-color-batch-candidates/README.md). Catorce pasan los gates independientes y quedan para revisión visual; las dos texturas de cultivos se rechazan por calidad inferior a 32 dB. Ahorro potencial de las candidatas que pasan: 5.741.092 bytes, sin integración ni ahorro distribuido nuevo. Doce salidas únicas y sus recibos se conservan fuera de public; 24 pruebas correctas.

Revisión posterior: [cuatro perfiles de trabajadores](qa/embedded-worker-color-native/README.md) comprobados delante/detrás y día/noche: 32 capturas, 96 pares de lectura GPU, cámaras/poses/hashes conservados y cero errores WebGL. Sus cuatro colores ya están [integrados con receta offline verificable](qa/tinify-worker-runtime/README.md), con 1.418.728 bytes menos en GLB; los otros dieciséis modelos permanecen iguales. Verificación descodificada completa, 19 pruebas, build y ZIP correctos. Edificios, diorama y variantes de trabajadores adicionales siguen pendientes; no acredita rendimiento ni aceptación móvil/Tauri.

Edificios: [checkpoints de las cinco culturas](qa/embedded-building-color-native/README.md), usando NativeBuilding y máscaras reales, con 120 capturas de estados intacto/35%/65% y 360 pares de lectura día/noche, cero errores WebGL y hashes/cámaras iguales dentro de cada pareja. [Ciclos nativos de las cinco culturas](qa/embedded-building-color-lifecycle/README.md): otras 160 capturas y 480 pares de lectura cubren reparación, derrumbe, ruinas y reconstrucción, incluido humo/escombros; la reparación y reconstrucción recuperan exactamente la captura inicial de cada variante. Las cinco candidatas están [instaladas y verificadas](qa/tinify-building-runtime/README.md), con ahorro de 2.256.596 bytes, hashes idénticos a las candidatas revisadas y los otros quince GLB iguales. Build, descodificación y ZIP comprobados; suite local 2.805/2.805 y 51 regresiones sensibles a assets repetidas tras acabar la reconstrucción. Falta aceptación amplia. La prueba visual no acredita recorrido/cobro de reparaciones. Los seis nombres de bioma repiten la misma receta de cada casa y no acreditan seis escenarios distintos.

Estado actual contrastado: [preflight cd31d6b](qa/image-current-preflight/README.md). Cero imágenes distribuidas sin clasificación; 79 archivos de color elegibles, 43 de revisión específica y 40 variantes integradas. Las 63 imágenes embebidas siguen fuera del preflight independiente. 60 pruebas correctas; inventario y selección actuales archivados. Las cifras siguientes describen entregas históricas y no deben sumarse ni usarse como estado actual.

[Repacker de color embebido](qa/web-glb-image-repack/README.md): sustituciones de longitud distinta en los veinte GLB conservan bytes Meshopt, metadata de skins/animaciones y todas las imágenes no modificadas. 66 pruebas correctas. Herramienta offline; pendiente convertir desde originales, actualizar manifiestos y validar assets antes de distribuirlos. No hay ahorro nuevo ni assets modificados en esta entrega.

[Piloto embebido del facóquero](qa/tinify-embedded-color-pilot/README.md): Tinify desde PNG original, 2048×2048 intactos, 165.424 bytes de ahorro potencial, alpha sin cambios y geometría descodificada idéntica. Gate independiente con PSNR 38,64 dB; doce pares nativos y cuatro capturas cercanas día/noche revisadas. Candidata aún fuera del runtime: falta receta de reconstrucción aceptada, instalación/manifiesto y build/paquete. No acredita ahorro RAM/GPU ni aceptación móvil.

Resultado posterior: [facóquero integrado](qa/tinify-embedded-color-runtime/README.md), con receta offline, reconstrucción real de veinte GLB (diecinueve idénticos), 17 pruebas, verificador completo, build y ZIP directo correctos. Ahorro efectivo del asset: 165.424 bytes. Continúa pendiente optimizar los demás colores embebidos y ampliar la aceptación móvil/rendimiento; la nota de piloto anterior conserva su estado histórico.

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

[Pilotos de los tres atlas de poblados restantes](qa/tinify-remaining-village-pilots/README.md): candidatos reales Mapungubwe/Saheliana/Etíope, 2.090.366 bytes de reducción potencial, hashes/dimensiones/alpha verificados y 53 pruebas dirigidas correctas. Comparación nativa de doce vistas día/noche completada e integración posterior: 56 pruebas y paquete web correctos, 2.086.563 bytes menos de distribución. Preflight actualizado sobre cee494f: 82 imágenes independientes elegibles, 45 de revisión y 35 variantes ya integradas; cero roles de imagen sin clasificar en la distribución. No acredita mejora de RAM/FPS ni aceptación móvil/Tauri.

## Vegetación lejana mediante impostores (pedido el 5 de octubre de 2026)

- Seguir los 25 puntos de [Wild Guardians — Far Vegetation Impostor System](far-vegetation-impostor-system.md).
- Aplicar el [criterio prioritario de exactitud y composición](far-vegetation-impostor-system.md#criterio-prioritario--exactitud-y-composici%C3%B3n-del-horizonte-6-de-octubre-de-2026): 3D real, zona media fiel, selección muy lejana con densidad decreciente y hash estable, recuperación mediante fade atmosférico antes de la zona fiel, categorías pequeñas retiradas antes y backdrop 2D inaccesible independiente. Evitar una pared de árboles; no visualizar todo el procedural a densidad constante.
- Incorporar la [referencia visual de paisaje por capas](far-vegetation-impostor-system.md#referencia-visual-adicional--paisaje-por-capas-6-de-octubre-de-2026): primer plano 3D, distancia cercana ajustable, impostores deterministas, bruma residual durante transición, suelo lejano lavado y montañas 2D con parallax delante del skymap; validar coste y coherencia del relieve.
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


[Índices diferidos medidos dentro del render real](qa/late-farm-work-indexes/README.md): cuatro lotes, 800 muestras CPU/GPU y mismo estado final/rutas/entregas. Todos los frames mantienen dos a nueve trabajadores actuando; no se acredita mejora estable de frametime. Siguiente paso: reutilizar el índice durante actividad con invalidación comprobada, además del coste GPU sostenido. La campaña de margen congelada sigue viva y alcanzó el día 57, sin resultado terminal todavía.


[Destinos de VFX reutilizados durante actividad](qa/cached-work-targets/README.md): referencias/IDs verificados en cada llamada, actualización directa de reemplazos únicos y reconstrucción para cambios de pertenencia/IDs. 41 pruebas, build, 400 entradas equivalentes y cuatro lotes renderizados con estado/rutas/entregas idénticos. Menor CPU aislada y reducción modesta en pares nativos, sin FPS estable/general acreditado. Se conserva un candidato rechazado por penalizar reemplazos. La comprobación sigue siendo O(N), con metadatos residentes; pendiente GPU sostenida y aceptación amplia.


[Coste de ruido fino medido en finca real](qa/late-farm-fine-noise/README.md): cuatro lotes, 800 muestras CPU/GPU y mismos estados/rutas/entregas. Desactivarlo solo en QA reduce GPU ~61–62→58–59 ms, pero modifica imagen; producción conserva el shader original. Pendiente alternativa barata que conserve detalle, coste GPU restante y aceptación amplia.


[Textura de ruido fino medida en finca real](qa/late-farm-noise-volume/README.md): nueve pruebas dirigidas y cuatro lotes nativos con mismos estados/rutas/entregas. Ahorro GPU de ~1,4 y ~2,4 ms en los pares, con diferencias visuales pequeñas en la captura; sin FPS general, móvil ni RAM en bytes acreditados. Adaptador QA corregido para conservar hooks auditados de profundidad. No se activa en gameplay: pendientes periodicidad/distancias, biomas/culturas/luz/destrucción y coste GPU restante. Campaña de margen viva al día 60, sin resultado terminal.


[Profundidad de la textura de ruido comprobada](qa/late-farm-noise-volume/DEPTH.md): cuatro pares Manglares/Gran Cañón intactos/colapso, sin diferencias en 1,44 millones de píxeles por par ni cambios de estado/materiales preparados. Sigue fuera de gameplay; pendientes otras etapas/poses, biomas/culturas/luz, móvil y coste GPU restante.


[Descarte de cultivos probado como candidato QA](qa/crop-frustum-prototype/README.md): 19 pruebas y cuatro lotes nativos con estados/rutas/entregas iguales. En la vista general no reduce envíos (637 llamadas/5,14M triángulos) y añade trabajo de límites, por lo que no se adopta. Pendientes verificar envolventes GPU de bridges, investigar diferencias estáticas, vistas cercanas/laterales y agrupación espacial con su coste incluido; no marcar optimización de cultivos completa.


[Envolventes de morph verificadas en GPU](qa/crop-frustum-prototype/GPU.md): 16,48 millones de posiciones de 40 originales y 32 bridges con hooks nativos, dentro de tolerancia 1e-4; no prueba todas las combinaciones ni el pipeline completo. [Cuatro lotes con cámara cercana](qa/crop-frustum-prototype/NEAR.md) reducen diez llamadas/0,62 % de triángulos, sin ganancia GPU consistente en los pares. Candidato todavía fuera del producto; pendientes diferencias de imagen, vistas laterales/centradas en cultivos y agrupación espacial/coste.


[Repetibilidad de imagen del descarte de cultivos](qa/crop-frustum-prototype/STATIC.md): dos secuencias A/A/B/B/A con lectura directa de 1,44 millones de píxeles, sin diferencias al pasar original→candidato y repetición completa idéntica. Se conservan diferencias iniciales de 2–10 píxeles sin atribuir su causa. No acredita otras vistas/móvil/FPS; candidato sigue fuera de producción por beneficio pequeño/no consistente. Campaña de margen viva al día 62, sin resultado terminal.


## Protección de cámara en primeros planos (pedido el 6 de octubre de 2026)

- Seguir la [especificación independiente de protección de cámara](camera-close-protection-post-jam.md), junto a distancia de dibujado/impostores/horizonte pero sin confundir sus objetivos.
- Evitar penetraciones y ampliaciones problemáticas con soft collision y volúmenes de exclusión finitos, márgenes contextuales por categoría/modelo y desaceleración suave.
- Conservar360°, desplazamiento, zoom, inclinación y sobrevuelo. No aumentar simplemente una distancia mínima global ni crear columnas/paredes invisibles.
- Fade temporal solo como último recurso; ajustar distancias experimentalmente, revisar varios assets/culturas y medir coste en desktop/móvil.
- Contemplar cámara/objetivo dentro de volúmenes, streaming, construcción/destrucción, Volver/continuar/incursiones y gestos rápidos/simultáneos.

Estado: registrado y pendiente de implementación; abordarlo cuando sea posible sin desplazar prioridades actuales.


[Coste GPU atribuido por pases en finca avanzada](qa/late-farm-pass-cost/README.md): 200 frames y 1.800 queries completas, 13 pruebas dirigidas; contadores reconciliados y mismo estado lógico final. Medianas GPU: dibujo final ~37,6 ms, profundidad VFX ~16,3 ms, sombras ~8,3 ms, cielo ~1,0 ms. Instrumentación QA, sin optimización aplicada/FPS general; siguiente prioridad: categorías/materiales del dibujo y profundidad conservando siluetas y efectos.


[Profundidad alpha reevaluada en finca real](qa/late-farm-alpha-depth/README.md): 13 pruebas, cuatro lotes nativos y 800 queries; mismo estado/rutas/eventos/envíos. GPU ~2,82/~1,14 ms menor pero CPU mayor y RAF sin mejora: solo QA, no se adopta. Cuatro escenas actuales de Manglares/Sabana intactas/colapso conservan profundidad idéntica; color presenta diferencias pequeñas también entre originales. Pendientes integración sin recorrido duplicado, repetibilidad, más estados/biomas/móvil y coste total.


[Preparación de lotes vacíos evaluada](qa/empty-depth-batches/README.md): 22 pruebas y build; cuatro lotes de finca con mismo estado/eventos/envíos y 575 lotes no preparados. CPU integrada/aislada sin ahorro consistente: flag experimental apagado por defecto. Dos estados Manglares/Mapungubwe conservan profundidad idéntica en diez pares; color presenta variación también entre originales. No acredita FPS/móvil ni justifica seguir con ese filtro sin otra hipótesis. Siguiente prioridad: integrar el candidato alpha sin recorrer dos veces y estudiar dibujo final.


[Profundidad alpha integrada en un recorrido](qa/single-pass-alpha-depth/README.md): 26 pruebas y build; cuatro lotes reales con estados/rutas/eventos/envíos idénticos. GPU ~2,86/~2,30 ms menor y RAF ~1,80/~2,35 ms menor en los pares, CPU integrada variable y preparación aislada ~0,41–0,48 ms más costosa por captura. Diez pares Manglares/Mapungubwe intacto/colapso conservan profundidad idéntica; color varía también entre controles. Flag QA apagado por defecto hasta ampliar estados/biomas/efectos/móvil y explicar diferencias históricas. Campaña congelada de margen verificada viva al día 67, sin resultado terminal.


[Alpha comparado con profundidad nativa completa](qa/alpha-native-baseline/README.md): tres rutas N/G/B en seis renders por escena, 28 pares de profundidad idénticos en Manglares intacto/colapso/giro y Gran Cañón intacto. El color coincide en Gran Cañón y sigue variando entre controles en Manglares. El contraejemplo histórico no se reproduce en estas vistas actuales, pero no se explica su causa ni se retira la salvaguarda. Pendientes CPU de preparación, estados/efectos/móvil y repetibilidad de color.


[Compatibilidad de profundidad reutilizada por captura](qa/shared-depth-compatibility/README.md): 28 pruebas y build; CPU nativa aislada ~24–32 % menor con alpha=true en ambas rutas (~0,18–0,27 ms por captura), mismas selecciones y restauraciones. Catorce pares actuales intacto/colapso coinciden en profundidad. Mejora de preparación aplicada sin activar alpha experimental ni filtro de vacíos; no es evidencia de FPS. [Traza de cámara](qa/static-camera-color/README.md) exactamente estable, pero variación de color aún sin causa aislada.


[Contactos nativos de las cinco especies en Gran Cañón](qa/canyon-five-species-contacts/README.md): cinco casos individuales con centro/brote pagados, navegación/daño reales y VFX originales activos; aparición sin descargas GLB ni programas de shader animal adicionales. Se conserva y reejecuta la prueba original de daño al centro (600→580). No acredita cinco ataques en un grupo, noche natural, audio/HUD/móvil ni ausencia de tirón. Pendiente medir shaders VFX del primer golpe y QA-155 completo.


[Primera activación de VFX perfilada](qa/first-attack-gl-profile/README.md): preparar profundidad durante la carga elimina cuatro compilaciones MeshDepth del paso 48. Dos pruebas nativas conservan contacto de cultivo y daño al centro; 32 pruebas/build correctos. Persisten pico de frametime, dos variantes Standard y shaders de polvo/ondas/ataque: precarga incompleta, sin acreditar eliminación del tirón ni móvil.


[Shaders VFX preparados y retenidos durante carga](qa/vfx-shader-preload/README.md): cuatro materiales, sin conservar geometrías/partículas de preparación, ondas de río preparadas sin contactos falsos, recetas/destino reales de profundidad y máscara de daño. Gran Cañón: contacto de cultivo y golpe al centro sin compileShader/linkProgram en las trazas correspondientes; 78 pruebas/build. Sabana mantiene dos variantes Standard y persiste un pico CPU sin compilación. Pendientes otros biomas/culturas/calidades/móvil, costes de memoria/carga y primeras subidas/ejecuciones; no se declara resuelto todo el tirón.


## Textos del guardián con carisma y lore (pedido el 6 de octubre de 2026)

Estado: [integrados y verificados en ES/EN](qa/guardian-copy-v2/README.md). Las 27 parejas coinciden con la referencia; compatibilidad con mensajes guardados anteriores, 54 comprobaciones DOM y nueve layouts con el HUD. No cambia el gameplay. CI completa de esta revisión queda pendiente.

- Sustituir los textos existentes del guardián por los del [JSON bilingüe proporcionado por el usuario](reference/Wild_Guardians_Espiritu_ES_EN_v2.json).
- El archivo contiene 27 sustituciones en español y 27 en inglés: cada clave es el texto anterior y cada valor, la nueva versión. Conservar esta referencia original y comprobar la correspondencia con los textos actuales antes de integrar.
- Aplicar ambas versiones al tutorial, recordatorios, mensajes de victoria/derrota y demás intervenciones del guardián cubiertas por el archivo; mantener las reglas de gameplay, disparadores, tiempos y señalización existentes.
- Verificar cobertura de las sustituciones en ambos idiomas, ausencia de mensajes antiguos o mezclas de idioma y legibilidad de los nuevos textos en móvil y escritorio. Si una clave ha cambiado entretanto, revisar su equivalencia de contexto en lugar de omitirla silenciosamente.

Integración terminada en 834a075; queda pendiente la aceptación móvil completa. JSON original guardado sin modificaciones (18.628 bytes; SHA-256 `c006ad919e24f4031425cd86b32ad4985240498388140f9e9c39b3d115ac0a6f`).


[Diagnósticos de shader adelantados a la carga](qa/first-dust-cpu/README.md): 74 pruebas y build; Gran Cañón conserva contacto de cultivo y daño al centro sin nuevas compilaciones/consultas de logs. Pico CPU del recorrido del facóquero 145,3→24,1 ms máximo en las muestras, sin acreditar FPS/GPU/móvil general. Sabana sigue alcanzando 234,5 ms al compilar dos variantes de agua paintUniforms en profundidad/color. Pendientes localizar su disparador, nuevos residentes/calidades/luz y coste de carga/memoria/aceptación amplia.


[Agua y lava preparadas desde vistas secas](qa/water-shader-preload/README.md): 78 pruebas/build y cinco recorridos preparados. Sabana deja de compilar las dos variantes chunk de agua del paso 77 (254,6→18,1–25,1 ms en muestras); contactos y daño al centro conservados. La repetición registra otro pico de 171,1 ms sin compilaciones: no se declara ausencia general de tirones. Pendientes su causa, RAM/carga, otros estados/calidades/biomas/móvil y coste sostenido de dibujo/profundidad.


[Precarga comprobada en los biomas restantes](qa/preload-biome-coverage/README.md): contactos de búfalo/Gran Río, rinoceronte/Manglares y león/Desierto sin compilar/enlazar durante movimiento. Finca histórica de Manglares con 66 cultivos vivos alcanza daño físico. Nueve pruebas QA correctas; runtime sin cambios. El pico de 171 ms no se reproduce ni queda explicado. Gran Río/Sabana generan un programa de vegetación alpha instanciada durante aparición, fuera de la medición de movimiento; siguiente prioridad preparar esa variante y medir aparición/carga/memoria. Campaña congelada de margen viva al día 73, sin resultado terminal.


[Variante de pantalla de remansos preparada](qa/alpha-appearance-preload/README.md): el programa alpha detectado es el slot 19, remanso con orilla rocosa. Se compilan residentes/LODs con sombras durante carga; Gran Río y Sabana aparecen sin nuevos programas y se conserva daño al centro en Gran Cañón. 79 pruebas/build; primer render de Gran Río 84,8→28,6 ms en muestras, con nueve programas más tras carga/aparición, sin medir bytes/RAM. Capturas difieren en 35/720.000 píxeles, máximo 2/255 por canal; no igualdad exacta/global. Pendientes picos sin compilación, chunks/LOD/batching, carga/memoria, otras combinaciones/móvil y GPU sostenida.


[Recursos de precarga y cierre medidos](qa/preload-buffer-lifecycle/README.md): dos contactos nativos y pérdida real de contexto comprobados; 31 pruebas dirigidas. La preparación libera 98.852 bytes solicitados de buffers en ambas muestras. El saldo tras cierre (2,56/4,18 MB) excluye la liberación implícita del contexto y no acredita una fuga ni RAM total. Pendientes propietarios de prototipos/texturas/cachés, orden de limpieza, ciclos e interrupciones, memoria física/móvil y coste de arranque sin sonda. Runtime sin cambios. Campaña congelada de margen sigue viva al día 75, todavía sin resultado terminal.


[Limpieza de prototipos y cachés corregida](qa/asset-owner-close/README.md): Assets registra los recursos empaquetados y texturas, libera cargas tardías y vacía sus cachés; el mundo cierra cropBatch y assets antes del contexto. Tres contactos nativos dejan cero buffers observados/geometrías y cachés antes de perder contexto; nueve campos lógicos de dos recorridos coinciden con baseline. 83 pruebas/build correctos. Pendientes atribuir cuatro texturas/tres programas restantes, cancelación independiente de NativeSky.load, ciclos completos y RAM física/móvil. Campaña congelada de margen viva al día 76, sin resultado terminal.


[Cancelación de carga del cielo corregida](qa/sky-load-cancel/README.md): AbortSignal propio y guardas antes de decodificar/crear panoramas, cierre idempotente y referencias vacías. 16 pruebas/build; dos cargas reales de WorldScene abortadas en catálogo/HDR sin recursos tardíos y cielo normal con contadores a cero al cerrar. Gran Cañón conserva nueve campos lógicos y limpieza de buffers/cachés. Siguen pendientes otras fases de cancelación/ciclos, cuatro texturas/tres programas del mundo completo y RAM/móvil; campaña congelada de margen viva al día 78, todavía sin resultado terminal.


[Cancelación de fases del mundo protegida](qa/world-phase-cancel/README.md): barreras tras esperas, JSON privado abortable, clones de suelo/barro protegidos y cachés de plantillas/poblados sin resultados tardíos. Cuatro checkpoints nativos y carga normal Manglares; 38 pruebas/build. Pendientes GPU/chunks, ciclos, contadores residuales y RAM/móvil.

[Campaña con defensa pagada fallida](qa/paid-defense-failure-ee25c8c/README.md): sesión 7678/PID 36076 terminó con exit 1, incursión sin finalizar noche 39 en revisión congelada ee25c8c. Estado y procedencia preservados; reproducir sobre main antes de atribuir/afirmar corrección. El informe de victoria inicialmente localizado era histórico dba3b69/PID 39712 y no pertenece a esta ejecución. La campaña de margen PID 20608 sigue viva; último estado observado día 79.


[Densidad lejana decreciente experimental](qa/far-vegetation-density/README.md): selección determinista por ID/semilla, fade progresivo antes de zona fiel y comparación nativa de ocho lotes. Fondo más abierto y menores medianas GPU en este visor; pendiente integración procedural, movimiento, bruma y móvil. Sigue fuera de gameplay.


[Primera consulta de árboles procedurales exactos](qa/far-vegetation-procedural/README.md): Sabana/acacia, mismos IDs/alturas/giros/escalas de los chunks, sin generar geometría ni vegetación pequeña; anclaje y escala anisotrópica en visor. Igualdad completa de generación normal en seis biomas, 73+15 pruebas, build/paquete y render nativo. Pendiente terreno, bruma, streaming/chunks tardíos y móvil; sigue fuera de gameplay.


[Relieve lejano simplificado experimental](qa/far-vegetation-ground/README.md): campo de altura/paleta originales, 28.800 triángulos y error máximo 7,1 cm en 112 bases; ocho pruebas/build/paquete correctos. Comparación nativa muestra coste GPU adicional y generación inicial síncrona de 352,5 ms. Pendientes streaming acotado, iluminación/bruma, agua y transición integrada; continúa fuera del gameplay.


[Generación experimental de paisaje en worker](qa/far-scene-worker/README.md): árboles/relieve originales idénticos, buffers transferidos y loader cancelable; nueve pruebas y build. Dos cargas nativas mantienen callbacks RAF durante el cálculo. Pendientes streaming regional, epochs, chunks reales y aceptación móvil/visual; sigue fuera de gameplay.


[Peticiones regionales del horizonte experimental](qa/far-scene-regions/README.md): única carga activa con epoch/cancelación, residente anterior retenido y reutilización al volver; quince pruebas y cambios regionales nativos sin errores. Árboles de solapamiento idénticos. Pendientes conexión automática a cámara/chunks, preparación GPU, crossfade y aceptación de relieve/móvil; sigue fuera de gameplay.


[Seguimiento regional del foco experimental](qa/far-camera-regions/README.md): regiones simétricas X/Z con histéresis/settling, sin muestreo por frame; veinte pruebas y secuencia nativa órbita/desplazamiento/acercamiento sin errores. Pendientes tiles de anticipación, chunks reales, iluminación/bruma/crossfade y móvil; sigue fuera de gameplay.


[Atlas normal offline candidato](qa/far-normal-atlas/README.md): comparación de una acacia confirma diferencias de sombreado; ocho vistas lineales de normales con misma máscara alpha, WebP 321 kB y verificación de fuentes. Pendientes conexión experimental, transformación anisotrópica/renormalización, A/B visual y coste GPU/móvil antes de adoptarlo. Sigue fuera de gameplay.


[Atlas precocinados día/noche](qa/far-prelit-atlas/README.md): petición del usuario del 6 de octubre, sustituye preferencia inicial de atlas sin fases. Ocho vistas con shader real por fase, 484 KiB WebP en total. Ruta precocinada omite normales/iluminación, mezcla extremos y conserva fog/dither; 28 pruebas y comparación nativa GPU. Pendientes coincidencia de luz con giros/elevación, GPU crepúsculo, integración con chunks y móvil.

[Bruma residual y giros del prototipo](qa/far-prelit-transition/README.md): niebla existente compartida, rangos configurables y comparación de árboles a 90° con escala anisotrópica y 180°. Retención de modelo tardío y llegada al modelo próximo comprobadas en visor; ocho lotes GPU con los mismos programas/texturas/calls. Persisten diferencias de silueta/sombreado; no aceptación visual completa ni integración en gameplay.


[Atlas con orientaciones respecto al sol fijo](qa/far-prelit-rotations/README.md): ocho orientaciones × ocho vistas × dos fases horneadas con el shader real, mezcla de ambas dimensiones, 30 pruebas y comparación nativa. Par WebP 3.50 MiB; memoria RGBA+mips estimada 42.67 MiB. Pendientes resolución 128, GPU crepúsculo, comparación de interpolación/discreto y aceptación integrada. Corregida también vista/anclaje anisotrópicos del prototipo. El sol del juego no orbita: advertencia anterior sobre sol variable no aplicaba.


[Límites de origen desde materiales únicos](qa/origin-material-registry/README.md): eliminado un recorrido completo de escena por frame, con metadatos vivos y fallback. Doce pruebas/build y dos escenas nativas Manglares/Gran Cañón conservan referencias y restauración. Sin medición de frametime/GPU ni aceptación móvil; sigue pendiente el coste integrado de render.


[Contraejemplo alpha de Volcanes](qa/alpha-volcano-counterexample/README.md): tres secuencias nativas reproducen tres píxeles de profundidad distintos en B2 frente a B1/nativo. Candidato desactivado; corregido resumen QA para considerar todos los pares (22 pruebas). Pendiente atribuir causa, no se declara equivalencia ni mejora de rendimiento.


[Primera rotura de mampostería](qa/sfx-first-masonry-crack/README.md): SFX 042 conectado al primer daño real de piedra/adobe/reforzado, con prioridad crítica, posición y guardas de ciclo de vida. 139 pruebas dirigidas y build/verificadores correctos. Catálogo 90 asignados/36 pendientes; escucha y mezcla móvil pendientes.


[Traza nativa del contraejemplo alpha](qa/alpha-depth-submission-probe/native/README.md): dos secuencias 1600×900 conservan tres píxeles distintos respecto al shader nativo; B1/B2 presenta los mismos 67 envíos y profundidad. A 1280×720 coincide. El filtro de props no modifica dibujos visibles y no identifica la causa. Se documenta también un timeout de precarga; no hay equivalencia ni mejora de rendimiento acreditadas y el candidato sigue desactivado.


[Recetas alpha y localización de píxeles](qa/surface-alpha-mip-recipe/README.md): compartido sesgo mip nativo del follaje y separadas claves de shader para superficies sólidas/follaje. 41 pruebas/build y candidatos nativos de la misma cara/instancia. La discrepancia de tres píxeles persiste: no se atribuye a estos defectos ni se activa alpha especializado. Pendientes cobertura efectiva y aceptación visual amplia de variantes.


[Caché experimental de recetas de cultivo](qa/crop-stage-sample-cache/README.md): buffers equivalentes, pero coste CPU mixto en ABBA sintético; candidato archivado y producción sin modificar. Pendiente reducir coste activo y comprobar memoria/frametime antes de adoptarlo.


[Tuplas temporales de cultivos reutilizadas](qa/crop-instance-scratch/README.md): 32 pruebas y build correctos; cinco casos CPU aislados con buffers idénticos. Maduras: mediana aproximada 0,55 a 0,26 ms para 1.200 plantas, sin mejora amplia de FPS acreditada. Pendientes GC/RAM y coste integrado/móvil.


### Integración optativa de impostores en seis biomas

La rama de integración añade 22 especies con 44 atlas offline de día/noche y sol fijo, selección determinista lejana, bruma, suelo regional lavado y backdrop 2D por bioma. `WorldScene.load(..., {farVegetation: options})` permite probarlo; su valor por defecto continúa siendo `false`. El experimento `compact=trees` acorta props nativos y conserva terreno exacto, picking y límites lógicos de incursión. [Evidencia, variantes y límites](qa/far-biome-integration/README.md).

No dar por aprobada la activación: la deriva ABBA no acredita un ahorro GPU sólido; el fondo bajo de Sabana y la simplificación visible de árboles próximos necesitan otra ronda visual. Falta validar movimiento lento, transiciones/chunks tardíos, shoreline distante, móvil/memoria real y otras culturas. La integración optativa no equivale a cerrar esos criterios.
[Usos de imágenes distribuidas completos](qa/image-display-classification/README.md): 225 entradas, cero desconocidas y cero errores. Preflight actual: 95 candidatas de color, 45 de revisión y 22 variantes integradas; SVG y prueba de soporte WebP preservados. No son nuevas conversiones ni ahorro; pendientes API/aceptación, perfiles y mapas embebidos.


[Manos, Espíritu y logo Tinify integrados](qa/tinify-tutorial-menu/README.md): ocho imágenes, alpha/dimensiones exactos, 64 pruebas y treinta alias cargados en ruta anidada. 821.936 bytes menos en imágenes; paquete neto 812.161 bytes menor. Quedan 87 candidatas de color/45 de revisión, mapas embebidos y aceptación móvil/Tauri.

## Tarjetas de eventos y voces del espíritu (pedido el 7 de octubre de 2026)

Estado: integrado en main mediante [PR #5](https://github.com/dossijeo/wild-guardians-africa/pull/5), merge d048270, verificado en GitHub. Incluye 54 voces originales y tarjetas recuperadas; 112 pruebas dirigidas del subagente, revisión raíz y [recorrido real hasta mediodía](qa/spirit-game-first-day/README.md). [Evidencia y límites](qa/spirit-voices-event-cards/README.md). Validate game y Windows de d048270 pasan; [prueba nativa de Windows](qa/windows-ci-d048/README.md). Siguen pendientes escucha/mezcla de todas las voces, aceptación móvil física y recorrido completo hasta la primera incursión. No publicar en itch.io hasta autorización posterior.

- Recuperar las tarjetas de evento tipo toast con icono y barra de auto hide del lab `Wild_Guardians_HUD_Lab_Contratacion_Diaria.html`. Respetar el área segura del HUD y los layouts móviles; mantener cierre manual y evitar duplicar eventos ya explicados por el tutorial.
- Integrar las voces del nuevo `Wild_Guardians_Spirit_Voice_Lab_V9_UnityStereo.html`, adjunto del usuario, con los textos ES/EN ya integrados desde `docs/reference/Wild_Guardians_Espiritu_ES_EN_v2.json`. Conservar la correspondencia texto/idioma/audio original del lab.
- Reproducir la voz mientras se muestra su texto. Al finalizar realmente el audio, avanzar automáticamente al siguiente mensaje o cerrar si es el último. Si el jugador salta o cierra, detener inmediatamente esa voz; evitar audios superpuestos, eventos ended tardíos y reproducción de mensajes anteriores.
- Conservar la guía por manos 2D/3D y sus requisitos de acción: terminar una voz no debe dar por hecha una acción que el jugador aún no ha realizado. Validar autoplay bloqueado, errores de carga, pausa/cambio de idioma, cierre del juego y limpieza de recursos.
- Mantener rutas relativas, formato Opus del lab y la carga/descodificación limitada a voces necesarias; comprobar sincronización, ambos idiomas, móvil landscape/portrait y paquete web anidado. Adjuntar evidencia visual/audio y regresiones en la PR.


[Recogida física de caja — SFX 117](qa/sfx-crate-pickup/README.md): contacto nativo de tarea crate, separado del SFX 026 al caer y del ingreso al entregar. 67 pruebas/build/paquete correctos; fixture de navegador con decodificación Opus, caída/recogida/entrega única y limpieza. Catálogo actual: 91 asignados/35 pendientes. Prueba silenciada y sin mundo 3D; escucha/mezcla y aceptación móvil pendientes.


[Cosecha y primera noche en el juego real](qa/game-harvest-first-night/README.md): continuación Sabana/Mapungubwe, tarea automática al madurar con saldo sin ingresar, entrega única posterior, facóquero visible con autocentrado y recordatorio de escudo sin toast duplicado. Amanecer día2 con contratación automática y cuatro retratos visibles. 13 pruebas/build/paquete; diagnóstico solo DEV. No acredita visualmente todo el transporte, protección con escudo, Gran Cañón, móvil físico ni campaña intensiva.


[Candidato de posiciones de lote de cultivos descartado](qa/crop-origin-update-candidate/README.md): evita sets de 72 meshes con origen estable, pero ocho lotes CPU A/B/B/A de 128 y 1200 plantas muestran beneficio mixto y p95 mayor durante crecimiento heterogéneo grande. Buffers iguales y ocho pruebas de subida correctas; producción sin cambios. Pendiente optimización del trabajo activo con evidencia integrada, GPU y móvil.

[Reembolso de muralla — SFX 114](qa/wall-refund-audio/README.md): ingreso sonoro únicamente tras una devolución positiva confirmada; conserva demolición, sin duplicar ventas ni modificar el saldo. 31 pruebas dirigidas, build y verificación de los 126 Opus. Catálogo actualizado: 95 asignados/31 reservados; escucha y aceptación móvil pendientes.

[Pago de jornales — SFX 115](qa/payroll-audio/README.md): gasto sonoro tras contratación inicial o proporcional confirmada con coste positivo; vacías, rechazadas e históricas no producen gasto. 26 pruebas dirigidas, build, paquete y hashes de los 126 sonidos correctos. Catálogo actual: 96 asignados/30 reservados. Reproducción nativa, escucha y aceptación móvil pendientes.

[Toque guiado del HUD — SFX 093](qa/sfx-guided-hud-touch/README.md): asignado a Construir/Cultivar cuando la mano 2D indica realmente ese botón, una vez por acción y partida. 35 pruebas dirigidas, reproducción nativa Opus silenciada y build/paquete correctos. Catálogo vigente: 97 asignados/29 reservados. Pendientes escucha/mezcla física y aceptación del contexto guiado en el juego completo.

## Decisión de integración de impostores — 7 de octubre de 2026

El usuario ha revisado los benchmarks y acepta el sobrecoste observado como proporcionado a los sprites añadidos. Se avanza a un perfil integrado con una ligera reducción configurable de distancia 3D, comprobando el coste conjunto. El delta del piloto a 220 m ya no bloquea por sí solo la implementación. Conservar zona cercana exacta, transición fiel por identidad/escala y precarga, densidad determinista decreciente en zona muy lejana y backdrop/bruma que mantengan el paisaje abierto. El primer perfil integrado es Sabana; su evidencia no acredita otros biomas. Revisiones visuales y regresiones siguen necesarias, sin exigir eliminar todo el sobrecoste aceptado. Subagente en rama aparte, PR y revisión/merge posterior según autorización existente.

[Perfiles de CPU de fincas archivadas](qa/late-farm-cpu-profile/README.md): tres estados históricos con terreno y navegación nativos, cincuenta ticks por caso y perfiles V8 completos. Separan búsquedas iniciales de rutas del trabajo posterior de simulación; no acreditan FPS ni campañas actuales. Pendiente aislar recorridos históricos y trabajo de plantas vivas con comparación de estados idénticos antes de modificar producción.

[Auditoría espacial del ruido fino experimental](qa/noise-volume-spatial/README.md): 4.096 muestras deterministas por región, cuantización interior acotada y campo envuelto continuo. Fuera del primer bloque cambia la realización analítica; pendiente revisión visual recorriendo varios periodos y cruzando coordenadas negativas/origen antes de promover el candidato. No cambia el shader del juego ni acredita un nuevo ahorro de frametime.

[Candidatos adicionales de historial no promovidos](qa/crop-history-followups/README.md): el índice para paseo inactivo no se ejercita durante 130 s de continuación nativa ocupada; la resolución FIFO por ID conserva todos los estados/entregas en 36 lotes, pero sus tiempos son mixtos entre tres fincas. Producción sin cambios; priorizar el coste integrado de render antes de añadir otra caché sin beneficio consistente.

[Caché de rutas fallidas con expulsión acotada](qa/navigation-failure-capacity/README.md): al alcanzar 50.000 entradas ya no borra todo el conjunto por una consulta nueva; expulsa solo la más antigua. 83 pruebas, build/paquete y paridad por paso en 100 ticks de Gran Cañón. Ese recorrido no alcanza el límite; sigue pendiente atribuir el atasco de la campaña grande distinguiendo rechazo de altura/punto de riego y fallos de navegación.

[Reparación de cultivos/trabajadores para FrontSide](frontside-model-repair-post-jam.md): encargo delegado en rama independiente, Blender headless/Python, originales conservados y pilotos representativos antes de ampliarlo. El usuario autoriza también modelos derivados hechos para FrontSide, conservando los mismos criterios. Requiere conservación de rigs/morphs/UV/comportamiento, comparación automatizada multivista y ganancia GPU suficiente. Ningún candidato aceptado ni activado; PR, revisión/merge y activación controlada posteriores condicionados a esa evidencia.

[Exclusión nativa de dibujos de profundidad](qa/alpha-depth-draw-exclusion/README.md): main `65fb9114`, Volcanes/Mapungubwe 1280×720 reproduce 12 píxeles distintos en B1/B2 con 67 envíos iguales. Excluir 67 meshes identifica participación de dos superficies alpha en ocho sondas, corroborada por candidatos CPU de instancias 0/4. Control nativo estable en esas sondas y nueve pruebas correctas; especie y causa sin acreditar. Alpha especializado continúa desactivado, sin evidencia de mejora GPU.

[Sonda WebGL por dibujo alpha](qa/alpha-depth-gpu-state/README.md): main `307b8dc9`, mismo encuadre, siete píxeles distintos frente al candidato y controles nativos iguales. Grupo `18:2` identificado; textura, bindings comunes, matrices/alpha y pipeline registrado coinciden. B1/B2 estable en esta repetición; causa aún pendiente. Doce pruebas correctas; consultas sincronizantes sin valor de benchmark. Validate y Windows de `65fb9114` terminan success, incluidos WebView2 y minimizar/restaurar.

[Invariancia de proyección/UV descartada como solución suficiente](qa/alpha-depth-invariance/README.md): dos variantes solo QA, 29 pruebas correctas. Position conserva siete píxeles distintos; position+UV coincide inicialmente pero dos repeticiones vuelven a diferir en siete. Controles nativos estables; no activación ni causa probada. Pendiente contenido de buffers y estado inicial/repetido, sin asumir igualdad de bytes a partir de bindings iguales.

[Diagnóstico de reservas de riego](qa/watering-route-diagnostics/README.md): observador QA distingue altura/alcance, destino bloqueado y ruta fallida sin muestras extra ni modificar la simulación. 24 pruebas y paridad completa por paso en checkpoints históricos de Gran Cañón y Gran Río. No reproduce todavía el atasco del día 76; producción intacta, pendiente checkpoint representativo.

[Checkpoints de colas bloqueadas](qa/intensive-blocked-checkpoints/README.md): nuevas campañas conservan el primer y el mayor backlog capturado, con estado completo/contexto/hashes y límites de frecuencia. 16 pruebas, dos jornadas nativas con paridad por tick y CLI normal aprobadas; esos recorridos no dispararon capturas. Las campañas vivas siguen congeladas; falta reproducir un atasco real a partir de uno de estos recibos.

[Montañas HQ: altura y muestreo del atlas](qa/hq-mountain-elevation-lod/README.md): 438 poses nativas sin errores ni cambios lógicos. Gran Cañón a altura intermedia permite revisar la nueva silueta de día/noche; la vista muy elevada no representa el encuadre final. Ocho capturas seleccionadas de Sabana, también con buffer 320×180, muestran estimaciones de LOD inferiores a la zona de mezcla entre celdas. No acredita todos los píxeles/poses, niveles reales del driver, estabilidad temporal, móvil físico ni política definitiva de mipmaps. Pendientes composiciones de cuatro siluetas por bioma y validación integrada antes de promover assets públicos.

[Gran Río con cuatro montañas HQ](qa/hq-mountain-river-four/README.md): 146 poses día/noche sin errores ni cambios lógicos; ocho capturas seleccionadas revisadas. Relieve variado y abierto, bases integradas con bruma y tono nocturno coherente. Atlas de 737.754 bytes, una textura/sampler; no es un benchmark GPU ni aprobación de todos los encuadres. Pendientes los otros biomas con cuatro siluetas y la integración pública.

[Manglares/Volcanes con cuatro montañas HQ](qa/hq-mountain-mangrove-volcanoes/README.md): 292 poses día/noche, 16 capturas y desplazamiento nativo de 20m en Volcanes. Manglares conserva horizonte discreto y abierto. Volcanes necesita corregir puntas horizontales superpuestas en los flancos, especialmente visibles contra el cielo nocturno; candidato no aprobado aunque el export y GL sean correctos. Evidencia negativa conservada y revisión delegada al autor de los assets.

[Desierto/Gran Cañón con cuatro montañas HQ](qa/hq-mountain-desert-canyons/README.md): otras292 poses día/noche y16 capturas. Desierto mantiene perfiles detallados y abiertos. En Gran Cañón tres orientaciones muestran mesas, pero la cuarta queda oculta; además un pan de20m desplaza verticalmente el fondo19m por seguir la altura local bajo la cámara. Corregir anclaje/composición y verificar recorrido ida/vuelta antes de aprobar la integración.

[Recorrido directo de obstrucciones](qa/obstruction-traversal/README.md): candidato con menos listas temporales, 1600 frames de equivalencia exacta y ocho lotes alternados por escenario. No demuestra mejora consistente y empeora el P95 móvil en la muestra de 49 chunks; no se promueve al runtime. Evidencia y reproducción conservadas, sin atribuir resultados a GPU/FPS ni a una causa concreta de la variabilidad.

[Volcanes HQ v2 y datum estable de Cañón](qa/hq-mountain-repaired/README.md): ocho vistas de volcanes regenerados con imagegen, revisadas de día/noche sin los cortes anteriores; atlas de 718.398 bytes. Cinco recibos verificados de Cañón mantienen anchorY2.36 en pan +20/−20 y elevación80→100→80. Pendientes cuarta silueta de Cañón, recorrido continuo, benchmark e integración pública/PR; no acredita aún coste GPU ni móvil.

[Coste HQ y recorrido continuo](qa/hq-mountain-cost-path/README.md): ABBA nativo de Sabana, 480 muestras GPU válidas; mediana14,629ms anterior frente14,118ms HQ en este encuadre, mismas54 llamadas. CPU7,1→7,3ms con campañas activas, sin promesa general de FPS. Cañón161poses confirma datum2,36 fijo y estado lógico intacto. Cuarta silueta sigue invisible en120/180m; alpha/composición confirma cima bajo meseta y se corrige individualmente con imagegen antes de PR.

[Sabana/Suajili: cien noches terminadas](qa/intensive-sabana-suajili-e461b550/README.md): tercer caso de la matriz congelada e461b550, 100 noches/victoria, ocho cultivos, hasta1.460 plantas vivas y cuentas exactas. Archivo completo auditado en main, resumen idéntico; no es replay de navegación actual. Inactividad de estrategia19,92% diurno pendiente de reducir. El padre avanzó a Musgum sin reiniciar; Gran Cañón sigue independiente.

[Sabana/Musgum: cien noches terminadas](qa/intensive-sabana-musgum-e461b550/README.md): cuarto caso congelado, victoria con hasta 1.551 plantas vivas y cuentas exactas. Archivo auditado y resumen idéntico en main; inactividad diurna 20,283% pendiente de reducir. El padre avanzó a Etíope; no es replay de main actual ni aceptación de toda la matriz.

[Contenido de buffers GPU alpha](qa/alpha-depth-buffer-content/README.md): dos secuencias nativas copian los buffers completos del afloramiento volcánico. Hashes estables de posición/UV/instancias/visibilidad/índices mientras persisten siete píxeles de profundidad distintos. No aceptar alpha experimental; investigar evaluación/rasterización del shader. No es benchmark ni prueba de texels/propiedad exclusiva del fragmento.

[Cuarta silueta HQ de Gran Cañón corregida](qa/hq-canyon-d-v2/README.md): cuatro capturas raíz verificadas, azimut275°, elevaciones80/120m día/noche. D-v2 aparece sobre la meseta y conserva relieve detallado/valles abiertos, datum2,36 y GL0. Atlas826.140bytes; fuentes1f9acab5. Desbloquea preparación de integración pública/PR; quedan aceptación temporal/móvil y coste de los demás biomas, sin extrapolar el benchmark de Sabana.

[Cachés acotadas de terreno y segmentos](qa/navigation-query-capacity/README.md): expulsión FIFO de una entrada en lugar de vaciar 50.000/100.000 respuestas al llenarse. 38 pruebas, build/paquete y paridad completa en100ticks nativos de Cañón. Ensayo de capacidad artificial con consultas nativas conserva respuestas y reduce258→2recálculos por lote; no demuestra frecuencia de overflow ni mejora de FPS en gameplay. Invalidación geométrica preservada.
