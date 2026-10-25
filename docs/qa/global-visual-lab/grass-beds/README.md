# Sabana: matas bajas agrupadas — ensayo descartado para adopción

Se conserva `visualLab=global-grass-beds` exclusivamente para reproducir este resultado. La opción anterior permanece por defecto. No se modificaron simulación, modelos originales ni otros biomas. La ganancia artística es modesta y la regresión GPU nocturna impide recomendar el cambio.

## Auditoría del sistema real

[`biome-material-audit.json`](./biome-material-audit.json) registra archivos, dimensiones y configuración. Sabana, Gran Río, Manglar, Volcán y Gran Cañón tienen base/normal/ARH de 1024²; Desierto usa base de 1254², normal de 1024² y ARH neutro de 1×1, sin altura autoral. ARH contiene oclusión, rugosidad y altura, respectivamente. La altura produce parallax en el shader, no desplazamiento geométrico ni cambios de colisión.

Sabana y Gran Río comparten las fuentes de normal/ARH, con bases distintas. Sus amplitudes configuradas son 0,075; Volcán 0,22 y Cañón 0,10. El suelo puro de musgo del Manglar retorna antes del parallax general: su valor configurado 0,18 no demuestra que ese recorrido esté activo. Desierto conserva el recorrido legado sin parallax. No conviene aumentar amplitudes de forma global.

Ya existen árboles, arbustos y plantas 3D nativos con instancing y LOD. El catálogo contiene 10 slots vegetales en Sabana, Manglar, Volcán y Desierto, 11 en Gran Río incluyendo papiros y 7 en Cañón (sus mesas, agujas y arco son piedra). Las matas de este ensayo son detalle opcional adicional, no la primera vegetación 3D del juego. La auditoría cubre seis biomas; las capturas nuevas solo cubren Sabana y Gran Río.

## Decisión artística

La primera agrupación con la malla antigua parecía un conjunto de ramas altas: se conservan sus cuatro capturas `previous-savanna-*` y su manifiesto. La segunda malla, modelada mediante 18 hojas de parámetros explícitos en Blender, baja la silueta, pliega cada hoja y agrupa cinco posiciones asimétricas. No emplea tarjetas alpha, ruido aleatorio ni texturas añadidas. El archivo `.blend` y el script conservan el proceso editable.

En cámara de juego las pequeñas agrupaciones resultan más intencionales que las agujas dispersas, pero siguen siendo angulosas y escasas. A cámara baja la mejora se concentra en los bordes del encuadre. El suelo fotográfico de frecuencia fina continúa dominando la imagen. No alcanza la composición ni la riqueza de los mockups. Añadir densidad para compensarlo no está justificado.

Comparar `savanna-global-grass-game-day.png` con `savanna-global-grass-beds-game-day.png`, y sus pares `low`/`night`. Las 24 capturas y [`captures.json`](./captures.json) incluyen base `0`, anterior y candidata, dos cámaras y dos horas por bioma. Cámara/objetivo coinciden en cada par. Gran Río conserva exactamente las posiciones anteriores.

## Coste y ABBA aislada

1280×720, perfil media, fixture real WorldScene, casos 1/6, horas 150/350. Orden A-B-B-A, A=`global-grass`, B=`global-grass-beds`. Medias de dos corridas por brazo, no garantía universal de rendimiento. [`abba.json`](./abba.json) conserva las 16 corridas y muestras; [`summary.json`](./summary.json) resume controles. Todos los temporizadores GPU fueron válidos, sin disjoint ni pérdida de contexto; cámaras estables y sin errores de navegador.

| Bioma/hora | GPU A → B (ms) | CPU envío A → B (ms) | Draw calls A/B |
|---|---:|---:|---:|
| Sabana día | 19,050 → 18,802 | 5,502 → 5,593 | 88 / 88 |
| Sabana noche | 19,981 → 22,167 | 5,134 → 5,359 | 88 / 88 |
| Gran Río día | 15,834 → 15,531 | 6,176 → 6,067 | 86 / 86 |
| Gran Río noche | 16,003 → 15,427 | 5,417 → 5,246 | 86 / 86 |

La diferencia nocturna de Sabana es **+2,186 ms**. Las dos B nocturnas son 22,133/22,200 ms; A son 19,343/20,619 ms. El control también fluctúa aunque no cambia su geometría. No se atribuye causalmente la diferencia diurna a la reducción de triángulos.

La malla baja pasa de 176 a 108 triángulos por mata; en Sabana hay 458 → 454 instancias y 80.608 → 49.032 triángulos de detalle. El GLB pasa de 14.916 a 13.504 bytes. Buffers de atributos/índices: 13.728 → 12.312 bytes; buffer de instancias 32.768 bytes en ambos. Cero texturas nuevas, un material y un draw de detalle en ambos (un draw adicional respecto a `0`). La escena mantiene 73 texturas. Son contadores y tamaños de buffers, no una medición de VRAM total. El benchmark registra un draw/triángulo adicional respecto a las capturas por su propio recorrido de medida.

## Aislamiento ligero: causa sin resolver

[`isolation-input.json`](./isolation-input.json) compara A dispersa antigua, B agrupada antigua y C agrupada baja. El material es idéntico: MeshStandardMaterial opaco, DoubleSide, colores de vértice, rugosidad 0,96, sin mapas ni alpha test. Los seis shaders guardados son idénticos al quitar únicamente `SHADER_NAME`; no aparece otra función de iluminación en C.

[`projected-area.json`](./projected-area.json) suma áreas de triángulos proyectados candidatos: 20.580 / 43.084 / 20.893 píxeles para A/B/C. C apenas supera A en este indicador. La estimación no recorta triángulos, ni mide profundidad, oclusión, early-Z o fragmentos realmente sombreados: **no prueba ni descarta overdraw**. No hay experimento factorial temporizado de material e iluminación. La causa de los +2,186 ms sigue sin determinarse y no se retocan parámetros a ciegas.

## Reproducción y validación

- `blender --background --python tools/experiments/blender-savanna-grass-beds.py`
- `node tools/experiments/audit-biome-materials.mjs`
- Con Vite en 5189: `node tools/experiments/capture-grass-beds.mjs`
- Benchmark: `WG_ABBA_VARIANTS=global-grass,global-grass-beds,global-grass-beds,global-grass`, `WG_ABBA_CASES=1,6`, `WG_ABBA_RAW=1`, `WG_ABBA_OUTPUT=docs/qa/global-visual-lab/grass-beds/abba.json`, `WG_QA_URL=http://127.0.0.1:5189`; ejecutar `node tools/experiments/benchmark-visual-lab-abba.mjs` con host libre.
- `node --test tests/blender-ground-details.test.js`: 4/4; determinismo, ocupación, ausencia de mutación de estado, residencia y control Gran Río.

Build de producción: correcto (402 módulos); conserva avisos de chunk grande e importación estática/dinámica de far-atmosphere.

## Siguiente estudio propuesto, todavía sin implementar

Probar una composición pintada de suelo de Sabana con claros de barro y paja conservada, a 1024², sustituyendo su tripleta base/normal/ARH solo bajo un flag. Mantener coherencia entre color y relieve, el shader actual, desgaste, geometría y número de mapas/draws. Gran Río debe seguir usando sus originales compartidos, sin modificar archivos fuente. La hipótesis es que una distribución de masas legible aporta más que añadir miles de hojas. Antes de adoptar: revisar repetición visible, día/noche, cámara de juego/baja y control Gran Río; descartar si no mejora. Esta propuesta no constituye un resultado validado.
