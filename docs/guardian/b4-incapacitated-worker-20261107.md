# Presentación GPU del trabajador incapacitado

Cuando un trabajador confirmado sigue incapacitado pero ya ha terminado la caída, recuperación y mezcla de salida, el Worker gráfico solicita el banco compartido `Idle` o `Run` según la misma decisión de `workerPose`. La fase se actualiza en los límites confirmados: no se extrapola el movimiento ni se amplían los certificados históricos. La física, posición y decisiones permanecen en Wild Engine; si el banco o su admisión no están disponibles, continúa el rig CPU.

Las pruebas comparan vértices muestreados del proxy GPU con el rig CPU en los cuatro perfiles y varias fases, con tolerancia de 0,02 unidades. También cubren la selección de bancos y la exclusión de caída, recuperación y transición de salida. La comparación usa renderizador simulado y no demuestra continuidad perceptiva ni rendimiento en una partida WebGPU real.
