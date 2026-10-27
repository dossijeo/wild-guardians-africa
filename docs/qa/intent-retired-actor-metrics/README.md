# Wild Engine: métricas de actores retirados

En `main` `f919bc02a91ebb6cfc25307c066211a50f7cb882`, `planningCallsByActor` en C++ y los mapas `animalRequests`, `animalPlanCounts` y `animalPeakPerMinute` en JavaScript conservaban un registro por animal aun después de `RaidEnded`. Los mapas equivalentes de trabajadores tampoco se vaciaban al recibir su baja confirmada. Una campaña larga podía acumular entradas de actores ya desinstanciados. Estos registros son telemetría derivada; no forman parte de las reglas, reservas ni del estado guardado.

Ahora el cierre real de la última oleada retira las métricas de todos sus animales. Wild Engine libera también cualquier intención o ruta residual y sus índices inversos, sin emitir una nueva propuesta para actores que ya no existen. La baja confirmada de un trabajador limpia sus métricas en ambos lados. Los contadores agregados de sesión permanecen para el perfilado; los actores todavía presentes conservan sus métricas por minuto y su total hasta la baja. Las oleadas pendientes no se retiran prematuramente.

Validación:

```powershell
$env:WILD_ENGINE_NATIVE_ROUTE_WASM='src/world/wild-engine/spatial-savanna.wasm'
node --test tests/spatial-native-raid.test.js tests/spatial-native-intent-bridge.test.js
node tools/experiments/compare-enclosure-defense-campaigns.mjs desierto 14 123 test-results/desert-retired-actor-metrics-14.json topological
```

Las 36 pruebas nativas dirigidas pasan antes de añadir el caso específico de baja de trabajador; este también pasa. La incursión integrada comprueba que el mapa por animal queda vacío al terminar y que el contador nativo del actor retirado vuelve a cero. El nuevo caso de trabajador confirma un contador positivo antes de la baja y ausencia de registros nativos y JavaScript después.

La [campaña de 14 noches](desert-123-topological-14.json) reproduce **14/14 hashes diarios** del [control de 30 noches anterior](../desert-late-raid-main-replay/desierto-123-current-30.json.gz), además de los saldos y cultivos vivos. No se comparan sus tiempos como benchmark A/B: la carga del host varía y esta corrección elimina retención, sin prometer una aceleración medible. El WASM compilado para esta variante tiene SHA-256 `c841861d362b0fd7cec66e942c56ca1644d24f6e5b8e8f6750aab82b57b1190b` y conserva los 16 MiB iniciales con crecimiento permitido. La build y los verificadores de assets originales y variantes web pasan.
