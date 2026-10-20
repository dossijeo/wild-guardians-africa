# Decisión: CONSERVAR WEBGL2

Fecha: 2026-10-20. Rama independiente: `codex/webgpu-renderer-evaluation`. Base: `719510cec`; prototipos y protocolo final V3: `b0b4b406c`. No se modifica el renderer de producción, main, el laboratorio gráfico ni la PR #159.

**No se ha demostrado una ventaja integral suficiente para migrar Wild Guardians.** WebGPU ejecuta correctamente los prototipos y ofrece señales positivas en algunos pases GPU, pero la escena compleja empeora el envío CPU y la cadencia total. La cobertura equivalente no obtiene una mejora estable en todos los bloques. El compute probado tampoco reduce la CPU con la población residente real. Por tanto, no se activa la migración condicional de las fases 4–5.

Esta conclusión significa «conservar el renderer actual con la evidencia disponible», no que WebGPU sea incapaz de superarlo. No se ha portado el juego completo ni validado sus seis campañas bajo WebGPU. Las limitaciones impiden convertir los resultados favorables de una escena de diagnóstico en una promesa de mejora de campaña.

## Prueba ejecutada

Intel UHD 0x9A60 / Gen12LP, i7-11800H, driver 32.0.101.6881, Windows, Chrome 155, Three 0.180.0. Adaptador WebGPU Intel real, sin fallback software, timestamps disponibles. Resolución 1280×720, DPR 1, sin MSAA, plan Equilibrado. El escritorio y sus cargas externas no están controlados; no se simula otro hardware. [Hardware](hardware.json).

Escenarios: cobertura aprobada de Sabana y Gran Río exportada del juego, terreno procedural con Grass Medium 01/normal/POM8/sombras/viento, y escena compleja con assets reales: 36 edificios, 432 componentes de cultivo, 135 plantas, 90 murallas, 24 trabajadores y 8 búfalos. Animación, cámara y cambios de posición son deterministas. La escena compleja es una disposición de estrés, no una partida avanzada guardada; su iluminación estándar no sustituye a AfricanToon.

Se comparan WebGLRenderer (legacy), WebGPURenderer con backend WebGPU, y su backend WebGL2 con materiales TSL comunes. A y C: legacy/GPU/legacy/GPU, seguido de TSL-GL/GPU/TSL-GL/GPU. B: TSL-GL/GPU/TSL-GL/GPU; no existe aquí un port legacy equivalente del terreno completo. Cada bloque incluye día y noche, 45 frames de calentamiento, 120 muestras GPU y una secuencia RAF independiente de 30 frames de calentamiento más 180 registrados.

**56 bloques; 6.720 muestras GPU válidas y 10.080 frames RAF; cero errores.** El análisis verifica por índice de frame que ambas rutas envían los mismos draws y triángulos, descontando únicamente la pasada de salida adicional del renderer común. También coinciden las cámaras de captura. [Datos y análisis](results/summary.json), [protocolo y comandos](REPRODUCE.md).

## Resultados principales

Milisegundos. Cada rango representa las medias de bloques completos, no mínimos y máximos de muestras sueltas. Para legacy frente a WebGPU se usan sus parejas ABAB iniciales (runs 0/2 frente a 1/3); la serie completa queda en JSON. Día y noche se agrupan en esta tabla para hacer visible la variabilidad.

| Escenario / medida | WebGL actual o TSL-GL indicado | WebGPU | Lectura |
| --- | ---: | ---: | --- |
| Sabana, CPU de envío RAF | 0,132–0,186 | 0,572–0,661 | Más CPU con WebGPU; coste absoluto pequeño |
| Sabana, GPU | 1,689–3,050 | 1,588–2,595 | Solapamiento y cambio de signo entre repeticiones |
| Gran Río, CPU de envío RAF | 0,152–0,220 | 0,613–0,743 | No reduce preparación/envío |
| Gran Río, GPU | 2,004–2,609 | 1,652–2,274 | Señal favorable diurna; no mejora universal nocturna |
| Terreno, GPU, día (TSL-GL) | 7,418–7,462 | 6,563–7,975 | Resultado mixto |
| Terreno, GPU, noche (TSL-GL) | 8,473–9,951 | 6,693–7,088 | Señal favorable, solo en este material de diagnóstico |
| Terreno, intervalo RAF medio (TSL-GL) | 30,762–32,980 | 20,324–21,986 | Mejora del fixture común; no comparación con AfricanToon original |
| Compleja, CPU de envío RAF | 2,657–3,592 | 11,062–11,903 | Aumento aproximado de 3–4 veces |
| Compleja, GPU | 45,286–56,130 | 27,280–29,819 | Menor suma de pases; no equivale a menor frame completo |
| Compleja, intervalo RAF medio | 53,951–60,324 | 61,617–69,193 | Peor cadencia con WebGPU |
| Compleja, p95 de intervalo RAF | 99,6–99,9 | 99,9–116,5 | No mejora los picos |

