import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {nodeSharedRaidWorker} from '../tools/qa-shared-raid-worker-node.mjs';
import {Navigation} from '../src/world/navigation.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {createRaidExteriorFramePrewarming} from '../src/world/raid-exterior-frame-prewarming.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const group=['warthog','warthog','warthog','warthog','hyena','hyena','hyena','buffalo','buffalo','lion','lion','rhino'];
const sha=value=>createHash('sha256').update(value).digest('hex');
function navFor(s,profile,bounds,view){const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);return nav;}
test('one actual shared Node worker preserves full spawn/RNG, every physical route tick, reload and all12native exits against original entry preparation',async()=>{
 let {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana'});assert.ok(Game.plant(s,'crop','mijo',88,9,nav));assert.ok(Game.buildWallChain(s,'walls','zarzas',[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]],nav,{smooth:false,snap:false}));nav.setActiveBounds([-24,-120,216,120]);nav.setRaidView({x:88,z:9},{x:88,z:6.5});s.nightPlan={at:400,group,done:false};
 let reference=deserialize(serialize(s)),other=navFor(reference,nav.profile,nav.activeBounds,nav.raidView);const original=serialize(s),node=await nodeSharedRaidWorker(),entry=new RaidEntryPreparer(nav,{transport:node.transport}),controller=createRaidExteriorFramePrewarming(nav,{enabled:true,transport:node.transport});const fake={postMessage(request){this.request=request;},terminate(){}},baseline=new RaidEntryPreparer(other,{createWorker:()=>fake});
 try{
  controller.frame(s);entry.update(s);baseline.update(reference);baseline.receive(computeRaidEntry(fake.request));const started=performance.now();while(!entry.ready){assert.ok(node.transport.worker,node.transport.lastError);if(performance.now()-started>7000)throw Error('Actual shared physical preparation timeout');await new Promise(r=>setTimeout(r,5));}
  assert.equal(serialize(s),original);const chunkProof=[];for(const [key,value] of entry.ready.warmth.chunks){assert.deepEqual(nav.chunks.get(key),value);const fresh=navFor(deserialize(original),nav.profile,nav.activeBounds,nav.raidView),[cx,cz]=key.split(',').map(Number);assert.deepEqual(fresh.chunk(cx,cz),value);chunkProof.push(key);}
  spawnRaid(s,{group},nav);spawnRaid(reference,{group},other);assert.equal(serialize(s),serialize(reference));const initialSnapshot=serialize(s),initialSHA256=sha(initialSnapshot),routeSamples=[],observed=new Map(),exits=s.raid.animals.map(a=>({id:a.id,exit:{...a.exit}})),ledger=structuredClone(s.ledger);controller.dispose();entry.dispose();baseline.dispose();let ticks=0,reloaded=false;
  for(;ticks<1200&&(s.raid||reference.raid);ticks++){
   for(const a of s.raid?.animals??[])observed.set(a.id,a);Game.tick(s,.25,nav);Game.tick(reference,.25,other);assert.equal(serialize(s),serialize(reference),`physical snapshot tick${ticks}`);routeSamples.push({tick:ticks,snapshotSHA256:sha(serialize(s)),animals:(s.raid?.animals??[]).map(a=>({id:a.id,x:a.x,z:a.z,status:a.status}))});
   if(ticks===3&&s.raid){const a=serialize(s),b=serialize(reference),profile=nav.profile,bounds=nav.activeBounds,view=nav.raidView;s=deserialize(a);reference=deserialize(b);nav=navFor(s,profile,bounds,view);other=navFor(reference,profile,bounds,view);assert.equal(serialize(s),a);reloaded=true;}
  }
  assert.equal(s.raid,null);assert.equal(reference.raid,null);assert.ok(reloaded);assert.equal(observed.size,12);for(const {id,exit} of exits){const a=observed.get(id);assert.equal(a.status,'gone');assert.ok(Math.hypot(a.x-exit.x,a.z-exit.z)<1e-7);}assert.deepEqual(s.ledger,ledger);
  if(process.env.RAID_SHARED_PHYSICAL_EVIDENCE){const out=resolve(process.env.RAID_SHARED_PHYSICAL_EVIDENCE);mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'initial-state.json.gz'),gzipSync(initialSnapshot));writeFileSync(resolve(out,'final-state.json.gz'),gzipSync(serialize(s)));writeFileSync(resolve(out,'route-samples.json.gz'),gzipSync(JSON.stringify(routeSamples)));}
  console.log(JSON.stringify({scope:'one actual Node shared-worker/native paid-enclosure physical parity; not campaign or browser renderer',initialSHA256,finalSHA256:sha(serialize(s)),ticks,actors:12,reloaded,actualWarmChunks:chunkProof,transport:node.transport.stats,records:node.transport.records}));
 }finally{controller.dispose();entry.dispose();baseline.dispose();node.transport.dispose();}
});
