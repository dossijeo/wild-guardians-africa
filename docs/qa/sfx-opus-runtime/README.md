# SFX Opus distribuidos y exportados desde el lab

Los 126 SFX utilizan ahora sus derivados Opus previamente convertidos y auditados. Los MP3 originales se conservan en el repositorio como fuentes; el paquete excluye sus bytes y los tres metadatos sustituidos. No se cambia ninguna asignación, prioridad, bucle o condición de gameplay por esta conversión.

`tools/prepare_sfx_runtime.mjs` verifica hashes de los candidatos contra la conversión nativa archivada y conserva los samples a 48 kHz antes de crear recursos, catálogo de gameplay, catálogo del lab y routing derivados. Los IDs y números, incluido el intercambio 021/022, siguen intactos. El lab reproduce y descarga el mismo Opus; nombres, tamaños, MIME y SHA-256 describen esos bytes.

La ficha distingue LUFS/pico verdadero del MP3 de origen de los metadatos Opus. No se presentan como nuevas mediciones Opus. La forma de onda de consulta procede del MP3. El ZIP incluye un CSV de conversión con peak/RMS de PCM decodificado (no true peak ni LUFS) y la auditoría original de normalización en otro CSV. Originales WAV no disponibles: estos Opus son una segunda codificación con pérdida desde MP3 normalizados; escucha pendiente.

## Evidencia

- `npm run verify:audio-runtime`: además de la música, 126 SFX y tres metadatos verificados por bytes/hashes, CRC y duración Ogg, correspondencia de IDs, exports y procedencia.
- 98 pruebas dirigidas pasan: rutas/paquete, SFX y contactos, estructura/avisos, UI, riego, agua del cañón y traducciones. Los nuevos textos del lab tienen catálogo inglés/español.
- Build pasa. Paquete: 586 archivos, 393.992.959 bytes y 859 enlaces relativos; 1.458.489 bytes menos que la activación musical anterior. No se distribuyen MP3 originales ni índices fuente sustituidos.
- Lab compilado en `/nested/itch/game/library.html?lab=sfx`: 126 filas cargadas, preview nativo silenciado de SFX 012, ficha con formato/nombre/tamaño/hash Opus, console sin errores/avisos. `lab.png` acredita la presentación observada en español; el inglés se valida por las pruebas del catálogo, no con esta captura.
- Descarga real `Wild_Guardians_SFX_Opus.zip`: 131 entradas, incluyendo 126 Opus idénticos por bytes al runtime. Manifest, hashes, CSV original, CSV de conversión y LEEME coinciden. `zip-proof.json` guarda tamaño y SHA. El observador automatizado de descarga agotó su plazo, pero el archivo sí apareció en Downloads y se validó completo; no se repitió la descarga.
- `tests/browser/sfx-runtime.html`, compilado mediante `qa:web-package`, pasa 252 casos desde `/nested/itch/audio-qa/`: bytes SHA del recurso realmente descargado, fuente Web Audio, canales/duración/bucle y retirada de voces. Output silenciado, contextos cerrados. `browser-report.json`: 252 filas, cero errores. RAM PCM máxima de un clip de este ensayo: 5.760.000 bytes. Se libera cada clip en el ensayo; esto no acredita el pico de caché de una partida completa.

## Corrección del comprobador

La primera ejecución comparaba muestras enteras contra `duration × sampleRate` sin redondear: para 1,36 s a 44,1 kHz, la coma flotante produce un número apenas superior a 59.976. Una diferencia válida de una muestra falló. Se conserva `initial-float-assertion.json` (143 casos y un fallo). El comprobador usa ahora muestras esperadas enteras con `Math.round`, manteniendo tolerancia de una muestra para el resampling nativo como en la auditoría anterior. No se cambió el audio ni el decoder.

Pendientes: escuchar todos los efectos/contactos, comprobar nivel/percepción frente al original, Chrome físico en itch.io y Tauri. La reproducción individual de 126 archivos no acredita que los 45 todavía reservados ya tengan acciones de gameplay; el barrido de asignaciones sigue abierto. No se publica en itch.io por este cambio.
