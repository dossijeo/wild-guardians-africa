# Textura de ruido fino en finca avanzada real

Experimento QA sobre main `758638c`, sin cambiar el producto. Cuatro lotes A/B/B/A en Manglares/Saheliana, continuación normal del guardado histórico y contratación pagada de 18 trabajadoras. Ambos caminos usan el mismo shader y la misma textura residente; solo cambia `uFineNoiseVolumeEnabled=0/1/1/0`. El adaptador sustituye las dos evaluaciones finas del pigmento y la evaluación fina del suelo por interpolación trilineal R8 de 64³ valores (262144 bytes de datos fuente). El ruido grueso, bandas, paletas, contornos, luz, geometría y sombras conservan su receta. La textura es cuantizada y periódica: no equivale exactamente al campo analítico.

Se corrige una interferencia del adaptador QA: envolver `onBeforeCompile` invalidaba la identidad de los hooks de profundidad. La envoltura, que modifica únicamente RGB y no vértices/discards, conserva ahora la receta previamente auditada mediante `recordNativeDepthHook`; hooks desconocidos siguen siendo desconocidos. Las nueve pruebas dirigidas de `node --test tests/noise-volume-experiment.test.js tests/standard-depth.test.js` pasan. Incluyen clips de chunk, obstrucción, reutilización de profundidad e invalidación de hooks desconocidos. Esta corrida no incluye lectura pareada de profundidad ni destrucción controlada; no extender la conclusión a esas escenas.

## Medición nativa

15 segundos simulados de calentamiento y 20 medidos por lote; 800 muestras CPU y 800 GPU, sin consultas pendientes/disjoint, errores de escena, consola o WebGL. Calidad media, sombras, viewport 1280×720, buffer 1600×900, Intel UHD/ANGLE D3D11. Los procesos de campañas congeladas 20608/36076 seguían activos; sin otros tests/builds propios concurrentes con los tiempos.

| Lote | Receta | GPU mediana ms | GPU media ms | CPU render mediana ms | Intervalo RAF mediana ms |
| --- | --- | --- | --- | --- | --- |
| A1 | analítica | 61,63 | 61,91 | 43,05 | 67,05 |
| B1 | textura | 60,23 | 60,37 | 44,00 | 66,55 |
| B2 | textura | 59,15 | 59,33 | 50,10 | 72,20 |
| A2 | analítica | 61,51 | 61,65 | 52,70 | 77,00 |

Ahorro de medianas GPU en pares: ~1,40 y ~2,36 ms (2,3 % y 3,8 %). Es mayor que en las [escenas previas](../noise-volume/README.md), pero pequeño frente al coste GPU total. No demuestra FPS estables ni una mejora general: CPU/RAF varían. No sumar CPU y GPU.

Cuatro estados finales completos iguales, 89 búsquedas de ruta y mismos eventos físicos: 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha en la ventana medida. Final: 35 s, 841 monedas, 18 trabajadores, 186 cultivos vivos. Medianas de 637 llamadas y 5135701 triángulos en cada lote, pases sumados. Se adaptan 80 programas por lote; contadores residentes 319 geometrías/79 texturas en ambos caminos, sin medición de RAM en bytes ni comparación contra producción sin adaptador. La textura adicional está residente incluso en A para aislar su evaluación.

## Imagen y decisión

[Analítico](analytic.png) y [textura](volume.png) tienen la misma cámara/estado final: el checkbox estático verifica que `serialize(state)` no cambia. Inspección visual: silueta, poses y colores generales coherentes, diferencias pequeñas de pigmento; no son imágenes idénticas ni aceptación visual de todos los materiales. Región de screenshots `x>=520 OR y>=570`, excluyendo panel QA: 625200 píxeles, 138463 diferentes, 1876 con máximo de canal >8/255, media 0,527/255 y máximo 58/255. [Métricas](image-difference.json). No es una comparación directa de framebuffer.

**No se activa en gameplay todavía.** El resultado permite ampliar la evaluación a biomas, culturas, distancias/periodicidad, luz y destrucción, además de móvil físico. La receta de producción se conserva. El ahorro de este experimento no resuelve el coste GPU restante y no acredita completar las optimizaciones ni la release.

Paso controlado `advanceReal(0.1)` por RAF, no ritmo variable de producción. Sin audio/HUD/autosave, incursiones, móvil, RAM en bytes o aceptación actual de cien noches. La campaña de margen seguía viva al día 60, sin resultado terminal.

Reproducción: preparar el guardado con `node tools/prepare_late_farm_render.mjs`, disponer de la referencia congelada Game/Navigation 1bfd85a para los imports existentes, servir con Vite y pulsar «Comparar textura de ruido A/B/B/A» en `/tests/browser/late-farm-render.html`. No se modifica el grafo de imports de producción; no requiere build nuevo del producto. [Informe completo](native.json), [fuentes y hashes](proof.json).
