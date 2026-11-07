# Reposo precocinado de trabajadores

El Worker gráfico solicita bajo demanda un banco compartido `Idle` para cada perfil. La ruta GPU se activa solo cuando la pose original es Idle en estado `idle` o `waiting`, sin recuperación, incapacitación ni espera ante una puerta. La variante `watch` y las demás poses conservan el rig CPU. El banco contiene 115 muestras por perfil, 206.540 bytes por perfil en disco, y el generador valida que no haya herramientas rígidas visibles.

La fase toma `idleState.elapsed` cuando existe y el tiempo de simulación confirmado en los demás casos. Entre publicaciones queda fija; durante un tramo histórico certificado usa las muestras autoritativas, rechaza cambios de modo o fases decrecientes y se detiene en el horizonte confirmado. Las pruebas cubren cambio de fase, cancelación, vuelta al rig y muestras con Wild Engine/WASM contra una autoridad de referencia. La comparación de poses comprueba vértices muestreados de los cuatro modelos, no una comparación de imágenes ni una ejecución en GPU real.

El movimiento de herramientas rígidas para regar, plantar y reparar no está cubierto por este banco: esas acciones siguen en CPU. No se han medido la memoria GPU, el impacto en carga ni el rendimiento de una partida. `node tools/guardian/build-worker-gpu-walk.mjs --clip=Idle --check` verifica los cuatro bakes.
