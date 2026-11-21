# Traspaso a Sol: oportunidad previa a la mutación

Entrega acotada en `codex/guardian-3d-animation`, subordinada al plan integrado. [Informe y límites](native-mutation-opportunity-20261120.md) · [Evidencia, hashes y comandos usados](performance/native-mutation-opportunity-20261120/manifest.json).

**Código:** `77afcbbcf`. **Laboratorio/QA:** `3ce180f97`. No requiere cherry-pick: son commits de la misma rama. No se alteró main, se descartó trabajo ajeno ni se cambiaron WASM/ABI. El fetch previo confirmó `origin/…` en `5e8984d27`; el mensaje de entrega confirma por separado el push y el HEAD remoto final.

## Lo utilizable

- El Host notifica una oportunidad después del intento RAF original. La admisión común la espera **antes** de capturar quiescence; el cohort coordina a sus miembros. No es un permiso y no cambia el fence ni los contratos de release. Funciona también si READY ocurrió casi dos segundos antes de la adquisición.
- `tests/native-prepared-ready-opportunity.test.js` cubre el negativo del Host anterior, adquisición aplazada, movimiento de B en Farm común, abort/retry con respuesta en tránsito, NACK normal, negociación y ciclo de vida. Los tests antiguos conservan la protección de recursos y del mundo después del commit.
- `QA_NATIVE_MUTATION_TRACE=true`, junto al observador de preparación existente, registra fases de la mutación, todos los callbacks, inicios de draws que enviaron, ordinales y terminal de drenaje. No crea otro fixture ni renderer.
- `tools/guardian/native-audit-mutation-report.mjs` reconcilia snapshots y traza, identifica holds incompletos, separa callback/draw/hold y sólo compara un presupuesto si se suministra explícitamente. El contador terminal detecta la cola que faltaba en los snapshots anteriores.

Archivos de producción: `remote-webgpu-host.js`, `native-intent-control-publication.js`, `native-intent-control-cohort.js`, `native-resource-admission.js`. Los dos helpers QA nuevos están junto al observador `native-audit-preparation-costs.mjs`. El resto son tests, sincronización de fixtures y esta documentación independiente. No se sobrescriben los documentos canónicos de estado.

## Validación exacta

Build aprobado. Suite amplia conservada roja: **5.091 = 5.083 pass + 3 fail + 4 cancel + 1 skip histórico**. Las correcciones de sincronización y controles negativos se reejecutaron con **297/297**; producción idéntica a la suite amplia/build. QA terminal: **12/12**. No afirmar que hubo una segunda suite amplia verde.

GPU after2 y after3: **0 oportunidades bloqueadas por mutation-hold**, recorrido completo y retirada drenada. after3 conserva **2.484 ordinales de oportunidad y 2.463 de draw**, continuos y coincidentes con el terminal; CDP declara cero pérdida. Los 11 holds se completan. Preparaciones, modelos y propietarios originales; mismas fuentes de producción en ambos ensayos. after3 sólo refuerza QA con ordinales/contadores. Las capturas son de timing, con instrumentación; no certifican píxeles ni scanout.

Los máximos completos **38,750 y 40,885 ms** siguen registrados. Son casos de admisión ordinaria en el Host, fuera de mutation-hold. **Astra conserva su investigación y corrección; Sol no tiene que parchearlos en paralelo.** C4 sigue abierto. El usuario ha fijado el objetivo en **60 fps (16,666… ms)**; los 30 Hz actuales no rebajan ese requisito. Los informes archivados preceden a esa decisión y conservan su `targetMs: null`. No expandir sobre esa propiedad un productor dependiente hasta contrastar la corrección siguiente.

## Comandos

Pruebas enfocadas:

```powershell
.cache/tooling/node20.exe --test tests/native-prepared-ready-opportunity.test.js tests/native-mutation-release-presentation.test.js tests/native-intent-control-cohort.test.js tests/native-audit-mutation-costs.test.js tests/native-audit-mutation-report.test.js
```

Repetir el escenario original, usando las dependencias ya existentes y sin otros jobs CPU/GPU. Mantener Vite disponible en `127.0.0.1:5218`; si falta, arrancarlo en otra terminal con Node 20:

```powershell
.cache/tooling/node20.exe node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5218 --strictPort
```

Después, en la terminal de ensayo:

```powershell
$run = Get-Content docs/guardian/performance/native-mutation-opportunity-20261120/after3-frozen.json -Raw | ConvertFrom-Json
foreach ($entry in $run.environment.PSObject.Properties) {
  [Environment]::SetEnvironmentVariable($entry.Name, [string]$entry.Value, 'Process')
}
$env:OUTPUT = '.cache/native-opportunity-repeat.json'
.cache/tooling/node20.exe tools/guardian/audit_native_farm_birth_world_owner.mjs
.cache/tooling/node20.exe tools/guardian/native-audit-mutation-report.mjs .cache/native-opportunity-repeat.json .cache/native-opportunity-repeat-report.json 16.666666666666668 .cache/native-opportunity-repeat.trace.json
```

Guardar antes/después los hashes y HEAD, como en `after3-frozen.json`. El runner archivado conserva el procedimiento usado y sus inputs locales; el comando anterior reutiliza directamente el auditor del repositorio. El escenario debe terminar con recorrido aprobado, `drained: true`, `coverage.tracedLifetime: true`, `dataLossOccurred: false` y sin huecos ordinales. Estos resultados no convierten automáticamente una superación de cadencia en aceptable.

Los recibos y trazas archivados están comprimidos sin pérdida, con SHA del original y del gzip en el manifiesto. Para reconstruir un recibo de esta entrega:

```powershell
@'
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root='docs/guardian/performance/native-mutation-opportunity-20261120/';
fs.writeFileSync('.cache/native-opportunity-archived.json',gunzipSync(fs.readFileSync(root+'after3.json.gz')));
'@ | .cache/tooling/node20.exe --input-type=module
.cache/tooling/node20.exe tools/guardian/native-audit-mutation-report.mjs .cache/native-opportunity-archived.json .cache/native-opportunity-archived-report.json - docs/guardian/performance/native-mutation-opportunity-20261120/after3.trace.json.gz
```

## Coordinación acordada

Sol detecta y envía a Astra cada incumplimiento con el objetivo explícito, HEAD/mapa de fuentes, seed/configuración, fase funcional, recibo, traza completa y tipo de medida. Astra reproduce, atribuye y corrige; devuelve commit, negativo, validación y límites. No usar 50 ms como aceptación ni inferir scanout de callbacks o draws. Evitar ensayos y compilaciones simultáneos durante las mediciones.

La comunicación se realizó por el canal directo entre hilos y Sol confirmó recepción y separación de archivos. Sus revisiones detectaron además la cola ausente después de inspect y precisaron `samples.at`; ambas observaciones están incorporadas. Sol conserva Game, WASM, productor e intenciones. Astra continúa sobre la admisión ordinaria del Host y su QA. La incorporación de estas conclusiones a los gates y documentos canónicos corresponde a Sol.
