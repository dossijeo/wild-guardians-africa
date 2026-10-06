El cierre libera los buffers observados de los prototipos y del lote de cultivos antes de perder el contexto. Corrige las omisiones detectadas en [el diagnóstico anterior](../preload-buffer-lifecycle/README.md); todavía no acredita la liberación de toda la memoria GPU o del heap JavaScript.

`Assets` registra geometrías, materiales y texturas de GLB, prototipos empaquetados de bioma/poblado/murallas y texturas independientes. Si un consumidor ya los ha liberado, su propietario no repite la liberación. El cierre vacía recursos registrados, fuentes GLB y caché de promesas. Los GLB y texturas que terminan después del cierre se liberan sin repoblar la caché; los generadores empaquetados y plantillas de edificios comprueban el cierre antes de crear nuevos recursos tras sus esperas. Las descargas fallidas de texturas pueden reintentarse mientras la colección siga abierta.

`WorldScene.dispose` llama ahora al cierre completo de `cropBatch`, incluyendo sus geometrías, instancias y materiales de profundidad, y cierra los assets antes de `renderer.dispose`/`forceContextLoss`. La liberación sigue ocurriendo al cerrar el mundo; los recursos compartidos se conservan durante la partida.

Tres recorridos nativos, semilla 712, Mapungubwe y calidad media: facóquero/Gran Cañón, hiena/Sabana y rinoceronte/Manglares. Centro y brote pagados, contratación inicial vacía y spawn controlado. Llegan al primer golpe real al cultivo en 399, 523 y 228 pasos, sin espera de modelos, errores, descargas GLB adicionales o nuevos programas de material animal. Los nueve campos lógicos comparados de Gran Cañón y Sabana coinciden exactamente con los informes anteriores: pasos, espera, especies, segundos simulados, salud inicial/final del centro, primer golpe, golpes lógicos y actores.

| Justo antes de solicitar pérdida de contexto | Gran Cañón anterior → corregido | Sabana anterior → corregido | Manglares corregido |
|---|---:|---:|---:|
| Saldo de bytes de buffers solicitados | 9.121.602 → 0 | 10.930.990 → 0 | 0 |
| Geometrías del contador de Three | 24 → 0 | 31 → 0 | 0 |
| Texturas del contador de Three | 25 → 4 | 25 → 4 | 4 |
| Programas del contador de Three | 10 → 3 | 10 → 3 | 3 |

En los tres casos quedan cero buffers registrados y cero entradas en caché/fuentes/recursos del propietario. Se confirma posteriormente el evento de pérdida de contexto y `isContextLost()`. El saldo de buffers ya era cero con el contexto todavía disponible: no se infiere ese resultado únicamente de la liberación implícita del contexto.

Las cuatro texturas y tres programas restantes son contadores pendientes de atribución, no prueba de memoria física retenida después de perder el contexto. No se desactivan sombras ni se manipulan las cachés privadas de Three para hacer desaparecer esos números. La sonda consulta bindings y no sirve para comparar frametime/carga; excluye texturas, programas, driver y heap. No hay medición de RAM física ni prueba de móvil, de todos los biomas/culturas/calidades o de ciclos continuos de la interfaz completa.

Validación: 83 pruebas dirigidas correctas (18.635,4741 ms), incluyendo seis casos de propiedad/liberación, descargas pendientes, reintentos, generadores empaquetados interrumpidos, cultivos, prototipos de todos los biomas, cinco poblados/culturas, edificios, precarga y bindings. Build correcto: 207 módulos, 10,47 s; persiste el aviso habitual del bundle mayor de 500 kB. Fuentes exactas e informes completos gzip guardados; `proof.json` registra SHA-256 de archivos y JSON descomprimidos y los campos lógicos comparados.

Reproducción: `/tests/browser/animal-preload.html?biome=gran-canon&motion=1&attack-species=warthog&resource-profile=1&dispose-world=1`. Cambiar biome/especie a `sabana`/`hyena` o `manglares`/`rhino` para los otros casos.

Pendiente: atribuir los contadores restantes, comprobar ciclos e interrupciones de la carga completa del mundo y medir el heap/RAM en dispositivos físicos. La revisión descubre además que `NativeSky.load` aún puede finalizar su carga tras `NativeSky.dispose`; requiere una protección propia antes de decodificar/construir panoramas tardíos. Las pruebas de cancelación de esta entrega acreditan el propietario `Assets`, no ese cargador independiente.
