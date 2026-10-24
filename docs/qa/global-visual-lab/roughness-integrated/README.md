# Integración de rugosidad seca

Conservada únicamente en ?visualLab=global-lighting para suelo mapeado de Sabana, Gran Río y Cañón. Mínimo 0,86, sin nuevos recursos, uniformes ni cambios geométricos. El renderer por defecto y los demás biomas quedan fuera de la condición de aplicación. [Antes/después y coste](../ground-roughness/README.md).

## Validación

- 36 capturas de la ruta integrada: seis biomas, juego/baja/lateral, día/noche. qa-integration-comparison.json confirma cámaras/objetivos/horas iguales al candidato QA. No se afirma igualdad píxel a píxel: el reloj visual del agua no se bloqueó en este fixture entre sesiones.
- 12 capturas de partidas iniciadas desde el menú en campaign/: Sabana, Gran Río y Cañón, referencia anterior/integración, día/noche. Misma semilla 712, calidad media, cámaras, horas y población; campaña pausada, reloj visual del agua fijo y sin entidades añadidas. campaign/comparison.json verifica seis parejas sin errores registrados. HUD/tutorial permanecen visibles.
- Streaming de terreno 0 → 96 → 0 en los tres biomas: todos los materiales residentes conservan el parche tras cargar nuevos chunks. streaming.json registra 25/26 materiales en Sabana/Gran Río y 25 en Cañón, todos cubiertos. Es una comprobación del shader, no una auditoría de memoria ni navegación.
- 18 pruebas de selección por bioma/opción, agua, registro de materiales y sombras nativas pasan (../ground-roughness/tests.tap). La primera versión de la prueba construía una combinación volcánica sin receta mapeada que el parche volcánico existente no soporta; se corrigió el fixture a los estados pertinentes, conservando las comprobaciones de terreno no mapeado en los tres biomas afectados.
- Vite build: 404 módulos, correcto. Avisos existentes sobre importación estática/dinámica de far-atmosphere y tamaño de bundle.

[Sabana integrada lateral](savanna-global-lighting-side-day.png), [Gran Río](grand-river-global-lighting-side-day.png), [Cañón](canyon-global-lighting-side-day.png). [Campaña Sabana antes](campaign/sabana-base-day.png) / [después](campaign/sabana-integrated-day.png).

Seis registros del fixture integrado contienen un 404 sin URL identificada; campañas sin errores registrados. No se oculta el resultado nocturno anómalo de Cañón del benchmark. El coste total de global-lighting, las orillas, la vegetación volumétrica y la calidad global siguen pendientes. Recomendación: conservar esta corrección optativa; no promocionar todo el experimento a configuración por defecto ni declarar alcanzados los mockups.

Reproducir con capture-roughness-integrated.mjs, capture-campaign-roughness.mjs y check-roughness-streaming.mjs en tools/experiments, servidor 5190. La variante base-roughness opcional del capturador integrado permite comparar antes/después mediante interceptación local de la respuesta del módulo, sin modificar el repositorio.
