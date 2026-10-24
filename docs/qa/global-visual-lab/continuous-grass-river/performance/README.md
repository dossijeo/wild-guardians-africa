# Gran Río: rendimiento, memoria y sobrepintado

20/10/2026 · helper con exclusión por triángulos de agua (69f42263e) · Intel UHD 0x9A60 / ANGLE D3D11 · Chrome WebGL2 · 1280×720 · semilla 712.

**Recomendación: conservar el piloto QA y optimizar el LOD de cámara elevada antes de plantear activación general.** La cobertura tiene coste medido, no es gratuita: en cámara normal diurna C añade aproximadamente 0,98 ms GPU en la zona herbácea y 1,38 ms en la orilla. En elevada media el incremento es aproximadamente 1,9–2,3 ms. El perfil bajo utiliza la geometría ligera, pero su coste temporal presenta variación suficiente para no afirmar un presupuesto estricto a partir de esta sesión. No se garantiza 60 FPS ni se declara terminado el objetivo gráfico global.

## Método y resultados completos

Se cerró temporalmente la revisión interactiva de Sabana y se comprobó que no quedaban procesos Chrome/Playwright QA anteriores. Los benchmarks, memoria y sobrepintado se ejecutaron secuencialmente. Esto evita competencia de otra escena QA; no equivale a un laboratorio con frecuencia GPU fija o ausencia de toda actividad de Windows.

Matriz: dos regiones (cubierta junto al poblado y orilla principal), tres cámaras, día/noche, media/baja, orden A/B/C/C/B/A. 144 bloques ×120 muestras, después de 30 renders de calentamiento por bloque: **17.280 muestras GPU**. Viento C 8× con tiempo `frame/30`; cámara, semilla, hora y resolución constantes en cada comparación. A oculta la cobertura y conserva el helper residente, como en las capturas; no es una medición de arranque sin herramientas QA.

GPU mide todas las pasadas de render; CPU mide la llamada de render, no toda la simulación de Wild Engine. Mundo pausado: no acredita coste de una partida con combate o navegación activos. No hay screenshots/readback durante la medición temporal. Las variantes se precalientan antes del muestreo. Sin errores WebGL, pérdida de contexto, eventos disjoint, overflow ni movimientos de cámara dentro de los bloques. El validador comprueba 120 muestras y dos repeticiones por variante en cada caso.

[Tabla completa de medianas y deriva](TABLE.md) · [Resumen con medianas/P95, conteos y dispositivo](summary.json) · [Datos media](benchmarks-media.json) · [Datos baja](benchmarks-baja.json).

El máximo P95 GPU de C en la matriz inicial es 17,07 ms en media y 16,87 ms en baja. El máximo P95 CPU de envío es 11,41 ms y 6,20 ms respectivamente. Son máximos de casos distintos, no componentes que deban sumarse como si pertenecieran al mismo fotograma.

## Repetición dirigida por deriva

La primera ronda baja presentó hasta −2,74 ms de diferencia entre la primera y última medición de A. Se repitieron la orilla cercana/normal de día y noche, y la cubierta cercana nocturna. No se descartó ni sustituyó la ronda original. Otras 30 secuencias de medición individuales ×120 muestras = **3.600 muestras adicionales**, todas válidas; total **20.880 muestras GPU**.

| Región baja | Cámara | Luz | GPU A / B / C ms | Δ C−A ms | Deriva A ms |
|---|---|---|---:|---:|---:|
| shore | close | day | 10.29 / 11.25 / 10.76 | +0.47 | -0.82 |
| shore | close | night | 11.08 / 11.23 / 13.71 | +2.63 | -2.13 |
| shore | game | day | 9.47 / 10.18 / 9.29 | -0.18 | +0.53 |
| shore | game | night | 9.93 / 10.88 / 9.78 | -0.15 | +1.03 |
| vegetation | close | night | 11.06 / 11.34 / 11.45 | +0.39 | -0.62 |

