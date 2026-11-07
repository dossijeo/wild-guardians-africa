# Bloqueo del checkpoint con Attack provisional

Estado: **corregido y comprobado para aceptación de Attack**, con límites de
validación indicados abajo. La evidencia del bloqueo anterior procede
de `.cache/historical-islet-certified.json`, una prueba QA con WebGPU real en
la que se envió el objetivo por ID. Esa entrada no valida la selección por
píxel.

Al final de la captura, la autoridad y la presentación habían confirmado la
secuencia 325 y 15,85 s de simulación. La cola visual estaba vacía y el reloj
histórico no tenía ningún intervalo pendiente o retenido. Sin embargo:

- El guardián había iniciado un gesto provisional (`began: 1`), con dos
  fotogramas provisionales y sin confirmación ni rechazo.
- El diario de recuperación tenía 129 entradas, frente a un umbral alto de
  128; figuraba saturado, con checkpoint aplazado y sin reintento pendiente.
- El runtime estaba libre, pero `castAttack` seguía en su cola junto con pasos
  de simulación y otros comandos. No había diagnóstico de ejecución del ataque.

El ciclo observado es el siguiente. La presentación inicia inmediatamente el
gesto provisional. La exportación del checkpoint del guardián rechaza estados
provisionales, de modo que se aplaza el checkpoint de presentación. Al alcanzar
el umbral del diario, la autoridad deja de despachar trabajo, incluido el
`castAttack` que está esperando. El gesto provisional solo se confirma al
aplicarse el evento autoritativo correspondiente, o se elimina al recibir un
rechazo; su edad visual queda limitada y no se elimina por simple transcurso de
tiempo. Como el comando no se despacha, ninguna de esas salidas llega y no se
anuncia que el checkpoint vuelve a estar disponible.

`deferUntilBoundary` puede aplazar el inicio visual de la caída hasta que se
confirme un intervalo histórico, pero en esta captura no había intervalo
pendiente cuando se observó el bloqueo. No es la causa demostrada aquí.

La corrección conserva el orden de comandos y eventos y mantiene el gesto
provisional fuera del checkpoint. Con una base válida y checkpoint aplazado,
permite consumir una reserva acotada del diario para que puedan llegar los
resultados de órdenes ya aceptadas. Al agotarse la reserva detiene la admisión
y la captura de tiempo y comunica el problema; no garantiza drenar una cola
arbitraria. Los detalles están en [la reserva del checkpoint](deferred-checkpoint-reserve.md).

En una captura posterior con WebGPU real, el mismo escenario de manglares y
objetivo seleccionado por ID inició y confirmó un Attack, y el diario renovó
la base hasta la secuencia 854. La muestra final registra 27 entradas, hasta
la secuencia 881, sin saturación. La física histórica Rapier aislada pasó su
auditoría de pose. La [evidencia compacta](b-close-20261107/historical-physical.json)
registra asimismo que la prueba combinada falló por no observar sublímites
históricos de eventos. No demuestra selección por píxel, rechazo de Attack en
hardware ni recuperación completa sin duplicación de VFX. Las pruebas CPU de
la reserva modelan aceptación y rechazo, pero no sustituyen esas validaciones.
