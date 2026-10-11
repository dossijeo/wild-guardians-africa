// Isolated locomotion diagnosis, not a restarted campaign or economic proof.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {walkTo} from '../src/simulation/game.js';
import {advanceGateLeaves} from '../src/simulation/gates.js';
export function probeArchivedWorkerDeparture(snapshotPath,actorId,{steps=1200,dt=.1}={}){
 assert(Number.isSafeInteger(steps)&&steps>0&&steps<=3000&&Number.isFinite(dt)&&dt>0&&dt<=.1);
 const bytes=readFileSync(snapshotPath),s=deserialize(gunzipSync(bytes).toString());
 const worker=s.workers.find(w=>w.id===actorId);assert(worker,'Archived actor required');
 assert(['fleeing','returning','incapacitated'].includes(worker.status),'Departure status required');
 const village=s.villages.find(v=>v.id===worker.villageId);assert(village);
 const destination={...(village.entry??village),id:'home-'+village.id};
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const initial=structuredClone(worker),before=JSON.stringify([s.result,s.day,s.time,s.elapsed,s.ledger,s.plants,s.rng,s.tasks]);
 const trace=[],started=performance.now();let reached=false,maximumStep=0;
 // No tick, hire, harvest, cast or economy command. A shallow presentation
 // view permits gate animation despite the immutable archived terminal result.
 const gateView={...s,result:null,initialPreparation:false,pauses:[]};
 for(let i=0;i<steps&&!reached;i++){
  const previous={x:worker.x,z:worker.z};advanceGateLeaves(gateView,dt);
  reached=walkTo(s,worker,destination,dt,nav,{motion:{flight:worker.incapacitated||worker.status==='fleeing',slow:worker.incapacitated}});
  const displacement=Math.hypot(worker.x-previous.x,worker.z-previous.z);maximumStep=Math.max(maximumStep,displacement);
  assert(displacement<.5,'No teleport in movement-only replay');
  if(i<5||i%50===0||reached)trace.push({step:i,x:worker.x,z:worker.z,path:worker.path?.length??0,gateWaiting:worker.gateWaiting??false,displacement,reached});
 }
 assert.equal(JSON.stringify([s.result,s.day,s.time,s.elapsed,s.ledger,s.plants,s.rng,s.tasks]),before,'Archived domain state must remain unchanged');
 const paths=['src/simulation/game.js','src/simulation/gates.js','src/simulation/actor-motion.js','src/simulation/worker-return-route.js','src/simulation/worker-route-clearance.js','src/world/navigation.js','src/world/worker-wall-overlap-recovery.js'];
 return {snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')])),initial,destination,final:structuredClone(worker),steps,dt,reached,maximumStep,trace,milliseconds:performance.now()-started,domainStateUnchanged:true,
  scope:'Isolated native walkTo and gate-animation replay from an archived copy. No campaign, task execution, clock advance, animal attack or income is simulated. Failure to reach within this bounded probe is not a certified unreachable route. A successful departure does not certify whole-campaign recovery.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [snapshot,actor,out,...extra]=process.argv.slice(2);assert(snapshot&&actor&&out&&!extra.length,'Use SNAPSHOT.json.gz ACTOR_ID FRESH_REPORT.json');
 assert(!existsSync(out),'Refusing to overwrite an original probe');
 const report=probeArchivedWorkerDeparture(snapshot,actor);writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({reached:report.reached,maximumStep:report.maximumStep,milliseconds:report.milliseconds}));
}