La orilla cercana nocturna sigue siendo inestable (delta +2,63 ms, deriva de A −2,13 ms), así que no se convierte en una cifra contractual de coste. Tampoco se interpretan diferencias negativas como aceleración. Una ronda adicional no eliminó esa incertidumbre y no se continuó repitiendo hasta obtener un resultado favorable. [Resumen de repetición](drift-repeat-summary.json), [orilla](benchmarks-baja-drift-repeat-shore.json), [cubierta](benchmarks-baja-drift-repeat-vegetation.json).

## Memoria y liberación

Vista normal de la orilla, C, medida con CDP tras GC explícito:

| Perfil | Heap adicional al activar | Geometrías antes / C / retirada | Texturas | Programas antes / C / retirada |
|---|---:|---|---|---|
| Media | 2.348.008 bytes | 197 / 199 / 197 | 60 constantes | 34 / 35 / 34 |
| Baja | 1.460.968 bytes | 176 / 177 / 176 | 58 constantes | 31 / 32 / 31 |

El heap incluye importación QA, cachés de distribución, índice de agua, buffers CPU y cachés de shaders; no se atribuye íntegramente a geometría. Tras retirar el helper, el heap queda unos 312 KB por encima del inicial en media y 291 KB en baja: no se afirma recuperación exacta de todo el heap ni ausencia de fugas tras ciclos indefinidos. Geometrías, texturas y programas vuelven a sus conteos iniciales. La VRAM del driver no está expuesta por WebGL2 y no se ha medido. [Media](memory-media.json), [baja](memory-baja.json).

## Sobrepintado potencial

Diagnóstico exclusivo de QA: profundidad del mundo seguida de rasterización aditiva de hierba, sin escritura de profundidad entre hojas. No añade una pasada al renderizador experimental. Mide fragmentos potenciales por píxel cubierto de hierba, no el coste exacto con early-Z del pipeline opaco. Snapshot a tiempo de viento cero, no máximo de toda la animación.

| Perfil C | Cercana | Normal | Elevada |
|---|---:|---:|---:|
| Media | 1,642 | 1,249 | 1,211 |
| Baja | 1,314 | 1,091 | 1,065 |

Sin píxeles saturados al límite del contador (≥16). [Histogramas media](overdraw-media.json), [histogramas baja](overdraw-baja.json). No se incorporan texturas nuevas al piloto: el shader reutiliza una lectura lógica de color por vértice y, cuando está habilitada, una consulta lógica de sombra por fragmento; el filtrado de sombra puede implicar varias lecturas físicas. No hay alpha blending ni sombras individuales de hierba en el pipeline normal.

## Qué justifica esta evidencia

La corrección de las orillas mantiene un coste mensurable con el perfil ligero disponible, y las capturas muestran una mejora de volumen. Se conserva como piloto experimental. Los resultados de cámara elevada apuntan a revisar el LOD que actualmente usa distancia horizontal; esto es una hipótesis de optimización, no una mejora implementada en esta entrega. Las pruebas funcionales de orilla y streaming están en el informe anterior; sus tiempos concurrentes no se mezclan con estos benchmarks.

Pendientes antes de activación general: presupuesto con simulación activa, estabilidad temporal del perfil bajo, más semillas y casos de orilla/ocupación, y decisión artística sobre el resto de biomas. Sin cambios en main, reglas, navegación, balance o modelos originales.

## Reproducir

Con servidor del worktree en 5190 y sin otra sesión de revisión/render QA abierta:

```powershell
node tools/experiments/measure-continuous-grass-river.mjs
python tools/experiments/summarize-continuous-grass-river.py
node tools/experiments/memory-continuous-grass-river.mjs
node tools/experiments/overdraw-continuous-grass-river.mjs
```

Para la repetición se usaron `WG_COVER_QUALITY=baja`, `WG_RIVER_REGIONS=shore`, `WG_COVER_VIEWS=close,game`, `WG_COVER_SUFFIX=-drift-repeat-shore`; después región `vegetation`, vista `close`, fase `night` y sufijo `-drift-repeat-vegetation`. Los archivos originales se preservan. Los scripts de memoria/sobrepintado apuntan a la orilla y ambas calidades por defecto. La salida Unicode del resumen fue corregida para la consola de Windows; los datos no se modificaron por ese error de impresión.
