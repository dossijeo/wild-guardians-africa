# Reservas de plantación al perder un centro

En `main` tras la PR #161, `findPlantingSite()` podía reservar una parcela y
conservar esa reserva nativa después de que el centro entrase en colapso o se
retirase. La reserva seguía ocupando el lugar para otras consultas. Además, el
puente JavaScript rechazaba centros `ruined`, pero admitía `collapsing`, aunque
la regla del juego solo considera operativo un centro `intact`.

La prueba sobre el estado guardado de Desierto/983 reproduce primero el fallo:
`releasePlantingSite()` devolvía `true` para la reserva de un centro que ya
estaba en colapso. El índice nativo ahora descarta únicamente las reservas del
centro afectado al cambiar su geometría o acceso, perder su estado operativo o
desaparecer. Una pérdida de HP que no cambia el estado conserva la reserva.
Después de reparar el centro, el mismo lugar puede proponerse de nuevo. La
consulta nativa y su puente exigen un centro operativo; la economía, las reglas
de colocación y las rutas físicas permanecen en sus servicios existentes.

```powershell
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM='src/world/wild-engine/spatial-savanna.wasm'
$env:WILD_ENGINE_NATIVE_ROUTE_WASM='src/world/wild-engine/spatial-savanna.wasm'
node --test tests/spatial-native-planting-site.test.js tests/spatial-native-planting-geometry.test.js tests/spatial-native-damaged-services.test.js tests/spatial-native-intent-bridge.test.js
npm run build
```

El ensayo dirigido pasó de 1 fallo reproducido con el WASM original a 27/27
pruebas aprobadas con el WASM reconstruido, sin pruebas omitidas. `npm run build`
también pasó. Es una corrección de coherencia y retención de estado derivado;
estas pruebas no miden una ganancia de `Game.tick` ni acreditan un cambio de
balance de campaña.
