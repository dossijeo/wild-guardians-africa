# Distribución web / itch.io

El build mantiene el juego, los ocho laboratorios y todos los recursos de audio. Las variantes GLB se sirven desde `assets/web/`; los 20 originales permanecen intactos en `public/assets/` para procedencia, calibración y pruebas, y se excluyen de `dist/`.

## Reproducción

```sh
npm ci
npm run assets:compress
npm run verify:assets
npm run verify:web-assets
npm run verify:plan
npm test
npm run package:itch
npm run qa:web-package
```

`assets:compress` sólo regenera variantes y su manifiesto. Las dependencias están fijadas: meshoptimizer 1.3.0, sharp 0.35.5, gltf-validator 2.0.0-dev.3.10 y Three.js 0.180.0. El decoder local es exactamente `three/addons/libs/meshopt_decoder.module.js` (meshoptimizer 0.22); se fuerza el codec v0 compatible. Su copia para los labs conserva aviso y licencia MIT. No hay decoder CDN.

`package:itch` valida el contenido y crea `test-results/wild-guardians-itch.zip`, con `index.html` en la raíz. Orden, timestamps y permisos ZIP son constantes. Comprueba CRC, 1.000 archivos, 240 caracteres por ruta, 500 MB extraídos y 200 MB por archivo, según [requisitos oficiales de itch.io](https://itch.io/docs/creators/html5#zip-file-requirements). No se ha publicado el juego en itch.io.

## Compresión y fidelidad

Todos los bufferViews de geometría y animación usan `EXT_meshopt_compression`, sin simplificación, welding, reorder, filtros ni cuantización. Se conservan todos los bytes de accessors, índices, UV, morphs, pesos, joints, matrices, tiempos y muestras de animación. La tolerancia geométrica y de animación es cero; también se comparan exactamente nodos, escenas, skins, materiales, samplers, extras y accessors. Esto conserva la correspondencia con los puentes de cultivos y la calibración existente.

Las 63 imágenes integradas usan `EXT_texture_webp`: color/emisión calidad 90, datos ORM calidad 95 y normales lossless. El máximo es 2048 × 2048, sin ampliar imágenes pequeñas; 25 imágenes de 4096 se reducen con Lanczos. Las normales son lossless respecto a esa resolución destino, no respecto a una fuente de 4096. Se conservan UV, índices de textura, canales, materiales y parámetros PBR. Se verifica alpha exactamente (ninguna fuente actual tiene alpha; se comprueba también el canal implícito 255). La verificación de píxeles compara contra el original reducido del mismo modo y exige PSNR ≥32 dB; el mínimo medido es 34,73 dB. El informe incluye RMSE, error máximo, resoluciones, roles y bytes por imagen; `psnr: null` indica RMSE cero.

El validador Khronos no implementa meshopt/WebP completamente. Se verifica el contrato de extensiones, los hashes y cada buffer decodificado con el decoder local, se validan los contenedores decodificados manteniendo WebP en su extensión y se comparan los diagnósticos contra cada original. Resultado: cero errores nuevos. Se conservan 1.893 errores originales: 473 normales no unitarias en cada una de las cuatro bibliotecas completas de trabajadores y un error en otro modelo. No se alteran esas normales ni otros datos de procedencia para ocultarlos.

`content/manifests/web-assets.json` enumera TODOS los GLB, mapping original → runtime, tamaños, SHA-256 y texturas. `web-assets-verification.json` registra la comprobación numérica y conformidad. Los manifiestos originales y tests de calibración conservan sus fuentes.

## Rutas y laboratorios

Vite utiliza `base: './'`. El resolver central calcula el directorio del proyecto desde la URL del módulo, tanto en desarrollo como en el bundle: modelos, texturas, JSON, audio, manos, guardian y DOM/HUD quedan dentro del prefijo de despliegue. Los identificadores originales de assets se preservan en los módulos generados y catálogos de procedencia; sus consumidores resuelven esas rutas.

El plugin aplica la misma adaptación al servir desarrollo y al copiar `public/` en el build. Reescribe las rutas de catálogos, fuentes/CSS, menú, selector, música e iframes según su contexto real. Los scripts/markup de biblioteca se inyectan en `library.html`, por lo que se resuelven desde ese documento; CSS usa la profundidad de su propio directorio. Respeta URLs ya relativas y chunks generados por Vite. Futuras ejecuciones de `prepare_menu`, `prepare_selector`, `prepare_library` y otras extracciones mantienen esta adaptación automáticamente, sin modificar los originales exportados. Un nuevo GLB sin variante bloquea el build hasta regenerar el inventario.

El GLTFLoader de producción usa el decoder local directamente. El menú y los labs con parsers propios reciben un GLB decodificado en memoria; workers/destruction leen el índice de imagen de `EXT_texture_webp`. No se distribuye un segundo GLB descomprimido. El lab de cultivos conserva su envelope gzip y su Three r140 con soporte WebP; mantiene los 40 estados y los 32 puentes originales.

`test:web-package` comprueba links HTML/CSS y referencias JSON, index en raíz, mapping completo y ausencia de originales duplicados. CI ejecuta esa comprobación, la verificación GLB, las comprobaciones originales, la suite completa y publica ambos artifacts, build y ZIP itch.

## Revisión de navegador

El servidor QA no sirve archivos desde la raíz: sólo `/nested/itch/game/` y `/qa/`. La revisión usa la interfaz visible por CUA, no mutación de estado desde el driver.

- `/nested/itch/game/`: abrir menú, Juego nuevo, seleccionar Sabana/Mapungubwe y entrar en la partida; revisar terreno, HUD, guardian y tutorial.
- `/nested/itch/game/library.html?lab=...`: crops, walls, destruction, sfx y los cuatro worker-*.
- `/qa/tests/browser/web-assets.html`: renderiza automáticamente los 20 GLB con Three.js y reporta meshes, skins, morphs, clips y texturas; `done: true` y veinte entradas confirman fin.
- `/qa/tests/browser/vfx.html` y `work-vfx.html`: las rutas nuevas de VFX también funcionan bajo prefijo.

QA CUA del 2 de octubre: 20/20 GLB terminados sin warnings/errores de consola; menú y selector por botones, nueva partida, terreno/HUD/guardian visibles; Cultivos muestra ocho plantas, Bastión carga 33 piezas. Los ocho laboratorios terminan sin avisos/errores: Destrucción carga cinco edificios y un impacto del 7,5%; SFX ofrece 126 botones y reproduce Viento suave (12 s); los cuatro visores de trabajadores muestran materiales, rig de 28 huesos y las 12 acciones del lab, con animación y Regar revisados.

QA CUA final de las variantes finales: veinte modelos, 95 clips y materiales/rigs cargados, sin warnings/errores. WorkVfx completa una entrega real a 229,10 s: saldo 95 → 106, una caja entregada y efectos finales a cero, sin consola. Los reportes de CUA `itch-models-cua-final.json` e `itch-work-vfx-report.txt` se conservan en test-results del checkout principal, junto con las capturas.

HTTP de desarrollo bajo `/dev/prefix/`: index, catálogos runtime, menú/adaptador, módulo resolver y proxy VFX resuelven correctamente. Vite limita el scan de dependencias a index para evitar escanear el código clásico de los labs originales.

Suite completa: 436/436 PASS. Verificación original: 23 fuentes, 484 recursos y 126 SFX con hashes intactos; cuatro bibliotecas completas y 48 acciones con procedencia. Plan: 123.048 aserciones correctas. La QA acredita carga/decodificación, no un presupuesto de FPS móvil ni una publicación real en itch.io.

## Inventario y tamaños

20/20 GLB: **432,310,652 → 150,791,556 bytes** (−65.12%). Texturas: 383.957.531 → 115.262.176 bytes (−69,98%).

Todos los nombres siguientes terminan en `.glb`; original en `public/assets/` y runtime en `public/assets/web/`. Los SHA completos de ambos están en el manifiesto.

| Nombre completo | Original bytes | Runtime bytes |
|---|---:|---:|
| `0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894.glb` | 19143664 | 7433488 |
| `25e4ab988c87419007f185c956970b3329e7379e9fab4bcbe6851cb1e81de238.glb` | 27893128 | 5852488 |
| `3ba902fd9bfc99589348ba9202513e9daa63442a6c2b21bb23a15bf58bd546f7.glb` | 12293584 | 7428644 |
| `4c3d590d278e3fc979257b71502ed8b151e5821972e192c19f0228004d70d141.glb` | 19341308 | 7698448 |
| `5ac817bcc5a8147c69f0e9876d2e37a94228272b14b85be1d1ecbfd6e2d0527b.glb` | 20926120 | 7444008 |
| `6c43390aa864c32555795b2be638f8e1e8d4154fa85e6991580ebb0d7fcde309.glb` | 22194836 | 7367468 |
| `6fb0b48a96d820d1738c6e36ed2d1cacaf54844df37298450b79d68b4703d80c.glb` | 17251608 | 12862816 |
| `7de8ad72063cfeeb74f5d334069b77a3ac5c06c39a6c674a75b21ff51a210c25.glb` | 18302772 | 6666508 |
| `88552fdb555a88e55f8e392bfe381cbad0c6af861e993213a4ebc42cd0996d2b.glb` | 18055192 | 6212368 |
| `9cb17849416e2d2578eb5806c4874fc496fdf9a1aa421d3a10fe3a346933674e.glb` | 17965476 | 6522992 |
| `a748ca0cea0d4d0d4abd95071577a8457e63f22433e618be77934c079f4cf89c.glb` | 26517228 | 4679128 |
| `b27ce08a5f860912783d5978cec8a012b28d7a55e2c7a69cc992f91f8bbd5a76.glb` | 18859292 | 6541988 |
| `b396fba7b2c500770a3770222fc6a3b5b9a17fce66933ad53d569ae349affc82.glb` | 40225776 | 7602380 |
| `be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.glb` | 17895972 | 13626668 |
| `cb7a23479fb9210b6cda1ab13cbddd85b3ebce10cad863f1dd8ae1d9d66e4869.glb` | 31550764 | 7092700 |
| `db01314e4e0a03f4e1aaa31e8207cee85a42294edffb003633282bb574ef28cd.glb` | 17767816 | 6257516 |
| `e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202.glb` | 20235172 | 7717684 |
| `eddde4e46932cf9fd056315e34af03f07595cd1ce4de61b4d7d6ac7be5d873e9.glb` | 20211084 | 6533740 |
| `f3ae53d5ce3b57419fd31e74e2572ada9cc61392c2e7ac20dac484ec194d5e9f.glb` | 22362516 | 7814792 |
| `fedb713c0b32df33f11111a91e2c3e0616a0345ec9be9a8beeecaa0b93ef26cb.glb` | 23317344 | 7435732 |
