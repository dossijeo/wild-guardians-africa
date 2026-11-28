# Trazo de muralla sobre una publicación confirmada

El trazo captura la secuencia confirmada al soltar. El indicador aparece enseguida y el picking espera `waitForCurrentFrame` para esa secuencia fija. Luego consulta el terreno una vez. La cámara, el viewport, el mundo, la herramienta y el binding conservan su identidad hasta entregar el resultado. El cambio de herramienta o de binding invalida también los resultados que ya esperan detrás de otro trazo. Una cancelación retira el indicador y una publicación tardía queda fuera del plazo de espera.

En Godot 4.4, `RenderingServerDefault::_draw` termina los trabajos de dibujo antes de entregar los callbacks de ese frame. El análogo de Wild Guardians es su barrera de frame vigente, que añade secuencia, cámara y viewport y ya se usa al cambiar la vista. La orden de construcción sigue en el Worker de autoridad. [Código de Godot](https://github.com/godotengine/godot/blob/4.4/servers/rendering/rendering_server_default.cpp).

En dos ensayos sobre NVIDIA Turing, un arrastre produjo un solo picking, una sola orden, un solo `WallChainBuilt` y tres módulos de zarzas seleccionables. El auditor usa el flujo normal de carga y construcción y registra las marcas de la interfaz sin introducir una demora artificial en la orden. En el ensayo final, la vista estaba en 32 y la autoridad exigía 119. El frame 119 desbloqueó la única consulta, que devolvió la secuencia 120. [Primer ensayo](performance/native-build-active-farm-20261120/stroke-candidate.json) · [Ensayo final](performance/native-build-active-farm-20261120/stroke-final.json) · [Auditor](../../tools/experiments/audit_early_native_gpu_wall_chain.mjs).

| Marca | Primer ensayo | Ensayo final |
| --- | ---: | ---: |
| Soltar a indicador | 0,51 ms | 0,69 ms |
| Indicador a frame vigente | 4,33 s | 4,80 s |
| Consulta del terreno | 13,33 ms | 47,74 ms |
| Orden a respuesta del Worker | 781 ms | 666 ms |
| Soltar a confirmación inspeccionada del Surface | 9,85 s | 11,05 s |

La última fila incluye el coste de sondear el Surface. Quedan atribuir el retraso de publicación, medir el primer dibujo de la obra y cumplir el objetivo de C4. El relevo gráfico de una ruta activa se sigue en el [caso de Farm](native-build-active-farm-20261120.md).

Pasaron 172 pruebas en 15 archivos, incluidas cancelación, cambio de herramienta y entrega ordenada de dos trazos. Pasaron también el build de Vite y el empaquetado de recursos.

## Captura del retraso de publicación

En un tercer ensayo con muestreo acotado, la autoridad exigía la secuencia 123 y la vista dibujaba la 34. Justo antes del trazo, el Worker gráfico había recibido hasta la 66, tenía 32 pendientes y esperaba recursos VFX para la 35. La primera muestra con recepción de la 123 llegó 3,16 s después de soltar, con la vista en 91 y 32 pendientes. El frame 124 liberó la consulta a los 5,13 s. Entre ambos extremos hubo 38 muestras, con 23 que registraron una frontera histórica pendiente y 13 que registraron preparación pendiente. El tramo medido de entrega de los mensajes de diagnóstico al hilo principal estuvo entre 0,1 y 2,1 ms. Queda atribuir la espera acumulada dentro de la entrega y el consumo de las publicaciones.

El Worker de autoridad respondió a los 5,68 s. El primer registro de fin de dibujo cuyo contador incluía los tres módulos correspondió a la secuencia 210, a los 10,33 s desde soltar. Esa marca identifica cuándo el frame incorporó el contador. El auditor inspeccionó después las piezas seleccionables a los 11,38 s. La captura registra el feedback provisional por separado. La presentación física y los intervalos C4 requieren su propia medición. [Captura completa, 128 muestras del Worker sin desbordamiento](performance/native-build-active-farm-20261120/stroke-publication-latency.json.gz).
