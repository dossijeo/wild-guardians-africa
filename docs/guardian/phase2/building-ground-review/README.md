# Contacto del centro de trabajo

Reproducción: `tests/browser/guardian-combat.html?nativeRaid&lightingReview&recoveryDay&buildingView`, botón «Inspeccionar suelo del centro». Usa el centro instalado, su geometría de destrucción, transformaciones reales y la interpolación del terreno renderizado. La inspección pausa la simulación y acerca la cámara.

En la fixture Mapungubwe del vídeo, los 4.697 vértices bajos con normales aproximadamente horizontales quedan por encima del terreno. Separación mínima 0,025 m; ninguna muestra penetra más de 5 mm. El terreno muestreado bajo las peores muestras es plano. No se justifica subir este edificio como arreglo del artefacto comunicado.

Se guardan imágenes de la misma vista con sombras solares y sin ellas. La iluminación interior cambia, pero estas imágenes fijas no certifican ausencia de parpadeo en movimiento. La prueba no examina intersecciones entre caras del propio modelo ni certifica todas las culturas/posiciones. El z-fighting sigue abierto: falta reproducir temporalmente el punto exacto y distinguir sombras de superficies internas superpuestas.

La petición posterior del usuario añade prioridad a precalcular y reutilizar profundidad, sombras y oclusión cuando haya beneficio medido. Ya existe shadow-cache.js con invalidación por entradas geométricas. Antes de duplicar caches hay que medir sus aciertos y costes. Una profundidad de cámara no se puede reutilizar sin invalidar por cámara/oclusores; la luz diurna y los personajes animados tampoco son estáticos. Evaluar por separado AO horneado de modelos, sombras estáticas y componentes dinámicos conservando apariencia. No se ha incorporado aún un nuevo horneado o cache como consecuencia de esta inspección.

![Con sombras](shadows.png)
![Sin sombras, solo diagnóstico](no-shadows.png)
