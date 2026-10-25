# Normales compartidas de pared: descartado

Sobre el ensayo canyon-sky, promedia normales vecinas de caras inclinadas con producto escalar mayor de 0,75. Reduce la triangulación visible, pero las paredes siguen leyendo como bandas planas. No aporta suficiente mejora artística. Se modificaron 23.243 normales en 15 mallas residentes; se verificó igualdad exacta de posiciones y colores antes/después. Afecta normales también de noche. No se integra ni se hace un barrido de intensidades sobre este resultado.

12 capturas WorldScene real, Cañón caso 21, semilla 712, calidad media, 1280 × 720 DPR 1. Vistas juego/baja/lateral, día 150/noche 350. comparison.json confirma seis parejas con cámara, objetivo y hora iguales. Referencia: canyon-sky.

- [Antes lateral](canyon-canyon-sky-side-day.png) / [después](canyon-canyon-normal-smooth-side-day.png)
- [Antes noche](canyon-canyon-sky-game-night.png) / [después](canyon-canyon-normal-smooth-game-night.png)

+0 draw calls, +0 triángulos y +0 texturas. El contador de geometrías de juego/día varía entre cargas (+3 en cielo, +2 en normales); no se presenta como ahorro ni prueba de fugas. El ensayo de normales reemplaza buffers residentes por clones y dispone los originales; el número de triángulos se conserva. No es una solución de streaming: el promedio no se reconstruye con nuevos vecinos. Los límites entre caras también intervienen en las máscaras de material existentes, por lo que no se afirma aislamiento exclusivo de la iluminación al modificar normales.

Sin benchmark temporal CPU/GPU: rechazado visualmente antes de aprobar rendimiento. Seis registros de referencia contienen un 404 sin URL identificada; candidatos sin errores registrados. No se alteran siluetas ni simulación. Fuente y auditoría en tools/experiments/qa-canyon-normal-smooth.js y audit-canyon.json.

Reproducción: WG_MATERIAL_STUDY=canyon-normal-smooth, WG_STUDY_BASELINE=canyon-sky, node tools/experiments/capture-material-study.mjs, servidor 5190. Verificar con python tools/experiments/summarize-ground-frequency.py canyon-normal-smooth canyon-sky.

Siguiente dirección: evaluar textura rocosa proyectada en paredes, conservando sus bandas y siluetas, en lugar de esperar que otro reparto de luz resuelva por sí solo un material plano. Referencia original revisada: ART-REFERENCES.md, Gran Cañón.
