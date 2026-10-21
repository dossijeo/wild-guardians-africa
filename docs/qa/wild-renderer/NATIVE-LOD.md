# Selección LOD nativa: primera etapa

En la primera etapa se añadió `wr_lod` a Wild Renderer sin conexión al juego; la integración QA posterior se describe más abajo. Consume registros persistentes Float64 de posición/centro visual/radio y genera índices estables separados en tres rangos. La cámara y los tres umbrales son los únicos parámetros variables de selección; no necesita copiar registros por frame. El registro y retiro de esos datos aún deben conectarse a eventos del ciclo de vida.

La prueba compara con `nativeLodBins` original: 2 roles, 6 grupos, 4 calidades, 3 cantidades de niveles y 3 cámaras, 432 combinaciones de 2.048 instancias. Incluye escalas no uniformes, centro vertical, umbrales exactos y valores a ambos lados, descarte por distancia máxima y población vacía. Todos pasan. Esto no prueba equivalencia para todos los números de coma flotante: Math.hypot y std::hypot pueden diferir en casos extremos; la prueba del juego sigue siendo obligatoria.

No se ha medido aceleración ni se ha reducido trabajo del juego todavía. No hay un nuevo benchmark sintético presentado como resultado final. El siguiente paso es registrar estos datos desde los recursos persistentes y los exports compactos de Engine, conservar las invalidaciones por geometría/calidad y conectar las listas a los consumidores de sombras/cobertura antes del A/B completo.

Compilar mediante tools/build-wild-renderer.ps1 y ejecutar node --test tests/wild-renderer-lod.test.mjs. El export nuevo no altera los selectores anteriores ni activa cambios de producción.

## Integración QA sobre export de Engine

`engine-native-lod` conecta el selector con `EngineEventsWildRenderer`. `wr_lod_props` construye registros visuales a partir del mismo export de 40 bytes y los índices filtrados que usa el registro de matrices; no recorre posiciones de objetos JavaScript. Los datos geométricos (anchura, profundidad y centro vertical) proceden del prototipo de render. Las escalas uniformes corresponden al contrato del export Engine; no se generaliza a fuentes ajenas con escalas no uniformes.

Los registros LOD pertenecen al registro persistente del lote y se liberan con él. La prueba con Proxy que prohíbe lectura numérica de instancias pasa con LOD activado, tanto para EnginePacked como EngineEvents; también pasan reemplazo de población, selección cerca/lejos y liveBytes=0 tras dispose.

La adaptación todavía conserva el recorrido de lotes de updateAssetLods, las matrices fuente y sus consumidores. Devuelve arrays independientes de índices porque sobrescribir una vista compartida invalidaría la comparación con el orden anterior. Por tanto, persiste una conversión de salida a JavaScript; no se declara eliminación completa del agrupador. La variante anterior permanece disponible y predeterminada.

Reproducir A/B con WR_ORDER=engine-selection,engine-native-lod,engine-selection,engine-native-lod, WR_FIXED_RESIDENCY=1 y salida nueva. Auditar con audit-wild-renderer.py <salida> --native-lod. No combinar con instrumentación LOD ni con el gate de sombras.

## A/B/A/B en el juego: no promover aún

Cámaras, draws y triángulos coinciden por frame en todas las ventanas. Las capturas diurnas coinciden; quedan residuos nocturnos de hasta 7 píxeles, delta máximo 1. La auditoría estricta de imágenes no pasa.

| Pareja | CPU render A → B | Intervalo A → B |
|---|---:|---:|
| Día 1 | 8,943 → 8,649 ms | 18,506 → 17,872 ms |
| Día 2 | 7,885 → 7,771 ms | 16,905 → 17,089 ms |
| Noche 1 | 8,765 → 8,524 ms | 18,854 → 17,671 ms |
| Noche 2 | 7,320 → 7,384 ms | 16,905 → 16,721 ms |

**Anomalía del temporizador:** en el segundo bloque B diurno, frame 19, la consulta GPU devuelve 960767,920505 ms sin disjoint ni error de contexto. No es compatible con la duración observada del experimento. Se conserva el dato bruto; no se elimina el frame ni se usa la media GPU contaminada para comparar. La serie GPU se considera no fiable. Los indicadores de estado del temporizador por sí solos no bastan para certificar la medición.

