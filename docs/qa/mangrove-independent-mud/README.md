# Manglar: musgo puro y barro independiente

La petición final aprobada conserva Moss002 como material principal y Ground050 como objetos separados. No se mezclan ni se deforman las coordenadas de los materiales. Esta versión sustituye la mezcla offline publicada en `043d68b`; la prueba anterior sigue archivada en `../mangrove-original-materials/`.

Los seis mapas se preparan desde los dos ZIP originales conservados en `references/materials/`. Color y NormalGL se comprimen a JPEG; AO/roughness/height se empaquetan en RGB WebP sin pérdida. Todos mantienen 1024 × 1024 y su orientación original. El manifiesto registra los hashes de los diez mapas fuente y seis resultados. Los mapas combinados anteriores se conservan como referencia y se excluyen del paquete web.

El musgo usa tres lecturas de textura y evita el relieve/POM y la máscara mixta del lab en este bioma. El resto de biomas conserva la receta importada. El diorama del menú no utiliza esta ruta. Los objetos de barro se generan una vez al crear el chunk, agrupados en un mesh por chunk; no proyectan sombras ni añaden colliders. Se excluyen agua abierta y la zona protegida del poblado. La geometría se recorta contra cada triángulo del terreno y se separa 0,024 m. La distribución actual se conserva tras la confirmación visual del usuario.

## Validación

- `python tools/verify_assets.py`: PASS, 24 fuentes, 505 recursos, 126 SFX y ambos materiales originales.
- 16 pruebas dirigidas: PASS (`biome-update`, `render-quality`, `render-origin`, `mud-patches`). La prueba de barro contrasta también alturas interpoladas desde el buffer real del terreno en chunks positivos y negativos, determinismo, caras orientadas y exclusiones de agua/poblado.
- `npm run package:itch`: PASS. 578 archivos, 406.668.687 bytes sin comprimir, 816 enlaces relativos y 20 GLB de runtime. ZIP 354.556.907 bytes; CRC comprobados. Los materiales reemplazados no se duplican en el paquete.
- Capturas `final-day.png` y `final-night.png`: WorldScene real, Manglares/Mapungubwe, semilla 712. Los escenarios QA no guardan partidas.

## Rendimiento observado

Dos ensayos alternados ABBA comparan el suelo de `043d68b` con esta implementación, en la misma escena/cámara dentro de cada ensayo: 30 frames de calentamiento y 90 muestras GPU por variante. GPU Intel UHD Graphics con ANGLE/D3D11, perfil media; cada JSON conserva resolución, cámara y datos del temporizador. No son una garantía para otros equipos ni una medición del juego completo en movimiento.

| Informe | GPU anterior, media | GPU nuevo, media | Calls anterior/nuevo | Triángulos anterior/nuevo |
| --- | ---: | ---: | ---: | ---: |
| paired-1.json | 37.89 ms | 32.55 ms | 66/68 | 897686/899456 |
| paired-2.json | 29.16 ms | 27.31 ms | 66/68 | 897686/899456 |

Ambos informes tienen cero errores y conservan intacta la simulación. El añadido de geometría tiene un coste de envío pequeño; en estas mediciones el menor coste del shader compensa ese trabajo. `lab-reference.json` es una comparación previa con los mapas combinados del lab, no con `043d68b`. Las capturas `after-day.png` y `before-published.png` corresponden a la exploración previa; las capturas finales son las identificadas como `final-*`.
