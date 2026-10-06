# Cobertura de precarga y diagnóstico de framebuffer

Runtime 95cb9d2, sin cambios de producción. Continúa [agua/lava preparadas](../water-shader-preload/README.md). Nuevos casos para Gran Río, Manglares y Desierto; no sustituyen las limitaciones de las pruebas previas.

## Contactos renderizados

IAB desktop, seed 712, Mapungubwe, calidad media. Centro/brote pagados, contratación inicial de cero y spawn controlado; navegación, movimiento, daño y VFX originales. Se detiene en el primer contacto real, sin completar incursión/noche ni campaña. Los tres actores están listos, tienen meshes visibles y cajas dentro del frustum al contacto; esto no prueba ausencia de oclusión ni visión completa desde cualquier cámara.

| Caso nuevo | Pasos de 50 ms | CPU máxima world.render | Compilar/enlazar durante movimiento | Logs durante movimiento |
| --- | ---: | ---: | ---: | ---: |
| Sabana / hiena, framebuffer | 523 | 30,7 ms | 0 / 0 | 0 |
| Gran Río / búfalo | 523 | 33,0 ms | 0 / 0 | 0 |
| Manglares / rinoceronte | 228 | 23,8 ms | 0 / 0 | 0 |
| Desierto / león | 416 | 25,4 ms | 0 / 0 | 0 |
| Gran Río / búfalo, aparición asentada | 523 | 28,1 ms | 0 / 0 | 0 |

Todos terminan ok:true, sin errores ni esperas por actores durante el movimiento. Conservan siete descargas GLB antes/después de aparición y cero programas nuevos del material de animales. Se suman a las pruebas previas de Sabana, Volcanes y Gran Cañón sobre el mismo runtime, pero no acreditan todas las especies en cada bioma, otras culturas/calidades o móvil físico. La comparación de campos lógicos/renderizados de Sabana con thin-savanna coincide en todos los campos conservados por proof.json.

## El pico sin compilación no se reproduce aquí

submission=1 activa únicamente QA: relojes inclusivos en cambios de target, clear, tamaño de target y matrices de cámara. La prueba verifica argumentos, receptores, propiedad de métodos, restauración y ausencia de estas envolturas adicionales por defecto. No hay tiempos GPU ni exclusividad de coste; las filas se solapan.

En los 523 frames de Sabana, depthTarget.setSize no se llama; target.depth/target.screen y gl.bindFramebuffer tienen máximos de 0,2 ms, gl.clear 0,3 ms y actualización de matriz de cámara 0,1 ms. El máximo world.render es 30,7 ms. El pico previo de 171,1 ms no aparece en esta ejecución: no se atribuye a reallocación, framebuffer, GC, driver o instrumentación sin evidencia nueva. No se retira el contraejemplo.

## Programa nuevo antes del movimiento

Sabana y Gran Río registran un programa nuevo en after.newPrograms, antes de arrancar el observador por frame; Manglares y Desierto no lo registran. Los animales conservan sus programas. Por ello, cero compilaciones durante movimiento no demuestra cero compilaciones al aparecer la incursión.

Gran Río se repite con timing=1: 24 frames de asentamiento, espera de chunks, 24 baseline y 60 de aparición, sin ticks adicionales del juego. Persiste un programa nuevo que usan meshes Standard instanciados con alphaTest=0.35 y metadatos nativeLodBatch/nativeLodLevel. Su primer render después de enfocar el spawn tarda 103,2 ms; el siguiente 9,7 ms. CPU baseline mediana 7,4 ms y aparición 8,5 ms; intervalos RAF medianos ~33,2 ms. Son datos de una ejecución con cámara/región cambiadas, no un A/B de coste exclusivo del shader ni aceptación de FPS.

Siguiente acción: identificar la variante exacta de vegetación/LOD y prepararla conservando sus propietarios y recetas, medir aparición con la misma cámara/estado, y comprobar costes de carga/memoria. No afirmar eliminado el tirón por disponer solo de material animal precargado.

## Finca poblada

Se ejecuta también el visor existente populated-raid en Manglares, muy baja, cargando el snapshot histórico de la primera noche naturalmente alcanzada (6ffc0ef), con 66 cultivos vivos y seis contratos pagados. Se reutiliza su plan original con un facóquero, sin editar reloj, daño o saldo, y con preparación nativa de entrada en worker. Avanza 103 ticks de 50 ms hasta CropHit real en plant-98. CPU máxima de Game.tick 6,2 ms; saldo 362→362, sin errores. Preparación 707,4 ms y spawn 4,8 ms; no son GPU ni frametime.

Los seis trabajadores ya estaban home en el snapshot: esta prueba no demuestra trabajadores 3D activos simultáneos con animales ni QA-155 completo. Es una reproducción de guardado histórico sobre runtime actual, sin audio/HUD ni interacción continua de jugador, no una campaña actual ni noche completa. Se conserva el reporte y la captura del primer daño.

## Verificación y procedencia

Nueve pruebas dirigidas correctas (209,97 ms) de observadores CPU/GL, incluyendo el nuevo modo framebuffer opcional, restauración y fallos. No hay cambio de runtime ni nueva afirmación de build. Los informes completos se leen del DOM y se guardan como gzip con hashes de bytes comprimidos/descomprimidos; fuentes exactas, referencias y capturas nativas están en esta carpeta. paid-manglares es JSON pequeño sin comprimir. Se comprueba por bytes que scene.txt coincide con la fuente probada en water-shader-preload.

Las dos campañas congeladas se comprobaron vivas por proceso. La de margen c04c069/Manglares-Saheliana había alcanzado el día 73, sin resultado terminal; sus fuentes congeladas no prueban el HEAD actual. Faltan aparición completa, pico sin compilación, culturas/calidades, retirada/colapsos/HUD/audio/móvil y aceptación amplia.
