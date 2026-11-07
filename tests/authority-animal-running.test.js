import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {confirmedAnimalRunningSamples} from '../src/rendering/confirmed-animation-samples.js';

// The fixtures are real raids. No mocked authority or collision system is used;
// graphical admission and pixel output are tested separately.
test('real WASM raid running samples stop at transition without changing authoritative outcomes',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];
 for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const observed=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),baseline=createSimulationAuthority(module,snapshot,keys);
 try{let initial=observed.execute({kind:'snapshot',sequence:1});assert.equal(initial.snapshot,baseline.execute({kind:'snapshot',sequence:1}).snapshot);let previous=JSON.parse(initial.snapshot),accepted=0,transitions=0;
  for(let sequence=2;sequence<=5;sequence++){
   const command={kind:'advance',sequence,seconds:.25,steps:2,nightFastForward:false,captureClockSegments:true},a=observed.execute(command),b=baseline.execute(command),next=JSON.parse(a.snapshot);
   assert.equal(a.snapshot,b.snapshot);assert.deepEqual(a.events,b.events);assert.ok(a.worldMotionTrace.separationEvidence);
   const preview={start:previous.elapsed,end:next.elapsed,trace:a.worldMotionTrace};
   for(const entity of previous.raid.animals.filter(item=>item.status==='entering')){
    const ticks=a.worldMotionTrace.actorTickStates.actors.find(item=>item.actorId===entity.id)?.samples??[],samples=confirmedAnimalRunningSamples(preview,entity.id,entity);
    if(ticks.length>1&&ticks.every(item=>item.status==='entering')&&ticks.at(-1).motionPhase>ticks[0].motionPhase){assert.ok(samples);accepted++;}
    if(ticks.some(item=>item.status!=='entering')){assert.equal(samples,null);transitions++;}
   }
   previous=next;
  }
  assert.ok(accepted>0,'real entering motion accepted');assert.ok(transitions>0,'real transition rejects GPU running history');
 }finally{observed.dispose();baseline.dispose();}
});
