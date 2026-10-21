# Transición de cámara al plantar

Prueba real del LoadingDiorama experimental con sombras originales, encuadre adaptativo y niebla ligada a la distancia. Secuencia de seis segundos simulados a 30 Hz: cuatro plantas iniciales; dos tandas de prueba en los segundos 1 y 3 elevan la cantidad a 11 y 18. Son fixtures de estrés mediante la API de presentación, no clics reales en esta prueba. Semilla 712, día 150, progreso constante 75 %, 1280×720.

El encuadre interpola exponencialmente la distancia con constante .35 s y dt limitado a .1 s. Primera presentación, cambio de aspecto y reducedMotion se resuelven inmediatamente. Se mantiene el giro original y la compensación de niebla; no cambia el maíz ni el terreno.

## Evidencia

- 180 frames: cero raíces fuera del viewport, cero errores JS/GL. Distancia inicial 9.125, final 15.607; máximo cambio entre pasos de 1/30 s: .437 unidades. No constituye una prueba de ausencia absoluta de vibración o recorte de hojas.
- 12 poses adicionales: giros -10/0/+10 grados, día/noche y horizontal/vertical, todas con raíces dentro. En estas poses reducedMotion hace inmediato el ajuste.
- `motion-keyframes.webp` permite inspeccionar composición, crecimiento y apoyo. `planting-camera.mp4` contiene 90 capturas reales a 15 fps; es vídeo montado offline con tiempo simulado, **no una medición de rendimiento ni grabación de carga real**. Se revisaron los fotogramas clave, no se afirma revisión de reproducción continua.
- Al completar la capacidad, el harness pasa accepting=false al overlay y deja de invitar a plantar. La ilustración conserva el pergamino vacío: pendiente decidir un mensaje de capacidad completa en la integración.

## Límites y recomendación

Conservar la variante para integrar y validar en el flujo real. No usar como evidencia de costes GPU/CPU, tiempo de carga, funcionamiento táctil, cancelación o recuperación de recursos. El encuadre vertical del jardín completo sigue siendo más distante. Los cuatro cultivos iniciales conservan protagonismo en la primera captura, pero la cámara no es idéntica al original: se adapta al espacio disponible.

La instalación aún usa hooks QA; falta integrar el ciclo de vida y el aislamiento de sombras en el renderer compartido, probar interrupción/cancelación y transición a partida. No modifica producción ni main.

## Reproducción

Vite 5190; `node tools/experiments/capture-loading-framing-motion-20261021.mjs`. Genera frames PNG (no versionados), motion.json y poses; reemplaza salidas. Vídeo: ffmpeg -framerate 15 -i frames/%04d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart planting-camera.mp4. El conjunto global de biomas sigue pendiente de validación final.
