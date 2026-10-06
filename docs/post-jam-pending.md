# Tareas pendientes posteriores a la Jam

## Barrido completo del catálogo SFX (pedido el 5 de octubre de 2026)

- Revisar los 126 efectos sonoros del catálogo y registrar para cada ID sus acciones asignadas y puntos de reproducción.
- Identificar efectos sin asignar y completar su vinculación a la acción correcta, respetando el catálogo y los labs de referencia.
- Verificar la reproducción en el juego: condiciones de activación, ausencia de disparos fuera de contexto, repeticiones indebidas y duplicados.
- Comprobar precarga, rutas relativas y liberación de recursos; mantener las optimizaciones de audio existentes.
- Dejar una matriz de cobertura y pruebas reproducibles antes de marcar la tarea como terminada.

Estado: inventario de los 126 efectos registrado en [la matriz de cobertura](qa/sfx-catalog-post-jam/inventory.md): 82 tienen asignaciones de código y 44 siguen sin asignar en gameplay. Los bytes originales de todos coinciden por hash. [SFX 121/122 verificados](qa/sfx-structure-alerts/README.md): primer daño a un centro por incursión y transición de muralla a estado crítico, con avisos agrupados. [SFX 120 verificado](qa/sfx-raid-arrival/README.md): primera entrada física en la finca, una vez por incursión. Pendientes: revisar contextos, completar usos compatibles y verificar reproducción/escucha; la matriz no acredita estos pasos.

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

Estado: [inventario inicial medido](qa/image-inventory/README.md): 225 imágenes distribuidas (162 independientes y 63 embebidas), 219.365.411 bytes codificados y seis pruebas de clasificación correctas. Quedan 107 usos sin clasificar, conversión/optimización y aceptación visual; no se han enviado imágenes a Tinify.

## Vegetación lejana mediante impostores (pedido el 5 de octubre de 2026)

- Seguir los 25 puntos de [Wild Guardians — Far Vegetation Impostor System](far-vegetation-impostor-system.md).
- Objetivo principal: poblar el horizonte y reducir el popping más allá de los chunks, con datos procedurales deterministas ligeros y sin cargar GLB/chunks completos para árboles lejanos.
- Primera prueba aislada: un árbol de Sabana, atlas precalculado de ocho vistas, billboard cilíndrico, orientación procedural conservada, transición con dithering, iluminación día-noche y fog.
- Validar rotación, aproximación bidireccional, desplazamiento lateral, cuatro fases de luz y horizonte con cientos/miles de instancias; medir CPU/GPU/RAM y tamaño distribuido.
- Integrar los demás biomas y estudiar una segunda fase solo después de superar los criterios visuales y de coste. Distancias, densidad y resolución configurables; los ejemplos no son valores definitivos.

Estado: pendiente de prototipo aislado; esta anotación no genera atlas ni activa el sistema en gameplay.

## Ritmo económico con restricciones de fluidos reactivadas

La [campaña nativa de Manglares/Saheliana sobre 7a14cb9](qa/intensive-mangrove-shield-100/README.md) termina 100 noches con victoria, pero registra 58,17 % de tiempo diurno sin acciones disponibles: 15.455 segundos por presupuesto y 1.995 al final de turno. El flujo operativo neto es solo 403 monedas en cien noches.

[Diagnóstico de cinco campañas](qa/farm-margin-baseline/README.md): márgenes de solo 0,3–1,8 % e inactividad diurna del 58–64 %, con un candidato de ingresos derivado de entregas exactas y pérdidas desproporcionadas de algodón/plátano identificadas. [Primer ajuste de ingresos aplicado](qa/harvest-margin-candidate/README.md), con 173 pruebas correctas y derrota por mala gestión preservada. Pendiente: medir cien noches con este ajuste y revisar los parámetros reales del juego para permitir expansión rápida y reducir la inactividad, con la estrategia responsable preservada y ensayos de mala gestión que todavía puedan perder. La victoria aislada no satisface la petición de ritmo/actividad del usuario. La estrategia responsable y sus registros anteriores se conservan; el ajuste todavía no acredita el ritmo solicitado.
