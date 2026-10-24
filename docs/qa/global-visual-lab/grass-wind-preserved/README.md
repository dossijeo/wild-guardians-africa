# Viento corregido: conservación de AfricanToon

2026-10-20. Corrección del piloto QA, sin cambios en producción. Sustituye la evidencia de fidelidad visual y rendimiento del informe grass-wind anterior.

## Error y corrección

El primer helper reemplazaba onBeforeCompile sin invocar el callback ya instalado por AfricanToon. Tanto su control estático como su viento usaban otra receta de iluminación; por ello no demostraban fidelidad al material original. Se conserva ahora el callback y la clave de caché previos, se invoca primero la compilación nativa y se añade únicamente la deformación de vértices/normales. La variante reference permite volver directamente al callback original.

Se retira la aplicabilidad directa de las cifras anteriores de viento y de grass-wind-shadow a esta revisión. La invalidación del mapa solar completo sigue siendo una limitación arquitectónica, pero su sobrecoste numérico anterior no es un benchmark de este shader corregido. No se habilita proyección por mata.

## Evidencia nueva

- [Referencia diurna](media-close-day-reference.webp) / [viento corregido](media-close-day-wind2.webp).
- [Referencia nocturna](media-close-night-reference.webp) / [viento corregido](media-close-night-wind2.webp).
- [Vídeo diurno estático](motion-day-static.webm) / [viento](motion-day-wind.webm).
- [Vídeo nocturno estático](motion-night-static.webm) / [viento](motion-night-wind.webm).

Dieciséis capturas reales de Sabana, seed 712, 1280×720, perfil media, cámaras cercana/normal y horas 150/350. Orden referencia/estático/viento a t=2/referencia. Los ocho pares estático y retorno frente a referencia coinciden exactamente en la ronda final. Doce comprobaciones comparan las fuentes vertex/fragment completas tras ejecutar ambos callbacks: identidad exacta en estático, conservando artLighting416 y nativeShadowOcclusion. El helper falla si se pierde esa ruta de iluminación.

Una primera ronda tuvo variación aislada de 3–8 píxeles en cámara general; no se usó como prueba de identidad absoluta. La ronda final incorpora la comprobación estructural del shader y queda archivada en control-audit.json/captures-media.json. Sin errores registrados. Misma geometría, posiciones y cantidad: 192 matas, 46 080 triángulos; el viento no añade mapas ni draws frente al control.

Cuatro clips de 72 frames a 20 fps de reproducción, con cámara determinista; no son FPS medidos. Se inspeccionaron muestras de día y noche. El movimiento conserva ahora el carácter cromático del material nativo. No demuestra calidad del mockup ni ausencia de todos los artefactos temporales.

## Coste actual

3 840 muestras GPU en 32 bloques; dos bloques por variante/condición, 30 frames de calentamiento y 120 muestras. Intel UHD/ANGLE. CPU de envío, p95 y muestras en JSON. Sin eventos disjoint en bloques validados.

| Calidad | Vista | Hora | GPU estático / viento (ms) | Delta |
|---|---|---|---:|---:|
| media | close | day | 21.937 / 19.971 | -8.96% |
| media | close | night | 22.595 / 22.194 | -1.78% |
| media | game | day | 21.769 / 22.358 | +2.71% |
| media | game | night | 23.328 / 22.867 | -1.97% |
| baja | close | day | 15.594 / 15.498 | -0.62% |
| baja | close | night | 15.578 / 15.299 | -1.79% |
| baja | game | day | 14.550 / 15.153 | +4.14% |
| baja | game | night | 14.199 / 15.582 | +9.74% |

Las diferencias negativas no prueban aceleración. Baja/juego/noche registra +9.74%, por encima del criterio propuesto del 5%; otras condiciones cambian de signo y hay deriva conocida. Conservar la corrección y el prototipo QA, pero no aprobar presupuesto ni integrar por defecto. No mezclar estas medias con las del shader anterior.

## Hipótesis de transmisión suspendida

La revisión empezó con luz transmitida en hojas. Su parche sobre iluminación Standard no alcanzaba la salida final de AfricanToon y las doce parejas de tres biomas no cambiaban píxeles. Se clasifica como prueba técnicamente inválida, no como descarte artístico de la transmisión. Código y capturas exploratorias quedan en .codex-tmp/grass-translucency-inactive-run; la auditoría de identidad se publica. Antes de retomarla debe actuar en la función de iluminación realmente utilizada y demostrar actividad del shader.

## Límites y reproducción

Persisten las limitaciones de streaming largo, pausa/reanudación, interacción real de construcción y ajuste de sombras. Las normales geométricas se deforman; la envolvente estilizada de copa mantiene su forma de referencia, por lo que no se afirma una simulación física completa de iluminación foliar.

Servidor del worktree en 5190. Ejecutar capture-grass-wind-preserved.mjs, measure-grass-wind-preserved.mjs y record-grass-wind-preserved.mjs; resumen con summarize-grass-wind-preserved.py. La captura usa WG_POM_QUALITY=media; benchmark media,baja. PNG archivados como WebP sin pérdida. Los scripts anteriores importan el helper corregido, por lo que sus resultados históricos solo se reproducen desde el commit previo.
