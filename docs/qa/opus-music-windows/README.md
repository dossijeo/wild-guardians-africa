# Ventanas musicales Opus precalculadas — experimento

Los veinte stems de los conjuntos A/B se han preparado en 550 ventanas de seis segundos, manteniendo intactos los paquetes del Opus completo. `node tools/prepare_music_opus_windows.mjs` usa los candidatos generados previamente con `python tools/experiment_opus_audio.py`. Los packs e índices quedan en `.cache/opus-windows`, fuera de los assets distribuidos.

Cada rango es un Ogg Opus independiente con cabeceras, CRC, pre-skip y gránulos recalculados. No hay otra compresión ni recodificación de los paquetes. El nombre del pack contiene su hash para evitar lecturas obsoletas desde la caché al cambiar parámetros.

## Resultado y corrección del primer intento

El primer intento usaba 120 ms de historial y empezaba su PCM directamente en la unión. Se rechazó: 73 de 160 comparaciones iniciales excedían la tolerancia, con un error máximo de 0,01816645. Se conserva en `initial-rejected.json`. Esto no se acepta como evidencia de estabilidad.

La variante comprobada usa 600 ms de historial del códec y 40 ms de PCM antes de la unión, con dos paquetes de margen al final. El pre-skip descarta el historial interno; los 40 ms PCM conservan contexto para el remuestreo. El transporte ya calcula el offset a partir de `firstSample`, por lo que ese margen no desplaza el reloj musical. Las posiciones se mantienen alineadas a muestras enteras tanto a 48 como a 44,1 kHz.

Las **1.100 comparaciones de señal** —las 550 ventanas a ambas frecuencias— pasan. Máximo error PCM frente al Opus completo: **1,1920929 × 10⁻⁷**. Se usan el `MusicWindowPool` y `musicRangeReader` existentes. La prueba completa realizó 1.100 lecturas desde caché y ninguna nueva descarga: los packs habían sido almacenados durante la prueba inicial corregida. Esa prueba de 160 casos registra las veinte descargas iniciales y la reutilización posterior desde disco. Los contextos se cierran; no se reproduce sonido audible.

También pasan **37 pruebas dirigidas** de CRC, truncación, rangos inválidos, paquetes retenidos, duración, preroll, alineación, caché, capas perezosas, índices y transporte existente. El fixture pequeño proviene del inicio casi silencioso del stem B/s0 y acredita contenedor/paquetes; las comprobaciones de señal incluyen los veinte stems completos, no solo ese fixture.

## Tamaño

| Representación de los veinte stems | Bytes |
| --- | ---: |
| MP3 originales | 50.535.784 |
| Opus completos | 38.258.002 |
| Packs de ventanas Opus comprobados | 42.799.366 |

Los márgenes y cabeceras añaden 11,87 % respecto al Opus completo. Los packs aún reducen el tamaño un 15,31 % respecto a los stems MP3. El paquete final debe distribuir una representación de los stems; añadir estos packs manteniendo también todos los stems originales aumentaría el tamaño y no constituye la optimización pedida.

## Alcance y trabajo restante

Este experimento no cambia el audio del gameplay. Compara ventanas con el **Opus completo**, no demuestra calidad perceptual de la conversión MP3→Opus. Falta escucha comparativa, bucles, comprobación de transporte renderizado con saltos/retornos/entradas de capas, costes de descodificación y RAM, integración del fallback y catálogos, paquete sin duplicados, Chrome móvil/itch.io y Windows/Tauri. No se afirma haber completado esas verificaciones.

`proof.json` registra los hashes. La única modificación posterior a la observación del HTML fue normalizar CRLF a LF; conserva su hash observado y el normalizado. Los índices archivados se formatean para revisión; los hashes de los packs binarios están en sus registros.

Referencia normativa: [RFC 7845 — pre-skip, trimming, seeking y preroll](https://www.rfc-editor.org/rfc/rfc7845.html).
