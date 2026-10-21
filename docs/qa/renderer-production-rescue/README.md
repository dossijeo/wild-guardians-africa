# Auditoría de recuperación JS

El objetivo y los hitos están en [GOAL.md](GOAL.md). El prototipo modifica solo
NativeAssetGroups. No incorpora archivos, imports o memoria de Wild Renderer WASM.
Las herramientas se ejecutan desde la raíz del checkout con npm ci, Python 3,
Chrome y Playwright disponibles. Si Playwright vive fuera de node_modules,
RENDERER_PLAYWRIGHT acepta la URL file: de su index.mjs.

## Referencia y captura

Iniciar Vite: `npm run dev -- --port 5197 --strictPort`.
`RR_MAIN` es el SHA inmutable de main usado para crear el checkout; no usar una
rama experimental como referencia. El medidor sirve su asset-groups.js completo,
y el del candidato, como módulos separados del mismo servidor. El resto de la
aplicación proviene de ese main. Config guarda SHA de ambos módulos y entorno.
No editar módulos de producción durante una serie.

```powershell
$env:RR_OUT='test-results/renderer-rescue-visual'
$env:RR_BIOMES='sabana,gran-rio,manglares,volcanes,gran-canon,desierto'
$env:RR_QUALITY='muy_baja,baja,media,alta'
$env:RR_POSES='0,1,2'
node tools/qa-renderer-rescue.mjs
python tools/audit-renderer-rescue.py test-results/renderer-rescue-visual/results.json
```

Se abre una partida real por bioma/calidad, semilla 712, sin los cambios de
materiales/vegetación del laboratorio anterior. La simulación queda pausada;
elapsed=2, delta visual=0, mismos assets. Poses 0/1 trasladan; 2 rota la cámara.
Cada condición compara main/candidato/main sobre el mismo mundo. Se guardan
WebP sin pérdidas, diferencias RGB sin tolerancia y equivalencia exacta de los
buffers activos de sombras y de las claves residentes. No contar color como
geometría equivalente: su reducción es justamente lo que se evalúa.

## Tiempo y tráfico

```powershell
$env:RR_OUT='test-results/renderer-rescue-abba'
$env:RR_BIOMES='sabana'
$env:RR_QUALITY='media'
$env:RR_PERF='1'
$env:RR_ORDER='main,candidate,candidate,main'
node tools/qa-renderer-rescue.mjs
python tools/audit-renderer-rescue.py test-results/renderer-rescue-abba/results.json
```

La residencia fija de 49 chunks sirve solo para medir tiempo en Sabana. Cámara
por índice de frame, 180 de calentamiento y 180 muestras por bloque, GPU y
cadencia separados; ajustar RR_SAMPLES/RR_WARMUP explícitamente. CPU cubre
world.render, no simulación pausada ni todo el trabajo del navegador. Intervalos
entre entradas de render no equivalen a tiempos de presentación. Mantener todos
los samples, p95/p99 y resultados adversos; no sumar CPU y GPU.

RR_TRACE=1 mide payload real emitido por bufferData/SubData y rectángulos de
textura. Esta ejecución es diagnóstica, no evidencia de tiempo comparable. No
confundir payload API con tráfico físico del driver. RR_ORDER puede incluir
naive: mismo culling JS con subidas incondicionales para aislar salida efectiva.
Ese control se deriva por dos reemplazos verificados en QA; no entra en el juego.
RR_STATIC=1 conserva la cámara. RR_DENSE=1 añade 300 cultivos, 24 trabajadores,
16 animales, tres centros y cuarenta murallas: es un fixture de render, no una
partida avanzada simulada. RR_MUTATE=1 ejecuta tres plantaciones y construcción/
retirada de muralla reales, fuera de las mediciones. No combinar trazas, tests,
builds, otras capturas o edición de módulos con una serie de rendimiento.

La memoria de atributos de grupos es exacta, separada del heap JS estimado por
Chrome y del heap recogido por CDP fuera de las ventanas. Objetos GL de Three
no son bytes de VRAM. Streaming normal pertenece a una validación separada;
la residencia fija no sirve como prueba de latencia o corrección de streaming.