La memoria viva del allocator aumenta de 1.100.144 a 4.871.092 bytes (no VRAM). Causa identificada: invocar source() desde selección LOD registra todos los lotes residentes en la estructura completa de matrices/esferas, incluidos aquellos que el agrupador no necesitaba antes. Esto contradice la intención de un registro LOD ligero. La siguiente integración debe separar los registros compactos de selección de la materialización de matrices/esferas de empaquetado, reutilizando el mismo export de Engine y el mismo ciclo de eventos.

**Mantener solo como prototipo QA.** No demuestra una mejora global suficiente y no se activa por defecto. La selección nativa y su equivalencia inicial están implementadas, pero aún quedan conversión de listas, recorrido de lotes, memoria excesiva y validación con eventos/streaming del nuevo adaptador. No dar por cumplida la arquitectura persistente completa.

[Datos brutos](native-lod-abab/benchmarks.json), [resumen](native-lod-abab/summary.json), [día](native-lod-abab/day-pair.webp), [noche](native-lod-abab/night-pair.webp).

## Variante de registro ligero

`engine-light-lod` separa el registro de selección del registro de empaquetado. Conserva 32 bytes de datos visuales y 12 bytes de índices por instancia, más umbrales/contadores por lote. No crea matrices mundiales ni esferas de todos los LOD al seleccionar un lote. Los recursos de empaquetado se materializan cuando los necesita el agrupador.

Se comparte el export compacto por chunk. En el registro inicial todavía se utiliza el filtro nativo existente con scratch temporal de matrices; se libera al terminar. No hay copia de posiciones por cámara ni lectura numérica de instancias JS. Este scratch y la conversión de listas de salida siguen siendo oportunidades posteriores, no costes eliminados.

`trackEntry` registra el ciclo de vida sin crear datos geométricos; retirada del mesh, retirada del grupo e invalidación explícita liberan el registro ligero. Diez pruebas cubren modos anteriores y ligero, paridad, cámara, invalidación y retiro; el caso ligero exige cero registros de empaquetado tras seleccionar LOD y cero memoria viva después de dispose.

A/B frente a engine-selection, con WR_ORDER=engine-selection,engine-light-lod,engine-selection,engine-light-lod y WR_FIXED_RESIDENCY=1. Auditor: --light-lod.

### Resultado del registro ligero: memoria corregida, CPU peor

La memoria nativa viva es 1.805.540 bytes, frente a 4.871.092 de la integración acoplada anterior y 1.100.144 del control sin LOD nativo. Son bytes del allocator, no VRAM ni memoria total del proceso.

| Pareja | CPU A → B | Intervalo A → B |
|---|---:|---:|
| Día 1 | 7,577 → 8,079 ms | 16,813 → 16,674 ms |
| Día 2 | 7,330 → 7,872 ms | 16,906 → 16,675 ms |
| Noche 1 | 7,270 → 7,973 ms | 16,675 → 17,553 ms |
| Noche 2 | 7,045 → 7,864 ms | 17,441 → 17,320 ms |

CPU empeora en las cuatro parejas (+0,50–0,82 ms). La cadencia mixta, cercana a 16,7 ms en muchos bloques, no demuestra mejora global. La conversión de salida, llamadas por lote y recorridos JS permanecen; esta serie no aísla cuánto aporta cada uno. No se atribuye el resultado únicamente al núcleo C++.

Mismos draws/triángulos/cámaras por frame, sin errores GL ni cambios de estado/residencia. 1.440 consultas GPU y 2.880 frames de cadencia. Máximo GPU individual 28,357 ms: no se repite la anomalía extrema anterior. Quedan residuos de imagen de hasta 7 píxeles, por lo que la auditoría estricta no pasa.

**No promover la integración LOD nativa actual.** La separación ligera resuelve la reserva excesiva, pero no la rentabilidad. Se conserva como prototipo comparativo; no se habilita en producción ni se presenta como aceleración. La hipótesis más amplia del agrupador persistente no queda resuelta por este selector por lote.

[Datos](light-lod-abab/benchmarks.json), [resumen](light-lod-abab/summary.json), [día](light-lod-abab/day-pair.webp), [noche](light-lod-abab/night-pair.webp).
