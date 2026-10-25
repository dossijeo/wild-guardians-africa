# Auditoría de cierre del laboratorio gráfico

Fecha: 2026-10-25. Estado inspeccionado: 389114810, codex/global-visual-lab.
PR159 verificada OPEN/draft, base main. No se declara completado el objetivo.

## Evidencia y límites por requisito

| Requisito | Evidencia disponible | Conclusión verificable |
|---|---|---|
| Dirección artística de seis biomas | ART-REFERENCES.md; elevated-review/README.md; aprobaciones posteriores del usuario | Conservar las direcciones seleccionadas. Las aprobaciones posteriores de helechos/LOD, lava y Desierto prevalecen sobre recetas históricas. |
| Antes/después con cámaras comparables | main-current-gallery.json; elevated-review/provenance.json y seis montajes | Comparación contra main histórico b2497b0695218652672c805c40971ea830686e3a. No demuestra equivalencia con origin/main actual. |
| Costes modestos día/noche | current-resident-cost/SIX-BIOME-DAY.md, SIX-BIOME-NIGHT.md, SIX-BIOME-LOW-DAY.md, SIX-BIOME-LOW-NIGHT.md | 48 ejecuciones válidas archivadas: seis biomas, dos horas, dos perfiles, dos repeticiones. Escena residente pausada; no extrapolar a FPS de simulación activa. |
| Movimiento de Sabana y Gran Río con receta actual | EXACT-RECIPE-MOTION.md y telemetría de ambos directorios | Recorridos diurnos/nocturnos con simulación activa, flags nativos de suelo fino y sin override adicional de altura de montañas. Grabación excluida de aceptación de rendimiento. |
| Movimiento de los otros cuatro biomas | manglares-resident-mask-low, desierto-clearance-corrected-motion, volcanes-step16-motion-low, canyon-handoff-integrated-low | Evidencia previa específica, no nuevas ejecuciones de HEAD. Respetar perfiles, overrides y correcciones de cámara documentados; no agrupar como un A/B homogéneo. |
| Manglares aprobado | mangroveFerns=holly y groundCache=fixed512 en global-current-review-recipe.mjs | Caché y helechos seleccionados conservados. La descripción cupped de closure-review es histórica: applyHollyFern sustituye geometría y añade texturas/normales/LOD. No restaurar hojas redondas por leer el plan antiguo. |
| Fondos e impostores | Correcciones de máscara residente, suelo fino y handoff atómico; capturas y recorridos citados | Evidencia localizada de continuidad. No certificación universal de todos los puntos del mundo. |
| Selección reproducible | tools/experiments/global-current-review-recipe.mjs | Flags explícitos y reproducibles. El propio módulo indica que es selección de revisión, no defaults del juego. No presentar la selección QA como integración final automática. |
| Reglas y navegación | Este pase solo modifica QA/documentación | No se ha cambiado la simulación en este pase. No equivale a auditar retrospectivamente todos los cambios de la rama. |
| Publicación | PR159 abierta en borrador; commits publicados en rama experimental | Sin fusión a main. |

## Recomendación actual

Mantener la selección artística completa y el perfil medio como referencia visual. Baja es una concesión explícita, especialmente en sombras; no reducir densidad aprobada para obtener cifras favorables. Manglares sigue siendo el coste residente más alto (aproximadamente 22–23 ms GPU en media), y los máximos de presentación impiden prometer 60 FPS o ausencia de tirones. Consultar los informes por ejecución: no sumar CPU, GPU y presentación ni tratar su media como tiempo total ocupado.

## Pendientes acotados antes de declarar cierre

1. RESUELTO: aislamiento en renderer atribuye los elementos azules a plant_02 del asset original; el suelo no presenta huecos en esa región. Véase current-resident-cost/SABANA-BLUE-ISOLATION.md. Conservar el modelo.
2. Completar la reconciliación de los recorridos restantes con la selección nativa. Mantener separados controles históricos y receta actual. Solo repetir una prueba si cambia un comportamiento relevante, no por fecha del informe.
3. Consolidar la recomendación de integración final, distinguiendo flags QA de valores efectivos del juego y comparativa histórica de main actual. La galería histórica sigue siendo válida para su commit; no renombrarla como comparación con producción actual.
4. Revisar los límites artísticos restantes de cielo/fondos y transiciones usando evidencia representativa. Las capturas con HUD que ocultan el cielo no prueban la calidad del skybox.

No repetir por rutina la matriz residente de 48 ejecuciones. El menú por capas/parallax y la revisión visual de microeventos conservan el orden posterior solicitado por el usuario. El atlas manual del taller sigue en pausa.

## Verificación posterior de main (25 octubre)

`git ls-remote origin refs/heads/main` devuelve b2497b0695218652672c805c40971ea830686e3a, exactamente la base de las comparativas. origin/main local coincide y ese commit es ancestro de la rama experimental. Por tanto, la base histórica sigue siendo main remoto actual en esta fecha; no hay motivo para repetir las comparativas por un supuesto avance de main. Las capturas candidatas siguen siendo archivadas y mantienen sus límites propios. main-reference-verification.json conserva la comprobación.

Control de regresión seleccionado: 26/26 pruebas aprobadas de cobertura continua, helechos/caché, suelo lejano y agua/ribera/reflejos. Salida en selected-visual-tests.tap. Se ejecutaron con el loader local de Wild Three.js; esto no certifica por sí solo el historial funcional completo ni un empaquetado de distribución.
