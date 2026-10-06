# Búsquedas de trabajadores en fincas avanzadas reales

Comparación de d77baf6 contra 1bfd85a, aislando el índice local de entidades añadido en d77baf6. Ambos incluyen ya la mejora previa de mantenimiento de tareas bloqueadas; no se atribuye aquí su ahorro por segunda vez.

## Entradas y órdenes

Se reutilizan los estados íntegros, sin editar su historial, de tres campañas archivadas: [Manglares/Saheliana sobre 7a14cb9](../intensive-mangrove-shield-100/README.md), [Gran Río/Mapungubwe sobre dba3b69](../intensive-river-rejoin-100.md) y [Sabana/Mapungubwe sobre 80f64ff](../crop-lifecycle-eight-100.md). Los archivos originales comprimidos conservan su ubicación; este informe registra sus hashes descomprimidos. Los tres son victorias históricas del día 101, **no campañas de cien noches ejecutadas con el balance actual**.

Para cada versión se carga el mismo snapshot, se crea su navegación nativa con el perfil del bioma y se fijan cámara/área activa usando la receta de la estrategia intensiva. Se llama a `continuePostgame` y a `hire` normalmente, contratando ancianas a 30 monedas con plantilla = ceil(plantas vivas/12), limitada por el saldo. No se aumenta dinero, no se acelera crecimiento ni se alteran tareas, posiciones, RNG, colisiones o daño. La campaña de Sabana era de ancianos con mayor plantilla; esta continuación paga ancianas y **no reproduce su estrategia original**.

| Caso | Historial de cultivos/cajas | Vivos iniciales | Contratadas | Cobro |
|---|---|---|---|---|
| Manglares/Saheliana | 12201 / 11602 | 215 | 18 | 540 |
| Gran Río/Mapungubwe | 13541 / 12597 | 557 | 47 | 1410 |
| Sabana/Mapungubwe | 20443 / 19436 | 546 | 46 | 1380 |

## Método y resultados

15 segundos simulados de calentamiento y 20 medidos, pasos de 0,1 segundos. Orden de ejecución referencia/candidato alternado por paso, con dos estados/navegadores independientes en el mismo proceso. Se mide solo `Game.tick`; preparación, comprobaciones/serialización/hash, recopilación de eventos e IO quedan fuera. Los 600 pares individuales de muestras están en `benchmark.json`.

| Caso | Mediana referencia → actual (ms) | P95 referencia → actual (ms) | Pasos actuales más rápidos |
|---|---|---|---|
| Manglares | 11,178 → 6,846 | 18,197 → 12,886 | 188/200 |
| Gran Río | 16,768 → 9,166 | 29,956 → 17,870 | 196/200 |
| Sabana | 23,746 → 14,839 | 34,711 → 24,498 | 195/200 |

Reducción de mediana aproximada del 39/45/38 %, respectivamente. El máximo de Manglares no baja en esta sesión (40,261 → 41,208 ms); no se promete eliminar todos los picos. Son costes CPU de simular **100 ms**, no coste por frame real, FPS, GPU o mediciones en móvil. Las pausas/tamaño del historial inducen otro patrón de trabajo al renderizar; queda medirlo en la app.

Hay nueve puntos de control de estado completo por caso (preparación, cada cinco segundos y final), todos exactamente iguales. No se serializa cada paso de esta medición ni se afirma equivalencia de todos los estados intermedios por este informe. Las pruebas previas de d77baf6 conservan su propia comparación completa de 15.600 pasos en seis biomas. Los contadores de eventos y búsquedas de ruta coinciden en los tres casos: 89/214/218 búsquedas, incluyendo calentamiento.

Durante los veinte segundos medidos se completan 2/24/22 riegos, 23/39/41 recogidas y **17/26/28 entregas físicas**. La recogida sola no acredita ingreso. El saldo final y las cajas conservan su estado real; no se rellenan o simplifican las colecciones para acelerar la prueba. La partida permanece sin resultado final ni pausas durante la ventana.

Los procesos de campaña 20608 y 36076 seguían activos en paralelo. No se ejecutaron suites/builds/perfiladores propios durante la medición. Un piloto con solo estadísticas se repitió para conservar también las muestras individuales; las cifras publicadas proceden de esa segunda ejecución. No se modifica ni reinicia ninguna campaña ya iniciada.

## Reproducción y límites

Extraer `git archive 1bfd85a src content package.json` a una carpeta de referencia. Ejecutar:

`node tools/benchmark_late_farm_worker_lookups.mjs <referencia> <salida.json>`

`proof.json` registra fuentes, entradas y comprobaciones independientes de medianas, máximos y recuentos. La ejecución terminó con exit code 0, tres casos completados y todas las igualdades correctas. Este cambio añade el benchmark y documentación; el código runtime de d77baf6 no cambia, por lo que no se recompila otra vez.

Quedan fincas con otros tamaños/plantillas, recorridos más largos, sombras/render/audio, memoria, móviles y cien noches con el nuevo balance. Los resultados mejoran la evidencia de la optimización, pero no cierran la estabilidad o el plan maestro completo.
