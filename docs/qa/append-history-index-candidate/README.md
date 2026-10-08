# Índices incrementales de historiales — integrado

Referencia congelada44851761 y candidatoV2 medido fuera de producción; después de los checks se integra su algoritmo en main. Mantiene mapas de entidades por array; cuando crecen los historiales de cultivos/cajas incorpora únicamente los nuevos miembros. El opt-in appendOnly se aplica a esas dos colecciones: gameplay añade con push y conserva miembros históricos muertos/entregados. Cambiar referencia/restaurar o reducir longitud conserva invalidación. Las tareas mantienen la reutilización actual, sin asumir altas exclusivas.

Se encontró además un caso de borde en el helper de referencia: indexar100 miembros, reducir a32/consultar y volver a100 con miembros diferentes reutilizaba el mapa anterior. La ruta de arrays pequeños retornaba antes de retirar el índice global. V2 elimina ese índice cuando se consulta una colección pequeña. Las operaciones actuales del juego no reducen in-place los historiales ni las tareas así: estas últimas reemplazan el array. Es un defecto reproducido del helper, no evidencia de una partida dañada.

**519 consultas** de paridad del helper: altas, campos vivos, duplicados, ausencia de ID, reducción, sustitución/restauración; los miembros antiguos no se leen al indexar una nueva cola final. Caso de regrowth adicional se compara con pertenencia real, pues referencia reproduce el defecto. No soporta editar IDs o sustituir miembros en-place sin cambiar longitud entre consultas; no es una caché genérica de arrays mutables.

V2 conserva36 checkpoints de estado completo, eventos y búsquedas en cuatro continuaciones nativas de victorias históricas: contratación pagada,350 ticks por brazo, dt0,1. No acredita cien noches con balance actual ni la campaña viva de Gran Cañón. Se reutiliza el runner histórico de altura, pero los únicos cambios del candidato son helper y dos opt-ins de game.js; no cambia terreno.

**Medición preliminar descartada para rendimiento.** Suite40124/session46954/child49660 y campañas43808/49032 estaban activas. Los tiempos incluidos por el runner se retienen para trazabilidad, pero no se usan para aceptación, porcentajes de mejora ni reducción del frametime. Estas condiciones corresponden únicamente a native-check.json.gz, no a las mediciones finales descritas abajo. La instrumentación anterior de tareas no prueba automáticamente el beneficio de este candidato.

## Reproducción

Extraer src/package.json de la referencia en carpeta del repositorio:

```powershell
node tools/experiments/append-history-index.mjs <referencia> <nuevo-candidato>
node tools/check_append_history_index.mjs <referencia> <candidato> <helper.json>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <nativo.json>
node docs/qa/append-history-index-candidate/verify.mjs
```

El candidato anteriorV1 comprobó516 consultas y continuidad, pero no protegía la reducción bajo64; queda superado, sin promoción. El archivo incluye solo V2. Verificador: integridad y coherencia archivadas, no nueva ejecución de campañas ni medición de rendimiento.

## Medición final e integración

Con la suite46954 ya terminada y sin otros trabajos propios de benchmark, Blender o GPU, se ejecutaron dos recorridos AB/BA con orden alternado por tick. Las campañas CPU43808/49032 seguían activas: no son mediciones en máquina ociosa. Cada brazo usa150 ticks de calentamiento y200 medidos de dt0,1. Solo Game.tick se cronometra; preparación, serialización, comparación, hashes y escritura quedan fuera. Los72 checkpoints completos coinciden; eventos y búsquedas son idénticos. Son continuaciones de cuatro victorias históricas, no aceptación de cien noches del código actual ni diagnóstico de la campaña viva del cañón.

| Finca / trabajadores | Total AB referencia → candidato (ms) | Total BA referencia → candidato (ms) |
| --- | ---: | ---: |
| Manglar /18 |531,889 →407,551|457,228 →356,736|
| Río /47 |901,447 →752,799|770,831 →712,283|
| Sabana /46 |894,681 →685,134|793,409 →601,681|
| Musgum /112 |3626,063 →3347,998|3647,745 →3162,052|

Los ocho totales medidos disminuyen entre7,6% y24,2%. Dos recorridos no prueban significancia estadística ni una mejora universal; los primeros ticks fríos son mixtos, sin reducción consistente de picos. No se miden GPU, FPS ni móvil.

Apertura pequeña nativa: Sabana/Mapungubwe, ocho mijos y un trabajador, cuatro perfiles por separado, todos los gastos reales pagados. Cada perfil usa dos pares de calentamiento y ocho medidos con orden alternado. Se comparan estados completos cada25 ticks y al terminar; los32 pares medidos conservan1568 checkpoints, estados finales y número de búsquedas. El límite1200 ticks de0,5s no acredita campaña completa. Medianas del total (ms): anciano hombre1245,652→1213,169; anciana1286,663→1241,363; joven hombre1321,111→1281,224; joven mujer1217,486→1229,308 (+0,97%). Candidato gana respectivamente4/8,4/8,3/8 y4/8 pares: resultados mixtos, sin beneficio consistente en fincas pequeñas ni prueba estadística de ausencia de regresión.

Se integra opt-in appendOnly exclusivamente en historiales de cultivos/cajas, con la protección bajo64 y sin modificar navegación, economía o gameplay. Los comentarios del helper integrado explican el contrato; el candidato congelado utilizado en las mediciones mantiene el mismo algoritmo. Los78 tests dirigidos pasan. Build y comprobación del paquete pasan: 701 archivos, 403017012 bytes, 859 enlaces relativos y 20 GLB runtime, sin duplicados originales. La suite completa del código integrado termina con exit0: 3142/3142, sin fallos/canceladas/omitidas, 937673,125ms. Los833 hashes registrados de src/tests siguen iguales al finalizar. Se acepta el opt-in en main; performanceAcceptance se limita a la observación CPU pareada y paridad funcional descritas, sin aprobación general de rendimiento. Este archivo no valida FrontSide ni incorpora modelos reparados.

Reproducción adicional (usar referencia/candidato congelados V2):

```powershell
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <ab.json>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <ba.json> BA
node tools/benchmark_small_farm_candidate.mjs <referencia> <candidato> <small.json>
```

El runner de apertura prepara un estado compartido con módulos de main y createOpeningWorld. Para reproducir la medición, usar la referencia congelada con las dos fuentes integradas y opening-setup en sus rutas originales; se archivan también villages y el perfil Sabana. No usar una versión futura arbitraria de main para preparar estados y atribuirle los mismos hashes. Los brazos importan su propio src congelado.

Inventario posterior: además de los PIDs43808/49032 registrados, siguen vivas las campañas41320 (Desierto/Musgum, creada6oct) y41304 (Cañón/Mapungubwe, creada7oct). No se inventarió exhaustivamente su carga CPU durante los benchmarks; por ello los porcentajes son observaciones pareadas bajo carga de fondo, no rendimiento de máquina ociosa ni promesa estadística. No se detiene ni reinicia ninguna campaña para mejorar artificialmente esa evidencia.
