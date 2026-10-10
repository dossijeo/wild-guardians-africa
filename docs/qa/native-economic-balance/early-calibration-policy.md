# Política de parada temprana de calibración

Indicación del usuario, 10 de octubre de 2026: detener las simulaciones cuando se detecte tempranamente un balance claramente erróneo, recalcular los parámetros y volver a lanzarlas. No completar campañas largas cuya candidata ya ha fallado.

- Antes de cada piloto, registrar fuente congelada, semillas, estrategia, parámetros, horizonte corto y criterios de revisión. Ampliar el horizonte sólo si los controles anteriores justifican continuar.
- Revisar tesorería y flujo neto, capacidad laboral y tareas pendientes, pérdidas reales, intercepción de murallas y actividad significativa. Una mala jornada aislada no basta para declarar un desequilibrio; un fallo concluyente o una tendencia incompatible con el objetivo sí requiere parar.
- Usar la parada cooperativa del runner mediante `--stop-file`, conservando diario, estado parcial y recibo. No registrar una parada de calibración como derrota del juego ni como campaña completada. Una derrota decidida por el motor conserva su clasificación nativa.
- Diagnosticar primero si falla la candidata económica, el comportamiento físico, la estrategia automatizada o el harness. Recalcular únicamente los parámetros relacionados con la causa; documentar los cambios antes del siguiente piloto. No compensar una mala política de contratación alterando los precios o el daño de producción.
- Mantener todos los resultados negativos y comparar las candidatas con la misma lógica económica y condiciones declaradas. No imponer porcentajes de destrucción, ingresos anticipados ni gastos ficticios.
- Escalar a varias semillas y a 100/180 noches después de superar los controles cortos. Un piloto favorable no sustituye esa validación final.

Aplicación actual: el piloto `6cdf5d84/Q4/no-walls/712` terminó en derrota nativa tras cuatro noches, antes del calendario de presión que empieza en la sexta. Se rechaza Q4 como receta de buena gestión; no se atribuye esa derrota al nuevo calendario ni se lanza una campaña larga con esa política. Véase [análisis preservado](pilot-pressure-6cdf5d84-q4-no-walls-712-6/analysis.md).