En las cuatro repeticiones GPU de C, incluyendo las parejas con TSL-GL, la CPU oscila entre 11,06 y 16,07 ms y el intervalo RAF medio entre 58,29 y 70,95 ms. No se selecciona únicamente la repetición más favorable. En A, los pilotos previos también presentan variación y cambios de dirección entre APIs; se conservan sus datos como evidencia de esa inestabilidad, no se mezclan con V3 para fabricar una media favorable.

**Alcance de temporización:** GL mide una consulta externa alrededor de todos los comandos del render; GPU suma timestamps de pases, excluyendo huecos y transferencias entre ellos. No son envolventes estrictamente idénticas. Las muestras GPU son serializadas y no miden presentación ni latencia de cola. La CPU y RAF se miden aparte sin readbacks. Los resultados de C no permiten afirmar «el juego es dos veces más rápido» por dividir esas cifras GPU.

## Compute: capacidad demostrada, beneficio no integrado

Tres repeticiones de 30 calentamientos + 120 muestras sobre **13.864 candidatos residentes de Sabana**; cuatro auditorías de igualdad de IDs por repetición. Selección por distancia horizontal, compactación atómica y argumentos indirectos: todas las auditorías pasan y no hay errores.

| Trabajo | CPU selector equivalente | CPU envío compute | GPU compute |
| --- | ---: | ---: | ---: |
| Residentes, tres repeticiones | 0,123–0,129 ms | 0,140–0,158 ms | 0,016–0,023 ms |
| Cuadrícula sintética, 32.768 | 0,292 ms | 0,140 ms | 0,026 ms |

La cuadrícula mayor muestra potencial de amortización, pero es una microprueba. Entre 78 y 93 de las 120 muestras GPU residentes devuelven cero por resolución del temporizador; no significa coste cero. No sumar CPU+GPU como si necesariamente fueran seriales en una integración real.

El probe no dibuja con el buffer indirecto, no porta el selector completo de frustum/LOD y no mide streaming. No se justifica incorporarlo ahora al juego. [Residente 1](compute-resident-1.json), [2](compute-resident-2.json), [3](compute-resident-3.json), [sintético](compute-synthetic.json).

## Paridad visual y capturas

En todas las comparativas, **izquierda: backend de referencia; derecha: WebGPU**. Las imágenes WebP son vistas de revisión; el cálculo de diferencias usa los PNG originales sin pérdida, conservados para la primera ejecución de cada backend/condición.

| Escena | Día | Noche |
| --- | --- | --- |
| Sabana, legacy vs GPU | [comparativa](results/grass-legacy-versus-webgpu-day.webp) | [comparativa](results/grass-legacy-versus-webgpu-night.webp) |
| Gran Río, legacy vs GPU | [comparativa](results/grass-river-legacy-versus-webgpu-day.webp) | [comparativa](results/grass-river-legacy-versus-webgpu-night.webp) |
| Terreno, TSL-GL vs GPU | [comparativa](results/terrain-webgl-tsl-versus-webgpu-day.webp) | [comparativa](results/terrain-webgl-tsl-versus-webgpu-night.webp) |
| Compleja, legacy vs GPU | [comparativa](results/complex-legacy-versus-webgpu-day.webp) | [comparativa](results/complex-legacy-versus-webgpu-night.webp) |
| Compleja, TSL-GL vs GPU | [comparativa](results/complex-webgl-tsl-versus-webgpu-day.webp) | [comparativa](results/complex-webgl-tsl-versus-webgpu-night.webp) |

A conserva 10.741 instancias / 212.704 triángulos en Sabana y 8.821 / 258.808 en Gran Río. MAE RGB global legacy frente a GPU: 0,0114–0,0206 sobre 255, incluyendo el fondo uniforme; esa inclusión reduce la media y no debe confundirse con una métrica exclusiva de las fibras. Diferencias aisladas de bordes, sin discrepancia global visible. El port del material y viento a TSL es viable, pero la selección del fixture está congelada y la hierba está aislada de terreno y sombras.

