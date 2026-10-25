# Horizonte emisor integrado como opción

Activar `?visualLab=global-lighting&canyonShadows=horizon`. NativeHorizon registra la opción al construirse y activa castShadow únicamente cuando config.biome es canyons. Sin ambos parámetros, comportamiento previo. No cambia geometrías, materiales, shadow map size ni simulación. Disponible en rama experimental, no main.

Paridad receta QA frente a opción integrada:12 parejas, seed712,1280x720,poses24/36/47 día150/noche350, perfiles baja y media. Todas idénticas píxel a píxel, mismas cámaras y contadores del pase final, sin errores WebGL. Baja no muestra sombras solares en esta escena: confirma compatibilidad, no mejora visual. Media conserva las sombras que motivaron la candidata. Láminas baja aquí, media en media/. Control es receta forzada QA, no versión original sin sombra.

Validación:11 tests existentes horizon/horizon-generator pasan; npm run build pasa con avisos de bundle grande e import mixto ya habituales. El primer montaje de la ruta de referencia QA asignaba el flag antes de que la nueva línea lo sobrescribiera: corregido, recapturado y el auditor exige castShadow true en ambos lados. Esos datos iniciales no se utilizan.

Coste: ver ../canyon-horizon-caster/performance/README.md; reconstrucción +1 draw/34404 triángulos en view47 media, caché sin dibujos extra, timings variables. Pendiente streaming prolongado y movimiento continuo con esta opción; no se declara validación global ni ausencia general de regresiones. Se mantiene opt-in para revisión.

Reproducir Vite5190: capture-canyon-horizon-integrated.mjs y package-canyon-horizon-integrated.py. Por defecto baja; para media establecer WG_COVER_QUALITY=media y WG_BANK_OUT=docs/qa/global-visual-lab/canyon-horizon-integrated/media en ambos comandos.
