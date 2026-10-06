# Destino de paseo sin distancias a cultivos históricos

Cambio respecto a `726157f`: `idleFarmAnchor` busca primero el cultivo vivo más cercano del centro del trabajador. Solo si no hay ninguno consulta las posiciones históricas para conservar la zona plantada como destino. Mantiene radio, empate por ID y fallback al centro; no modifica rutas, velocidades, estados o guardados. No guarda cachés entre pasos y conserva las mutaciones de vida y posición.

## Comparación aislada con fincas reales

Snapshots archivados íntegros de tres victorias históricas, sin modificar sus plantas. Cien posiciones diagnósticas tomadas de cultivos vivos por lote; **no son cien trabajadores contratados ni una jornada simulada**. Diez calentamientos y diez pares medidos con orden alternado. Las respuestas completas coinciden y el estado no cambia. Preparación y comparaciones excluidas del tiempo. Muestras en `benchmark.json`.

| Guardado | Cultivos históricos | Vivos del centro | Mediana de cien consultas, referencia → actual (ms) | Pares más rápidos |
|---|---|---|---|---|
| intensive-mangrove-shield-100 | 12201 | 215 | 165.20 → 52.63 | 10/10 |
| intensive-river-rejoin-100 | 13541 | 557 | 197.24 → 69.59 | 10/10 |
| crop-lifecycle-eight-100 | 20443 | 546 | 258.15 → 69.58 | 10/10 |

Son costes del selector de destino, no `Game.tick`, FPS, GPU, móvil o un balance actual de cien noches. Mejora solo cuando los trabajadores pasean. Se siguen inspeccionando los IDs de centro/vida de todas las plantas; el historial no se elimina. Si ya no hay plantas vivas, se hace una pasada adicional barata antes de calcular el destino histórico; no se acredita ahorro en ese caso. Las campañas largas 20608/36076 seguían activas durante la medición; suites/builds propios se ejecutaron después.

## Verificación

84 pruebas dirigidas correctas, incluido un caso que detecta lecturas indebidas de coordenadas históricas y comprueba cambios posteriores de vida. Los casos existentes verifican empates, centros distintos y plantación completamente recogida.

Comparación con la fuente congelada `726157f`: seis incursiones nativas de 600 pasos más seis jornadas pagadas de 2.000 pasos. Estado serializado completo comparado en cada paso (15.600 en total), búsquedas de ruta iguales y riego físico inicial conservado. Esto acredita equivalencia en esos casos, no toda la partida/UI. La compilación Vite terminó con código 0; conserva el aviso existente de bundle grande.

Reproducción: extraer `git archive 726157f src content package.json` y ejecutar `node tools/benchmark_idle_farm_anchor.mjs <referencia> <salida.json>` y `node tools/check_navigation_query_reuse.mjs <referencia>`. Los hashes de fuente y resultados quedan en `proof.json`. Pendientes render, móvil, memoria y el recorrido intensivo completo.
