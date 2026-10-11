// Native replay of one exhausted animal from a terminal campaign snapshot.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
const [directory,output,animalId]=process.argv.slice(2);assert(directory&&output&&animalId&&!existsSync(output));
assert.equal(JSON.parse(readFileSync(directory+'/receipt.json')).status,'incomplete-harness-error');
const bytes=readFileSync(directory+'/partial-state.json.gz');let s=deserialize(gunzipSync(bytes).toString());
const navigation=state=>{const nav=new Navigation(state.seed,state.biome,JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[state.biome]+'.json')).profile);nav.setState(state);return nav;};
let nav=navigation(s),actor=s.raid.animals.find(a=>a.id===animalId),steps=0,movedSteps=0,reloaded=false;
assert(actor&&actor.status==='retreating'&&actor.hitsRemaining===0);
const ledger=structuredClone(s.ledger),exit={...actor.exit},radius=actor.radius,start=performance.now(),initialElapsed=s.elapsed;
let maximumTickMilliseconds=0,totalTickMilliseconds=0;
for(;s.raid&&steps<4000;steps++){
 actor=s.raid.animals.find(a=>a.id===animalId);const previous={x:actor.x,z:actor.z},before=performance.now();
 Game.tick(s,.1,nav);const milliseconds=performance.now()-before;maximumTickMilliseconds=Math.max(maximumTickMilliseconds,milliseconds);totalTickMilliseconds+=milliseconds;
 const travelled=Math.hypot(actor.x-previous.x,actor.z-previous.z);assert(travelled<=.380000001);assert.equal(actor.radius,radius);assert.equal(actor.hitsRemaining,0);
 if(travelled>1e-9){assert(nav.segmentClear(previous,actor,radius,null,false));movedSteps++;}
 if(movedSteps&&!reloaded&&actor.status!=='gone'){s=deserialize(serialize(s));nav=navigation(s);reloaded=true;}
}
assert.equal(s.raid,null);assert.equal(actor.status,'gone');assert(Math.hypot(actor.x-exit.x,actor.z-exit.z)<1e-8);assert.deepEqual(s.ledger,ledger);assert(reloaded);
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['tools/probe-stopped-native-retreat.mjs','src/simulation/animal-grid-exit-bridge.js','src/simulation/animal-exit-connectors.js','src/simulation/game.js','src/world/navigation.js'];
const result={scope:'Native continuation of a copied terminal failed state, with swept geometry and speed assertions and an actual movement reload. Tick timings include the whole native simulation, not GPU or gameplay frame-time measurements. Not a 100-night campaign or final balance result.',animalId,steps,movedSteps,reloaded,day:s.day,completedNights:s.completedNights,nativeResult:s.result,raidEnded:s.raid===null,ledgerUnchanged:true,simulatedSeconds:s.elapsed-initialElapsed,wallMilliseconds:performance.now()-start,maximumTickMilliseconds,totalTickMilliseconds,snapshotSha256:hash(bytes),sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))]))};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
