# Evaluación de deltas para muestras de actores

Se evaluó una representación sin pérdida que conserva la primera muestra de
cada actor y transmite solo los campos modificados en las siguientes. En un
lote de dos pasos del fixture real de manglares, los datos de muestras pasaron
de 226.059 a 61.326 bytes JSON. Las pruebas comprobaron reconstrucción exacta,
validación, vista previa y transporte incremental con un Worker real.

En una medición local de 60 repeticiones, la clonación de las muestras
originales promedió 2,109 ms, p95 2,520 ms. Codificar, clonar y reconstruir
promedió 2,157 ms, p95 4,213 ms. Son operaciones secuenciales en un proceso
Node, sobre una única captura: no miden el envío entre Workers, el navegador,
la GPU, la memoria residente ni los fotogramas. El p95 incluye ruido y pausas
de asignación; estos datos no establecen el coste de una partida completa.

**Decisión:** no integrar la codificación. El tamaño disminuye, pero no hay
evidencia de mejora global y el trabajo adicional podría perjudicar los picos.
La implementación de prueba se ha descartado. La ruta existente mantiene todos
los campos y las mismas validaciones. Una evaluación futura tendría que medir
el transporte real y el coste completo en ambos Workers, sin perder eventos ni
la evidencia necesaria de colisiones.

Para reproducir la referencia de tamaños y tiempos con Node 20 desde la raíz
del repositorio:

```powershell
@'
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from './src/persistence/snapshots.js';
import {createSimulationAuthority} from './src/simulation/simulation-authority.js';
import {actorTickState} from './src/simulation/worker-actor-tick-states.js';
const snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()));
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),keys=[];
for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)keys.push(`${x},${z}`);
const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true,captureHyenaDiagnostics:false});
const schema=Object.keys(actorTickState({x:0,z:0,status:'idle'},0)),allowed=new Set(schema),valid=value=>{const keys=Object.keys(value);return keys.length===schema.length&&keys.every((key,index)=>key===schema[index]);};
const pack=t=>{if(!t||typeof t.complete!=='boolean'||!Array.isArray(t.actors))throw TypeError('Invalid ticks');return {version:'actor-delta-v1',complete:t.complete,actors:t.actors.map(e=>{if(typeof e?.actorId!=='string'||!Array.isArray(e.samples))throw TypeError('Invalid entry');let previous=null;const changes=[];for(const sample of e.samples){if(!sample||typeof sample!=='object'||Array.isArray(sample)||!valid(sample))throw TypeError('Invalid schema');if(previous){const delta={};for(const key of schema)if(!Object.is(sample[key],previous[key]))delta[key]=sample[key];changes.push(delta);}previous=sample;}return {actorId:e.actorId,first:e.samples[0]??null,changes};})};};
const unpack=t=>{if(!t||t.version!=='actor-delta-v1'||typeof t.complete!=='boolean'||!Array.isArray(t.actors))throw TypeError('Invalid ticks');return {complete:t.complete,actors:t.actors.map(e=>{if(typeof e?.actorId!=='string'||!Array.isArray(e.changes)||e.first!==null&&(!e.first||typeof e.first!=='object'||Array.isArray(e.first)||!valid(e.first))||e.first===null&&e.changes.length)throw TypeError('Invalid entry');const samples=[];let previous=e.first===null?null:{...e.first};if(previous)samples.push(previous);for(const delta of e.changes){if(!delta||typeof delta!=='object'||Array.isArray(delta))throw TypeError('Invalid delta');const next={...previous};for(const [key,value] of Object.entries(delta)){if(!allowed.has(key))throw TypeError('Invalid field');next[key]=value;}samples.push(next);previous=next;}return {actorId:e.actorId,samples};})};};
try{const t=authority.execute({kind:'advance',sequence:1,seconds:.05,steps:2,nightFastForward:true,captureClockSegments:true}).worldMotionTrace.actorTickStates,p=pack(t),plain=[],compact=[];if(JSON.stringify(unpack(p))!==JSON.stringify(t))throw Error('Round trip mismatch');for(let i=0;i<60;i++){let at=performance.now();structuredClone(t);plain.push(performance.now()-at);at=performance.now();unpack(structuredClone(pack(t)));compact.push(performance.now()-at);}const stats=a=>{a.sort((x,y)=>x-y);return {mean:a.reduce((x,y)=>x+y,0)/a.length,p95:a[Math.floor(a.length*.95)]};};console.log(JSON.stringify({originalBytes:Buffer.byteLength(JSON.stringify(t)),compactBytes:Buffer.byteLength(JSON.stringify(p)),baselineClone:stats(plain),packCloneUnpack:stats(compact)}));}finally{authority.dispose();}
'@ | .\.cache\tooling\node20.exe --input-type=module
```

Las cifras variarán entre ejecuciones y condiciones del sistema.
