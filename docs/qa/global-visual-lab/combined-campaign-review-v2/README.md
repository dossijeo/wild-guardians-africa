# Revisión conjunta V2: seis biomas, media y baja

A es el conjunto anterior conservado: iluminación global, cobertura C viento8/tiempo2 en Sabana/Río, suelo cálido Cañón y arena experimental. B añade únicamente frontera por desgaste en Río, mezcla barro/musgo con interior toon en Manglares y escala de grava0,08 en Cañón. Sabana, Volcanes y Desierto son controles sin cambio de receta. No es una comparación contra main.

144 capturas reales,72 parejas: seis biomas × dos calidades × día/noche × tres cámaras. Semilla712,1280×720, misma cámara/objetivo/hora por pareja. Geometría enviada idéntica A/B en todas; instancias/buffers de cobertura coinciden y overflow0. Cero errores. Individuales WebP RGB sin pérdida verificados; `*-pair.webp` muestran vista normal izquierda A/derecha B. [Conjunto baja diurna](baja-day-overview.webp).

| Bioma | Draws media/baja | Triángulos media/baja, vista normal |
| --- | ---: | ---: |
| Sabana | 72/69 | 1927535/1274920 |
| Gran Río | 66/62 | 869817/504136 |
| Gran Cañón | 39/36 | 399675/335551 |
| Manglares | 64/61 | 614104/462480 |
| Volcanes | 69/65 | 502116/394439 |
| Desierto | 44/38 | 221404/208853 |

Controles: Volcanes y Desierto tienen doce pares RGB exactos cada uno. Sabana tiene nueve exactos y tres con diferencias de hasta84píxeles; causa no aislada, no atribuirlo a mejoras inexistentes. Todas sus vistas normales son exactas. Los deltas no son una métrica de calidad.

## Lectura artística

- Río: la frontera cercana pierde parte del aspecto de pared de hojas. Persiste diferencia de color/iluminación entre cobertura y suelo desnudo. Mantener candidata.
- Manglares: el barro se integra mejor sin perder interior oscuro, también de noche. La banda suave no resuelve el patrón repetitivo del musgo. Mantener candidata, coste aún condicionante.
- Cañón: la grava es más legible a distancia normal; en cámara cercana sigue siendo plana. No aumentar indefinidamente su escala. Mantener como variante de legibilidad.
- Sabana conserva cubierta y paleta cálida; el perfil bajo tiene menor volumen que media, con coste geométrico explícito.
- Volcanes conserva contraste y lava, pero el detalle rocoso es uniforme y muy extendido; necesita diferencias de escala/material, no solo más contraste.
- Desierto conserva las ondulaciones y claridad de lectura del ensayo anterior.

No se demuestra todavía calidad global comparable a los mockups. Las tres candidatas son locales y no sustituyen la dirección completa de los seis biomas.

## Coste y siguiente puerta

Esta serie mide contadores y paridad, **no CPU/GPU ni FPS**. Los costes previos de barro (+0,89ms media diurna en su fixture) y Río (deltas variables hasta+1,33ms baja diurna) no deben sumarse para fabricar un presupuesto combinado. Cañón aún carece de benchmark específico. Antes de integración, ejecutar presupuesto real del conjunto en campaña, con calidad baja prioritaria, calentamiento, orden intercalado y medición separada de CPU/GPU/cadencia. Mantener controles para distinguir coste de preparación y render. No repetir esta misma serie estática sin cambios o una pregunta nueva.

Reproducir: Vite5190, `node tools/experiments/capture-combined-campaign-review-v2.mjs`, `python tools/experiments/package-combined-campaign-review-v2.py`. WG_COVER_QUALITY/WG_REVIEW_BIOMES permiten acotar captura, pero el empaquetador exige la serie completa48registros. Las variantes se instalan por QA y no alteran el inicio normal del juego ni main.
