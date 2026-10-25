# Matas de hojas finas: geometría conservada para refinar, integración rechazada por coste

72 hojas curvadas de sección triangular cerrada, 1.152 triángulos por mata, sin planos cruzados, texturas ni assets externos. Fuente Blender propia y generador tools/experiments/blender-grass-fine.py. Auditoría: cero bordes abiertos/no manifold, GLB 104.048 bytes. Los modelos originales permanecen intactos.

La forma es más fina que las islas de tallos y el piloto Kenney. Se aprecia en cámara baja, pero la cobertura a escala de juego todavía es escasa y algunas matas parecen tallos aislados. Se conserva como punto de partida, no como calidad aprobada. Reducir geometría y coste del material antes de ampliar cobertura; no integrar esta versión.

## Capturas

Ocho PNG del WorldScene real, Sabana/caso 1, semilla 712, calidad media, 1280 × 720 DPR 1, día 150/noche 350, cámara de juego/baja. comparison.json verifica cámara, objetivo y hora idénticos.

- [Juego antes](savanna-global-lighting-game-day.png) / [después](savanna-grass-fine-game-day.png)
- [Cámara baja antes](savanna-global-lighting-low-day.png) / [después](savanna-grass-fine-low-day.png)
- [Noche antes](savanna-global-lighting-game-night.png) / [después](savanna-grass-fine-game-night.png)

103 instancias visibles en juego (+118.656 triángulos), 128 en baja (+147.456), un draw adicional, cero texturas adicionales. Límite 128 instancias. Selección residente QA con 2.267 candidatos, exclusión de agua/pendiente/ocupación/desgaste. Sin actualización de ocupación ni streaming; corte de distancia abrupto. No listo para producción.

## Rendimiento

Misma escena, alternando visibilidad del mesh, activos residentes también al ocultarlo. Se verificó que el detalle original estaba vacío. Captura media de 180 frames tras 30 de calentamiento por muestra. Cámara estable y simulación sin cambios en cada reporte. ABBA y repetición nocturna BAAB:

| Ronda | Base GPU ms | Candidato GPU ms | Delta |
| --- | ---: | ---: | ---: |
| Día ABBA | 18,529 | 18,828 | +0,300 |
| Noche ABBA | 18,139 | 21,335 | +3,196 |
| Noche BAAB | 18,332 | 19,524 | +1,192 |

Ambas rondas nocturnas exceden +0,5 ms. Hay variación temporal, pero no sustenta aprobar el coste. No mide carga inicial ni coste de mover la cámara/streaming. Datos CPU/GPU crudos, dispositivo y límites en paired.json y paired-night-baab.json; resumen en performance-summary.json. La referencia visual y los benchmarks registraron un 404 sin URL identificada, conservado; las capturas del candidato no registraron errores.

Reproducir: WG_MATERIAL_STUDY=grass-fine con node tools/experiments/capture-material-study.mjs o node tools/experiments/benchmark-grass-study.mjs, servidor 5190. Benchmark admite WG_PAIR_PHASES, WG_PAIR_ORDER y WG_PAIR_OUTPUT. Ninguna modificación runtime, ninguna aprobación para los otros biomas.
