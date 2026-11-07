# Transición de carga WebGPU Worker

El perfil Worker mantiene la simulación pausada mediante una razón propia durante la transición. Solicita una cámara dirigida al cielo y espera un fotograma enviado por el Worker para la versión actual de cámara y viewport; entonces retira el progreso y el botón de cancelación. Mantiene el HUD oculto, espera terreno confirmado en el punto de interés y gira suavemente hacia el encuadre de juego. Al terminar o fallar restaura su pausa; el cambio de mundo o la cancelación impiden que una respuesta tardía controle la nueva sesión.

La señal de fotograma acredita un dibujo enviado, no la presentación física por el compositor. Una prueba con Worker de autoridad y WASM reales verifica que se genera y confirma un chunk mientras la razón de pausa está activa; la publicación gráfica se simula. Faltan validación visual y de dispositivo, tiempos de carga y comprobación en partida. La integración parcial del diorama descrita abajo no cierra B7 ni afirma paridad visual con el original.

# Diorama de carga Worker WebGPU

El perfil Worker crea un canvas independiente para el jardín durante la carga. Su Worker usa el cielo WebGPU y el roster real de maíz, mientras `LoadingPlants` y la órbita existentes controlan crecimiento e interacción. La interfaz acumula como máximo un frame pendiente y la transición espera una primera escena dibujada y la maduración de las plantas; la cancelación termina el Worker y rechaza la espera. El progreso Worker utiliza hitos de configuración, preparación gráfica, terreno y vista, sin fingir las precargas de la ruta histórica.

La integración es parcial: aún no traslada el telón de montañas, la niebla, los destellos ni todos los ajustes AfricanToon del diorama original. Mantiene temporalmente dos contextos GPU durante la carga porque el renderizador de partida es otro Worker; medir esa duplicación y unificarlos cuando sea viable. Las pruebas unitarias y la compilación no acreditan paridad visual, funcionamiento de imágenes y shaders en navegador, coste GPU ni ausencia de tirones. El paso a la vista de juego sigue pendiente de validación en GPU real.
