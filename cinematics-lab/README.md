# Wild Guardians · laboratorio de cinemáticas

Abra `wild-guardians-cinematics-lab.html` como archivo local en un navegador compatible con WebP y Opus/Ogg. El archivo integra las 50 escenas, las 101 capas visuales y las 100 pistas de voz: no requiere red, servidor ni instalación. El proyecto permanece separado del juego de producción.

El visor permite elegir uno de diez actos y cinco escenas por acto, avanzar o retroceder, pausar/reanudar, reiniciar, alternar ES/EN, ocultar textos y desactivar el parallax. La reproducción de voz puede requerir pulsar **Reproducir** una vez por la política de autoplay del navegador. La duración mínima ajustable nunca corta la voz: cada escena termina después de que concluya su audio y de un margen de 0,8 s. Cambiar escena o idioma detiene y libera la pista anterior antes de asignar la nueva. En dispositivos con `deviceMemory ≤ 4`, el visor omite la precarga de la escena siguiente; durante un fundido solo coexisten las capas de la escena saliente y entrante.

`cinematics-manifest.json` contiene el guion, los movimientos de cámara y la referencia de cada activo. `narrationRaw`/`closingRaw` y sus variantes `EN` conservan cada párrafo del Word carácter por carácter, incluidos números y espacios. Los 50 PNG maestros están en `sources/`, los 50 WebP planos comprimidos por Tinify en `assets/`, y las placas de fondo reconstruido y recortes alfa en `layers/` como PNG editable y WebP final. El HTML incrusta solo los WebP de capas; los planos quedan disponibles para revisión o cambios futuros. Los 100 Opus mono de `audio/` proceden del ZIP MP3 suministrado. Los informes JSON registran rutas de generación, hashes, tamaños, códec, canales y duraciones.

Para reconstruir el proyecto con las fuentes externas originales:

1. `python build_manifest.py RUTA_GUION_ES.docx`
2. `python convert_audio.py RUTA_ARCHIVO_100_MP3.zip`
3. `python integrate_english_audio.py RUTA_GUION_EN.docx`
4. `python build_html.py`
5. `python qa_static.py RUTA_GUION_ES.docx RUTA_GUION_EN.docx RUTA_ARCHIVO_100_MP3.zip`

`node qa_viewer_logic.cjs` comprueba navegación rápida, cambio de idioma, pausa y espera al fin de la voz con un DOM/audio simulado. Es una prueba de lógica, no una sustitución de la aceptación visual en navegador.

Los pasos 1–3 usan `python-docx`, Pillow y `ffmpeg`/`ffprobe` instalados localmente. Las imágenes se generaron y editaron con `image_gen`; `sources/provenance.json` y `layers/provenance.json` preservan la relación entre salida de generación, escena y hash. `tinify_assets.py` y `tinify_layers.py` envían los PNG a Tinify y convierten la salida a WebP usando exclusivamente `TINIFY_API_KEY` del entorno del proceso; la credencial no se guarda en el proyecto. Los informes `tinify-report.json` y `tinify-layers-report.json` permiten verificar que la conversión ocurrió realmente. Repetir estos pasos de Tinify requiere una credencial y cuota válidas.

La [guía de estilo](style-guide.md) explica el diseño, los prompts y la separación de capas. [QA.md](QA.md) recoge las comprobaciones realizadas y el límite de prueba del navegador local.
