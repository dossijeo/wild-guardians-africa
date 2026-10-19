# Mapungubwe taller: pase artístico C

Variante aislada `?visualLab=village-art`, exclusivamente para `mapu-0`. **Mejora parcial de teja, puerta y franja del arco; no acabado final ni paridad con los mockups. No activar por defecto.** Geometría, proporciones, silueta y UV de B permanecen idénticas. Los originales conservan sus hashes, verificados otra vez en `summary.json`.

## Autoría y alcance

El script `blender-paint-mapu-workshop.py` se ejecutó en Blender 5.2.2 headless. Reconstruye B, asigna siete selecciones/materiales de autoría y pinta a 2048 × 2048: original protegido (6.455 caras), terracota (302), puerta (60), travesaño (79), piedra lateral (169), claridad de franja original (313) y arco frontal ligado a geometría (614). `art-audit.json` guarda todos los índices y `surface-selection.png` la máscara. `workshop-art.blend` incluye el color empaquetado y selecciones editables. Todos los materiales de autoría se aplanan en **un material runtime**.

Las hiladas de teja siguen la bóveda, con labios suavemente curvos, juntas y tonos elegidos para este taller. La puerta y el travesaño usan trazos orientados según la carpintería y nudos colocados; la base lateral recibe piezas de piedra definidas. Son trazos parametrizados con decisiones artísticas específicas, no una pintura manual exhaustiva de cada isla. No hay ruido aleatorio, sharpen, upscale, normal adicional ni cambio de luz global.

Los murales solares, la cara naranja del arco, el toldo y otros accesorios conservan el pigmento fuente. Esto protege el diseño, pero mantiene su borrosidad. La WebP puede cambiar ligeramente los píxeles protegidos por recompresión. El contraste entre esas zonas suaves y los materiales nuevos sigue siendo un límite del resultado.

## Corrección del arco

La pintura blanca original cruzaba las facetas reales. `audit-workshop-arch.py` reconstruye adyacencias por posición solo para diagnosticar y mide los quiebros de normales. Se seleccionaron 53 segmentos del zigzag y 72 de sus bordes, con extremos y caras exactos en `arch-paint-edges.json`. `arch-selected-edges.png` muestra las aristas elegidas sobre la pintura fuente; `arch-facets.png` y `arch-creases.png` conservan el diagnóstico.

C desplaza el pigmento hacia esos segmentos en coordenadas 3D y lo vuelve a rasterizar en las UV de B. **No cambia posiciones, normales, índices ni silueta.** El blanco se redujo a marfil y las líneas se estrecharon tras comprobar su competencia con la puerta. Se renovó el padding de las islas para que el filtro no arrastrara rojo antiguo sobre las líneas nuevas. El contador de píxeles modificados incluye ese padding.

`0-facade-day.png` y `village-art-facade-day.png` usan exactamente el mismo encuadre frontal oblicuo. Solo en esta vista diagnóstica se ocultan las otras unidades del grupo para que no tapen el taller. Las capturas media/cercana mantienen el poblado completo. Las líneas siguen ahora el relieve; permanecen bordes dentados e irregularidades de grosor en la banda fragmentada, especialmente visibles en cercana nocturna. Corregirlos bien requiere un desplegado continuo específico del arco y rehacer su transferencia, pendiente de este pase. No se presenta como una restauración terminada.

## A/B/C WebGL

Los doce archivos `{0,village-repacked,village-art}-{medium,close}-{day,night}.webp` muestran la misma escena a 1280 × 720, semilla 712, calidad media. Desplazamiento de cámara respecto al centro: media (9,6.5,11), cercana (3.3,2.6,4.1). El capturador fija y verifica tiempo 150/350. Se corrigió un error del capturador anterior que podía invertir las etiquetas de luz de la cámara cercana.

La teja se lee mejor a distancia de juego; la puerta y el zigzag también se distinguen más claramente. La piedra lateral mejora discretamente. De noche el beneficio disminuye. La base frontal sigue borrosa y requiere una restauración específica de sus motivos para considerar completo el edificio. No se observan los polígonos negros del repack inicial.

El primer intento de cubierta superponía juntas y produjo una retícula cargada: se descartó (`rejected-overlay-close-day.webp`). Otra selección de puerta no alcanzaba las caras visibles; se corrigió mediante raycast. La primera cámara frontal mostraba una unidad vecina sin modificar; se corrigió el encuadre antes de evaluar el arco.

## Coste y validación

24 mediciones en orden **A–B–C–C–B–A**, dos muestras por cámara/fase, 30 fotogramas de calentamiento y 180 muestras por medición. Sin build ni otro cálculo pesado durante la corrida.

| Cámara/fase | GPU A / B / C, ms | CPU A / B / C, ms |
| --- | --- | --- |
| Media día | 13,90 / 13,36 / 13,82 | 5,44 / 5,81 / 5,77 |
| Media noche | 14,06 / 14,01 / 13,84 | 5,23 / 5,56 / 5,36 |
| Cercana día | 14,57 / 14,30 / 14,43 | 5,13 / 5,25 / 5,12 |
| Cercana noche | 14,89 / 15,18 / 14,57 | 4,99 / 4,97 / 4,99 |

No hay ganancia de rendimiento demostrada: diferencias pequeñas y variables. A/B/C presentan **62 draw calls y 580.971 triángulos** en media, **65 y 669.724** en cercana. El edificio conserva 10.147 vértices, 7.992 triángulos y un material runtime. B/C añaden un material de escena (206 frente a 205) y una textura; mismo número de geometrías (132 media, 138 cercana).

Atlas original compartido: 1.279.936 bytes; B: 782.534; C: **813.850 bytes**, 31.316 más que B. Binario B reutilizado: 420.608 bytes. El prototipo C añade **1.234.458 bytes de recursos frente a A**; no reduce la descarga global. Sin errores de página en las 24 mediciones.

B/C mantienen además el atlas original para las demás unidades. Un atlas RGBA8 2048² con mipmaps supone aproximadamente **21,33 MiB adicionales frente a A**, cero frente a B, más unos 0,40 MiB de binario aislado antes de copias del motor. Es una estimación de almacenamiento, **no VRAM/RSS medida**. Las mediciones son Chrome WebGL2 de escritorio, no un perfil móvil ni una campaña completa.

`summary.json` incluye diferencias de píxeles en una región fija: son diferencia visual, no una puntuación de calidad. `capture-report.json` registra cámaras, fases, materiales, texturas, draw calls y errores de página. La variante sigue fuera del camino por defecto.

## Reproducción

Con Vite en 127.0.0.1:5189:

```powershell
python tools/experiments/audit-workshop-arch.py
& 'C:\Users\PC\tools\blender\blender-5.2.2-windows-x64\blender.exe' -b --python tools/experiments/blender-paint-mapu-workshop.py
$env:WG_ART_VARIANTS='0,village-repacked,village-art,village-art,village-repacked,0'
node tools/experiments/capture-workshop-art.mjs
node tools/experiments/summarize-workshop-art.mjs
$env:WG_ART_VARIANT='0'
node tools/experiments/inspect-workshop-surfaces.mjs
$env:WG_ART_VARIANT='village-art'
node tools/experiments/inspect-workshop-surfaces.mjs
```

Pasaron build Vite, sintaxis de scripts, comprobación de diff y preservación de hashes. Los avisos existentes de bundle grande e importación dinámica/estática no cambian. Antes de adoptar C falta terminar las zonas decoradas protegidas y diseñar un atlas compartido que evite pagar otra textura por edificio.