C entre los dos backends TSL tiene MAE global 0,00635 de día y 0,00125 de noche. Legacy frente a GPU alcanza 0,576 de día y 0,0525 de noche; 2,93% de los píxeles diurnos difieren más de 10 niveles. Hay diferencias visibles en filtrado/sombras y no se declara equivalencia exacta entre material estándar legacy y Node. Esta pareja no acredita una ganancia gráfica a calidad idéntica; la pareja TSL proporciona el control más estrecho de backend y tampoco demuestra una mejora integral de cadencia.

B presenta MAE 0,314 de día y 0,065 de noche. Las diferencias se concentran en microdetalle cercano, sin bloques de discrepancia en cielo o caminos. POM, normales, filtrado y rasterización son hipótesis; no se ha aislado su causa. No se atribuye a WebGPU una mejora por dibujar ese detalle de forma diferente. Además, B no conserva toda la iluminación AfricanToon del juego.

## Memoria, streaming y estabilidad

La hierba aislada usa aproximadamente 436 KB de atributos/índices en Sabana y 359 KB en Gran Río, más una textura 1024² estimada en 5,59 MB RGBA con mips. Son payloads nominales, no memoria residente medida. Los snapshots originales reservan capacidades mayores; no se compara el buffer recortado del fixture con el reservado en producción como ahorro de API.

Se registran heap JS, objetos del renderer y dispose por bloque. Los contadores no tienen necesariamente la misma semántica entre renderers (por ejemplo, texturas de huesos/targets), por lo que no se deriva un ahorro VRAM de ellos. No hay una medición fiable de VRAM ni una prueba prolongada de fugas.

C relocaliza chunks precargados cada 1,5 segundos de recorrido determinista y anima actores. Esto prueba cambios de matrices y frustum, **no latencia de IO, Worker, generación ni subida de chunks de campaña**. No se ha certificado recuperación de device loss. [Límites completos](LIMITATIONS.md).

## Correcciones del banco de pruebas

Se conservan los informes preliminares en [pilot-reports.json.gz](pilot-reports.json.gz), un objeto JSON comprimido que mapea rutas originales a contenido. No se usan como serie definitiva:

1. Primer piloto: legacy conservaba el drawing buffer y el nuevo no. Se igualó a false.
2. Segundo: el temporizador GL interno de Three anidaba consultas durante sombras. Se sustituyó por una envolvente externa común a ambos GL.
3. Tercero: el RAF interno de Three avanzaba NodeFrame independientemente del bucle serial, saltándose algunas actualizaciones de sombras. V3 detiene ese RAF y avanza el frame una vez por draw; verifica todos los contadores por índice.
4. Al desactivar timestamps WebGPU entre fases, r180 conservaba timestampWrites en un descriptor reutilizado. El harness lo elimina explícitamente cuando no se mide.

Las correcciones son locales al diagnóstico, están fijadas por commit y no se aplican al renderer del juego. Los smoke previos no se presentan como benchmarks.

## Coste, compatibilidad y siguiente decisión técnica

La [auditoría](RENDERER-AUDIT.md) encuentra Three 0.180.0, al menos 18 archivos con hooks/shaders y unas 25–40 piezas de integración potencialmente afectadas. AfricanToon, máscaras del terreno, agua, profundidad packed de destrucción, sombras cacheadas, precarga y lifecycle GL requieren trabajo específico. Estimación orientativa: **4–8 semanas-persona**, incertidumbre alta, incluida validación; no es un presupuesto de calendario.

TSL permite compartir fórmulas entre backends y el port de hierba lo demuestra. No elimina por sí solo trabajo de animación, generación de chunks o selección CPU. El juego ya tiene instancing, LOD, actualizaciones parciales y cache: no se atribuyen esas capacidades a una futura migración.

Si se reabre la evaluación, conviene un único conjunto de materiales TSL y selección CPU como fallback; compute opcional solo tras demostrar ahorro integrado. El fallback WebGL2 común no ejecuta los ShaderMaterial/onBeforeCompile actuales y compute atómico no tiene una alternativa idéntica allí. [Compatibilidad comprobada y fuentes](COMPATIBILITY.md), [Three r180](THREE-R180.md).

**Acción adoptada:** conservar WebGL2 y la cobertura visual aprobada. Los prototipos quedan reproducibles en esta rama, sin integración en main. La prioridad técnica razonable es medir e intervenir en invalidación de sombras, costes de selección/LOD y generación de chunks dentro del renderer existente; la auditoría identifica oportunidades, no ganancias ya demostradas. Reabrir una migración solo con una mejora de frame completo, paridad artística y streaming reales que compensen el coste, no por una microprueba o por modernidad de la API.
