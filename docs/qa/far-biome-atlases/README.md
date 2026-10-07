# Atlas multibioma offline

Rama `codex/far-impostors-integration`, herramienta `tests/browser/far-vegetation-atlas.html`. Se capturaron 22 especies de los seis biomas, 8 vistas de cámara × 8 orientaciones respecto al sol fijo × fases día/noche. Celdas de 128 px, LOD2 renderizado con AfricanToon; encuadre derivado del LOD0 y elevación de 8°.

44 imágenes WebP lossless, 20.450.296 bytes en total. Por bioma se cargan exclusivamente sus 4 especies (2 en Gran Cañón): no se cargan todos los atlas simultáneamente. El tamaño comprimido no equivale a RAM: cuatro pares RGBA1024² con mipmaps representan aproximadamente 42,7 MiB de texturas GPU, antes de recursos propios del mundo.

`bake-reports.json.gz` conserva los 44 informes originales, hash y longitud de los PNG offline. Todos registran cero errores GL/shader, 64 celdas con alpha y ninguna silueta tocando el borde de la celda. Los PNG se exportaron íntegros mediante lecturas DOM por bloques; una primera exportación truncada fue reemplazada y no se utiliza.

`node tools/prepare_far_atlas_assets.mjs` comprime las capturas de `.cache/far-atlas-bakes` y produce el manifiesto distribuido. Las capturas se hacen fuera del juego: abrir el baker con `biome`, `slot`, `bake=day|night`, `rotations=8`, `resolution=128`, `lod=2`, `elevation=8` y pulsar precalcular. No se genera ningún atlas durante gameplay.

`node --test tests/far-atlas-assets.test.js` valida alpha, dimensiones, especies, fases, coste distribuido y bounds frente a los atributos de posiciones binarios nativos. No demuestra todavía integración visual, transición, coste de render ni equivalencia perceptual entre orientaciones/interpolaciones.
