# Recorrido cercano y normal compartida

144 capturas del renderizador real: 36 posiciones de cámara × original/candidata × día/noche, campaña Manglares semilla712, media, 1280×720. Cámara en arco de0,8 radianes a22m de la parcela de barro más cercana al inicio; altura7m sobre el punto observado. Simulación y reloj material congelados. Las72 parejas conservan cámara, objetivo, draw calls y triángulos; cero errores. No demuestra rendimiento durante movimiento: se espera a los chunks y se capturan pasos deterministas.

[Vídeo diurno](day.mp4) y [nocturno](night.mp4): izquierda original, derecha mezcla. Codificados a6fps desde36 poses (6s), H.2641920×540; esta cadencia es de presentación, no FPS del juego. Las vistas `*-pair.webp` permiten revisar inicio, medio y final. La frontera es menos poligonal en las poses inspeccionadas; sigue apreciándose una banda suave y no resuelve el patrón repetitivo del musgo. No se declara validación de todos los artefactos temporales a60fps.

## Corrección del buffer

Three WebGLGeometries elimina al recibir dispose únicamente los atributos presentes entonces en `geometry.attributes`. El helper anterior alternaba dos atributos de normal y podía dejar fuera el buffer de la variante inactiva. Ahora conserva el atributo original, copia la normal CPU elegida y marca needsUpdate solo al cambiar variante. No hace esa copia por frame ni crea geometría adicional. Las matrices CPU de ambas recetas siguen retenidas para QA.

La identidad del atributo original permanece igual después de instalar y tras las alternancias durante la secuencia. Además,24 capturas estáticas nuevas en media/baja validan doce parejas candidatas con cámara/tiempo/geometría coincidentes: **RGB exactamente idéntico** a la receta previa. Véase [comparación](../../mangrove-mud-moss-single-normal/comparison.json). No es una medición directa de VRAM ni una prueba prolongada de fugas; elimina la sustitución de atributo que originaba el riesgo.

Reproducir: servidor5190, `node tools/experiments/capture-mangrove-mud-motion.mjs`, `python tools/experiments/package-mangrove-motion.py`. La captura acepta WG_COVER_QUALITY; esta serie solo mide visualmente media. Comparación estática: captura habitual con WG_SAND_STUDY=mangrove-mud-moss-toon-interior y WG_SAND_OUTPUT=docs/qa/global-visual-lab/mangrove-mud-moss-single-normal; después `python tools/experiments/compare-mangrove-single-normal.py`.

**Decisión:** candidata visual conservada en QA. No integrada. El siguiente paso útil es reducir la doble evaluación de iluminación del interior sin perder la transición, contrastando con esta referencia, antes de aceptar el coste diurno medido de+0,89ms. Mantener la revisión global pendiente, especialmente Río, Cañón y Volcanes; no prolongar esta variante con comprobaciones repetidas sin nueva hipótesis.
