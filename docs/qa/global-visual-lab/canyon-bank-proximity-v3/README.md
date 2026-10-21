# Gran Cañón: banda de sedimento por proximidad a la orilla

Candidata QA; no integrada. Máscara de 35×35 por chunk, calculada desde `field.waterInfo(...).shore` de la vista espacial de Wild Engine. Se clona el RGBA existente y se utiliza B, sin modificar ocupación, navegación ni los otros canales. Transición .25–3 unidades de mundo; conserva arena seca fuera de la banda. Sin consultas por fotograma ni texturas/draws/geometría adicionales. Hay 1225 consultas de preparación por chunk: coste de streaming todavía sin medir, no asumir que es gratuito ni que sea la implementación final.

El shader original sobrescribe el contexto de Cañón con constantes. La ruta QA conserva B en terreno mapeado y usa cero en horizonte sin máscara. Por tanto falta validar la transición residente/horizonte y streaming. La distancia lógica puede diferir del contorno de los triángulos de agua; no se cambia esa silueta.

La ejecución completa v3 genera doce capturas: tres cámaras, día/noche, semilla 712, media 1280×720. Auditoría: cámaras, hora, draws y triángulos coinciden en seis parejas; sin errores registrados. Las láminas muestran control izquierda, candidata derecha. Conserva las ondulaciones de arena seca y concentra el oscurecimiento junto al río; mejora la separación húmedo/seco respecto al ensayo por altura, pero el límite rectilíneo del agua permanece. Conservar candidata para coste/movimiento, no declarar objetivo artístico logrado.

Dos pruebas pasan: preservación de canales y bordes compartidos, y río inactivo sin consultas ni humedad. Reproducción: Vite en 5190; `node tools/experiments/capture-canyon-bank-proximity.mjs`; `python tools/experiments/audit-canyon-bank-captures.py docs/qa/global-visual-lab/canyon-bank-proximity-v3`.

Ejecuciones excluidas: `canyon-bank-proximity` usaba el B constante del shader y no demuestra proximidad; `canyon-bank-proximity-v2` terminó por timeout de arranque de la candidata (180s), sin causa confirmada. `canyon-bank-proximity-diagnostic` completó solo candidata. Ninguna se usa como benchmark ni comparación válida. V3 es la pareja completa repetida. No hay medición temporal nueva en este informe.

## Coste estacionario A/B/B/A, Intel UHD

Ocho bloques: 960 consultas GPU válidas y 1440 frames de cadencia; 180 frames de calentamiento por ventana, GPU y cadencia separadas. Día/noche, media 1280×720. Cámaras, 40 draw calls y 399676 triángulos coinciden por frame. Sin errores GL ni cambios del estado observado. Sin indicadores de disjoint, pérdida de contexto o consultas pendientes.

| Media de bloque | Control (dos bloques) | Candidata (dos bloques) |
|---|---|---|
| GPU día ms | 11.433 / 10.033 | 11.672 / 11.640 |
| GPU noche ms | 11.769 / 12.286 | 13.484 / 14.127 |
| CPU render día ms | 3.282 / 3.435 | 4.128 / 4.034 |
| CPU render noche ms | 3.358 / 3.439 | 4.639 / 3.921 |
| Intervalo día ms | 17.552 / 16.629 | 16.624 / 16.627 |
| Intervalo noche ms | 20.123 / 16.624 | 16.630 / 21.530 |
| p95 intervalo noche ms | 32.8 / 17.3 | 17.2 / 36.7 |

No son intervalos de confianza. La candidata cuesta más CPU en las cuatro parejas y más GPU, especialmente de noche; la cadencia es mixta. No afirmar optimización ni atribuir toda la variación al shader. La candidata artística se conserva para investigar, sin promoción por defecto.

Limitación adicional: 158 geometrías en todos los bloques, pero renderer.info.memory registra 68 texturas en controles y 59 en candidatas, estable dentro de cada bloque. No se ha explicado la diferencia; estos contadores no son bytes VRAM ni certifican igual residencia. La auditoría valida geometría/cámara/timers, pero registra esa discrepancia expresamente. No se presenta como ahorro de memoria.

Esta prueba no incluye crear máscaras ni streaming. Hay 1225 llamadas waterInfo por chunk; en la vista espacial cada una consulta nivel y distancia a la orilla. Sigue pendiente medir ese coste y estudiar datos compactos o cálculo por filas sin modificar Engine. También pendientes cámara móvil y transición al horizonte.

Reproducir: `node tools/experiments/measure-canyon-bank-proximity.mjs` (usar WG_BANK_OUT para una salida nueva), luego `python tools/experiments/audit-canyon-bank-performance.py` sobre la ruta predeterminada. Datos completos en performance/benchmarks.json y resumen en performance/summary.json. Las capturas visuales anteriores siguen siendo la evidencia artística; no se capturan imágenes dentro de ventanas de medición.

### Diagnóstico posterior de recursos

[Inventario instrumentado](../canyon-bank-resources/README.md): la diferencia diurna de nueve texturas se corresponde con máscaras 35×35 asignadas a WebGL (25 frente a 16, ambas variantes poseen 25). No es prueba de ahorro VRAM; queda explicar/controlar el historial de subida. Preparación inicial de 25 máscaras: 9,5 ms acumulados, .38 ms media, 1.6 ms máximo. No equivale a coste por frame ni a streaming completo.

