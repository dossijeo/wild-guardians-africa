# Selector original y conservación de ranuras

Comprobación integrada del 3 de octubre de 2026 sobre `c2e1cd2`, usando exclusivamente la UI del juego en `127.0.0.1:5176`. El origen y sus ranuras son independientes de los del usuario en 5173.

Se recorrieron seis biomas y cinco culturas en el iframe del selector original, en inglés. En las 30 combinaciones la cultura elegida quedó marcada, el texto del botón Comenzar correspondió a ambos nombres y el botón estuvo habilitado. Siempre hubo cinco opciones de cultura. Datos de las 30 observaciones: [selector-matrix-en.json](qa/acceptance-start/selector-matrix-en.json).

Desierto/Etíope se conservó al volver al paso del bioma, avanzar otra vez y reabrir Nueva partida después del regreso al santuario. Evidencia: [retained-selection-en.png](qa/acceptance-start/retained-selection-en.png). La UI presentó «Returning to the sanctuary» durante el retorno y después retiró el diálogo; el adaptador llama al `back` original y limpia los iframes cuando el menú vuelve al estado de inicio.

Antes de iniciar otro mundo, Continuar mostró únicamente la ranura Mapungubwe/Sabana, día 1, 95 monedas: [saved-slot-after-cancel.txt](qa/acceptance-start/saved-slot-after-cancel.txt). Después del arranque de Desierto/Etíope hubo un canvas de mundo y cero iframes de menú. Tras guardar, Continuar mostró exactamente dos ranuras: la nueva con 1.000 y la anterior con 95, que también se pudo cargar conservando el tutorial: [two-slots-after-start.txt](qa/acceptance-start/two-slots-after-start.txt). [Segundo arranque](qa/acceptance-start/desert-ethiopian-start.png).

El doble clic por coordenadas se interrumpió al desmontarse el documento del selector, igual que el intento con locator. No se acredita que el segundo evento llegase al juego: QA-002 sigue parcial aunque su resultado observado sea un único mundo y una ranura adicional.

QA-001 sigue parcial: se verificó el selector de las 30 combinaciones y el arranque visual de dos, no los otros 28 mundos. QA-004 queda acreditado mediante esta conservación de la ranura previa, las pruebas visuales de rechazo/cancelación y la prueba de dominio que verifica ausencia de cobro y supresiones al rechazar la colocación. No se ha comprobado todavía todo QA-006: falta la matriz móvil de contratación y confirmaciones.
