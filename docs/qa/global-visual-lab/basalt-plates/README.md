# Placas de basalto autorales — descartadas

Ensayo de escena completa en Volcanes, 19 de octubre de 2026. No se retocan edificios. El albedo original es azul-negro con vetas finas; se investiga una alternativa de formas medianas y carbón cálido, inspirada en las placas fracturadas del mockup.

## Construcción y resultado

Blender headless: 16 placas con contornos, posición, orientación, altura y tres colores explícitos, copias periódicas en los bordes y bisel de perímetro. Se hornean color, normal geométrica y AO/rugosidad/altura a tres PNG 1024². El AO es un valor autoral por material, no una oclusión física calculada. La altura procede de la geometría de horneado. No se exportan estas placas como geometría del juego. Se conserva el `.blend`, script y `design.json` para revisión.

**Se descarta.** Desde cámara normal parece un pavimento de polígonos superpuestos, demasiado regular y limpio para roca volcánica. Reduce la dominancia azul, pero pierde la riqueza de fractura del original. De noche se aplana y oscurece; desde cámara baja aparecen juntas demasiado gráficas. No es una mejora global de la escena, aunque el cambio sea visible en toda ella. No se añade grano para intentar encubrir el fallo de formas.

No se recomienda integrar ni automatizar este diseño. La dirección de relleno diurno del ensayo anterior sigue siendo más prometedora para algunos biomas; este resultado no la valida para Volcanes.

## Comparación real y controles

48 capturas WebGL: seis biomas, vistas de juego/baja, día/noche y original/candidata. Semilla 712, cultura Mapungubwe, calidad media, 1280×720. Solo Volcanes sustituye los mapas; los cinco controles devuelven `applied:false` en su auditoría. `comparison.json` confirma cámaras/objetivos idénticos en las 24 parejas y cero errores de navegador/shader. El máximo error medio de imagen de un control es 0,000791/255, diferencias residuales insignificantes.

En Volcanes llamadas, triángulos, geometrías y texturas coinciden por pareja: vista de juego 88 llamadas / 744.269 triángulos, vista baja 90 / 712.189. En Gran Río control hay una diferencia de seis geometrías contabilizadas entre sesiones, sin cambio de llamadas/triángulos ni imagen perceptible. Su causa de caché/carga no se ha aislado; no se presenta igualdad universal de recursos a partir de esta corrida.

## Coste e integridad

| Recurso | Original | Candidata |
|---|---:|---:|
| Dimensiones de los tres mapas | 1024² cada uno | 1024² cada uno |
| Archivos de textura | 5.572.195 bytes | 2.696.948 bytes |
| Estimación RGBA8 con mipmaps | 16 MiB | 16 MiB |
| Nuevos draw calls/geometría del mundo | — | 0 |

Las compresiones son distintas (JPG/PNG frente a PNG), y la candidata contiene mucho menos detalle: la reducción de bytes no constituye una mejora artística ni una optimización validada. El horneado conserva los valores de dithering del render de Blender, otro detalle a corregir antes de producir mapas de datos finales si el diseño hubiera prosperado.

El helper reemplaza `Source` en los tres objetos de textura existentes y conserva filtro/wrap. La caché QA retiene imágenes originales; se descargan adicionalmente 2.697 MB para la prueba y se decodifican aproximadamente 12 MiB de imágenes candidatas. No se afirma que la memoria RAM del navegador se mantenga igual. La estimación de 16 MiB no es una medición de VRAM residente. No hay medición de latencia de carga ni ABBA CPU/GPU: el resultado no supera el examen artístico.

`asset-budget.json` conserva hashes originales y confirma igualdad con Git HEAD. No se modificó ningún asset original, geometría, silueta, simulación ni default runtime. Mapas candidatos solo en documentación/QA.

## Reproducción y checks

`blender --background --python tools/experiments/blender-basalt-plates.py`, seguido de `node tools/experiments/capture-basalt-plates.mjs` con Vite en 5189. El parámetro URL no activa por sí solo el helper. Python compila; ambos scripts JS pasan comprobación sintáctica y el shader real no reporta errores en las capturas. El runtime no cambia respecto al build correcto de `54e3e0fd` (402 módulos).
