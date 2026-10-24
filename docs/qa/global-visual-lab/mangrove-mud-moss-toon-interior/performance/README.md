# Coste de la transición barro-musgo

Serie final: 32 bloques ABBA/BAAB, 5.760 muestras GPU, día/noche y media/baja. Fixture real WorldScene caso 11, 1280×720, mismo documento y cámara por calidad. Ejecutar `node tools/experiments/benchmark-mangrove-mud-blend.mjs` con `WG_PAIR_QUALITY=media` y después `baja`; servidor del laboratorio en 5190. Auditar con `python tools/experiments/audit-mangrove-performance.py`.

GPU media por bloque, agregada en ms; A original, B mezcla con interior toon:

| Perfil | Hora | A | B | B−A |
| --- | --- | ---: | ---: | ---: |
| Media | Día | 17,865 | 18,752 | +0,887 |
| Media | Noche | 18,292 | 18,450 | +0,157 |
| Baja | Día | 14,119 | 14,050 | −0,068 |
| Baja | Noche | 14,991 | 14,485 | −0,506 |

CPU de envío A/B: media día 5,317/5,651; media noche 5,137/5,370; baja día 5,595/5,588; baja noche 4,843/4,904 ms. Variación temporal visible: no interpretar los valores negativos como optimización demostrada. La carga externa del escritorio no está controlada. No hubo empaquetado propio concurrente en esta serie. El piloto anterior, que sí coincidió parcialmente con compresión, se conserva separado en `pilot-overlap` y queda excluido.

Auditoría: 180 muestras válidas por bloque, cero errores, disjoint, pérdidas de contexto o consultas pendientes; cámara estable y simulación sin cambios. Draw calls/triángulos constantes A/B: media 93/1.270.580; baja 92/1.017.508. Son contadores de envío del fixture, no los de las capturas de campaña anteriores. No se añade geometría.

Las capturas `return-*.webp` son conversiones RGB sin pérdida verificadas. A→B→A recupera exactamente ambas vistas nocturnas. En día quedan 7 píxeles distintos en media (máximo 23 niveles) y 24 en baja (máximo 44); causa no aislada, no declarar retorno exacto general. El piloto sí retornaba exactamente. No repetir mediciones para seleccionar un resultado más favorable.

La lectura de albedo duplicada del interior se reutiliza: doce capturas de campaña en `../../mangrove-mud-moss-dedup/comparison.json` son idénticas a la receta anterior. El helper también libera el material inactivo al descargar geometría; pendiente prueba de lifecycle, no constituye certificación de ausencia de fugas.

**Decisión:** mantener como candidata QA, sin integración. El sobrecoste diurno medio de ~0,89 ms requiere valorar beneficio en movimiento y vistas con más barro. Siguiente paso: recorrido y descarga/reapertura de chunks con contadores de materiales/atributos, además de localizar los residuos del retorno diurno. No está acreditada la calidad global de los seis biomas.
