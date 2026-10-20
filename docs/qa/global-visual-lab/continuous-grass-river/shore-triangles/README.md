# Orillas y streaming: corrección conservada en el piloto

La exclusión anterior usaba la caja rectangular completa de la malla de agua de cada chunk. En las curvas del río esa caja abarca suelo seco: **4.941 candidatos** pasaban cobertura, humedad, desgaste, pendiente y ocupación, pero se descartaban pese a estar a más de dos metros de la orilla lógica. La [auditoría reproducible](../shore/water-box-audit.json) reconstruye esa exclusión anterior sobre los datos residentes; no se limita a contar diferencias de píxeles.

Se conserva una corrección QA en `qa-continuous-grass-river.js`: indexar los triángulos de agua nativa ya residentes en celdas de 8 m y comprobar inclusión o distancia menor a 0,6 m. Las cajas se mantienen para pequeños elementos de agua instanciados. Se consultan también chunks vecinos a menos de 0,6 m de su límite y se invalidan los tiles afectados al instalar o retirar chunks. No se añade geometría de agua, textura, pasada ni consulta de navegación al renderizador. El índice se construye al recibir el chunk; la selección reutiliza la caché.

## Antes y después reales

| Vista diurna media | C con caja de agua anterior | C con triángulos de agua |
|---|---|---|
| Cercana | [Antes](../shore/media-close-day-C.webp) | [Después](media-close-day-C.webp) |
| Normal | [Antes](../shore/media-game-day-C.webp) | [Después](media-game-day-C.webp) |
| Elevada | [Antes](../shore/media-elevated-day-C.webp) | [Después](media-elevated-day-C.webp) |

El terreno seco de ambas orillas recupera cubierta continua. La corrección no cambia altura, color o fuerza del viento. No se ha retocado la imagen ni los modelos originales. Semilla 712; objetivo a +10 m del centro del río, z=15,8272549; coordenadas exactas en manifiestos. La selección de cámara utiliza una consulta QA al campo del mundo, fuera del algoritmo de distribución.

24 capturas anteriores y 48 corregidas (media/baja, tres cámaras, día/noche, A/B/C/A2). Los 18 controles A/A2 son idénticos byte a byte; los seis controles A de media también coinciden entre las sesiones anterior y corregida. WebP lossless verificados contra PNG. Sin errores de página o WebGL. [Media corregida](captures-media.json), [baja corregida](captures-baja.json), [comparación anterior](../shore/captures-media.json).

## Agua y streaming

Se contrastan las raíces visibles con `waterInfo` **solo en la herramienta de validación**, fuera de los tiempos de captura. El renderizador no incorpora esas consultas.

| Perfil | Raíces comprobadas en orilla | Dentro del agua | Recorrido alejado | Regreso |
|---|---:|---:|---|---|
| Media | 8.528 | 0 | 288 m; 12.698 raíces, 0 dentro | Distribución exacta |
| Baja | 4.321 | 0 | 288 m; 5.963 raíces, 0 dentro | Distribución exacta |

También se realizan 120 cambios de cámara, sin overflow de instancias, y una invalidación sin cambio de estado. Datos: [media](streaming-media.json), [baja](streaming-baja.json). La vuelta se compara mediante digest de posiciones/orden; el campo de agua verifica puntos de raíz, no todo el volumen de cada hoja animada. El mínimo de distancia a la orilla lógica en esta muestra es aproximadamente 0,003 m en media y 0,001 m en baja. **El margen de 0,6 m se aplica a la malla visible, no al límite lógico**, que no coincide exactamente con ella. No se presenta como una garantía universal de separación lógica de 0,6 m ni de ausencia de voladizos de puntas.

## Coste y límites

La vista normal de la orilla pasa de 199.472 a 258.388 triángulos de cobertura en media, manteniendo 2 draw calls. La corregida baja utiliza 34.568 triángulos y 1 draw call. Este aumento es la cobertura recuperada, no geometría nueva de cada módulo.

En la vista de orilla media, los chunks residentes indexan 1.706 triángulos de agua y 5.195 referencias de buckets. Son estructuras CPU adicionales, no nuevas mallas GPU. Los arrays y referencias de JS tienen sobrecoste de implementación: no se equiparan estos conteos a VRAM o heap medidos. La liberación por chunk elimina sus índices y tiles afectados.

Los tiempos de los JSON de streaming son diagnósticos de una sesión concurrente con la revisión de Sabana, **no benchmarks aislados de rendimiento**. Sigue pendiente medir GPU/CPU, overdraw y memoria real antes de promover el piloto fuera de QA. No se ha probado todo el mundo, rebasing lejano, todas las semillas ni agua instanciada con exclusión exacta; esta conserva cajas conservadoras.

## Reproducir

Servidor del worktree en 5190:

- `node tools/experiments/audit-continuous-grass-river-water.mjs`: reconstruye y cuantifica la caja anterior.
- `node tools/experiments/capture-continuous-grass-river-water.mjs`: captura la corrección; repetir con `WG_COVER_QUALITY=baja`.
- `node tools/experiments/streaming-continuous-grass-river-water.mjs`: prueba actual; repetir con calidad baja.

Las capturas anteriores corresponden al helper previo a esta corrección (commit 9f739a454). El capturador `capture-continuous-grass-river-shore.mjs` usa la versión vigente del helper; no reproduce automáticamente el código histórico. Los datos iniciales de streaming anteriores se conservan en la carpeta padre y no se mezclan con los nuevos.

Se recomienda conservar la corrección dentro del piloto: elimina una exclusión visual incorrecta y supera las pruebas funcionales de estas escenas. Gran Río sigue pendiente del benchmark aislado; no se activa en el juego normal ni se integra en main.

## Medición posterior aislada

Ya se ha completado la [evaluación de rendimiento, memoria y sobrepintado](../performance/README.md): 20.880 muestras GPU incluyendo repetición por deriva. La cámara elevada media añade alrededor de 2 ms y baja conserva incertidumbre temporal; el piloto no se activa por defecto. Las notas de benchmark pendiente anteriores describen el estado de aquel pase.
