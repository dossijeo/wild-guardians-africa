# Color del barro: orden de conversión, no solución completa

Comparación con transición por altura calibrada activa en ambos lados. A multiplica RGB codificado por(.58,.61,.64). B aplica toLinear4, multiplica el mismo factor y vuelve mediante sRGBTransferOETF antes de la iluminación del terreno. Distribución, alturas, normales, AO y rugosidad quedan iguales.

[Oblicua diurna](manglares-media-day-2-pair.webp) · [Oblicua nocturna](manglares-media-night-2-pair.webp). Izquierda A, derecha B. Inspeccionadas imágenes completas de B en estas dos vistas.

La candidata aclara el barro, pero permanece la diferencia con los parches independientes y el tinte azul nocturno. **No adoptar como corrección visual completa.** No se demuestra mejora de volumen ni coherencia suficiente. No ajustar otro multiplicador de color para encubrir una diferencia de iluminación sin aislarla.

## Alcance técnico

MudPatches carga la base con assets.texture(...,true), que establece SRGBColorSpace. El helper de parches recibe esa muestra lineal, aplica el multiplicador y convierte mediante OETF. La capa de suelo carga datos sin etiqueta sRGB. La variante se aproxima al orden del helper, pero toLinear4 usa pow(c,2.2), no la función sRGB exacta. Además, la ruta del suelo convierte luego su color otra vez con esa aproximación. Por tanto, este ensayo no demuestra equivalencia exacta entre rutas ni constituye una corrección final del espacio de color.

El interior de los parches usa africanToon4 y otra rugosidad; el suelo usa iluminación de terreno. La prueba no aísla cada término de iluminación. Que persista el azul demuestra que esta modificación de color sola no lo resuelve, no identifica por sí misma un único término culpable. El siguiente diagnóstico debe separar esas respuestas antes de nuevas calibraciones cromáticas.

## Evidencia y límites

24 capturas / 12 parejas, media/baja, día150/noche350, tres vistas próximas a una transición, seed712,1280×720. Cámara, objetivo, hora, draw calls y triángulos coinciden; sin errores registrados. Las conversiones individuales sin pérdida se verificaron contra PNG; pares reducidos publicados. [Registros](captures.json) · [Comparación](comparison.json).

No lecturas de textura nuevas frente a la variante anterior; añade conversiones de color. No hay benchmark nuevo, validación temporal, horizonte o lifecycle en este pase. La opción linearSoil queda falsa por defecto incluso en el helper QA, conservando la reproducción de las series anteriores. Main, simulación, navegación y modelos intactos.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-mangrove-soil-linear-color.mjs
python tools/experiments/package-mangrove-soil-linear-color.py
```
