# Reconciliación de recorridos activos

La comparación reproducible motion-recipe-reconciliation.json registra ambos periodos y hashes de la telemetría original. Manglares, Desierto y Gran Cañón coinciden con los flags artísticos actuales. Sus diferencias son semilla explícita, pthreads, scheduler y mountainBase=raised. El último solo actúa sobre savanna/grand_river según raised-mountain-base.js; no modifica estos tres biomas. Esta conclusión compara configuración, no afirma igualdad retrospectiva de todo el código.

Volcanes tenía suelo fino mediante sustitución de fuente. Se repite exclusivamente ese recorrido con WG_CURRENT_REVIEW=1, WG_MOTION_RECIPE_EXACT=1, WG_MOTION_SPARSE_GL=1, WG_COVER_QUALITY=baja, WG_FIXTURE_BIOME=volcanes y WG_REVIEW_OUT=volcanes-exact-recipe-motion. No se modifica lava, vegetación, simulación ni materiales. El auditor de movimiento termina correctamente.

- day: 1526 frames observados, avance de simulación 39.827 s.
- night: 1275 frames observados, avance de simulación 56.129 s.

Inspeccionados day-4.png y night-4.png directamente a 1280x720: terreno rocoso legible, lava y vegetación conservadas, montaña y cielo visibles; no se observa fondo azul bajo los árboles en estas vistas. Hay un desnivel visible en el encuentro de superficies a la derecha; no se afirma desaparición total de uniones. La noche conserva lectura y oscurece el conjunto. No se ha inspeccionado cada fotograma del vídeo.

La grabación no es un benchmark. Mantener los costes residentes separados y las limitaciones de movimiento de cada informe. Sabana y Gran Río tienen sus recorridos nativos recientes en EXACT-RECIPE-MOTION.md; los otros tres mantienen su evidencia histórica compatible por configuración. Los vídeos y capturas adicionales permanecen locales con hashes; telemetría, contactos y puntos medios se publican.
