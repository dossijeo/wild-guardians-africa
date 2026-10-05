# Ventanas desde un único archivo Opus

La ruta opcional del pool permite usar lecturas parciales del mismo Opus completo utilizado por la compatibilidad. No necesita distribuir un pack adicional con copias de los paquetes. No se activan todavía catálogos Opus del juego.

`tools/prepare_music_opus_recipes.mjs` prepara 550 recetas con cabeceras Ogg/CRC precalculados y rangos de payload del Opus original. Verifica que cada reconstrucción coincide **byte por byte** con la ventana ya validada. Los índices experimentales quedan en `.cache/opus-recipes`, junto a los Opus completos de `.cache/opus-audit`.

El `MusicWindowPool` usa `entry.recipe` cuando existe; la ruta MP3 anterior continúa leyendo sus rangos sin reconstrucción. La cola y las comprobaciones de cancelación siguen antes de descodificar. `assembleOpusWindow` hace copias acotadas y valida longitudes/rangos; no analiza paquetes, calcula CRC, comprime ni genera audio en gameplay. Solo se ejecuta al cargar una ventana pedida, no en cada frame. La asignación está limitada a 2 MiB y el índice no crea trabajos de pistas silenciosas.

## Comprobaciones

- Las 550 reconstrucciones coinciden por bytes con los contenedores anteriores.
- 40 pruebas dirigidas pasan: contenedores, corrupción, límites, lectura exclusiva de la pista pedida, pool, cola/cancelación, caché, transporte e índices.
- 1.100 comparaciones Web Audio pasan: todas las ventanas a 48/44,1 kHz, máximo error frente al Opus completo 1,1920929 × 10⁻⁷. Se registran veinte descargas iniciales y reutilización desde disco, sin nuevas descargas en la segunda frecuencia. Console sin errores/avisos.
- Latencia de preparación observada máxima: 1,5 ms. `proof.json` registra p50/p95. Es tiempo desde que vuelve el rango hasta llamar al decoder, incluye microtareas/asignaciones y se midió en escritorio con otras simulaciones ejecutándose. No prueba frametime, CPU aislada ni rendimiento móvil.
- Vite compila y el paquete existente pasa: 586 archivos, 407.016.935 bytes, 839 enlaces relativos. Esto valida la incorporación opcional del lector; **no** acredita un paquete final Opus ni su ahorro.

## Distribución prevista

Los veinte Opus completos pesan 38.258.002 bytes; las recetas añaden 1.377.756 bytes. El pack anterior de ventanas pesaba 42.799.366 bytes. Se evita conservar a la vez ese pack y los archivos completos, manteniendo disponible el archivo entero para compatibilidad. Los binarios experimentales e índices no se añaden al paquete del juego por esta comprobación.

Pendiente: activar catálogos/variantes con una única copia por recurso, adaptar y verificar metadatos y exports de los labs, medir RAM/descodificación en partida y fallback, escuchar contactos/bucles/transiciones, probar Chrome físico/itch.io y Windows/Tauri. La señal renderizada anterior prueba transportes con ventanas byte equivalentes; no se ha repetido aquí una partida completa usando las recetas.
