# Ensayo de subida desde ImageBitmap

2026-10-06, fixture aislada 5191, 1280 × 720, DPR 1, acacia nativa diurna a 25 m. El checkbox ImageBitmap nativo convierte únicamente las tres texturas del material 3D, antes de preparar GPU. La opción permanece apagada por defecto y no cambia Assets.texture del juego.

textureImageBitmap usa createImageBitmap con orientación según flipY, premultiplicación según premultiplyAlpha y colorSpaceConversion=none. Asigna el bitmap a la textura existente y marca needsUpdate. Conserva la fuente original para restaurarla al liberar; close se ejecuta una vez y también si la conversión termina tras cancelarse. La fixture libera sus conversiones al cerrar. Los bitmaps deben permanecer vivos mientras puedan necesitarse para restaurar el contexto GPU; no se cierran inmediatamente después de subirlos.

## Evidencia

ready-report.json: conversiones de 94,00 / 225,70 / 83,90 ms (403,60 ms acumulados). Las tres llamadas initTexture de mapas 2048 × 2048 pasan a **25,80 / 23,40 / 23,10 ms**. La medición previa con HTMLImageElement registró 125,40 / 263,80 / 114,20 ms. La preparación GPU, sin conversiones, tarda 168,10 ms; el camino completo de esta ejecución tarda 573,30 ms.

Esto señala una vía para reducir trabajo concentrado en initTexture, pero no es un benchmark repetido ni una prueba de mejora del tiempo total. Hay cachés posibles y procesos externos. No se midió la ocupación del hilo principal durante createImageBitmap ni intervalos de frame. Una subida de 26 ms aún supera un presupuesto de 16,7 ms.

ready.png frente a la captura anterior `docs/qa/far-native-texture-profile/detail.png`, mismo árbol/cámara/luz: comparación RGB sin reescalado, recorte (400,0)-(1280,720) que excluye controles. **0 píxeles diferentes de 633600**. pixel-comparison.json conserva el resultado. Solo se acredita esta vista diurna del modelo cercano, no todos los materiales/fases ni alpha del atlas (no convertido).

ready=1, gpuCovered=true, cobertura nativa=1, tres programas/tres llamadas, webglError=0, errors vacío y consola vacía.

`node --test tests/texture-image-bitmap.test.js tests/native-far-gpu.test.js`: nueve aprobadas, cero fallidas, 367,13 ms. Incluye opciones de orientación/premultiplicación, restauración de imagen, liberación idempotente y cancelación después de crear el bitmap sin sustituir la fuente original.

## Pendiente

Repetir comparación en lotes controlados, medir picos de frame y memoria, validar carga/disposición/restauración de contexto, plataformas sin soporte y más materiales/fases. Si se adopta, la conversión corresponde al cargador durante precarga, con propiedad explícita del bitmap y sin conservar innecesariamente las dos fuentes. La fixture conserva la original para comparar/restaurar y no acredita ahorro de RAM. WorldScene y su cargador siguen sin modificar; no se ha eliminado todavía el tirón del juego.
