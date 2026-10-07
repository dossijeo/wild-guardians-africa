# Aislamiento operativo del suelo, Sabana

Fuente a8455e7, Mapungubwe/media/seed712, transición120–160m, bruma30–300m. Cuatro capturas: suelo simple visible/oculto en pose de horizonte y elevada. `farGroundMeshes` acredita MeshBasicMaterial visible false al ocultar; la geometría simple no tiene aFarWater, por eso el antiguo control no habría funcionado. No se utilizó aquel control en el A/B4276339.

En la pose de horizonte, cámara y objetivo son idénticos. La franja gris detrás de los árboles permanece con el suelo lejano invisible: cambiar solo su material no resuelve esa parte del fondo. No equivalencia por píxel ni aceptación artística. El suelo cercano continúa exacto; se registra el ensayo elevado para ver cuánto cubre realmente el proxy.

Baobab tramado identificado: slot2/ID0:-6:-4, distancia142.450m, altura32.250m, spriteMix0.591422, densityFade1, ready1. Aquí interviene el crossfade3D/2D, no la reducción de densidad. Se conserva diagnóstico completo con packing/firmas; falta resolver su legibilidad y medir coste de cualquier cambio.

GL0 y errores vacíos en ambas poses ocultas. No medición de rendimiento; GPU cedida a raíz al cerrar tab118.
