# Finca avanzada real renderizada: simulación y GPU

Ensayo nativo del 6 de octubre de 2026 sobre `229aa70`, comparando la simulación actual con `1bfd85a`. Ambos usan **el mismo WorldScene actual**; cada simulación conserva su clase Navigation de la misma raíz, con código equivalente pero su propia identidad de módulo/caché. No se compara un renderer viejo con uno nuevo.

## Entrada y alcance

Snapshot íntegro de la [victoria histórica de Manglares/Saheliana](../intensive-mangrove-shield-100/README.md): 12.201 cultivos históricos, 215 vivos, 11.602 cajas históricas. Continuación mediante `continuePostgame` y contratación ordinaria de 18 ancianas por 540 monedas, sin crédito QA ni cambios de plantas, tareas, crecimiento, rutas o daño. Las cuatro ejecuciones terminan en saldo 841, 186 cultivos vivos y tiempo simulado 35 s.

Windows/Chrome del navegador integrado, Intel UHD/ANGLE D3D11. Viewport 1280×720, DPR 1,25, buffer 1600×900, calidad media, sombras activas. Cámara fija mediante `focusFarm`, con actores listos antes de iniciar. Quince segundos simulados de calentamiento y veinte de medición: 350 RAF con `advanceReal(0.1)` cada uno, que subdivide la simulación como producción. **El paso por RAF es controlado; no reproduce el ritmo variable de producción**. No incluye HUD, tutorial, audio, guardados, incursión o móvil.

Orden A1/B1/B2/A2, mundo/canvas nuevos por lote y mismo snapshot de partida. Carga, preparación, serialización y hashes fuera de las muestras. Instrumentación de renderer.info para sumar todos los pases; temporizadores GPU leídos de forma asíncrona. Los tiempos CPU/GPU se solapan y **no se suman como coste total**; el tiempo de llamada a render puede incluir esperas del driver. Los intervalos RAF incluyen planificación e instrumentación.

## Resultado

| Lote | Simulación CPU mediana (ms) | Llamada a render CPU mediana (ms) | GPU mediana (ms) | Intervalo RAF mediano (ms) |
|---|---|---|---|---|
| A1 | 32.10 | 57.65 | 63.56 | 91.40 |
| B1 | 21.10 | 61.70 | 64.41 | 84.35 |
| B2 | 22.00 | 61.55 | 64.02 | 85.35 |
| A2 | 23.50 | 58.90 | 63.02 | 86.40 |

Hay 200 muestras CPU y 200 GPU por lote, sin disjoint, overflow o queries pendientes. Medianas idénticas de geometría enviada: 1.730,5 llamadas y 6.048.399 triángulos por frame, sumando pases. 328 geometrías y 78 texturas registradas por Three al final: son recuentos, no bytes RAM/VRAM.

La simulación actual es más rápida en estos lotes, pero hay variación importante entre A1 y A2. Los intervalos solo mejoran modestamente y el trabajo de render sigue siendo muy alto. No acredita una ganancia grande/general de FPS ni permite atribuir porcentajes estables al runtime completo. El siguiente diagnóstico debe separar contribuidores reales de draw calls/triángulos y pases; no se deduce cuál categoría manda solo a partir del total.

Estado final completo serializado idéntico en los cuatro lotes, 89 búsquedas de ruta y mismos eventos físicos: 2 riegos, 23 recogidas y **17 entregas** durante la ventana medida. No se comparan estados completos intermedios en este visor. No es campaña actual de cien noches ni valida todos los cultivos/escenarios.

## Ensayos descartados y reproducción

`rejected-mixed-navigation.json` conserva el primer ensayo: usó Navigation actual también para la simulación antigua. Al estar las cachés en WeakMaps por módulo, aquella referencia perdía consultas compartidas y realizaba 107 búsquedas en vez de 89. **Sus tiempos no sustentan la comparación publicada**. Se repitió el ensayo completo con la pareja correcta y asserts de búsquedas, eventos y estado final.

Antes de ello hubo dos fallos de preparación del visor, corregidos: Vite sirvió `state.json.gz` como JSON y el navegador rechazó la lectura; después faltó mapear cultura `saheliana` al payload `saheliano`. La copia privada `state.bin` contiene exactamente los bytes comprimidos originales y no se distribuye. Ninguno fue un cambio de gameplay.

Extraer `git archive 1bfd85a src content package.json` en `.cache/worker-lookups-1bfd-reference`; ejecutar `node tools/prepare_late_farm_render.mjs`, levantar Vite y abrir `tests/browser/late-farm-render.html`. Pulsar «Comparar cuatro lotes A/B/B/A». La fixture necesita la raíz congelada local y no se empaqueta en el juego. `native.json` conserva todas las muestras y `proof.json` los hashes y comprobaciones.

Las campañas 20608 y 36076 estaban confirmadas activas. No se ejecutaron suites/builds/perfiles propios durante la medición. `Validate game` de 229aa70 ya había terminado correctamente; Windows seguía pendiente. Este commit solo añade visor, preparación y evidencia, sin cambiar código runtime.
