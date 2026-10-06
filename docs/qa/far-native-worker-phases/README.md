# Desglose de preparación de ImageBitmap en worker

Se instrumentan doce conversiones en cuatro lotes Bitmap, intercalados con cuatro lotes HTML mediante ABBAABBA. La prueba aislada mantiene un worker nuevo por textura y no altera el cargador del juego. Continúa desactivada por defecto.

El worker registra intervalos para obtener cabeceras, leer el cuerpo y convertir el Blob. La página registra arranque + despacho y transferencia + entrega utilizando `performance.timeOrigin + performance.now()` de ambos contextos. Estos dos intervalos incluyen planificación; no son medidas puras de CPU ni de transferencia. No se mide GPU elapsed ni RAM. No se purga la caché HTTP.

| Fase por textura | Mediana | Rango |
| --- | ---: | ---: |
| Arranque y despacho | 24,0 ms | 20,4–50,5 ms |
| Fetch hasta cabeceras | 13,3 ms | 4,1–21,7 ms |
| Lectura del cuerpo | 7,1 ms | 1,7–13,8 ms |
| Conversión a bitmap | 106,55 ms | 89,6–291,9 ms |
| Transferencia y entrega | 0,4 ms | 0,1–5,3 ms |

En esta ejecución el principal intervalo observado corresponde a la conversión. Las medianas de fases no deben sumarse como si describieran una misma muestra. El arranque es una oportunidad secundaria; reutilizar un worker no eliminaría el coste de conversión mostrado.

| Medida por lote | HTML | Bitmap en worker |
| --- | ---: | ---: |
| Mediana de preparación total | 579,0 ms | 797,35 ms |
| Mediana del máximo lote de subida | 256,15 ms | 28,95 ms |
| Máximos intervalos de frame, cuatro lotes | 249,2–282,7 ms | 33,1–50,1 ms |
| Frames registrados por lote | 6–9 | 43–49 |

Los ocho lotes terminan sin errores, con tres programas y cero errores WebGL. `console.json` está vacío. `ready.png` muestra el último lote HTML; no se presenta como una captura de bitmap. La equivalencia visual del worker está comprobada por separado en `../far-native-bitmap-worker/`.

El resultado apoya continuar investigando la conversión fuera del hilo principal, pero no acredita estabilidad general: las esperas de 3–7 segundos y los picos anteriores no se reprodujeron y su causa sigue sin identificar. No se puede concluir que añadir telemetría haya mejorado el rendimiento. Esta prueba no cubre gameplay, móvil ni todos los biomas.

Tests: once casos pasan para conversión, propiedad, cancelación, errores, fases y liberación si falla el observador de tiempos. El desglose queda en `abba-report.json` y `summary.json`, incluidos los intervalos crudos de cada lote.
