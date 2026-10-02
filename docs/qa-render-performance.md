# Medición de presentación en escritorio

El visor `tests/browser/african-toon.html` incluye «Medir 180 fotogramas». Calienta 30 frames y recoge 180 muestras con la simulación detenida. Usa WorldScene y todos sus pases reales: sincronización, LOD, efectos, sombras, profundidad, cielo y color. `renderer.info.autoReset` se desactiva únicamente dentro de cada render observado y se restaura incluso si falla; los controles y el método original también se restauran al finalizar.

Se registran percentiles 50/95, media y máximo del tiempo CPU de envío y de los intervalos requestAnimationFrame, draw calls y triángulos, identificación del renderer GL, dimensiones reales, escenario, recursos registrados por Three.js y comparación del estado antes/después. Los intervalos incluyen planificación del navegador; el tiempo CPU no incluye esperar a que la GPU termine. Los conteos de geometrías/texturas/programas no son bytes residentes de GPU. No se presenta esta fixture estática como una campaña, una medición de navegación/audio o una prueba de hardware móvil.

Repetir con la misma revisión, caso, cámara, viewport y calidad, sin cambiar el código durante la medición. Una pestaña oculta se identifica en el informe para no confundir throttling con rendimiento del juego. Los informes JSON conservan sus metadatos y límites junto a los resultados.

## Primera referencia: Sabana / Mapungubwe

Windows, i7-11800H, Intel UHD Graphics (ANGLE/D3D11), driver 32.0.101.6881, navegador Chrome 154 integrado. Viewport CSS 1280×720 y DPR 1,25. Semilla 712; cámara, target y dimensiones de canvas documentados en cada JSON. La primera media y baja preceden únicamente la ampliación de metadatos del visor; se observó sombras activas/inactivas respectivamente en su diagnóstico. El render de producción es el mismo en todas estas mediciones.

| Perfil / ensayo | CPU media / p95 (ms) | Cadencia observada (FPS) | Calls / triángulos por frame |
| --- | --- | --- | --- |
| Media | 10,55 / 13,70 | 16,70 | 275 / 2.837.376 |
| Baja | 8,99 / 11,40 | 33,00 | 106 / 1.171.005 |
| Muy baja | 8,92 / 11,30 | 24,77 | 106 / 1.171.005 |
| Alta | 14,54 / 18,90 | 11,18 | 291 / 3.958.633 |
| Media, sombras desactivadas solo en diagnóstico | 10,25 / 12,60 | 22,50 | 111 / 1.560.185 |

Son ensayos individuales secuenciales, no promedios de múltiples ejecuciones ni FPS garantizados. La vista incluye diagnóstico DOM actualizado por frame; su coste está en la cadencia, fuera del cronómetro WorldScene. No se aisló la carga del resto del equipo ni se controlaron temperatura, frecuencia o potencia. La aparente inversión entre baja y muy baja obliga a repetir y perfilar, no permite concluir que Basic sea más lento. Apagar sombras elimina tanto su pase como su muestreo en color; esta comparación no demuestra el ahorro de una caché que conserva el muestreo.

Los cinco informes completan 180 muestras cada uno, con estado lógico idéntico y sin errores. La calidad alta reside en 49 chunks; al volver a baja se retienen 25 y se observa la liberación de 24 geometrías de terreno. Esa observación no demuestra ausencia general de fugas ni bytes de GPU. Estas cifras muestran trabajo de rendimiento pendiente en este dispositivo; no se ha modificado la calidad por defecto ni se han reducido escalas, modelos o reglas para favorecer la prueba.

Evidencia: `docs/qa/render-performance/`. Build aprobado; esta modificación añade instrumentación de QA y no modifica WorldScene ni la simulación. Siguen pendientes mediciones de campaña con carga activa, navegación/audio, GPU con temporizador y memoria residente, más hardware y toda la matriz móvil del Plan Maestro.

Una repetición de baja después de alta devuelve 30,66 FPS (CPU 9,66 ms / p95 11,80), mismas 106 calls y 1.171.005 triángulos. Recupera los conteos iniciales de 211 geometrías y 40 texturas; los programas compilados reutilizables permanecen en 22. No se infiere una distribución estadística de dos ejecuciones.

Una vista aislada de los cuatro trabajadores y las cinco bestias, media/noche, añade 180 muestras: CPU media 13,09 ms / p95 19,20, cadencia 39,22 FPS, 267 calls y 821.935 triángulos. Oculta props/poblado para inspeccionar personajes, por lo que no representa su coste sumado a una incursión en una finca completa. Su campo `view: true` identifica el modo actores de la primera versión del visor; la versión final imprime `actors`. Los personajes permanecen quietos y no se acredita aquí locomoción ni ataque. Consola sin errores ni avisos en los ensayos.

El informe completo se despliega desde una línea compacta de resultados, para poder revisar la escena sin que el JSON la tape. La versión de producción medida conserva el código de renderizado de 789b1a6; las revisiones posteriores de este documento/visor no cambian la simulación o WorldScene.

La versión final del visor completa otra media: 17,40 FPS, CPU 11,87 / p95 14,90 ms, las mismas 275 calls y 2.837.376 triángulos. El resumen compacto y el desplegado completo se verifican en navegador. En total se conservan ocho ensayos y 1.440 muestras medidas, todos con estado lógico idéntico, pestaña visible según document.visibilityState y sin errores. Consola final sin avisos/errores; paquete web aprobado (554 archivos, 794 enlaces relativos, 20 GLB). CI 37065369958 de 262d7cf aprobado: 595/595 pruebas, cero fallos/omisiones, build y paquete. La mejora final del informe compacto se prueba en navegador después de esa revisión; su CI se iniciará al publicar.

## Instrumentación GPU posterior

Los ocho ensayos anteriores usan el esquema 1 sin timer GPU. La fixture actual añade temporizador GPU opcional, con muestras válidas, descarte disjoint y limpieza acotada. Sus ensayos instrumentados, variabilidad y límites se documentan en [QA del timer GPU](qa-gpu-timing.md). La reutilización de visibilidad PCF en objetos se describe en [QA del resultado compartido](qa-pcf-reuse.md); no acredita una mejora de FPS.

La caché posterior conserva el muestreo PCF y evita recalcular mapas con inputs de profundidad idénticos. Conteos, coste CPU, temporizador GPU, diferencias de imagen y límites están en [QA de caché de sombras](qa-shadow-cache.md).
