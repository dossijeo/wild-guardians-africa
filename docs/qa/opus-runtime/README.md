# Activación musical Opus en el paquete web

Los veinte stems y la pista del menú usan ahora Opus. Los MP3 originales permanecen como fuentes verificables en el repositorio y se excluyen del paquete. Los 126 SFX conservan su representación MP3 y los exports originales del lab; su integración Opus sigue pendiente.

El resolver conserva las URLs canónicas de los catálogos fuente y las redirige a las variantes musicales y a los dos índices de recetas. Ventanas y compatibilidad apuntan al mismo Opus completo: no se distribuye un segundo pack de audio por ventanas. Las recetas precalculadas reutilizan los paquetes codificados sin volver a comprimirlos durante gameplay.

## Verificación

- `npm run verify:audio-runtime`: 21 recursos musicales, dos índices y 550 ventanas; hashes fuente/runtime y reconstrucción idéntica por bytes verificados. Incluido en Validate game.
- 100 pruebas dirigidas pasan (36 de rutas/pool/paquete y 64 de transporte/caché/ciclo de vida): rutas musicales, conservación de SFX/exports, rutas relativas, lector/caché, pool, índices, gameplay, streaming y contenedores.
- `npm run build` pasa. `npm run test:web-package`: 586 archivos, 395.451.448 bytes y 859 enlaces relativos. El paquete anterior medía 407.016.935 bytes; ahorro observado total 11.565.487 bytes. Las representaciones musicales e índices por sí solos ahorran 11.587.058 bytes; el nuevo manifiesto/código explica la diferencia.
- `tests/browser/audio-runtime.html`, compilado mediante `qa:web-package`, pasa desde `/nested/itch/audio-qa/`: ambos conjuntos a 48/44,1 kHz, fuentes Web Audio reales y menú mediante HTMLAudioElement. Salida silenciada. `browser-report.json` contiene cuatro casos de ventanas y uno de menú, sin errores. Console sin errores/avisos.
- La primera frecuencia descarga dieciséis stems usados; la segunda obtiene sus ventanas desde caché sin nuevas descargas. No se descodifican completos. Ocho capas de la escena diurna: 18.596.352 bytes de PCM a 48 kHz y 17.085.376 a 44,1 kHz. Al parar se vacían ready/pending/fuentes; cada contexto de gameplay se cierra.

La prueba es breve y de escritorio: no acredita escucha, campaña completa, frametime móvil, Chrome físico en itch.io ni Tauri. La ruta de compatibilidad conserva PCM completo del conjunto actual, por lo que su memoria aún requiere optimización/medición. Las comprobaciones de señal y transiciones previas están en los informes de conversión, ventanas, transporte y recetas; no equivalen a escuchar los MP3 frente a Opus.

Para repetir: `npm run build`, `npm run verify:audio-runtime`, `npm run test:web-package`, `npm run qa:web-package`; abrir el enlace Audio del servidor y pulsar Verificar rutas nativas. Puede elegirse otro puerto con `WG_QA_PORT`. No se publica en itch.io por este cambio.
