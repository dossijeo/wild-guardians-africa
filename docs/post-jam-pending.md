# Tareas pendientes posteriores a la Jam

## Barrido completo del catálogo SFX (pedido el 5 de octubre de 2026)

- Revisar los 126 efectos sonoros del catálogo y registrar para cada ID sus acciones asignadas y puntos de reproducción.
- Identificar efectos sin asignar y completar su vinculación a la acción correcta, respetando el catálogo y los labs de referencia.
- Verificar la reproducción en el juego: condiciones de activación, ausencia de disparos fuera de contexto, repeticiones indebidas y duplicados.
- Comprobar precarga, rutas relativas y liberación de recursos; mantener las optimizaciones de audio existentes.
- Dejar una matriz de cobertura y pruebas reproducibles antes de marcar la tarea como terminada.

Estado: inventario de los 126 efectos registrado en [la matriz de cobertura](qa/sfx-catalog-post-jam/inventory.md): 79 tienen asignaciones de código y 47 siguen sin asignar en gameplay. Los bytes originales de todos coinciden por hash. Pendientes: revisar contextos, completar usos compatibles y verificar reproducción/escucha; la matriz no acredita estos pasos.

Las ondas de pisadas en el agua del Gran Cañón son **VFX**. El usuario autorizó después vincular el SFX 012 (Pasos barro) a dichas pisadas y el SFX 006 (Agua de río) al ambiente del río; esta asignación concreta no sustituye el barrido completo pendiente.

## Recompresión de audio a Opus (pedido el 5 de octubre de 2026)

- Abordar junto con el barrido SFX la conversión de los 126 efectos y de toda la banda sonora a `.opus`, a partir de los originales disponibles para evitar pérdidas acumuladas.
- Comparar tamaño y calidad; preservar duración, canales, volumen, transitorios, puntos de bucle y sincronización de contactos/animaciones.
- Adaptar catálogos, rutas relativas, precarga, caché en disco y streaming de ventanas musicales; verificar búsqueda temporal y transiciones sin cargar o descodificar pistas inactivas.
- Probar decodificación y reproducción en la versión web de itch.io, Chrome móvil y Windows/Tauri antes de sustituir los recursos distribuidos.
- Registrar ahorro total y por archivo, parámetros de conversión y pruebas de regresión; conservar los originales fuera del paquete de distribución.

Estado: pendiente; no se han convertido audios por esta anotación.

## Imágenes WebP y Tinify (pedido el 5 de octubre de 2026)

- Inventariar todas las imágenes del juego, incluidas HUD, menús, retratos, texturas y referencias internas de modelos; convertirlas a WebP y optimizarlas mediante la API de Tinify.
- Seguir la [referencia HTTP oficial](https://tinify.com/developers/reference/http): subida por HTTPS a `/shrink` y conversión con `convert.type: image/webp`. Controlar cuota, errores y reintentos; reutilizar resultados por hash para evitar conversiones repetidas.
- Usar la credencial facilitada por el usuario mediante configuración privada o variable `TINIFY_API_KEY`; nunca incluirla en Git, assets del navegador, capturas, informes ni logs.
- Conservar dimensiones, transparencia y orientación. Revisar específicamente mapas de datos del shader, normales y máscaras para evitar artefactos de compresión o cambios de espacio de color.
- Actualizar todas las referencias y verificar carga completa de HUD/contratación, culturas, biomas y modelos, además del paquete de itch.io y Windows.
- Comparar imágenes y tamaños antes/después; documentar cualquier caso que requiera WebP sin pérdida para preservar el resultado del juego.

Estado: pendiente; no se han enviado imágenes a Tinify por esta anotación.

## Vegetación lejana mediante impostores (pedido el 5 de octubre de 2026)

- Seguir los 25 puntos de [Wild Guardians — Far Vegetation Impostor System](far-vegetation-impostor-system.md).
- Objetivo principal: poblar el horizonte y reducir el popping más allá de los chunks, con datos procedurales deterministas ligeros y sin cargar GLB/chunks completos para árboles lejanos.
- Primera prueba aislada: un árbol de Sabana, atlas precalculado de ocho vistas, billboard cilíndrico, orientación procedural conservada, transición con dithering, iluminación día-noche y fog.
- Validar rotación, aproximación bidireccional, desplazamiento lateral, cuatro fases de luz y horizonte con cientos/miles de instancias; medir CPU/GPU/RAM y tamaño distribuido.
- Integrar los demás biomas y estudiar una segunda fase solo después de superar los criterios visuales y de coste. Distancias, densidad y resolución configurables; los ejemplos no son valores definitivos.

Estado: pendiente de prototipo aislado; esta anotación no genera atlas ni activa el sistema en gameplay.
