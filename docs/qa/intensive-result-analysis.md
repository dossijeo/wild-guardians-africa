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

Las siguientes ejecuciones CLI registran antes de empezar su fecha, argumentos, versión de Node, HEAD, archivos con cambios tracked y SHA-256 de los módulos/datos de src, package-lock y los dos scripts de simulación. El informe conserva esos datos y el resumen los transmite. Una ejecución larga conserva el código cargado al inicio aunque main reciba nuevos commits. Los procesos que ya estaban activos carecen de esta cabecera: su procedencia permanece sin acreditar por este mecanismo, y no se rellena retrospectivamente con el HEAD actual.

El sexto argumento CLI permite comparar los perfiles ordinarios del juego sin modificar sus salarios, animaciones, velocidad, rendimiento ni jornada. Por ejemplo: `node tools/check_intensive_farm.mjs 10 gran-canon mapungubwe mixed youngFemale`. Los perfiles alternativos escriben archivos con su propio sufijo, conservando los resultados de olderFemale; la política del informe identifica profile y mixed. Esta comparación no sustituye las campañas responsables de cien noches ni autoriza tratar diez noches como victoria.
