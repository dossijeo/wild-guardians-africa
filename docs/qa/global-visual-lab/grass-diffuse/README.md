# Material difuso de hierba: sin ventaja consistente

Comparación aislada del material: mismas 72 hojas por mata, geometría grass-fine-lite, posiciones y límite de instancias. Referencia MeshStandardMaterial con la receta AfricanToon existente; candidato MeshLambertMaterial con colores de vértices, luces y recepción de sombras de Three. Sin texturas, cambios de modelos originales ni cambios de simulación.

La apariencia se mantiene cercana en estas vistas, con algunas hojas más oscuras. La medición no demuestra una ventaja consistente: no se sustituye el material actual ni se integra el candidato. El siguiente ensayo debe reducir el detalle geométrico a distancia, conservando la curvatura en primer plano.

## Capturas

Ocho PNG, Sabana/caso 1, semilla 712, calidad media, 1280 × 720 DPR 1, juego/baja y día 150/noche 350. Cuatro parejas con cámara/objetivo/hora iguales, idénticos draw calls, triángulos, texturas y geometrías (comparison.json). Ambas variantes tienen hierba; esta referencia es distinta de una escena sin hierba.

- [Material actual de día](savanna-grass-fine-lite-low-day.png) / [difuso](savanna-grass-diffuse-low-day.png)
- [Material actual de noche](savanna-grass-fine-lite-low-night.png) / [difuso](savanna-grass-diffuse-low-night.png)

## Rendimiento

Una página, mismos mesh e instancias, alternancia ABBA de material. 180 frames medidos tras 30 de calentamiento por muestra. Cámara estable y simulación sin cambios en cada reporte. Los dos materiales permanecen residentes.

| Fase | Actual GPU ms | Difuso GPU ms | Diferencia |
| --- | ---: | ---: | ---: |
| Día | 18,261 | 18,003 | -0,258 |
| Noche | 18,571 | 18,811 | +0,240 |

No se interpreta el valor negativo como aceleración demostrada. Esta comparación no mide el coste respecto a una escena sin hierba y no aprueba el presupuesto global. Datos CPU/GPU completos y dispositivo en paired.json, resumen en performance-summary.json. El resultado cambia de signo entre fases; no justifica sustituir la receta de iluminación.

## Límites y reproducción

Solo Sabana y cámara fija. Se heredan los límites de grass-fine-lite: snapshot residente, sin streaming/actualización de ocupación ni transición de distancia. El wrapper conserva el material original para comparar; su ciclo de vida no es una implementación de producción. La referencia visual y el benchmark registran un 404 sin URL identificada, conservado; capturas candidatas sin errores registrados. La receta Lambert usa las sombras estándar de Three, no el filtro nativo específico; no se afirma equivalencia exacta de iluminación.

Servidor 5190. Capturas: WG_MATERIAL_STUDY=grass-diffuse, WG_STUDY_BASELINE=grass-fine-lite con node tools/experiments/capture-material-study.mjs. Benchmark: WG_MATERIAL_STUDY=grass-diffuse con node tools/experiments/benchmark-grass-material.mjs. Parejas: python tools/experiments/summarize-ground-frequency.py grass-diffuse grass-fine-lite. Ninguna modificación runtime.
