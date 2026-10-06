# Prototipo QA de límites para cultivos

Solo experimental, no importado por el producto. `tests/browser/crop-frustum.js` instala una envoltura sobre un batch ya creado. Calcula envolventes radiales/verticales para crecimiento y viento y una envolvente conservadora del morph (pivot + rotación de v-root). Los límites se unen por lote; Three realiza el descarte con la cámara del pase, incluyendo luz y profundidad. Cambios de matrices/atributos/cantidad invalidan la esfera; frames pausados reutilizan límites. El wind máximo incluido es el uniforme nativo 1. Escala de instancia unitaria y rotación Y, como en el batch actual. No usar con otra receta o transformaciones sin revalidar.

19 pruebas correctas: `node --test tests/crop-native-reload.test.js tests/crop-upload.test.js` (exit 0). Incluyen todos los vértices originales para ocho especies y catorce razones de crecimiento, rotación y extremos de viento; reutilización en pausa, cambio de origen, desaparición y descarte fuera de un frustum. Las ocho pruebas existentes de recarga reconstruyen los 32 morphs y conservan buffers/estado. **No prueban que todos los vértices deformados de los bridges estén dentro de su nueva esfera**; sigue pendiente verificar su shader real, así como cámaras/luces adicionales y lotes recreados por crecimiento de capacidad. La envoltura QA se instala después de la carga y no sigue automáticamente una sustitución del batch.

## Cuatro lotes nativos

Sobre main `834298d`, Manglares/Saheliana, guardado histórico intacto y contratación pagada de 18 trabajadoras. Mismo mundo/render/simulación y shader analítico. 15 s simulados de calentamiento, 20 medidos, paso fijo advanceReal(.1) por RAF. Calidad media, sombras, viewport1280×720, buffer1600×900, Intel UHD/ANGLE D3D11. Campañas congeladas PID20608/36076 siguen activas; ningún test/build propio concurrente con los tiempos.

| Lote | Descarte QA | GPU mediana ms | CPU render mediana ms | RAF mediana ms | Límites recalculados |
| --- | --- | --- | --- | --- | --- |
| A1 | no | 62,43 | 41,10 | 67,65 | 0 |
| B1 | sí | 63,19 | 45,00 | 69,40 | 2203 |
| B2 | sí | 62,04 | 46,00 | 74,70 | 2203 |
| A2 | no | 60,51 | 41,60 | 66,50 | 0 |

800 muestras GPU/CPU, sin disjoint/pendientes, errores de escena/WebGL o consola. Estados completos finales iguales, 89 búsquedas, 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha. Final 35 s, 841 monedas, 18 trabajadores, 186 cultivos vivos. No compara todos los estados intermedios ni acredita cien noches actuales.

**No se adopta:** medianas de 637 llamadas y 5135701 triángulos iguales en todos los lotes. En esta vista general las envolventes no descartan ningún lote adicional; se añade trabajo CPU y GPU no mejora en los pares. Las muestras no prueban el coste universal, pero contradicen un beneficio para esta cámara. El siguiente ensayo necesita una vista cercana/lateral y, si los lotes abarcan demasiado espacio, evaluar agrupación espacial con su coste de llamadas y memoria incluido. No endurecer límites a costa de geometría visible.

[Captura sin descarte](disabled.png) y [con descarte](enabled.png): mismo estado lógico al accionar el checkbox, aspecto general coherente, pero no imagen idéntica. Región de screenshots x>=520 OR y>=650: 583600 píxeles, 4382 diferentes, máximo58/255, media del máximo RGB0,0281/255. No aislar por conjetura la causa de esas diferencias; comparar framebuffer, repetición estática, profundidad y sombras antes de cualquier promoción. [Métricas](image-difference.json).

[Datos completos](native.json), [fuentes y hashes](proof.json). No hay cambios de runtime ni build nuevo del producto; el HTML QA se ejecutó nativamente. Sin audio/HUD/autosave, incursión, RAM en bytes, móvil o aceptación amplia. Reproducir con el guardado preparado y referencia congelada de Game/Navigation 1bfd85a, Vite y botón «Comparar descarte de cultivos A/B/B/A» en `late-farm-render.html`.
