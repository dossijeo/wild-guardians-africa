# Orillas naturales: prototipo en seis biomas, 22 octubre 2026

Estado: investigación activa, **no terminado ni integrado**. Rama codex/global-visual-lab. Prioridad solicitada: completar la unión entre agua y suelo en todos los biomas, por delante de más vegetación decorativa.

## Qué se ha corregido

El agua opaca escondía el fondo y dejaba cortes duros. La variante QA worldbank usa un mapa de altura del terreno calculado al cargar cada malla, transparencia de una sola pasada y una transición irregular de dos escalas. Conserva geometrías, modelos, simulación y navegación. La consulta del mapa incorpora el origen flotante del renderizador; usar coordenadas locales contra un mapa global era un defecto de las primeras pruebas.

Las charcas tienen dos superficies: las generadas por Wild Engine (círculos recortados por chunk) y las del asset. Se procesan ambas. El mapa incorpora la distancia a los bordes externos; los recortes de chunk no representan una costa. El horizonte del Cañón utiliza únicamente profundidad, porque interpretar su perímetro como costa producía una costura transversal visible.

Manglares tiene terreno plano y agua apenas elevada: la profundidad real no describe su orilla. Aquí se reutiliza la máscara del humedal expuesta por waterInfo, como distancia óptica aproximada; **no se presenta como batimetría real**. Desierto no genera agua natural: se comprueba que permanece intacto. Volcanes conserva su shader de lava, aunque la transición de su margen todavía requiere dirección artística específica.

## Capturas y reproducción

- `node tools/experiments/capture-biome-world-bank-20261022.mjs`
- Servidor Vite 127.0.0.1:5190, Chrome, 1280x720, media, semilla 712, horas 150/350.
- Baseline/worldbank, tres cámaras por bioma y hora: 72 PNG, 36 parejas.
- `captures.json` registra cámara, origen gráfico, hora, geometrías, texturas, draw calls, triángulos y errores.
- `pair-audit.json` valida cámaras/horas y detecta diferencias de contadores. Ninguna captura vacía; sin errores de consola/WebGL registrados.
- 35 parejas coinciden en calls/triángulos. **Volcanes noche vista 2 no es una comparación equivalente:** 72/71 calls y 508943/504590 triángulos. No utilizarla para atribuir rendimiento o diferencias exclusivamente al shader.
- Desierto conserva sus seis imágenes RGB exactas.
- Láminas `*-day-paired.webp`, `*-night-paired.webp`, `overview-day.jpg` y `overview-night.jpg`.

## Resultado artístico

Cañón gana entradas y salientes visibles, sin la costura transversal de la variante anterior. Sabana pierde el recorte circular abrupto, pero el conjunto sigue siendo demasiado redondo y la franja todavía parece desenfocada. Gran Río muestra una mejora discreta en charcas; falta una escena representativa del cauce principal. Manglares conserva la superficie y suaviza la unión, pero sigue necesitando sedimento y una relación más convincente con las plantas de ribera. Volcanes requiere corteza enfriada y diferencias propias de lava, no solamente un fundido. No confundir suavidad con haber alcanzado el aspecto natural buscado.

## Costes y límites

Un mapa RGBA8 por malla: altura de 16 bits en RG, distancia al borde en B. Resolución aproximada de 0,5 unidades, limitada a 513 por eje. Sin mipmaps; una consulta nueva por fragmento, más dos ruidos procedurales y blending. El máximo teórico por mapa es 1.052.676 bytes, no una medición de VRAM total. No hay nueva geometría, draw adicional ni render target; el blending puede aumentar el coste aun con iguales contadores.

El prototipo aún duplica mapas entre assets y chunks y clona materiales. Debe consolidar propiedad/caché antes de su integración. No se ha validado todavía el streaming largo, cambio de origen durante movimiento, sorting con otros transparentes, degradación por calidad ni el coste de generación de mapas. Los benchmarks residentes se guardan aparte; no cubren estos costes.

## Ensayos descartados o insuficientes

- Profundidad interpolada por vértices: descartada antes de implementar, porque los ríos tienen triángulos que cruzan de orilla a orilla.
- Profundidad idéntica en todos los biomas: borraba el agua de Manglares.
- Suavizar solo el agua del asset: dejaba el círculo de agua generado por el motor.
- Distancia a todos los bordes de malla: producía una costura del horizonte del Cañón.
- Mapa global consultado con posición relativa: invalidaba el efecto tras el recentrado. Corregido en worldbank.

Recomendación: continuar con esta base y perfiles específicos por bioma; no activar globalmente todavía. Quedan dirección artística del sedimento/corteza, escena de cauce de Gran Río, métricas y streaming, e integración opt-in en el renderizador. No se ha modificado main.

Benchmarks residentes de Sabana/Cañón completados: [coste y límites](../biome-world-bank-cost-20261022/README.md). El Cañón añade 2,81–4,56 ms GPU; la variante se conserva para optimizar, no se descarta por coste.
