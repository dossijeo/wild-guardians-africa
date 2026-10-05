# Registro terminal de cien noches intensivas

El proceso original terminó con código 0 y victoria tras cien noches de sabana / Mapungubwe, semilla 712. El registro conservado en `intensive-savanna-100/legacy-log.json` contiene las cien filas diarias y el resumen terminal: 14.558 brotes, 14.095 entregas, 224 plantas destruidas, 413 plantas vivas como máximo y saldo final de 2.077 monedas. Hubo cien incursiones resueltas, cien contrataciones y un evento de victoria.

La estrategia plantaba repetidamente con comandos ordinarios, reservaba contratación y mantenimiento y usaba los recorridos físicos de los trabajadores. El registro cuenta cien recargas dentro de la simulación. No acredita por sí solo escrituras en el almacenamiento de un navegador.

Los intervalos diurnos sin acciones suman 15.148 de 30.000 segundos (50,49 %). La supervivencia no resuelve el requisito de reducir las esperas del jugador. Tampoco permite acreditar la variedad de especies, el flujo contable por categoría ni las treinta combinaciones de bioma y cultura.

Al finalizar no estaban presentes los archivos de informe y snapshot esperados en `test-results`. La versión exacta cargada por aquel proceso tampoco dispone de la cabecera de procedencia incorporada posteriormente. No se reconstruye un snapshot a partir de los contadores ni se atribuye el resultado al HEAD actual.

Se inició una ejecución nueva de `node tools/check_intensive_farm.mjs 100`, con registro en `.cache/intensive-current-recorded-100.log`. Esta versión registra los hashes del código antes de simular y escribe informe y estado final antes de auditar la victoria. Su resultado sigue pendiente: permitirá comprobar economía, riegos, entregas y persistencia real sin inventar los datos ausentes de la ejecución anterior.
