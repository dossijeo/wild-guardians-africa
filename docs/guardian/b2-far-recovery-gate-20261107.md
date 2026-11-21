# Consultas regionales durante recuperación

El stream gráfico no envía consultas regionales antes de negociar la línea temporal ni mientras reproduce un checkpoint. Devuelve `null` inmediatamente y permite volver a solicitar tras el paso a vivo; la presentación no espera al Worker de autoridad. La recuperación construye un stream nuevo. Al separar el stream anterior, sus consultas pendientes se cancelan y sus respuestas tardías no se entregan al reemplazo.

Las pruebas usan puertos `MessageChannel` reales para el replay y la separación, y un puerto controlado para la negociación. Comprueban que no se envía una consulta prematura, que se puede solicitar tras la recuperación y que la respuesta tardía no se aplica ni provoca un fallo. No son una recuperación completa en navegador ni una validación de renderizado o rendimiento en GPU.
