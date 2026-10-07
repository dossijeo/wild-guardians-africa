# Plantilla nativa compartida al cancelar la carga

Base e181672. `ensureBuilding` usa la misma plantilla preparada para peticiones concurrentes de una cultura. Si la carga se cancela antes de registrar esa plantilla, cada barrera de fase la libera. La plantilla nativa no protegía llamadas repetidas a `dispose`, por lo que volvía a emitir disposiciones de geometrías, materiales y texturas.

`prepareNativeBuilding` incorpora una guarda privada: la primera liberación cierra la plantilla y libera sus recursos; las posteriores no realizan trabajo. No modifica geometría, escala, materiales, shaders ni estado de simulación.

La regresión utiliza los GLB originales de las cinco culturas y tres peticiones concurrentes por plantilla. Cancela antes de resolver la promesa compartida, comprueba que las tres rechazan y que la caché del mundo sigue vacía. Observa body, ash, noise, geometría original, material y sus texturas: cada uno emite una disposición en ese escenario, incluso después de una llamada adicional a `dispose`. Antes de la corrección falla con la primera cultura; después completa las cinco. Es una prueba del cierre compartido, no una medida de RAM física/GPU ni una prueba integral de todas las interrupciones de carga.

32 pruebas buildings/world-load-cancel/assets-lifecycle aprobadas; build Vite correcto. Log original del fallo conservado en gzip sin alterar los bytes; logs de éxito/build al lado. La corrección complementa el reintento de descarga de la plantilla, cuya evidencia está en ../building-load-retry/README.md.
