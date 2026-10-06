# Campaña intensiva de 100 noches — revisión c04c069

La campaña congelada de Manglares/Saheliana, seed 712, ha terminado con victoria tras 100 noches. Su proceso original (20608) ha finalizado. Se conservan el informe, resumen, estado final comprimido, estado del proceso y tabla económica histórica; los 256 archivos incluidos en la procedencia coinciden por SHA-256 con la copia de fuentes utilizada por aquella ejecución.

La estrategia usa comandos normales sobre terreno nativo, contratos diarios, cola de tareas, riego, recogida y entrega física. Planta continuamente mientras puede pagar nuevas semillas y conservar las reservas crecientes de personal y mantenimiento. Mezcla las ocho especies a partir del día diez. No usa la política adicional de murallas/defensa (`defend=false`); esto no significa que prescinda de magia: el informe registra 783 activaciones de poderes. Tampoco prueba todas las decisiones posibles de un jugador.

Resultados registrados:

- 23.636 siembras y un máximo de 1.719 cultivos vivos.
- 21.892 entregas físicas; todas las jornadas tienen personal contratado y entregas (mínimos: seis trabajadores y cuarenta entregas).
- 112 incursiones y 336 cultivos destruidos. 112 ciclos de guardado/restauración del simulador.
- Saldo final de 540.968 monedas; ingreso de 1.652.711, semillas de 840.103, jornales de 272.340 y centro de 800. La contabilidad reconcilia exactamente desde las 1.500 monedas iniciales. No hubo cobros de reparación en esta estrategia.
- 6.044 segundos diurnos sin acción disponible en la política, de 30.000: 20,15 %. Se desglosan en 4.046 por presupuesto y 1.998 tras el cierre de turno. Las esperas nocturnas y de incursión se registran aparte; esta métrica no mide actividad real de una persona ni frametime.

`financial-audit.json` es una reconciliación independiente del ledger, las semillas y las cajas realmente entregadas, usando la tabla histórica verificada por hash. No incluye los escenarios hipotéticos de cambio de precios del analizador. Reproducir con `node tools/analyze_farm_margin.mjs docs/qa/intensive-margin-100-c04c069 docs/qa/intensive-margin-100-c04c069/source-balance.js.gz` (el comando completo también imprime escenarios contrafactuales que no son nuevas simulaciones).

Este resultado **no aprueba el HEAD actual**. La auditoría contra 02d252e identifica treinta archivos históricos modificados y quince fuentes adicionales; entre ellos cambian movimiento, tareas, navegación y consultas de agua/lava. No prueba render, audio, móvil físico, otras culturas/biomas/seeds ni la política de mala gestión. El margen elevado de esta partida tampoco establece por sí solo dificultad adecuada.

Se ha iniciado la misma estrategia de 100 noches sobre una copia nueva congelada de 02d252e, en `.cache/qa-margin-current-02d252e`, con 433 archivos e inventario SHA-256. Sesión de ejecución 50749, PID inicial 40968, estado comprobado `running` con avance de jornadas. Esa ejecución seguirá registrando sus fuentes originales aunque main reciba cambios posteriores. Su resultado permanece pendiente y debe auditarse separadamente cuando termine.
