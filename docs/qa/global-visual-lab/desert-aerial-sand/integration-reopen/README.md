# Arena integrada: reaperturas en la misma aplicación

Seis ciclos completos (tres en media y tres en baja), cada calidad dentro de la misma página, sin recarga entre ciclos. Se vuelve al menú mediante la función normal de la aplicación —incluido guardado/cierre— y se inicia una partida nueva desde el menú. No es un simple reset del material.

Semilla712, Desierto/Mapungubwe, global-lighting y sandRelief=1, 1280×720. Partidas pausadas, cámara fija de poblado, visual clock congelado; día150/noche350. Doce capturas. Las ocho comparaciones de reaperturas contra su primer ciclo son RGB idénticas, con iguales cámara, objetivo, hora, draw calls y triángulos. Cuatro filas adicionales del JSON comparan los controles consigo mismos; no se cuentan como comparativas independientes.

Cada ciclo crea nuevos objetos de normal y fuente. Ambos se liberan exactamente una vez al volver al menú; BiomeGround queda disposed, con cero mapas y máscaras propios. Los seis cierres pasan, sin errores HTTP/JS/GL registrados. [Datos](results.json), [comparación](comparison.json).

Contadores Three durante captura: media108 geometrías y61→54→54 texturas; baja87 geometrías y59→52→52 texturas. No hay crecimiento entre las dos reaperturas observadas. Son objetos, no bytes GPU/CPU; no prueban ausencia de fugas en sesiones largas y no se atribuye la diferencia inicial de siete texturas a la arena. No se midieron GC, VRAM ni rendimiento en este pase.

Capturas sin pérdida: [primer día media](media-0-day.webp), [tercer día media](media-2-day.webp), [primera noche baja](baja-0-night.webp), [tercera noche baja](baja-2-night.webp). Se incluyen las doce y se verifican contra los PNG originales.

## Reproducción

Vite5190. Ejecutar `node tools/experiments/check-integrated-desert-sand-reopen.mjs` y `python tools/experiments/package-integrated-desert-sand-reopen.py` (Pillow/NumPy). Las rutas del navegador solo exponen el mundo y la función de menú para observación; la aplicación conserva su ciclo de carga/cierre.

## Decisión

Conservar la opción de arena: paridad artística, nuevos chunks, cierre y reapertura corta están verificados. Mantener el original por defecto. El siguiente pase debe revisar el conjunto de candidatos de los seis biomas, empezando por Sabana/Río/Cañón, y su coste acumulado; no seguir extendiendo micropruebas de este único material. Calidad global aún no acreditada.
