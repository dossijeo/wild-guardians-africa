# Relleno diurno del suelo y coherencia de sombras — prototipo global

Ensayo QA del 19 de octubre de 2026. Se suspende el retoque de edificios y se evalúa una intervención sobre escenas completas. No cambia geometría, normales, paletas de texturas, luz directa ni iluminación nocturna.

## Hipótesis y ejecución

Los cinco suelos físicos usan relleno diurno fijo `(0.55,0.63,0.67)`, mientras los props reciben una paleta de sombra por bioma considerablemente más oscura. En Sabana esa paleta es `(0.17,0.28,0.34)`. Se prueba reutilizar ese color para el relleno del suelo: las sombras proyectadas existentes se leen mejor sin otro mapa de sombras, pase o recurso.

El helper QA inserta constantes obtenidas del perfil activo; no es una implementación runtime de transiciones de bioma. Una primera compilación falló porque el shader de suelo no declara `uArtShade`; se corrigió usando el valor del perfil y se repitió la matriz completa. Las capturas finales no contienen errores.

Desierto usa otra rama toon que no consume este relleno físico. Es un control real sin beneficio, no se presenta como mejora en seis biomas.

## Evaluación artística

- **Sabana:** mejora clara del apoyo de árboles y lectura de sombras amplias en cámara normal. El suelo iluminado pierde algo de calidez; no reproduce la estructura fina de vegetación del mockup.
- **Gran Río:** los grupos se apoyan mejor, pero el suelo en sombra se vuelve más denso y frío. Mejora de volumen, con riesgo de reducir separación de plantas pequeñas.
- **Manglares:** efecto moderado. La alfombra de musgo y las bases de las plantas siguen desconectadas por sus materiales; cambiar relleno no resuelve ese problema.
- **Volcanes:** no recomendar la sustitución completa. El suelo ya es oscuro; reducir el relleno aporta poco y resta lectura local alrededor de rocas/troncos. La lava conserva su protagonismo, pero eso no demuestra mejora del resto.
- **Gran Cañón:** mejora la lectura de planos de pared y sombra del relieve desde el encuadre amplio. Mantiene el límite de superficie arenosa uniforme.
- **Desierto:** sin mejora; conserva su iluminación toon anterior.

**Decisión:** conservar como dirección de iluminación prometedora, no adoptar globalmente esta sustitución literal. El beneficio no es uniforme y no satisface aún seis biomas. Mantener original por defecto; no volver al pulido de un edificio para ocultar este límite. La siguiente decisión útil sería definir relleno por bioma y superficie con criterios de legibilidad, no barrer una constante universal.

## Evidencia y límites

48 capturas WebGL, seis biomas × dos cámaras × día/noche × A/B. Semilla 712, Mapungubwe, calidad media, 1280×720. Cámaras y hora idénticas por pareja; contadores de llamadas, triángulos, texturas y geometrías idénticos. No se cambiaron simulación, posición o cantidad de modelos. Noche esencialmente idéntica; las diferencias numéricas residuales de algunas parejas son menores que 0,001/255 de media, no una mejora nocturna.

`comparison.json` contiene diferencias cuantitativas, que no puntúan calidad artística. El Cañón tiene una cámara de fixture más alta que otros biomas; no permite comparar densidad aparente entre biomas.

Presupuesto previo: 0 nuevas texturas/draw calls/geometría y tolerancia GPU +0,5 ms. No hay descargas de assets nuevas ni memoria de texturas adicional; cambia un literal de shader. Tamaño del helper QA no equivale a tamaño final de un bundle. No se afirma VRAM residente medida. Medición ABBA en `abba.json`, resumen en `abba-summary.json`.

Reproducir: Vite en 5189; `node tools/experiments/capture-ground-shade-coherence.mjs`. Para ABBA usar `benchmark-ground-shade-coherence.mjs` con casos 1 y 6 y orden `0,ground-shade-coherence,ground-shade-coherence,0`. El helper se importa explícitamente y no existe flag runtime adoptado.

## Rendimiento y comprobaciones

Host exclusivo coordinado, Chrome, 180 muestras por fase, ABBA en cada bioma. Medias de las dos repeticiones, milisegundos:

| Escena | GPU A → B | CPU envío A → B |
|---|---:|---:|
| Sabana día | 18,199 → 18,158 | 5,359 → 5,210 |
| Sabana noche | 19,023 → 18,693 | 5,016 → 4,917 |
| Gran Río día | 14,446 → 14,097 | 5,991 → 5,654 |
| Gran Río noche | 14,955 → 14,829 | 5,654 → 5,348 |

Sin regresión observada respecto al presupuesto. No se atribuyen estas pequeñas reducciones a una optimización: el ensayo cambia color, no reduce trabajo, y la noche es control prácticamente idéntico. No se han medido GPU/CPU de los otros cuatro biomas ni carga inicial con cronómetro. Misma cantidad de recursos y ausencia de nuevos assets son el límite verificable de memoria/carga.

Los 16 informes tienen cámara estable, simulación intacta, timer GPU válido, cero disjoint/descartes/context lost y cero errores. Sabana 87 llamadas / 1.267.266 triángulos; Gran Río 85 / 746.780 en ambos brazos. El panel de benchmark añade una llamada y un triángulo respecto a las capturas.

Comprobación sintáctica de los cinco scripts nueva correcta. `npm run build`: correcto, 402 módulos; permanecen los avisos previos de importación estática/dinámica de far-atmosphere y tamaño de bundle. No se añaden tests que repliquen el helper: la verificación relevante es compilación real de shader, 96 capturas de las dos hipótesis y controles de invariantes.
