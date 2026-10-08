# Índices incrementales de historiales — candidato pendiente

Referencia congelada44851761, candidatoV2 fuera de producción. Mantiene mapas de entidades por array; cuando crecen los historiales de cultivos/cajas incorpora únicamente los nuevos miembros. El opt-in appendOnly se aplica a esas dos colecciones: gameplay añade con push y conserva miembros históricos muertos/entregados. Cambiar referencia/restaurar o reducir longitud conserva invalidación. Las tareas mantienen la reutilización actual, sin asumir altas exclusivas.

Se encontró además un caso de borde en el helper de referencia: indexar100 miembros, reducir a32/consultar y volver a100 con miembros diferentes reutilizaba el mapa anterior. La ruta de arrays pequeños retornaba antes de retirar el índice global. V2 elimina ese índice cuando se consulta una colección pequeña. Las operaciones actuales del juego no reducen in-place los historiales ni las tareas así: estas últimas reemplazan el array. Es un defecto reproducido del helper, no evidencia de una partida dañada.

**519 consultas** de paridad del helper: altas, campos vivos, duplicados, ausencia de ID, reducción, sustitución/restauración; los miembros antiguos no se leen al indexar una nueva cola final. Caso de regrowth adicional se compara con pertenencia real, pues referencia reproduce el defecto. No soporta editar IDs o sustituir miembros en-place sin cambiar longitud entre consultas; no es una caché genérica de arrays mutables.

V2 conserva36 checkpoints de estado completo, eventos y búsquedas en cuatro continuaciones nativas de victorias históricas: contratación pagada,350 ticks por brazo, dt0,1. No acredita cien noches con balance actual ni la campaña viva de Gran Cañón. Se reutiliza el runner histórico de altura, pero los únicos cambios del candidato son helper y dos opt-ins de game.js; no cambia terreno.

**No se incorpora todavía.** Suite40124/session46954/child49660 y campañas43808/49032 estaban activas. Los tiempos incluidos por el runner se retienen para trazabilidad, pero no se usan para aceptación, porcentajes de mejora ni reducción del frametime. Quedan benchmark AB/BA sin otras suites/perfiladores, casos de fincas pequeñas, regresión dirigida, suite/build/paquete del candidato y decisión de integración. La instrumentación anterior de tareas no prueba automáticamente el beneficio de este candidato.

## Reproducción

Extraer src/package.json de la referencia en carpeta del repositorio:

```powershell
node tools/experiments/append-history-index.mjs <referencia> <nuevo-candidato>
node tools/check_append_history_index.mjs <referencia> <candidato> <helper.json>
node tools/benchmark_late_farm_terrain_height.mjs <referencia> <candidato> <nativo.json>
node docs/qa/append-history-index-candidate/verify.mjs
```

El candidato anteriorV1 comprobó516 consultas y continuidad, pero no protegía la reducción bajo64; queda superado, sin promoción. El archivo incluye solo V2. Verificador: integridad y coherencia archivadas, no nueva ejecución ni aceptación de rendimiento.
