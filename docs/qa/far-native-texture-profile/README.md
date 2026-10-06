# Perfil por textura y ensayo de decode explícito

2026-10-06, fixture nativa aislada 5191, 1280 × 720, DPR 1. Se instrumentó cada initTexture con índice, dimensiones, tipo de imagen, mipmaps, espacio de color y tiempo CPU. No se guardan URLs ni contenido de imágenes en el informe. El orden comienza con atlas original, atlas diurno y nocturno; después aparecen las tres texturas únicas del material del modelo nativo.

## Evidencia

detail-report.json: los atlas 2048 × 256 y dos 1024 × 1024, ya utilizados por el impostor, tienen initTexture de 0–0,1 ms. Los tres mapas 2048 × 2048 del modelo, todos HTMLImageElement con mipmaps, registran **125,40 / 263,80 / 114,20 ms**. Preparación total 615,40 ms. El pico pertenece a uno de estos mapas, no a la inicialización caliente del atlas en esta página.

Se añadió una opción experimental decodeImages (desactivada por defecto) y un checkbox QA. Espera image.decode, cuando existe, antes de initTexture; comprueba cancelación tras la espera y mide decode por separado. No cambia la imagen ni su propietario, no crea bitmaps duplicados.

decoded-report.json: los mapas 2048 registran decode de **83,80 / 304,00 / 94,00 ms**, mientras initTexture sigue en **125,40 / 266,30 / 108,20 ms**. Preparación total 1133,50 ms. Este ensayo no apoya adoptar decode explícito como solución al pico; la opción queda apagada. Son muestras únicas sucesivas, con scheduling/cachés y procesos externos, así que no permiten atribuir porcentajes de mejora/regresión ni aislar coste de GPU. La duración CPU de una llamada puede incluir descheduling y trabajo del navegador/driver.

Ambos informes terminan ready=1, gpuCovered=true, cobertura nativa=1, tres programas/tres llamadas, webglError=0 y errors vacío. Ambas consolas están vacías. Se conservan capturas e informes.

## Validación y próximos pasos

`node --test tests/native-far-gpu.test.js`: siete pruebas aprobadas, cero fallidas, 295,02 ms. La nueva prueba comprueba que decode opcional termina antes de subir, y que cancelar durante decode evita subida/compilación. Las pruebas anteriores verifican tandas, deduplicación, restauración de render y fence.

Hace falta investigar formato de subida GPU, resolución necesaria de los mapas originales y preparación durante carga inicial. Comprimir la descarga no garantiza abaratar texImage2D ni mipmaps. Todavía no se han cambiado mapas, calidad visual o Assets.texture del juego, ni se ha implementado KTX2/Basis o ImageBitmap. WorldScene continúa sin esta ruta experimental. La prueba no acredita frametime durante el proceso, una carga completamente fría, eliminación del tirón ni móvil.
