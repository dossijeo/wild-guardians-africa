# Bloqueo del checkpoint con Attack provisional

Estado: **pendiente de corrección y validación integrada**. La evidencia procede
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

La corrección debe conservar el orden de los comandos y eventos y no registrar
el efecto provisional como estado confirmado. La validación debe incluir tanto
aceptación como rechazo del ataque, renovación del checkpoint bajo saturación,
reproducción o recuperación sin VFX duplicados y entrada durante un intervalo
histórico. Hasta completar esas pruebas no se considera resuelto el problema.
