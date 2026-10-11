import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {walkTo} from '../src/simulation/game.js';
import {workerWallOverlapRecoveryPath} from '../src/world/worker-wall-overlap-recovery.js';
const [directory,output]=process.argv.slice(2);
assert(directory&&output,'Stopped snapshot directory and fresh output required');
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'))).status,'stopped-early-calibration');
const bytes=readFileSync(join(directory,'partial-state.json.gz'));
let state=deserialize(gunzipSync(bytes).toString());
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
let nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
let actor=state.workers.find(w=>w.id==='worker-6087');assert(actor);
const village=state.villages.find(v=>v.id===actor.villageId),destination={...(village.entry??village),id:`home-${village.id}`};
const initial={x:actor.x,z:actor.z},economicBefore=JSON.stringify([state.money,state.ledger,state.plants,state.rng]);
assert.equal(nav.workerPath(actor,destination,.28,null),null);
const planned=workerWallOverlapRecoveryPath(nav,actor,destination);assert(planned,'Native wall recovery must connect to home');
const trace=[],start=performance.now();let reached=false,reloaded=false;
for(let tick=0;tick<1200&&!reached;tick++){
 const previous={x:actor.x,z:actor.z};
 reached=walkTo(state,actor,destination,.05,nav,{motion:{flight:true}});
 const distance=Math.hypot(actor.x-previous.x,actor.z-previous.z);
 assert(distance<.5,'No teleport or excessive per-step displacement');
 if(tick<20||tick%20===0||reached)trace.push({tick,x:actor.x,z:actor.z,distance,walkable:nav.walkable(actor.x,actor.z,.28,null,true),reached});
 if(tick===2){state=deserialize(serialize(state));actor=state.workers.find(w=>w.id==='worker-6087');nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);reloaded=true;}
}
assert(reached,'Worker must physically reach home within 60 simulated seconds');
assert.equal(JSON.stringify([state.money,state.ledger,state.plants,state.rng]),economicBefore,'Movement-only probe must not change economy, plants or RNG');
const sourceHashes=Object.fromEntries(['src/simulation/game.js','src/world/worker-wall-overlap-recovery.js','src/simulation/actor-motion.js','src/simulation/worker-route-clearance.js'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const report={scope:'Isolated native walkTo from stopped snapshot; no campaign restart, no farming or player commands',snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes,initial,destination,planned,trace,reached,reloaded,economyPlantsRngUnchanged:true,milliseconds:performance.now()-start};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({reached,reloaded,last:trace.at(-1),milliseconds:report.milliseconds}));
