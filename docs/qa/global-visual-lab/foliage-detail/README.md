# Relieve de hojas horneado: piloto descartado

Se modelaron 72 hojas cerradas en Blender y nueve repeticiones espaciales para hornear un mosaico periodico de normales. Fuente propia, sin assets externos. El archivo Blender conserva el modelo fuente y el plano receptor del horneado; ese plano no se incorpora al juego. No son planos cruzados de vegetacion.

La textura 512 x 512 ocupa 163.087 bytes en disco; RGBA8 con mipmaps supone aproximadamente 1,33 MiB nominales de GPU. El piloto comparte una textura, usa proyeccion por eje dominante a 2 m y fuerza normal 0,30, con atenuacion por tamano de pixel. Solo aplica a materiales nativos de vegetacion y usa su mascara de hoja por pixel. No desplaza vertices ni altera siluetas, entidades, reglas o navegacion. El atlas existente permanece intacto.

## Evidencia visual

24 capturas de campana real, Sabana/Gran Rio/Manglares, dos camaras elevadas, dia y noche. Semilla 712, calidad media, vegetacion lejana desactivada, objetivo desplazado +50/+30 m desde la aldea. Hora 150/350, dia 1, simulacion pausada y reloj de materiales fijado. `captures.json` registra las condiciones; `comparison-audit.json` verifica 12 parejas sin errores y sin cambios de camara, poblacion ni ajustes. La diferencia numerica de imagen es una comprobacion auxiliar, no una medida de calidad.

- [Sabana antes](sabana-base-settlement-day.png) / [despues](sabana-candidate-settlement-day.png): aparecen pequenas marcas angulosas en copas cercanas; no se leen como hojas con claridad suficiente.
- [Rio nocturno antes](gran-rio-base-settlement-night.png) / [despues](gran-rio-candidate-settlement-night.png): el relieve no resuelve la lectura de las masas oscuras.
- [Manglares antes](manglares-base-settlement-day.png) / [despues](manglares-candidate-settlement-day.png): aporte minimo en la vegetacion distante.

**Decision: no integrar esta variante.** Conservar fuente y evidencia para reproducibilidad, no como asset aprobado. No se ha demostrado estabilidad en movimiento, ausencia de costuras entre ejes, ni calidad en los otros tres biomas. No ampliar a esos biomas un piloto que ya falla el criterio visual en las escenas prioritarias.

## Rendimiento

Medicion separada de las capturas: fixture real de render, casos 1/6/11, ABBA por dia/noche, 30 frames de calentamiento y 180 muestras por bloque. Se alternan callbacks originales y candidatos en la misma pagina; la textura queda residente en ambas variantes. Por tanto, mide coste de render incremental, no carga ni ahorro de memoria al quitar el asset. Valores en `performance-summary.json`, registros completos en `paired.json`. No equivale a validar el presupuesto global de campana. Un 404 generico en la primera pagina del fixture no incluye URL en el informe; se conserva como limitacion sin atribuirlo a un recurso por suposicion.

## Reproduccion

Ejecutar Blender en segundo plano con `tools/experiments/blender-foliage-detail.py`. Para capturas, usar `capture-campaign-grass.mjs` con WG_GRASS_STUDY=foliage-detail, WG_GRASS_BIOMES=sabana,gran-rio,manglares, WG_GRASS_VIEWS=settlement,overview, WG_CAMPAIGN_TARGET_OFFSET=50,30 y WG_GRASS_OUTPUT apuntando a este directorio. Auditar con `python tools/experiments/audit-campaign-material.py docs/qa/global-visual-lab/foliage-detail`. Para ABBA, usar `benchmark-material-study.mjs` con WG_MATERIAL_STUDY=foliage-detail y WG_PAIR_CASES=1,6,11.

Siguiente direccion: priorizar la lectura amplia del terreno y las masas vegetales, evitando sumar detalle fino que compita con ellas. La iluminacion escalonada y la escala de los motivos siguen condicionando el aspecto; otro aumento aislado de normales no esta justificado por estas capturas. La calidad global de los mockups sigue pendiente.

| Bioma | Fase | GPU base / piloto (ms) | Diferencia |
|---|---|---:|---:|
| Sabana | day | 16.909 / 17.290 | +0.381 |
| Sabana | night | 17.489 / 18.035 | +0.546 |
| Gran Rio | day | 13.486 / 13.605 | +0.119 |
| Gran Rio | night | 13.982 / 14.360 | +0.378 |
| Manglares | day | 16.209 / 16.980 | +0.771 |
| Manglares | night | 17.346 / 17.818 | +0.472 |

Hay deriva entre bloques; estas diferencias no establecen un coste universal. Las 24 mediciones verifican camara estable y simulacion inalterada, sin errores internos de render. No se ha probado movimiento.
