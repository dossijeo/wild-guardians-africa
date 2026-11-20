# Fin de turno de una acción y un transporte adquiridos

Continúa A6/e-R3/f-R4 sobre la base publicada a1678a9be. La corrección gráfica sigue limitada por los dos casos A4/C4 del [estado actual](CURRENT-STATUS.md): holds por encima de 1000/60 y admisión ordinaria del Host. Este incremento semántico es independiente de esa propiedad; el productor Idle permanece desactivado y no hay nueva aceptación Worker/Surface/GPU ni de 60 FPS. A6/A/B/C siguen abiertos y D no se inicia.

## Regla y referencia real

Game ya permite que los trabajadores actuando o cargando terminen su trabajo al acabar el turno. El clasificador nativo reconocía Home, Farm e Idle, pero rechazaba los programas adquiridos de Harvest15 y Carry16 antes de poder avanzar el siguiente paso.

Se releyeron [requestMoveTarget y update de DetourCrowd1.6](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): la petición pertenece al agente existente y se tramita separadamente de su ejecución. Se conserva aquí la identidad y el programa adquirido. La política laboral procede exclusivamente del Game actual; Detour no define contratación ni horarios. El código consultado y su SHA están archivados con la evidencia.

El cambio son dos cláusulas en nativeReturnBoundarySupported. Exigen el estado Game, la marca nativa correspondiente y una consulta positiva de la ejecución realmente adquirida. Reutilizan nativeTaskActionExecution y nativeDeliveryExecution. Los demás controles de proyección, cuerpo, tarea, tiempo y consecuencia siguen vigentes.

## Evidencia y límites

- 20 casos nuevos, cuatro perfiles y motores standalone/pthread: Harvest activo y transporte aún sin llegar cruzan el fin de turno y terminan sólo su programa finito. Acción conserva cuerpo y tarea; Carry mantiene cuerpo y caja hasta la llegada. Ledger y consecuencias no se anticipan.
- Dos negativos conservan el rechazo del Task caminando; otro par acredita llegada, liquidación17, asiento económico único y propuesta Home genuina sobre el cuerpo original.
- El Game instalado anterior dio 20 tests: 2 pass / 18 fail, sin cancelaciones ni omisiones. Todos los fallos eran el rechazo de la frontera de retorno. La versión instalada final pasó 732/732 en 46 archivos, incluidos los 20 nuevos, sin cancelaciones ni omisiones; build de aplicación aprobado y dos comprobaciones de sintaxis. El detector transitivo proponía 697 archivos por importar Game: esa selección completa no se ejecutó y no se declara una suite global verde.
- 9053 entradas permanecieron estables durante la validación. Las cuatro rutas QA concurrentes del agente de corrección se excluyeron explícitamente y se registraron antes/después; no son dependencias de Game/build ni de esta selección. Se verificaron 16 archivos ajenos, 38 entradas externas de A5 y 64 entradas nativas. No se recompiló WASM ni se cambió su ABI.

Los fixtures de fuente configuran la hora diaria cerca del límite y usan tick, cuerpos y programas nativos reales, con commits de preparación confiados. No son un recorrido ordinario de publicación gráfica. La validación usa directamente el Game instalado, sin loader ni sustitución de binarios. El transporte genera su liquidación y Home sólo mediante los contratos existentes.

Task caminando necesita todavía parada preparada y Home; la expiración por cambio de día, restauración completa del borde y aceptación gráfica de todo el ciclo siguen pendientes. Este componente no resuelve esos casos ni las superaciones del presupuesto de 60 FPS.

[Recibo, comandos y mapas](performance/native-task-shift-end-20261120/validation.json) · [Archivo verificable](performance/native-task-shift-end-20261120/manifest.json) · [Referencia y decisión](performance/native-task-shift-end-20261120/research.json).

Repetición del componente con Node 20 y los WASM canónicos instalados:

    .cache/tooling/node20.exe --test tests/native-task-shift-end-game.test.js

El recibo conserva la selección completa de 46 archivos, el entorno y el comando de build. Los tiempos de jobs concurrentes son cotas hasta la observación del resultado, no mediciones de rendimiento; TAP y la fase de Vite se registran por separado.
