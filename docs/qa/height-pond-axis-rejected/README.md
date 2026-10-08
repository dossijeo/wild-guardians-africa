# Descarte por ejes de charcas en altura — rechazado

Base congelada `198d6d3d0e43a211d1720a7dda30a591f2bd6f36`. Las 237 fuentes `src` de referencia se comprobaron contra los blobs Git. Solo cambia `terrain.js` en una copia experimental fuera de producción.

El candidato omite `pondMetric` en `naturalHeight` cuando una charca nativa sin rotación queda fuera del límite normalizado 1,8 en algún eje. Mantiene divisiones originales, sin aproximar coordenadas ni añadir cachés; los métodos `pondMetric` sustituidos conservan sus llamadas. Manglares retorna antes de ese bucle y sirve como control donde el descarte no actúa.

## Integridad y comportamiento

46.440 comparaciones escalares exactas de height/surface: seis biomas, tres seeds, coordenadas positivas/negativas y 3.240 consultas alrededor del límite 1,8 con vecinos ±epsilon/±1e-8. Una sustitución de métrica conserva las 27 llamadas. Es muestreo, no prueba de todas las coordenadas ni aceptación visual.

Dos recorridos completos AB/BA usan cuatro victorias históricas continuadas con contratación pagada y navegación nativa. 350 ticks de 0,1 s por finca y recorrido; las 72 comprobaciones de estado serializado completo, eventos y búsquedas coinciden. No hay financiación o cambios de balance/terreno inyectados. No acredita cien noches actuales ni la campaña viva de Gran Cañón.

## CPU y decisión

Orden alternado por tick y comienzo invertido entre recorridos. Primeros 150 ticks de calentamiento retenidos; siguientes 200 medidos. Preparación, eventos, serialización/hash e IO fuera del tiempo de tick. Las campañas 43808/49032 seguían vivas; sin otras suites, builds, Blender o escenas QA propias durante los intervalos medidos.

| Finca / empleados | Total estable AB: referencia → candidato | Total estable BA: referencia → candidato |
| --- | ---: | ---: |
| Manglares / 18 (control) | 454,97 → 470,53 ms | 474,52 → 453,80 ms |
| Gran Río / 47 | 778,76 → 807,85 ms | 793,73 → 811,48 ms |
| Sabana / 46 | 807,98 → 833,84 ms | 780,62 → 822,08 ms |
| Sabana Musgum / 112 | 2830,21 → 2852,17 ms | 3162,80 → 3215,26 ms |

Los seis pares donde actúa el descarte empeoran el total medido. No se afirma significación estadística con dos recorridos ni se atribuye toda la diferencia al algoritmo.

El primer tick de Gran Río parece mejorar en AB (591,76 → 464,46 ms), pero empeora al invertir el orden en BA (463,34 → 575,82 ms): el segundo brazo es más rápido en ambos. Manglares también varía sin que actúe el descarte. No hay evidencia de reducción consistente del pico frío. Musgum: 1275,58 → 1292,53 ms AB y 1314,51 → 1270,26 ms BA.

**No se incorpora al juego.** No mide GPU, FPS, RAM, móvil, generación visual de chunks ni coste de todo el horizonte. El terreno de producción queda intacto. No demuestra que cualquier descarte geométrico sea peor; rechaza promover este candidato a partir de estas medidas. Priorizar las estructuras de búsqueda y las rutas repetidas/inaccesibles antes de añadir otro filtro de terreno.

## Reproducción

Extraer `git archive 198d6d3d src package.json` dentro del repositorio para resolver las dependencias comunes. El generador exige un destino nuevo y nunca modifica el original.

```powershell
node tools/experiments/height-pond-axis.mjs <referencia> <nuevo-candidato>
node tools/check_height_pond_parity.mjs <referencia> <candidato> <paridad.json>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <AB.json>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <BA.json> BA
node docs/qa/height-pond-axis-rejected/verify.mjs
```

El candidato inicial y el generado por herramienta coinciden byte a byte. Fuentes de referencia/candidato, herramientas, muestras completas y hashes están archivados. El verificador comprueba integridad y coherencia de lo registrado; no vuelve a ejecutar la simulación. No se repite build ni suite completa porque no cambia producción; la base ya pasó 3138 pruebas, build y paquete web.
