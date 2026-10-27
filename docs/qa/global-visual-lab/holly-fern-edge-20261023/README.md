# Borde gradual del manto de helechos

Solicitud del usuario: reducir alrededor del 30% la densidad periférica para romper la franja uniforme, conservando interior, tono y tamaño.

Variante QA sobre los helechos de tono intermedio. Durante la generación de tiles cacheados se reutilizan las ocho muestras de cobertura/desgaste que ya verificaban la huella. Un gradiente de periferia combina cobertura baja y desgaste alto: la probabilidad de descarte va de cero en el interior a 0,30 en el extremo. Hash independiente de semilla y celda, fijo al mover la cámara; no aleatoriedad temporal ni transparencia. No añade consultas de navegación, pasadas de render ni muestreos extra de terreno. Los límites de agua, caminos, cultivos y obstáculos permanecen.

El 30% es la probabilidad máxima exterior, no un recorte global ni exactamente 30% de toda la banda. Los 4503 candidatos cacheados de transición incluyen 598 descartes (13,3% promedio por el gradiente); el interior queda fuera del descarte. En las vistas cercana/juego/opuesta hay 3884→3662, 4376→4247 y 4148→3996 matas. El número de draws permanece igual, la diferencia de triángulos coincide exactamente con 16 por mata retirada. No se afirma mejora FPS sin completar benchmarks.

Seis capturas reales con cámara/semilla/hora/resolución/calidad idénticas al control, día/noche, fondo e impostores completos. Comparativas: control a la izquierda, periferia irregular a la derecha. El borde izquierdo resulta algo más abierto y deja frondas aisladas delante de la masa; es una mejora discreta, no una eliminación demostrada de toda uniformidad a cualquier distancia. Las tres poblaciones vuelven a ser exactamente iguales al repetir cámaras de noche; pendiente vídeo de movimiento, calidad baja y serie de rendimiento final.

Reproducción: Vite 5190, `node tools/experiments/capture-holly-fern-edge-20261023.mjs`. La modificación se inyecta mediante route en QA, no cambia src ni la opción por defecto. Utiliza geometría/material/assets ya publicados en e32adf500. Conserva la variante anterior como control. No integra nada en main.
