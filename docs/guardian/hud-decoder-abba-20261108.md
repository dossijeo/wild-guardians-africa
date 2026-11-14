# Copias del HUD: comparación y descarte de integración

> Actualización: después de integrar la reutilización de hierba se repitió la comparación con un candidato de aislamiento reforzado; véase [la nueva evaluación](webgpu-hud-decoder-after-grass-20261108.md). El decodificador de producción no se ha sustituido.

La traza de la incursión señaló `copy` en la recepción del HUD. Se compararon tres líneas: eliminar las copias redundantes manteniendo una transacción aislada; compartir estructuralmente las colecciones sin copiar las entidades intactas; y desplazar más trabajo de proyección a otro Worker. Se probó la primera porque no cambia el contrato ni añade sincronización. Las otras dos requieren revisar propiedad, mutaciones y seguridad del transporte; no se han implementado ni medido.

El candidato construye una sola vista interna para `prepare`, entrega una copia al consumidor y publica la vista interna solo tras validar la generación. Conserva copias para los datos que salen del decodificador. Pasó las pruebas de orden, invalidación, eventos, aislamiento y autoridad WASM. Está archivado exclusivamente en [tools/experiments/hud-decoder-candidate.mjs](../../tools/experiments/hud-decoder-candidate.mjs); **la implementación de producción se ha restaurado**.

En Node 20, con 41 publicaciones de la incursión de sabana generadas por Wild Engine real, validación de esquema y cuatro pasadas ABBA sobre 40 deltas, la preparación y confirmación media bajaron de 78,76 a 50,08 ms; p95 de 86,11 a 57,96 ms y p99 de 89,54 a 73,38 ms. Se comprobaron todos los resultados de ambas vías. El conteo de llamadas a `structuredClone` para los 41 paquetes pasó de 90.148 a 89.986: desaparecen 162 llamadas, entre ellas las copias completas redundantes, pero siguen muchos clones individuales. Es una medición del componente con un conjunto muy grande de datos, no tiempo de fotograma. [Datos](hud-decoder-node-20261108.json); ejecutar `.cache/tooling/node20.exe --expose-gc tools/experiments/benchmark-hud-decoder.mjs`.

La prueba WebGPU de la [incursión de laboratorio](webgpu-native-horde-footsteps-20261108.md) se ejecutó en orden anterior, candidato, candidato, anterior. La ruta anterior se inyectó desde `168fb9d4f` y se verificaron dos cargas del módulo; las pruebas del candidato usaron el código que estaba temporalmente en el árbol. El backend fue WebGPU en los cuatro casos. La última observación de retraso de presentación, aproximadamente a los 10 s, fue:

| Ejecución | Versión | Retraso observado | rAF p95 / p99 / máximo |
| --- | --- | ---: | --- |
| A1 | anterior | 4,25 s | 222 / 633 / 700 ms |
| B1 | candidato | 5,80 s | 100 / 667 / 769 ms |
| B2 | candidato | 5,45 s | 167 / 700 / 767 ms |
| A2 | anterior | 4,35 s | 133 / 733 / 1.300 ms |

Los picos siguen siendo grandes y los p95/p99 son variables. El candidato tuvo más retraso en ambas ejecuciones, aunque solo hay tres consultas asíncronas por ejecución y estas no permiten establecer causalidad ni una distribución fiable de latencia. Los resultados no demuestran una mejora global, así que no se ha aceptado el cambio en producción. [Datos íntegros en orden ABBA](hud-decoder-webgpu-abba-20261108.jsonl).

Para reproducir el navegador, seguir el comando del informe de la incursión y alternar `QA_HUD_BASELINE=168fb9d4f` con `QA_HUD_CANDIDATE=1`, eliminando la otra variable entre ejecuciones; el experimento exige que el módulo se haya interceptado. Como en el ensayo original, se añade una versión espacial y una pausa solo a una copia antigua de la partida, y había cambios ajenos sin confirmar en el árbol. El commit de este informe no reproduce por sí solo esas modificaciones preexistentes. Se mantienen pendientes una explicación del retraso y la validación con más escenarios y muestras.
