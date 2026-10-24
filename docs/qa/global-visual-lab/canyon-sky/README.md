# Cielo sobre paredes: descartado

Reducir el aporte ambiente diurno de las caras inclinadas revela más facetas, pero resalta una triangulación regular. No aporta la textura rocosa ni el volumen de masas de la referencia. Conserva la receta nocturna original. No se integra ni se hace un barrido de intensidades sobre este resultado.

12 capturas WorldScene real, Cañón caso 21, semilla 712, calidad media, 1280 × 720 DPR 1. Vistas juego/baja/lateral, día 150/noche 350. comparison.json confirma seis parejas con cámara, objetivo y hora iguales. Referencia: global-lighting.

- [Antes lateral](canyon-global-lighting-side-day.png) / [después](canyon-canyon-sky-side-day.png)
- [Antes noche](canyon-global-lighting-game-night.png) / [después](canyon-canyon-sky-game-night.png)

+0 draw calls, +0 triángulos y +0 texturas. El contador de geometrías de juego/día varía entre cargas (+3 en cielo, +2 en normales); no se presenta como ahorro ni prueba de fugas. El ensayo de normales reemplaza buffers residentes por clones y dispone los originales; el número de triángulos se conserva. No es una solución de streaming: el promedio no se reconstruye con nuevos vecinos. Los límites entre caras también intervienen en las máscaras de material existentes, por lo que no se afirma aislamiento exclusivo de la iluminación al modificar normales.

Sin benchmark temporal CPU/GPU: rechazado visualmente antes de aprobar rendimiento. Seis registros de referencia contienen un 404 sin URL identificada; candidatos sin errores registrados. No se alteran siluetas ni simulación. Fuente y auditoría en tools/experiments/qa-canyon-sky.js y audit-canyon.json.

Reproducción: WG_MATERIAL_STUDY=canyon-sky, WG_STUDY_BASELINE=global-lighting, node tools/experiments/capture-material-study.mjs, servidor 5190. Verificar con python tools/experiments/summarize-ground-frequency.py canyon-sky global-lighting.

Siguiente dirección: evaluar textura rocosa proyectada en paredes, conservando sus bandas y siluetas, en lugar de esperar que otro reparto de luz resuelva por sí solo un material plano. Referencia original revisada: ART-REFERENCES.md, Gran Cañón.
