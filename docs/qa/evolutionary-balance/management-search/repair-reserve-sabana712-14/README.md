# Sabana/712: comprobación independiente de la reserva de reparaciones

Cuatro campañas nativas de 14 noches, con la misma semilla, bioma, genes y balance de producción. La referencia se ejecutó en `bf3b6fdc` y la candidata en `0fa3a2f9`. Los `config.json` de ambas carpetas registran hashes idénticos para `run-paired.mjs`, `run-ga.mjs` y `native-expanding-defense-policy.mjs`; sólo cambia `native-campaign-runner.mjs`, que deja de reservar dos veces las reparaciones pendientes al llamar a la política defensiva. Los commits entre ambas versiones no cambian otro código de campaña. Los informes nativos completos (`*.json.gz`), el progreso diario y los resúmenes se conservan sin sustituir resultados históricos.

| Política | Versión | Noches | Cultivos finales | Monedas finales | Cultivos destruidos, noches 6–14 | Muros pagados | Reparaciones pagadas |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Evolucionada | Referencia | 14 | 90 | 631 | 134 | 860 | 642 |
| Evolucionada | Reserva corregida | 14 | 111 | 757 | 42 | 860 | 814 |
| `good-current-magic` | Referencia | 14 | 60 | 868 | 103 | 820 | 830 |
| `good-current-magic` | Reserva corregida | 14 | 80 | 635 | 107 | 860 | 564 |

La evolucionada empezó a divergir en la jornada 8. En la noche 12 perdió 11 cultivos frente a 54 en la referencia. El control empezó a divergir en la jornada 7; acabó con más cultivos vivos, pero con 233 monedas menos y cuatro pérdidas agrícolas adicionales. Las reparaciones pagadas son transacciones reales, no solicitudes pendientes. Las trayectorias cambian al modificar la política, por lo que una pérdida nocturna concreta no demuestra por sí sola qué brecha quedó cerrada.

Junto al [ensayo Manglares/123 de 21 noches](../repair-reserve-candidate-21/README.md), hay dos escenarios donde la estrategia evolucionada mejora con la reserva corregida. El control tiene resultados mixtos: empeora en Manglares y cambia cultivos por caja en Sabana. Esto no acredita una política generalizable ni una victoria de 100 noches. El gasto en murallas confirma que ninguno de estos brazos mejoró por dejar de construirlas; tampoco certifica que sus recintos estuvieran físicamente cerrados. No se cambiaron precios, daños, especies, salarios ni presión militar.

Para repetir, use `node tools/evolutionary-balance/run-paired.mjs <ruta-a-run-input.json>` desde el commit indicado para cada versión. Los `run-input.json` originales están junto a los informes; cambie `output` a una carpeta vacía para forzar una nueva ejecución. El runner rechaza mezclar informes de otro hash en la misma carpeta. Las corridas fueron secuenciales, sin ABBA de tiempos: los `wallTime` se conservan como diagnóstico, no como prueba de rendimiento comparativo.

Antes de integrar la corrección en el laboratorio principal hay que verificar otras semillas y biomas, observar la finalización física de las reparaciones y comparar con una política que ahorre hasta poder cerrar el recinto completo. La rama sigue siendo experimental y no propone un cambio de balance en `main`.
