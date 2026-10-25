# Entrega del experimento gráfico de los seis biomas

25 de octubre de 2026. Rama codex/global-visual-lab. **Recomendación: conservar la selección experimental para revisión; no fusionar PR159 ni cambiar main.**

La dirección conseguida es comparable a los mockups en los criterios del experimento: materiales con relieve legible, separación entre luz y sombra, cobertura vegetal reconocible, identidad cromática por bioma e integración de agua/fondos. No se afirma equivalencia píxel a píxel, misma composición del mundo ni eliminación de todos los defectos. Las aprobaciones posteriores del usuario de helechos/LOD, Desierto y lava prevalecen sobre las primeras propuestas.

## Auditoría de requisitos

| Requisito | Evidencia inspeccionada y resultado |
|---|---|
| Seis biomas, no un edificio | REVIEW-RECOMMENDATION.md resume selección individual; current-resident-cost aporta 48 ejecuciones válidas. No se reabrió el atlas del taller. |
| Mockups como dirección, siluetas conservadas | ART-REFERENCES.md identifica originales; montajes closure-review y elevated-review, capturas actuales y aprobaciones posteriores guían la selección. No se añadieron raíces ni se cambiaron edificios para copiar composiciones generadas. |
| Suelo, normales, materiales, iluminación y vegetación | Receta nativa global-current-review-recipe.mjs: suelo fino Sabana/Río/Volcanes, musgo/barro y fixed512 Manglares, arena Desierto, estratos/ribera Cañón; cobertura y LOD seleccionados. |
| Microvegetación y licencia | Cobertura de fibras instanciadas Sabana/Río. Manglares usa frondas/cards con normales y LOD, autorizadas explícitamente después de la restricción inicial. Procedencia CC0, autor, URL y hash en source.json de holly-fern-frond/holly-fern-lod; arena en desert-aerial-sand/SOURCE.md. |
| Antes/después reproducible | main-current-gallery.json, elevated-review y conjuntos poblados: cámara/hora/estado controlados según cada informe. main-reference-verification.json confirma que el main remoto sigue en b2497b069, la base usada. No atribuir diferencias de carga de trabajo a una optimización equivalente. |
| Día/noche, perfiles y costes | current-resident-cost: seis biomas × dos horas × media/baja × dos repeticiones válidas. Fuentes/hashes, GPU, CPU y presentación separados. Fallos y variabilidad conservados. |
| Movimiento, fondos y streaming | EXACT-RECIPE-MOTION.md y MOTION-RECONCILIATION.md; recorridos nativos nuevos de Sabana, Río y Volcanes; reconciliación explícita de los demás. Vídeos locales, contactos y telemetría publicados según cada conjunto. |
| Cielo y coherencia de fondo | SKY-BACKGROUND-REVIEW.md y canyon-sky-visible cubren vistas con cielo. 18 pruebas específicas aprobadas; no prometer todas las rotaciones/transiciones posibles. |
| Recursos y corrección | Pruebas específicas inspeccionadas de propiedad/disposal, invalidaciones y calidad; 26 controles seleccionados aprobados en selected-visual-tests.tap. No son certificación funcional de todo el historial. |
| Estado de ground-shadow-fill | GLOBAL-DIRECTION y current-review/README documentan integración y revisión de procesos; no había prueba interrumpida que reiniciar. |
| Descartes preservados | Candidatas de menor memoria, simplificaciones visualmente pobres, microajustes y optimizaciones sin beneficio integral mantienen informes negativos. No se reintroducen en la selección. |
| Publicación y límites | HEAD publicado, PR159 OPEN/draft sobre main sin fusionar. No se enviaron tareas ni mensajes al core. |

## Capturas para revisión

Las siguientes son capturas reales del perfil medio diurno de la matriz residente; sus parejas nocturnas y baja están en el mismo directorio. Para antes/después ver [galería elevada](elevated-review/README.md); sus fuentes son archivadas y no deben confundirse con nuevas capturas de HEAD.

- [Sabana](current-resident-cost/sabana-media-default-r1.png)
- [Gran Río](current-resident-cost/gran-rio-media-default-r1.png)
- [Manglares](current-resident-cost/manglares-media-default-r1.png)
- [Desierto](current-resident-cost/desierto-media-default-r1.png)
- [Volcanes](current-resident-cost/volcanes-media-default-r1.png)
- [Gran Cañón](current-resident-cost/gran-canon-media-default-r1.png)

## Coste y limitaciones de la entrega

En Intel UHD a 720p/media, GPU residente aproximadamente 14–23 ms según bioma/hora. Manglares permanece alrededor de 22–23 ms y puede registrar intervalos de presentación cercanos a 50 ms. No se garantiza 60 FPS ni ausencia de tirones. Baja pierde sombras y detalle; no sustituye la referencia artística. Las cifras completas y rangos están en REVIEW-RECOMMENDATION.md y los cuatro informes de current-resident-cost.

Persisten desniveles/uniones en algunos encuadres, especialmente Volcanes; sombras e iluminación lejanas de helechos son aproximaciones precalculadas. Los detalles azules investigados de Sabana se atribuyeron al asset original, no a huecos de suelo. No hay justificación para borrar vegetación aprobada o alterar colores por esa observación.

La selección sigue siendo explícita mediante flags de laboratorio. Esto cumple la entrega experimental, no instala silenciosamente todos los cambios como defaults. La rama contiene además modificaciones arquitectónicas e históricas autorizadas en otras fases, incluidas de Wild Engine: **no certificar todo el diff como exclusivamente gráfico ni fusionarlo sin delimitar ese alcance y validar sus funciones.** No se cambiaron reglas para mejorar estas comparaciones.

Se cierra la iteración de investigación artística global con evidencia y limitaciones, sin declarar una versión de producción terminada. La preparación de una integración revisada, el menú por capas/parallax y después los microeventos son trabajos posteriores explícitos; no se presentan como ya realizados. No continuar microajustes indefinidos sobre materiales aprobados sin un defecto nuevo y visible.
