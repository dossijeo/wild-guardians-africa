# Manglares: mezcla de barro y musgo

**Conservar como candidata visual, sin integrar.** La frontera se incorpora al suelo mucho mejor que el recorte irregular descartado. El interior cambia también de iluminación: aparece más claro y húmedo, con brillo visible. Falta juzgar/ajustar esa respuesta y medir coste GPU; no se aprueba todavía la receta completa.

## Implementación QA

El parche mantiene posiciones, índices, UV y contornos autoritativos. Interpola color y normal del terreno bajo los vértices visuales del barro, añade una distancia a su contorno y sustituye solo su material por la ruta de suelo AfricanToon/BiomeGround. Entre0,05 y0,85m hacia el interior mezcla color, normal, rugosidad y AO con los mapas existentes del barro. No hay discard ni alpha blending. La misma iluminación y sombras procesan ambos lados de la mezcla; no se dibuja una pasada extra.

Usa los recursos ya cargados. El material de suelo del parche recibe tres samplers de barro adicionales; esto no significa coste cero ni tres lecturas extra respecto al shader de barro anterior, que también muestreaba sus mapas. Se comparten los uniformes de suelo y se conserva su contador de propietarios. Es un prototipo QA, no validación de lifecycle o restauración.

## Evidencia

24 capturas reales, 12 parejas: media/baja, tres cámaras, día150/noche350, semilla712, Mapungubwe y misma resolución1280×720. Todas coinciden en cámara, objetivo, hora, draws y triángulos. Cero errores registrados. [Metadatos](captures.json), [comparación](comparison.json).

Se revisaron directamente la candidata normal/oblicua diurna media y normal nocturna baja. El borde ya no dibuja el polígono duro; el barro mantiene una identidad diferenciada. No es aprobación perceptual de cada frame ni de movimiento. [Normal día](media-day-game-comparison.webp), [oblicua día](media-day-oblique-comparison.webp), [normal noche baja](baja-night-game-comparison.webp). Los24 archivos individuales son WebP lossless; las12 composiciones de revisión usan calidad92.

## Coste y siguientes puertas

La preparación ingenua del piloto tarda423–460ms acumulados hasta la primera captura candidata y569–586ms tras cambios de cámara/chunks. Son tiempos CPU medidos dentro del cálculo de atributos/materiales, no GPU ni coste por frame. Es demasiado trabajo síncrono para promover esta implementación. Calcula repetidamente distancias y atributos sobre vértices duplicados: el siguiente paso debe compartir/cachar resultados en preparación sin reducir calidad.

Atributos creados acumulados:3.171.924bytes iniciales y4.311.384 tras desplazamientos. Incluyen color/normal/distancia y chunks ya retirados; no equivalen a memoria residente, ni a VRAM. Hay24 bindings activos en esas capturas. No cambia el número de triángulos o draws; no se midió GPU/CPU de render todavía.

Pendientes: preparación menos costosa, control del cambio de iluminación interior (no confundir transición con aclarado global), movimiento/aliasing de frontera, streaming/cierre y benchmark pareado. Mantener como candidata QA; no modificar main ni activar por defecto. El patrón repetitivo del musgo sigue pendiente y esta mezcla no añade volumen nuevo fuera de los parches.

Reproducción: Vite5190; `node tools/experiments/capture-mangrove-mud-moss-blend.mjs`. Para empaquetar: WG_SAND_OUTPUT=docs/qa/global-visual-lab/mangrove-mud-moss-blend y `node tools/experiments/package-desert-sand-settlement.mjs`.
