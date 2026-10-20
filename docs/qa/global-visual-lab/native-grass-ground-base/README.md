# Transición de bases de hierba al terreno

2026-10-20. Sabana, campaña seed 712, global-lighting, 1280×720. Experimento QA de material; producción intacta.

## Decisión visual

Conservar la variante continua como candidato localizado, todavía sin integración. La textura sola elimina parte del aspecto de disco pintado, pero oscurece la base respecto al suelo. Compartir la respuesta continua de luz, sombra y contacto reduce esa discontinuidad, especialmente de noche. Sigue habiendo un contorno naranja y pequeñas zonas del material original. En cámara normal la mejora es discreta; no equivale al volumen del mockup ni resuelve las bases de los demás recursos.

- Día cercano: [original](media-close-day-original.webp), [textura](media-close-day-ground.webp), [textura y luz continua](media-close-day-continuous.webp).
- Noche cercana: [original](media-close-night-original.webp), [continua](media-close-night-continuous.webp).
- Cámara de juego: [original](media-game-day-original.webp), [continua](media-game-day-continuous.webp).

## Implementación y diagnóstico

Únicamente slot 8 Hierba seca corta del pack Savanna. Se conservan callbacks y caché nativos; las variantes se aplican en artLighting416. La máscara combina altura local, normal geométrica hacia arriba y exclusión foliar. No es una segmentación perfecta: explica partes sin cubrir y limita el tratamiento de bordes. No desplaza vértices, descarta fragmentos ni altera siluetas.

La textura se toma del recurso BiomeGround ya residente, con su escala, rotación, seed y origen flotante. El color usa la modulación de Sabana. La variante ground conserva la iluminación del objeto. La variante continuous reutiliza la BRDF de ground-lighting-source y los valores solares/nocturnos, relleno global de sombra, consulta nativeShadowOcclusion y mapa de contacto del terreno. Su AO procede del ARH existente; sustituye la respuesta de base en la mezcla, en lugar de multiplicar encima la oclusión anterior del objeto.

La primera implementación continua no compiló porque brdf4 solo existe en la ruta de suelo. Se corrigió reutilizando esa función con nombre propio y dependencias explícitas. Una revisión posterior corrigió el relleno y contacto: copiar solo los colores de luz dejaba bases claras bajo las copas. Las capturas publicadas pertenecen a la última revisión completa, sin errores.

El ensayo NO replica todo BiomeGround: faltan normales del suelo, POM, máscaras de cobertura/desgaste, mezcla con color original del terreno y reflexión ambiental. Por ello no hay continuidad exacta y no se propone extenderlo automáticamente. La máscara de altura requiere evaluación por recurso. No sustituir este diagnóstico por más intensidad de luz.

## Coste estructural

Sin nuevas geometrías, instancias, draws, texturas asignadas ni pasadas. Ground añade una consulta de color en el código fuente. Continuous contiene hasta cuatro consultas de material (color dos veces, ARH, contacto) y una consulta adicional de sombra; el compilador puede eliminar la lectura de color repetida, pero no se asume. Se reutiliza memoria de mapas existente; no se mide memoria de programas GPU en bytes. La variante original no añade esas operaciones.

## Evidencia

Dieciséis capturas reales: original/textura/continua/retorno, vistas cercana y normal, día/noche. Cuatro retornos idénticos píxel a píxel. Poses, horas, draw calls, triángulos y cantidades de texturas/geometrías iguales por condición. Cero errores de navegador en la revisión final.

48 bloques simétricos A/B/C/C/B/A, 30 frames de calentamiento y 120 muestras por bloque: 5.760 muestras GPU en Intel UHD/ANGLE. Sin eventos disjoint; cámara estable. CPU de envío y p95 en audit.json; datos crudos comprimidos en benchmarks-*.json.gz. Sin captura ni compresión durante la medición.

| Calidad | Vista | Hora | GPU original / textura / continua (ms) | Continua vs original | CPU original / continua (ms) |
|---|---|---|---:|---:|---:|
| media | close | day | 17.683 / 18.418 / 18.746 | +6.01% | 3.330 / 3.323 |
| media | close | night | 18.801 / 19.423 / 19.274 | +2.52% | 3.481 / 3.716 |
| media | game | day | 20.039 / 20.402 / 20.893 | +4.26% | 3.050 / 3.064 |
| media | game | night | 20.571 / 21.269 / 21.724 | +5.61% | 2.928 / 3.069 |
| baja | close | day | 14.172 / 13.714 / 14.120 | -0.37% | 3.271 / 3.284 |
| baja | close | night | 14.443 / 14.715 / 15.466 | +7.08% | 3.047 / 3.149 |
| baja | game | day | 14.429 / 14.662 / 14.675 | +1.70% | 2.980 / 3.068 |
| baja | game | night | 15.205 / 15.227 / 15.000 | -1.35% | 3.013 / 2.784 |

No aprobar coste: la variante continua supera el umbral orientativo del 5% en media/cercana/día, media/juego/noche y baja/cercana/noche. No interpretar los deltas negativos como aceleración. La mejora visual es localizada y el coste acumulado del experimento global sigue sin aprobarse.

Cuatro clips de órbita de 48 frames, reproducidos a 20 fps (no FPS medidos): [día original](motion/day-original.webm), [día continua](motion/day-continuous.webm), [noche original](motion/night-original.webm), [noche continua](motion/night-continuous.webm). Sin errores de captura. Inspección de fotogramas extremos: persiste costura naranja y diferencia de relieve. No equivale a una verificación exhaustiva de estabilidad temporal, streaming largo ni saltos de origen flotante.

Siguiente decisión: para mejorar más, separar la identificación de la base de la clasificación cromática foliar y compartir gradualmente normales/máscaras del terreno. No ampliar esta receta incompleta a todos los biomas ni duplicar toda la iluminación sin un presupuesto medido.


## Reproducción

Servidor en 5190; scripts tools/experiments/capture-native-grass-ground-base.mjs, measure-native-grass-ground-base.mjs, record-native-grass-ground-base.mjs y summarize-native-grass-ground-base.py. Los PNG locales se publican como WebP sin pérdida. El resumen admite muestras JSON locales o gzip publicado. No ejecutar capturas, compresión o bakes durante el benchmark.
