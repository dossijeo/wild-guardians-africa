# Paradas tempranas de calibración

Por indicación del jugador, no completar 100/180 noches cuando los resultados tempranos ya descartan un balance. Conservar siempre la evidencia negativa, recalcular los parámetros y abrir una tanda nueva con otro directorio; nunca sobrescribir ni presentar una parada como derrota nativa.

Usar primero horizontes cortos (7/14/21 días según el supuesto evaluado). Revisar solvencia, superávit sostenido, pérdida agrícola real, coste defensivo y diferencia entre estrategias antes de ampliar el horizonte. Una anomalía de entrada física invalida la prueba técnica; no demuestra un fallo económico.

El CLI admite `--stop-file RUTA`: crear ese archivo solicita parada cooperativa al siguiente tick observado. También admite el par explícito `--stop-cash MONEDAS --stop-min-day DIA`, para rechazar automáticamente una candidata que supere el techo económico documentado previamente. No existe un techo predeterminado ni una condición oculta de derrota. Registrar el motivo y justificar el umbral específico antes de lanzar cada candidata.

La parada conserva diario, estado comprimido y observadores parciales mediante el mecanismo de captura del runner. El recibo queda como `stopped-early-calibration` y el proceso devuelve código3, distinto del error técnico1 y derrota nativa2. La señal se comprueba entre ticks, no interrumpe a mitad de una transacción; durante una espera de entrada se atiende cuando la espera devuelve control o produce su error técnico. Las pruebas de CLI son contratos con dobles, no campañas ni QA visual.

La tanda77cfb1ac sin murallas fue detenida mediante terminación de proceso porque todavía no existía esta capacidad: conservó58 días completos y304.814 monedas, pero perdió la snapshot y observadores en memoria. Su recibo documenta expresamente esa limitación. La estrategia usaba magia, por lo que no equivale a ausencia total de defensas.

No cambiar precios, ingresos o daño dependiendo de estrategia/riqueza para conseguir resultados. Ajustar una candidata común y contrastar campañas nativas. Los porcentajes objetivos son hipótesis, nunca instrucciones para borrar plantas.
