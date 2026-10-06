# Separar el 3D del impostor para medir su diferencia

Se añade a `far-native-transition.html` un selector diagnóstico: transición normal, solo 3D, solo impostor o fondo sin árbol. El selector no modifica el estado procedural ni los datos de instancias. Cambia la visibilidad del impostor y la cobertura de color nativa; al volver a transición se recupera la cobertura normal. La revisión incluye el modo para no reutilizar una cobertura anterior.

## Capturas y método

Acacia nativa de Sabana, día, orientación cero, cámara [0,10,50], LOD nativo 1 y atlas precocinado LOD 1, viewport 1280 × 720. Se prepara la GPU antes de capturar. En los cuatro modos permanecen readiness 1, gpuCovered true y WebGL sin errores. La cobertura nativa observada es respectivamente 1, 0, 0 y 0,5; el retorno a transición está registrado en `mixed.json`.

Las capturas PNG originales conservan panel y mundo. Se compara la región x ≥ 400 contra el fondo de la misma cámara, excluyendo el panel. Una máscara incluye los píxeles cuyo RGB difiere del fondo; por tanto también intervienen agujeros de hojas, antialias y sombreado. No es una extracción pura del contorno geométrico ni una métrica directa de calidad percibida.

| Umbral máximo de diferencia RGB | Píxeles 3D | Píxeles impostor | Intersección / unión |
| --- | ---: | ---: | ---: |
| > 0 | 14.054 | 14.147 | 91,13 % |
| > 8 | 9.030 | 9.248 | 84,63 % |

El 3D llega hasta y=423 con el umbral amplio, mientras el impostor llega hasta y=416. Con umbral >8, el extremo es y=417 frente a y=415. Esto permite observar la sensibilidad del recuento al antialias. Visualmente siguen diferenciándose huecos del follaje y base. Aunque comparten geometría fuente, todavía no coinciden exactamente en esta vista elevada.

Reproducir el análisis guardado:

```text
python tools/check_far_silhouette.py docs/qa/far-prelit-silhouette --output docs/qa/far-prelit-silhouette/summary.json
```

El script comprueba cámara, modo, preparación GPU, cobertura, errores y dimensiones, y calcula las máscaras mediante Pillow. La consola capturada está vacía. No se cambia código de gameplay ni se introduce otra pasada en el juego real.

## Siguiente comprobación

Usar estas mismas capturas como referencia al probar un ángulo de precálculo más representativo de la cámara. Debe mantenerse vertical el billboard, conservar el punto lógico de la base y evitar cambios de escala/altura al hacer crossfade. La diferencia del extremo inferior es una observación; no se atribuye exclusivamente al ángulo sin una comparación controlada.

Quedan movimiento continuo, otras alturas/orientaciones, noche y transición de luz, densidad, sombras e integración con WorldScene. Esta medición no demuestra una transición imperceptible ni rendimiento de móvil físico.
