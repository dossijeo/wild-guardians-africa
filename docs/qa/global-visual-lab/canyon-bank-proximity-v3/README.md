# Gran Cañón: banda de sedimento por proximidad a la orilla

Candidata QA; no integrada. Máscara de 35×35 por chunk, calculada desde `field.waterInfo(...).shore` de la vista espacial de Wild Engine. Se clona el RGBA existente y se utiliza B, sin modificar ocupación, navegación ni los otros canales. Transición .25–3 unidades de mundo; conserva arena seca fuera de la banda. Sin consultas por fotograma ni texturas/draws/geometría adicionales. Hay 1225 consultas de preparación por chunk: coste de streaming todavía sin medir, no asumir que es gratuito ni que sea la implementación final.

El shader original sobrescribe el contexto de Cañón con constantes. La ruta QA conserva B en terreno mapeado y usa cero en horizonte sin máscara. Por tanto falta validar la transición residente/horizonte y streaming. La distancia lógica puede diferir del contorno de los triángulos de agua; no se cambia esa silueta.

La ejecución completa v3 genera doce capturas: tres cámaras, día/noche, semilla 712, media 1280×720. Auditoría: cámaras, hora, draws y triángulos coinciden en seis parejas; sin errores registrados. Las láminas muestran control izquierda, candidata derecha. Conserva las ondulaciones de arena seca y concentra el oscurecimiento junto al río; mejora la separación húmedo/seco respecto al ensayo por altura, pero el límite rectilíneo del agua permanece. Conservar candidata para coste/movimiento, no declarar objetivo artístico logrado.

Dos pruebas pasan: preservación de canales y bordes compartidos, y río inactivo sin consultas ni humedad. Reproducción: Vite en 5190; `node tools/experiments/capture-canyon-bank-proximity.mjs`; `python tools/experiments/audit-canyon-bank-captures.py docs/qa/global-visual-lab/canyon-bank-proximity-v3`.

Ejecuciones excluidas: `canyon-bank-proximity` usaba el B constante del shader y no demuestra proximidad; `canyon-bank-proximity-v2` terminó por timeout de arranque de la candidata (180s), sin causa confirmada. `canyon-bank-proximity-diagnostic` completó solo candidata. Ninguna se usa como benchmark ni comparación válida. V3 es la pareja completa repetida. No hay medición temporal nueva en este informe.
