# Hierba con dos niveles geométricos: prototipo, sin integración

Mismas posiciones y límite total de 128 matas. Cerca de la cámara (<22 m), malla grass-fine-lite de 720 triángulos; a distancia, 72 hojas cerradas de cuatro triángulos cada una (288 por mata). Fuente lejana propia Blender, cero bordes abiertos/no manifold, GLB 33.988 bytes. No planos cruzados, texturas ni modificaciones de modelos originales.

La cobertura se conserva en las vistas fijas, pero el presupuesto GPU no queda aprobado. Se conserva el prototipo para investigación, no se integra. Antes de aumentar complejidad vegetal, revisar el brillo del suelo a contraluz visible en el encuadre lateral. Esta observación no identifica aún la causa ni prueba una corrección.

## Comparación

Ocho capturas, Sabana/caso 1, semilla 712, media, 1280 × 720 DPR 1. Juego/baja, día 150/noche 350. comparison.json verifica cámara, objetivo y hora por pareja.

| Vista | Cerca / lejos | Triángulos adicionales | Draws adicionales |
| --- | ---: | ---: | ---: |
| Juego | 0 / 103 | 29.664 | 1 |
| Baja | 13 / 115 | 42.480 | 2 |

Dos geometrías adicionales, cero texturas. Reducción respecto a grass-fine-lite: 60 % de triángulos en juego y 53,9 % en baja. Los campos geometryBytes/instanceBytes heredados del capturador solo describen la malla cercana, no la memoria total de ambos niveles.

- [Antes](savanna-global-lighting-game-day.png) / [LOD](savanna-grass-lod-game-day.png)
- [Baja de noche](savanna-grass-lod-low-night.png)
- [Cruce lateral cercano](transition-side-0.png) / [lejano](transition-side-1.png) / [retorno](transition-side-2.png)

La prueba lateral pasa de 21/107 a 20/108 y vuelve a 21/107, manteniendo 128 matrices distintas y hora 150. No demuestra ausencia de popping: el cambio es abrupto y falta histéresis o transición. El primer encuadre transition-0/1/2 estaba parcialmente tapado por una copa y no basta para evaluación visual; se conserva y se añadió el lateral. La primera ejecución del comprobador agotó el tiempo por codificación del separador en la condición de espera; corregida y repetida con éxito.

## GPU

ABBA de visibilidad en la misma página, ambas mallas se ocultan/muestran juntas. Activos residentes, 180 frames medidos tras 30 de calentamiento. Cámara estable y simulación sin cambios en cada reporte.

| Fase | Base GPU ms | LOD GPU ms | Delta |
| --- | ---: | ---: | ---: |
| Día | 18,158 | 19,726 | +1,568 |
| Noche | 19,029 | 19,267 | +0,238 |

La fase diurna supera +0,5 ms pese a la reducción geométrica. No inferir ahorro temporal solo contando triángulos ni comparar rondas independientes como prueba causal. La caché de sombras registra cero nuevos draws en las muestras candidatas (210 hits incluyendo calentamiento); esta ronda no atribuye el coste a nuevas pasadas del mapa de sombras. Datos CPU/GPU crudos en paired.json y resumen en performance-summary.json.

## Límites

Solo Sabana; snapshot residente sin streaming/actualización de ocupación, cortes abruptos de distancia y LOD. Sin benchmark de cámara en movimiento ni noche de transición. Referencia visual y benchmark registran un 404 sin URL identificada, conservado; candidato visual sin errores registrados. No afirmación de calidad global ni rendimiento aprobado.

Generador tools/experiments/blender-grass-lod.py. Captura y benchmark: WG_MATERIAL_STUDY=grass-lod con capture-material-study.mjs y benchmark-grass-study.mjs en tools/experiments, servidor 5190. Transición lateral: node tools/experiments/check-grass-lod.mjs. Parejas: python tools/experiments/summarize-ground-frequency.py grass-lod.
