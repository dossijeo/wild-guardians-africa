# Actualización del tutorial durante pausas

El bridge enviaba `tutorialCommand/update` en cada frame y `advance` continuamente aunque el mensaje estuviera oculto, ausente o narrándose. Cada orden reactivaba la captura del reloj de la simulación, incluso con una pausa quiescente. Una captura diagnóstica confirmó ambos flujos; no se atribuye a este cambio un beneficio de rendimiento sin comparar una partida real.

Mientras `menu` está confirmado se suspende únicamente el polling de `update` del bridge Worker. Al solicitar cerrar el menú se encola inmediatamente una única orden `resume-menu`: la autoridad evalúa primero el tutorial y después elimina la pausa de menú en la misma orden; el bridge procesa la presentación y registros obtenidos. Las demás pausas, incluida `hidden`, se conservan y la ruta local/legacy no cambia. Si el bridge no está iniciado se utiliza el `resume` normal.

`advance` sigue enviando el primer reseteo cuando el mensaje no es visible, no existe o está siendo narrado, pero no repite un reseteo equivalente hasta cambiar la visibilidad, identidad o narración. Cuando no existe una presentación confirmada o la misma está narrándose, el bridge envía `visible:false` para que una presentación nueva en autoridad aún no mostrada no acumule edad. La cola mantiene el orden al alternar estados visibles y ocultos; un fallo permite reintentar. Las pruebas cubren las transiciones, fallos, salidas de menú, registros y el estado autoritativo de referencia.

Fuera del menú el polling `update` por frame permanece; su sustitución por invalidación de eventos es trabajo independiente y no se declara resuelta aquí.
