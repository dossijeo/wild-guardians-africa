# Mezcla de barro: conservar su respuesta estilizada

**Elegida para continuar evaluación de coste y movimiento.** Conserva la transición barro/musgo y recupera el marrón del interior. No se integra por defecto y no se declara finalizada la calidad de Manglares.

El control de rugosidad alta quitaba destellos, pero dejaba el interior claro. La diferencia principal procede del paso de la iluminación AfricanToon del barro a la física del suelo. Esta variante mezcla la radiancia del suelo en el borde con una evaluación AfricanToon del barro hacia el interior. Usa sus mapas y su tinte original(.58,.61,.64); no añade una corrección global de exposición o una paleta marrón inventada.

No reproduce literalmente cada operación del material anterior: mantiene la normal derivada de la nueva mezcla, calcula reflexión ambiental y usa visibilidad del suelo. La identidad visual recuperada no equivale a igualdad píxel a píxel con el interior anterior. La transición sigue conservando posiciones, índices y contornos autoritativos, sin discard ni alpha blending.

## Comparación

24 capturas reales: semilla712, Mapungubwe,1280×720, media/baja, tres vistas, día150/noche350. Doce parejas con iguales cámaras, hora, draws y triángulos; cero errores registrados. [Datos](captures.json), [comparación](comparison.json).

Revisión directa de normal diurna media y normal nocturna baja: el color terroso se recupera y el borde sigue mezclado. [Día media](media-day-game-comparison.webp), [oblicua media](media-day-oblique-comparison.webp), [noche baja](baja-night-game-comparison.webp). Se entregan24 WebP lossless individuales y12 composiciones calidad92.

## Coste pendiente

Vista normal:64draws/614104triángulos en media y61/462480 en baja, iguales al control. La preparación optimizada mide161–163ms acumulados inicialmente y211–220ms tras cambios de cámara. No son CPU de render, GPU ni benchmark ABBA. La nueva evaluación de iluminación y reflexión en cada fragmento sí añade trabajo; no se afirma coste cero por conservar draws.

El prototipo aún repite una lectura lógica del mapa base para la respuesta toon. Antes de medir, reutilizar ese texel y verificar equivalencia. Después medir GPU/CPU con estados pareados y revisar cámara móvil, streaming y cierre. No heredar la aprobación de la arena ni de otra receta. Mantener aparte el problema de repetición del musgo.

## Reproducción

Vite5190. WG_SAND_STUDY=mangrove-mud-moss-toon-interior, WG_SAND_OUTPUT=docs/qa/global-visual-lab/mangrove-mud-moss-toon-interior, `node tools/experiments/capture-mangrove-mud-moss-blend.mjs`; después `node tools/experiments/package-desert-sand-settlement.mjs` con mismo output. Receta explícita en el helper; el capturador no la activa automáticamente sin ese estudio.
