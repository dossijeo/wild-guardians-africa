# Análisis de campañas intensivas terminadas

`tools/summarize_intensive_farm.mjs` consume el informe y snapshot generados por `tools/check_intensive_farm.mjs`. No reejecuta una simulación, modifica sus parámetros ni sustituye sus decisiones. Ejemplo cuando el proceso correspondiente haya terminado y escrito ambos archivos:

```sh
node tools/summarize_intensive_farm.mjs test-results/intensive-sabana-mapungubwe-712.json
node tools/summarize_intensive_farm.mjs test-results/intensive-sabana-mapungubwe-712-mixed.json
```

Antes de resumir, ejecuta la auditoría de dinero entero, plantas cobradas, cajas físicas, riegos obligatorios, cargos por entrega y round-trip del guardado. Una victoria exige cien noches, día 101, ningún animal pendiente y un único evento de victoria. Las ejecuciones cortas o derrotadas permanecen `campaign100: unverified`.

El resultado conserva las filas diarias y agrupa por especie lo plantado, vivo, recogido, perdido, entregado y en tránsito. Los ingresos provienen de los cargos de entregas reales y se suman como enteros exactos; se serializan como strings. En esta estrategia no se retiran cultivos manualmente, por lo que una planta muerta sin caja representa una pérdida; no se generaliza esa clasificación a cualquier partida.

Se desglosan los segundos sin acciones por presupuesto, espacio, fin de jornada, incursión y noche. La fracción diurna sin acciones usa los tres primeros, como el simulador original; no equivale a aburrimiento medido en jugadores humanos ni a frametime. Los máximos de inactividad y número de especies permiten detectar una plantación grande pero poco variada o largos intervalos de espera antes de decidir si el balance necesita ajustes.

Las pruebas reutilizan las simulaciones legales existentes de apertura intensiva y mala gestión, comprobando conservación de plantas/cajas, entregas, pérdidas, ingresos y medidas diurnas. Este analizador no acredita por sí mismo las campañas de cien noches aún activas ni las treinta combinaciones de bioma/cultura.
