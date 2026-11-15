# Validación del apoyo operativo

Registro de ejecución de esta misión. No acredita cierre de A6, rendimiento ni
aceptación A/B/C. La salida de cada ejecución conserva sus fallos y alcance.

Evidencia estructurada: [recibos, hashes, comandos y límites](performance/migration-support-validation-20261115.json).
Procedimiento reproducible: [operaciones](MIGRATION-OPERATIONS.md). Base observada:
`44b6d40dd`, con los cambios locales de Sol y otros trabajos conservados.

Seguimiento sobre `6b4c0e52e`: corregida la prueba de política del reloj que
usaba la API de puertas anterior al contrato causal. El núcleo rechazaba
correctamente `nav_gate_motion_stage_objects` con `-7`; no era un permiso que
faltase conceder. La prueba conserva ese rechazo y utiliza ahora
`nav_gate_motion_stage_causal`, el ticket de mundo con secuencia de reloj y
`nav_gate_motion_commit_causal`. Exige que sólo cambie la política/secuencia del
reloj, manteniendo tiempo e intenciones, y que el commit antiguo sea rechazado
con `-2` sin cambiar la puerta. Pasan 38/38 casos de reloj, puertas causales,
quiescencia y admisión común, cero skips. [Evidencia de la corrección](performance/native-causal-clock-test-validation-20261115.json).
No cambia producción ni reinterpreta los fallos históricos siguientes como éxito;
se conservan sus recibos originales. No se repiten GPU/build por este ajuste
exclusivo de prueba y documentación.

## Herramientas de apoyo: comprobadas

- Siete pruebas pasan, cero skips/TODO: imports transitivos, guards obligatorios,
  archivo desconocido, ABI nativo, módulo huérfano junto a otro cubierto,
  documentación, integración, regresión amplia, deduplicación de escenarios,
  propagación de fallos, TODO incompleto, hash de log y timeout del proceso propio.
  Recibo estable: `.cache/migration-support/2026-11-15T10-13-16.518Z-impact-focused-19220/report.json`.
- `check`: 34 referencias de catálogo válidas y enlaces locales comprobados.
- `context`, `context --json`, `research --topic ...` y selección sin ejecución
  comprobados. Escenario desconocido falla explícitamente.
- Cambio de `src/world/native-resource-admission.js`: selección real de 137
  archivos de tests, incluidos los nueve guards; no fallback de suite completa.
  Es reducción de selección, no medición de rendimiento ni permiso de cierre.
- Cuatro TODO de Harvest producen `status: incomplete`, cero aprobados. No se
  cuentan como aceptación ni se convierten en éxito aunque Node devuelva 0.

No fue necesario un build de producto para estos cambios de herramientas/docs.
La opción de integración conserva el build del repositorio. No se instalaron
dependencias ni se reconstruyeron binarios desde esta misión.

## Escenarios existentes: observaciones y fallos conservados

Comando: `node tools/guardian/migration-support/cli.mjs lab --scenario all --run --gpu --require-complete`.
Usa Node 20.19.0 y Playwright ya presentes; WebGPU NVIDIA Turing real.

| Ejecución | Resultado observado | Límite |
|---|---|---|
| Unión Node de ocho escenarios | 221/222 pasan, un fallo causal; cero skips | No se declara suite verde. |
| Harvest GPU | Asignación y acción admitidas; 54 dibujos durante cada bloqueo de 1.800 ms; cero recursos creados después de readiness; drenaje confirmado | Autoridad de componente en página; sin consecuencia ni siguiente tarea ordinarias. |
| Puertas GPU | 15 dibujos durante 500,08 ms; drenaje confirmado | Harness complementario, no puertas dentro de Harvest completo. |
| Recovery GPU | Sus aserciones internas pasan: dispositivo drenado y canal silencioso sin mutación; proceso devuelve 0 | El recibo contiene `Failed to load resource: ... 404 (Not Found)`. El apoyo lo marca fallido para revisión, sin ocultarlo ni atribuirlo a una pérdida de dispositivo. Recurso exacto sin identificar. |
| Repetición Harvest | 140/141 Node pasan, mismo fallo causal; GPU vuelve a pasar | El WASM pthread cambió durante la ejecución; evidencia invalidada para cierre. |

La primera unión también detectó cambios concurrentes de Sol (C++ y helper de
restauración). Son observaciones parciales, no evidencia estable de una revisión.
La herramienta detectó correctamente esa situación. No se pausó a Sol ni se
repitieron indefinidamente pruebas para perseguir un árbol inmóvil; al cerrar su
incremento debe ejecutar el escenario relevante con huella estable.

La primera tentativa con Node 24 rechazó `assert {type:'json'}` en módulos
existentes; se interrumpió y no se acepta como evidencia. El ejecutor ahora
reutiliza el Node 20 local y registra runtime y hash del WASM. El log original
se conserva, sin modificar esas importaciones de producción.

## Reproducciones independientes del ejecutor nuevo

```powershell
$env:WILD_ENGINE_NATIVE_ROUTE_WASM = (Resolve-Path src/world/wild-engine/spatial-savanna.wasm).Path
.cache/tooling/node20.exe --test tests/spatial-native-causal-clock.test.js
.cache/tooling/node20.exe --test tests/spatial-native-intent-bridge.test.js
```

| Fallo existente en el árbol compartido | Evidencia / diagnóstico acotado |
|---|---|
| `a clock policy boundary invalidates an older staged gate proposal...` | `spatial-native-causal-clock.test.js:53`: devuelve `-7`, esperaba `1`. Se repite directamente: 3/4 pasan. No se corrige el contrato ni se atribuye a estos archivos de apoyo; requiere diagnóstico del propietario. |
| `the intent bridge projects a scaled gate...` | El fixture usa un Proxy WASM incompleto que devuelve cero para exports no definidos; el bridge rechaza `Unsupported native motion layout`. No inferir que recompilar el WASM real arreglará ese stub. |
| `loading during a committed strike...` | Diferencia en metadatos de eventos (`presentation`, `simulationTime`, `requestedDamage`); ya documentado en la corrección A6. |
| `event-fed native intent bridge...` | `Contador de entidad incoherente` al serializar el fixture; también documentado en la corrección A6. |

La suite completa del bridge da 17 aprobados y 3 fallos, con huella estable;
el filtro `--test-name-pattern='scaled gate|committed strike|event-fed'` reproduce
los tres (sus otros 16 skips son exclusiones del filtro, no cobertura).
Logs independientes: `.cache/migration-support/causal-clock-direct.log` y
`.cache/migration-support/bridge-direct.log`, con hashes en el recibo versionado.
Los dos últimos fallos tienen antecedente reproducido contra código anterior en
la corrección A6; para los otros no se afirma un bisect histórico. Se constata
que fallan sin importar ni ejecutar las herramientas nuevas. No se tocaron las
expectativas de ninguna prueba existente.
