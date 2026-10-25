# Color y normales proyectadas: Rock035 descartado para paredes del Cañón

El material añade grano fino, pero no fracturas y capas amplias comparables a la referencia. Las bandas siguen dominando como pintura plana. No se integra ni se intenta compensar aumentando su intensidad. El siguiente ensayo requiere una fuente de roca estratificada con detalle de escala mayor.

12 capturas WorldScene real, Cañón caso 21, semilla 712, calidad media, 1280 × 720 DPR 1; juego/baja/lateral y día 150/noche 350. comparison.json verifica seis parejas con cámara/objetivo/hora iguales a global-lighting. Se mantienen las mejoras ya integradas de sombra, agua y rugosidad seca.

- [Antes lateral](canyon-global-lighting-side-day.png) / [después](canyon-canyon-rock-normal-side-day.png)
- [Después de noche](canyon-canyon-rock-normal-game-night.png)

+0 draw calls, +0 triángulos; +2 textura(s) subida(s), reutilizando imágenes existentes con propiedad independiente de filtros/wrap. El contador de geometrías de juego/día varió +3 entre cargas, sin creación de geometría en el parche; no se interpreta como coste geométrico del shader ni como prueba de ausencia de fugas. Sin benchmark temporal CPU/GPU: rechazado visualmente antes de aprobar coste. Seis registros de referencia contienen un 404 sin URL identificada; candidato sin errores registrados.

[Fuente y licencia](SOURCE.md). El ensayo de color usa dos lecturas de textura en paredes; el de normales añade dos lecturas más y reorienta la proyección. Mantienen bandas y posiciones, no alteran navegación ni simulación. En el segundo, la orientación del color también se ajusta para coincidir con la proyección de normales: no es una comparación aislada de intensidad de normal map.

Limitación: materiales residentes únicamente, sin enlace de textura para nuevos chunks. Los clones de textura se liberan al desaparecer el último material propietario; esto no sustituye una prueba de ciclo de vida completa. Ningún cambio runtime.

Reproducir con WG_MATERIAL_STUDY=canyon-rock-normal y node tools/experiments/capture-material-study.mjs, servidor 5190. Verificar parejas con python tools/experiments/summarize-ground-frequency.py canyon-rock-normal. Shader QA en tools/experiments/qa-canyon-rock-normal.js.
