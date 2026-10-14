# AB de prioridad de reparación del jugador virtual

La opción `defenseRepairPriority` acepta `creation` (valor predeterminado y comportamiento histórico) o `ruined-first`. Sólo ordena los muros **propios** que ya cumplen el umbral de reparación y no tienen tarea pendiente. `ruined-first` solicita primero los arruinados y conserva el orden original de `s.structures` dentro de cada grupo. Conserva coste, reserva, umbral, comandos nativos y orden de tareas posterior.

Para un AB pareado, pasar el mismo objeto de genes congelados, escenario, semilla y número de días a `evaluateOne` en ambas llamadas, cambiando sólo el último argumento:

```js
const control=await evaluateOne(scenario,days,strategy,frozenGenes,undefined,true,undefined,
  {defenseRepairPriority:'creation'});
const variant=await evaluateOne(scenario,days,strategy,frozenGenes,undefined,true,undefined,
  {defenseRepairPriority:'ruined-first'});
```

Comparar gastos y reparaciones aplicadas, muros arruinados al amanecer, exposición física y cultivos destruidos por incursión. Una solicitud no equivale a reparación completada. El informe QA anterior de empalizada d12 aporta el motivo: tres ruinas permanecieron HP 0 hasta d13, mientras se gastó en otras reparaciones. Este cambio permite probar la prioridad sin modificar genes de material ni umbral y sin alterar el valor predeterminado de la campaña.

Regresión local: `node --test tests/native-expanding-defense-policy.test.js tests/evolutionary-balance.test.mjs` (8/8). La prueba de presupuesto limitado coloca una ruina al final de la lista: `creation` solicita el muro dañado anterior, `ruined-first` solicita la ruina; sólo cabe una solicitud.
