# Consultas y voz del tutorial en la vista confirmada — 2026-11-19

Durante la validación de A4 sobre la UI ordinaria aparecen dos bloqueos de A1 que impiden alcanzar la recuperación. Se corrigen en los límites existentes, sin nueva dependencia, propietario o permiso.

`tutorialMessageShownToday` consulta el historial diario sin crearlo ni reiniciarlo. La vista confirmada del Worker es inmutable: la consulta anterior intentaba añadir `shownToday` y abortaba el arranque. La inicialización y el registro siguen en las funciones mutables del controlador autoritativo; se conservan guardado y reinicio al amanecer.

El narrador también muestra avisos externos como `budget.reserve`. El puente del tutorial proyecta su identidad a `null` cuando no pertenece a `TUTORIAL_IDS`, usando el mismo catálogo que valida la autoridad. La voz válida permanece igual. La autoridad sigue rechazando un ID externo: no se amplía su protocolo ni se registra el aviso como una lección.

Las fuentes anteriores reproducen **20 pases/2 fallos**; las actuales pasan **22/22** y cuatro sintaxis. Las regresiones usan una vista congelada sin historial o con historial de otro día y el controlador autoritativo real. Se mantienen las comprobaciones existentes de orden, tiempo oculto, voz, reintentos y actualización; sus fixtures de voz utilizan ahora IDs reales del catálogo.

Esta es validación de esos límites CPU. **No acredita aún el relevo gráfico, cero reconstrucciones, cadencia ni aceptación integrada.** Los cambios de Worker/cliente/Surface/UI permanecen en progreso y se validarán por separado. A6/A/B/C siguen abiertos; D no iniciado.

Fuentes, listas, hashes, baseline y logs completos: [recibo](performance/native-confirmed-tutorial-read-validation-20261119.json).
