# Descartado: omitir iluminación física dentro del barro

Hipótesis: cuando mudWeight es exactamente1, la iluminación física del suelo se descarta al mezclar el interior toon. Una rama evita ese cálculo, conservándolo en la frontera. Solo QA; la receta anterior sigue siendo predeterminada.

Doce comparaciones estáticas candidatas, media/baja, tres cámaras y día/noche, son idénticas RGB a la receta anterior. Capturador habitual con WG_SAND_STUDY=mangrove-mud-moss-interior-branch; `compare-mangrove-interior-branch.py` conserva metadata y WebP sin pérdida. El primer arranque del perfil bajo agotó180s de espera; se repitió únicamente baja tras confirmar salida del proceso, completándose sin errores. No se contabiliza el intento fallido como validación.

## Medición

`benchmark-mangrove-interior-branch.mjs`: A es mezcla completa sin rama; B es la misma mezcla omitiendo iluminación de suelo en el interior. **A no es el barro original del juego.** ABBA/BAAB,180 muestras por bloque, día/noche y media/baja:32 bloques,5760 muestras. Mismo documento, cámara y geometría. `audit-mangrove-interior-branch.py` valida contadores, errores, temporizador, cámara y simulación.

| Perfil/hora | GPU A ms | GPU B ms | B−A ms |
| --- | ---: | ---: | ---: |
| Media día | 17,636 | 18,420 | +0,783 |
| Media noche | 17,823 | 18,954 | +1,131 |
| Baja día | 13,525 | 13,330 | −0,195 |
| Baja noche | 14,118 | 14,026 | −0,092 |

Cero errores, disjoint, pérdida de contexto o consultas pendientes. Draws/triángulos constantes: media93/1270580; baja92/1017508. No hay ahorro consistente; los tiempos varían entre bloques, con un pico B diurno de21,247ms en media. No eliminarlo para favorecer la hipótesis. No se midió aislamiento térmico ni carga externa del escritorio, ni se atribuye el empeoramiento exclusivamente a divergencia del shader. La rama no acredita una optimización.

Las capturas del benchmark tienen pequeños residuos temporales: A→A2 cambia2 píxeles media día,0 media noche,31 baja día y1 baja noche. A→B cambia2/0/26/2. La campaña estática controlada sí produjo doce pares exactos. No usar los residuos como cambio artístico. Los contadores y muestras completos están en `performance/*.json`.

**Decisión: descartar esta rama como optimización e integración.** Mantenerla únicamente como reproducción QA. La mezcla anterior conserva su candidatura visual y su coste conocido; no seguir repitiendo microbenchmarks de barro. Volver al objetivo global: el corte de cobertura herbácea de Gran Río sigue siendo evidente en la revisión conjunta. Investigar su transición geométrica y cromática hacia el material distante manteniendo densidad máxima, máscaras y distancias, en vez de aumentar arbitrariamente instancias.
