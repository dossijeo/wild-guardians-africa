// Real worker day over the retained paid fixture; no production changes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
const [input,output]=process.argv.slice(2),snapshotPath=output?.replace(/\.json$/,'-state.json.gz');
assert(input&&output?.endsWith('.json')&&!existsSync(output)&&!existsSync(snapshotPath));
const hash=b=>createHash('sha256').update(b).digest('hex'),inputBytes=readFileSync(input);
let s=deserialize(gunzipSync(inputBytes).toString()),nav;
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',profile=JSON.parse(readFileSync(profilePath)).profile;
const attach=()=>{nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);};attach();
assert.equal(s.time,0);assert.equal(s.day,1);assert.equal(s.pauses.length,0);assert.equal(s.workers.length,1);
const opening=numberOf(s.ledger.balance),initialEntries=new Set(Object.keys(s.ledger.entries)),seen=new Set(s.events.map(e=>e.id)),events=[],trace=[],began=performance.now();
let distance=0,maximumGateOpen=0,reloaded=false,steps=0,stopReason='daylight-complete';
while(s.time<300-1e-9&&!s.result&&!s.pauses.length){
 if(s.raid||Game.nightEntryPending(s)){stopReason='unexpected-incursion-entry';break;}
 const before=s.workers.map(w=>({id:w.id,x:w.x,z:w.z}));Game.tick(s,Math.min(.5,300-s.time),nav);steps++;
 for(const w of s.workers){const prior=before.find(p=>p.id===w.id);if(prior)distance+=Math.hypot(w.x-prior.x,w.z-prior.z);}
 for(const gate of s.structures.filter(p=>p.gate))maximumGateOpen=Math.max(maximumGateOpen,gate.gateOpen??0);
 for(const event of s.events)if(!seen.has(event.id)){seen.add(event.id);events.push({...event,time:s.time});}
 if(steps%2===0)trace.push({time:s.time,workers:s.workers.map(w=>({id:w.id,x:w.x,z:w.z,status:w.status,taskId:w.taskId,crateId:w.crateId})),gates:s.structures.filter(p=>p.gate).map(p=>({id:p.id,open:p.gateOpen??0}))});
 if(!reloaded&&s.time>=150){const saved=serialize(s);s=deserialize(saved);assert.equal(serialize(s),saved);attach();reloaded=true;}
 if(steps%20===0)await new Promise(resolve=>setImmediate(resolve));
}
if(s.result)stopReason='native-result';else if(s.pauses.length)stopReason='native-pause';
const entries=Object.entries(s.ledger.entries).filter(([id])=>!initialEntries.has(id)).map(([id,value])=>({id,coins:numberOf(value)}));
const income=entries.filter(e=>e.id.startsWith('deliver:')).reduce((n,e)=>n+e.coins,0),otherNet=entries.filter(e=>!e.id.startsWith('deliver:')).reduce((n,e)=>n+e.coins,0),closing=numberOf(s.ledger.balance);
assert.equal(closing,opening+income+otherNet);assert.equal(hash(readFileSync(input)),hash(inputBytes));
const paths=['tools/probe-native-paid-canyon-worker-day.mjs','src/simulation/game.js','src/simulation/crops.js','src/simulation/tasks.js','src/simulation/gates.js','src/simulation/locomotion.js','src/world/navigation.js','src/world/work-points.js','src/persistence/snapshots.js',profilePath];
const result={status:'observed-native-worker-day',input,inputSha256:hash(inputBytes),snapshotPath,stopReason,day:s.day,time:s.time,result:s.result,pauses:s.pauses,
 opening,closing,income,otherNet,entries,reconciliationDifference:closing-opening-income-otherNet,reloaded,steps,distanceMetres:distance,maximumGateOpen,
 wateredPlants:[...new Set(events.filter(e=>e.type==='WaterSatisfied').map(e=>e.targetId))],waterEvents:events.filter(e=>e.type==='WaterSatisfied').length,
 deliveredCrates:s.crates.filter(c=>c.delivered).length,living:s.plants.filter(p=>p.alive).length,events,trace,cpuObservationMilliseconds:performance.now()-began,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),
 scope:'Actual saved paid eight-crop Canyon fixture, native daytime ticks and worker tasks, one passive reload at simulated second 150, no purchases, magic, synthetic crop growth, forced paths or economic grants. No night attack, campaign balance, human activity, rendering or controlled performance acceptance.'};
writeFileSync(snapshotPath,gzipSync(Buffer.from(serialize(s))));writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,stopReason,time:s.time,opening,closing,income,wateredPlants:result.wateredPlants.length,waterEvents:result.waterEvents,deliveredCrates:result.deliveredCrates,distanceMetres:distance,maximumGateOpen,reloaded}));
