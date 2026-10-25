# Distribución y paleta de matas en seis biomas

20/10/2026. Piloto QA sobre la mata arqueada de Blender, sin integración habitual. Se rompe el grupo hexagonal fijo: número variable de matas, radios y ángulos deterministas, con separación mínima de raíces de 0,35 m dentro de cada grupo. La forma de la mata, el límite de 192 instancias y las transiciones se mantienen. No se modifica simulación, navegación, reglas, balance ni siluetas originales.

## Comparación visual

48 capturas finales de campaña, seis biomas, dos cámaras, día/noche y dos variantes. Semilla 712, calidad media, 1280×720, mismas cámaras, objetivos, horas y entidades. En Sabana/Gran Río la base es la mata arqueada con grupos hexagonales; en los otros cuatro biomas la base no tiene esta microvegetación. `comparison.json` verifica las 24 parejas: el cambio de triángulos coincide exactamente con la diferencia de instancias × 240. No hay errores de página/HTTP.

| Bioma | Matas en vista general / baja | Evaluación visual |
|---|---:|---|
| Sabana | 128 / 192 | Grupos menos geométricos; menos cobertura en la vista general que las 166 matas anteriores. |
| Gran Río | 128 / 192 | Distribución más irregular, con el mismo límite superior; conserva el claro. |
| Manglares | 76 / 164 | Aporte discreto; la referencia pide cobertura de hojas anchas. No aprobar este perfil como solución de Manglares. |
| Volcanes | 68 / 147 | El tono dorado se distingue del suelo oscuro y se acerca a la dirección de la referencia. |
| Gran Cañón | 30 / 20 | Presencia pequeña sobre zonas elegibles, sin plantar en paredes o agua; no resuelve el aspecto del terreno. |
| Desierto | 14 / 28 | Matas aisladas; el suelo sigue demasiado plano respecto al mockup. |

- [Sabana antes](sabana-base-overview-day.png) / [después](sabana-candidate-overview-day.png).
- [Gran Río antes](gran-rio-base-low-day.png) / [después](gran-rio-candidate-low-day.png).
- [Manglares antes](manglares-base-overview-day.png) / [después](manglares-candidate-overview-day.png).
- [Volcanes antes](volcanes-base-overview-day.png) / [después](volcanes-candidate-overview-day.png), [noche](volcanes-candidate-overview-night.png).
- [Cañón antes](gran-canon-base-overview-day.png) / [después](gran-canon-candidate-overview-day.png).
- [Desierto antes](desierto-base-overview-day.png) / [después](desierto-candidate-overview-day.png).

`initial/` conserva 48 capturas y los parámetros del primer pase, demasiado discreto en los biomas secos: Volcanes tenía 22 matas en la vista general, Cañón 4 y Desierto 7. Se aumentó la presencia sin retirar las exclusiones, y se corrigió el tono de Volcanes. El archivo `initial/profiles.js` documenta los valores iniciales; no es un módulo independiente ejecutable.

## Distribución y exclusiones

`qa-grass-biomes.js` contiene los parámetros finales. La probabilidad por ancla de 6 m es 0,55 en Sabana/Río/Cañón, 0,38 en Manglares, 0,30 en Volcanes y 0,10 en Desierto; no representa porcentaje de terreno cubierto. Los grupos tienen 3–7, 3–6 o 2–4 candidatas según bioma, antes de rechazos por espacio y terreno. Se mantiene escala base 1 y variación individual 0,85–1,15.

La auditoría de campaña comprueba todas las candidatas residentes: 3.967 en Sabana y Río, 2.057 en Manglares, 2.106 en Volcanes, 3.415 en Cañón y 395 en Desierto. Cero raíces en agua/lava, pendientes mayores de 0,42, desgaste nativo mayor de 0,27 o huellas de edificios con margen de 0,65 m. Se reutiliza la misma máscara de terreno que el renderer. La auditoría no equivale a probar interacción de construcción/cultivo desde la interfaz.

Se reutiliza el GLB de 8.008 bytes, 240 triángulos y 150 vértices, sin texturas. No hay assets externos nuevos. Los contadores globales de texturas entre páginas separadas varían en 0, −7 o −12; no se interpretan como ahorro de memoria atribuible a las matas.

## Rendimiento y límites

`campaign-performance.json` registra ABBA de visibilidad en el bucle real de campaña, con simulación pausada, cámara fija, 30 frames de calentamiento y 180 muestras por bloque. Assets y selección permanecen residentes en ambos estados. `performance-summary.json` contiene las medias por bioma/fase. No es una comparación directa contra los grupos hexagonales ni mide el coste completo del streaming en movimiento. No se graban nuevos vídeos en este pase; las transiciones usan el mismo mecanismo del pase anterior.

| Bioma | Matas en benchmark | Diferencia GPU día ms | Diferencia GPU noche ms |
|---|---:|---:|---:|
| Sabana | 192 | +0,221 | −0,027 |
| Gran Río | 192 | −0,153 | +0,084 |
| Manglares | 147 | +0,824 | +0,265 |
| Volcanes | 126 | +0,380 | −0,062 |
| Gran Cañón | 21 | −0,114 | +0,300 |
| Desierto | 24 | +0,149 | +0,006 |

Los 48 bloques contienen 180 muestras GPU, cámara estable, población acotada y ningún error registrado. Las diferencias negativas son variación de medición, no aceleraciones causadas por añadir matas. El benchmark usa la cámara de asentamiento, distinta de las dos cámaras de las capturas; por eso difieren los conteos. El coste diurno de Manglares, junto con su aporte visual pequeño, refuerza el descarte de ese perfil. No se aprueba el presupuesto global a partir de estas mediciones incrementales. Sintaxis de los cinco scripts modificados comprobada; no se cambió código de producción ni se ejecutó un nuevo build.

## Recomendación

Conservar la distribución irregular y el perfil dorado de Volcanes como candidatos; mantener los perfiles secos escasos. No dar por resuelto Manglares con esta hierba. Antes de integrar faltan recorridos largos e interacción de ocupación en campaña, además del presupuesto acumulado. Las vistas de los seis biomas muestran que la siguiente prioridad visual debe volver al terreno: relieve/material de arena en Desierto, volumen y sombras del Cañón, y cobertura de hojas anchas en Manglares. Las matas por sí solas no acercan suficientemente el conjunto a los mockups.

La inspección del shader identifica una hipótesis concreta para el siguiente pase de Desierto: `groundMaterial417` deriva a la ruta antigua, con normalAmount de 0,010 y desvanecimiento de detalle temprano. Es una hipótesis pendiente de comparación dentro del juego, no una mejora ya implementada.
