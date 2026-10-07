# Gran Cañón: cuarta silueta HQ corregida

Revisión raíz del candidato `1f9acab5`, con terreno y render del juego real,
semilla 712, Mapungubwe y calidad media. Cuatro capturas al azimut 275°,
elevaciones de 80 y 120 m respecto a la cámara inicial, de día y de noche.
La silueta anteriormente enterrada aparece sobre la meseta. Conserva detalle
erosionado, valles abiertos y tintado nocturno; no se observan los anteriores
cortes horizontales. La meseta oculta parte de las bases en estas vistas.

Los recibos originales acreditan buffer 1280×720, datum fijo Y=2,36,
atlas 2048×512, un sampler, cero errores de página y GL=0. `receipt.json`
identifica fuentes y hashes de atlas, recibos y capturas. El cambio regeneró
la imagen D mediante imagegen y ajustó su altura; no deforma las otras celdas.

Esta revisión desbloquea la preparación de la integración pública y PR.
No acredita móvil físico, todas las posiciones, filtrado temporal ni coste GPU
del Cañón. El benchmark anterior de Sabana conserva su alcance específico;
los contadores de estas capturas no son un ensayo comparativo de rendimiento.
Las elevaciones son diagnósticas; no equivalen al encuadre normal de gameplay.
Los negativos anteriores permanecen en `../hq-mountain-cost-path/`.

![Día a 80 m](canyon-d-80-day.png)

![Noche a 80 m](canyon-d-80-night.png)
