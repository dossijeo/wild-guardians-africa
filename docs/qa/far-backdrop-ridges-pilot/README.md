# Piloto offline de composición de Sabana

El aislamiento a8455e7 conserva la banda gris aun ocultando el suelo lejano. Para comparar la composición del fondo, este atlas QA mantiene resolución2048×512, paleta, tres capas y lectura única, pero divide los siete relieves alrededor de360° en dieciocho más estrechos. El precálculo es determinista y no se ejecuta durante gameplay.

`backdropSvg('savanna',{savannaRidges:18})` genera el candidato; los valores por defecto conservan exactamente los seis assets desplegados. Diez pruebas de perfiles/materiales, incluida igualdad binaria de los defaults, pasan. La fixture acepta `backdrop-ridges=18` solo en Sabana, carga la variante mediante el ownership normal de atlas y la declara en el informe. No cambia shader, draw, dimensiones, posición ni coste de lecturas; su coste final debe comprobarse en escena.

Pendiente A/B nativo día/noche con cámara idéntica y movimiento. **No aceptación artística ni integración del asset en public**. El candidato también puede resultar demasiado puntiagudo/denso: conservar el contraste antes de decidir.
