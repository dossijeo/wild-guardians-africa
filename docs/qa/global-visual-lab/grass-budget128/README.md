# Presupuesto de 128 matas frente a 192

Ensayo aislado del limite visible, conservando modelo arqueado, paletas, candidatas, densidad de grupos, exclusiones, sombras y transiciones. El helper QA acepta `maxVisible` (por defecto 192) y permite alternar el presupuesto dentro de una reserva ya creada; no cambia el renderer habitual. La reduccion no modifica los modelos originales ni la simulacion.

24 capturas reales en Sabana/Gran Rio/Gran Canon, dos vistas de paisaje y dia/noche. Semilla 712, calidad media, objetivo +50/+30 m, horas 150/350. `base` usa grass-biomes con 192 y `candidate` usa grass-budget128. La comparacion es entre dos cantidades de matas, no entre matas y suelo vacio. `comparison-audit.json` valida las 12 parejas sin errores. La primera ejecucion se interrumpio durante la carga inicial de Gran Rio antes de aplicar el helper; se conservaron las ocho capturas de Sabana y se repitieron Rio/Canon. `interrupted-run.json` registra la limitacion; causa no identificada.

La cobertura cercana se conserva en las vistas inspeccionadas; desaparecen sobre todo grupos lejanos. No hay evidencia de una mejora de color: el verde nocturno de Canon sigue pendiente y no se mezcla con este ensayo.

- [Sabana 192](sabana-base-settlement-day.png) / [128](sabana-candidate-settlement-day.png).
- [Rio 192](gran-rio-base-settlement-day.png) / [128](gran-rio-candidate-settlement-day.png).
- [Canon nocturno 192](gran-canon-base-settlement-night.png) / [128](gran-canon-candidate-settlement-night.png).

El benchmark alterna 192/128/128/192 en una pagina con capacidad fisica 192 y la misma geometria/material. Espera un segundo tras cambiar el limite, calienta 30 frames y mide 180. Incluye seleccion residente en ambos estados; no mide ahorro de carga ni de memoria por reservar menos matrices. La seleccion vuelve a calcularse al cambiar el limite y las entradas/salidas conservan la transicion de escala de 0,3 segundos. Los registros verifican camara estable y cantidad acotada tras la espera.

Reproducir capturas con `capture-campaign-grass.mjs`, WG_GRASS_STUDY=grass-budget128, WG_GRASS_BASELINE=grass-biomes, WG_GRASS_BIOMES=sabana,gran-rio,gran-canon, WG_GRASS_VIEWS=settlement,overview y WG_CAMPAIGN_TARGET_OFFSET=50,30. Para coste, `measure-campaign-grass-budget.mjs` con WG_GRASS_STUDY=grass-biomes, los mismos biomas y desplazamiento. WG_GRASS_OUTPUT selecciona este directorio.

| Bioma | Fase | GPU 192 / 128 (ms) | Diferencia 128 - 192 |
|---|---|---:|---:|
| sabana | day | 19.711 / 20.354 | +0.643 |
| sabana | night | 19.235 / 19.009 | -0.226 |
| gran-rio | day | 16.056 / 16.567 | +0.510 |
| gran-rio | night | 16.934 / 15.293 | -1.641 |
| gran-canon | day | 16.449 / 17.390 | +0.941 |
| gran-canon | night | 18.783 / 18.169 | -0.614 |

**Decision: no promover 128 como optimizacion demostrada.** La cobertura cercana cambia poco, pero se pierde cobertura lejana y las tres mediciones diurnas empeoran. La variacion nocturna no acredita un ahorro estable. Los contadores de ultimo pase bajan 15.360 triangulos en Sabana/Rio y 12.960 en esta vista de Canon; eso no implica menos tiempo GPU. No se repite el recorrido largo ni se cambia la paleta de un presupuesto que no supera esta evaluacion. El limite 192 sigue siendo el control QA previo, no un presupuesto global aprobado.

Siguiente hipotesis: aislar el coste del material y de recibir sombras en las matas, comparando el mismo numero de instancias, antes de recortar mas cobertura. Es una hipotesis pendiente, no una causa establecida por estos datos. No hay cambios de produccion ni aprobacion de calidad global.

Antes de atribuir diferencias pequenas al siguiente shader, incluir control A/A (mismo estado en ambos bloques) y orden inverso/repetido: esta ronda muestra suficiente variacion para no usar un solo ABBA como umbral absoluto de promocion. El resultado no prueba que reducir instancias sea intrinsecamente mas lento en cualquier equipo.
