# Imágenes pendientes · cd31d6b

Auditoría de lectura ejecutada sobre `main` en `cd31d6b6ee90da33a4fb8bce0724d5b4c0ada521`. La pertenencia al paquete procede del build local de `7c4d3fe`; el commit posterior solo añade QA y documentación. No se convierten imágenes, se modifica runtime ni se contacta con Tinify en este ensayo.

El paquete contiene 225 imágenes: 162 independientes y 63 embebidas en GLB. Suman 200.227.425 bytes codificados, con 213 hashes distintos. Hay 201 WebP, 23 JPEG y un SVG; no quedan imágenes distribuidas sin clasificación de uso. Los 9 usos desconocidos del inventario completo pertenecen a originales/archivos fuera del paquete. Esto actualiza las cifras históricas de usos pendientes sin modificar sus informes originales.

El preflight de las 162 imágenes independientes separa:

| Grupo | Imágenes | Bytes codificados |
| --- | ---: | ---: |
| Color elegible para un piloto | 79 | 3.984.122 |
| Revisión específica | 43 | 39.835.441 |
| Variantes ya integradas | 40 | 41.145.686 |

Las 63 texturas embebidas suman 115.262.176 bytes: 21 tienen únicamente usos de color y 42 incluyen normales/datos. No están cubiertas por el preflight de archivos independientes. La compresión futura debe preservar sus referencias GLTF, las skins y la geometría, y partir de los originales para evitar pérdidas acumuladas.

`inventory.json.gz` y `preflight.json.gz` conservan los informes completos. `tests.txt.gz` registra 60 pruebas correctas de clasificación, política de color y variantes runtime, sin fallos, cancelaciones ni omisiones. Los hashes de fuentes y resultados están registrados en `provenance.json` y `hashes.json`.

Clasificar una imagen o declararla elegible no demuestra que esté optimizada ni visualmente aceptada. Estas cifras no son RAM, VRAM, ahorro de paquete o frametime; siguen pendientes la conversión de los candidatos, revisión de datos/embebidos y aceptación nativa, móvil y Windows.
