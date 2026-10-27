# Perfil de llamadas de navegación durante una campaña de Wild Engine

Sabana/Mapungubwe/712, estrategia `good`, ocho noches. La apertura fue `createSpatialCampaignOpening` con `nativeIntents:true`, `nativeWallPlans:true` y `reloadRaids:false`; no se construyó una instancia de `Navigation` heredada. La medición envuelve las funciones expuestas en JavaScript después del primer tick. Cuenta todas las llamadas, pero solo cronometra una de cada 64 llamadas frecuentes; los tiempos estimados son inclusivos y pueden contar funciones anidadas más de una vez. `new Error().stack` identifica el llamador de una muestra de `segmentClear`. Esta instrumentación tampoco separa el coste de JavaScript del cálculo C++ interno.

| Ejecución | `Game.tick` acumulado | Noches | Monedas | Cultivos vivos | Entregas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sin envoltorios | 24,54 s | 8 | 738 | 144 | 642 |
| Muestreo y pila | 29,23 s | 8 | 738 | 144 | 642 |

Es una pareja de corridas en momentos distintos, no una estimación estable del sobrecoste ni un benchmark de optimización. El resultado de juego coincide en esas medidas, pero no se comparó aquí un hash completo de estado. Se observaron 187.969 llamadas a `segmentClear` y 528.298 a `walkable`. De 2.933 muestras de `segmentClear`, 2.819 procedían de `staticClear()` en `src/simulation/actor-motion.js`; otras 72 procedían de `yieldPoint()` del mismo módulo. La estimación inclusiva de `segmentClear` fue de unos 2,15 s en la corrida instrumentada, pero la carga del host y el muestreo impiden tratarla como un porcentaje exacto de `Game.tick`.

La prioridad de perfilado siguiente es la evitación local de cuerpos móviles: comprobar cuántas veces reconstruye el pequeño grafo de desvío cuando no cambia el conjunto relevante de obstáculos, y medir su coste con y sin tráfico denso. Reducir llamadas `segmentClear` no debe permitir cruces de cuerpos o barreras. Las búsquedas nativas de rutas no deben calificarse como el cuello de botella principal a partir de estos datos: `workerPath` se llamó 644 veces y `path` 35, frente a cientos de miles de pruebas de segmentos locales.

Reproducción:

```sh
node tools/experiments/profile-campaign-navigation-api.mjs 8 712 baseline wild-engine
node tools/experiments/profile-campaign-navigation-api.mjs 8 712 stack wild-engine
```
