import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {confirmedAnimalAttackSamples} from '../src/rendering/confirmed-animation-samples.js';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';

test('real WASM raid attack observations preserve outcomes and reject transitions',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const observed=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),baseline=createSimulationAuthority(module,snapshot,keys);
 try{let previous=JSON.parse(observed.execute({kind:'snapshot',sequence:1}).snapshot);baseline.execute({kind:'snapshot',sequence:1});let accepted=0,rejected=0,certified=0;
  for(let sequence=2;sequence<=450&&(!accepted||!rejected||!certified);sequence++){
   const command={kind:'advance',sequence,seconds:.05,steps:1,nightFastForward:false,captureClockSegments:true},a=observed.execute(command),b=baseline.execute(command),next=JSON.parse(a.snapshot);assert.equal(a.snapshot,b.snapshot);assert.deepEqual(a.events,b.events);
   const preview={start:previous.elapsed,end:next.elapsed,clockSegments:a.clockSegments,trace:a.worldMotionTrace};for(const entity of previous.raid?.animals?.filter(item=>item.status==='attacking')??[]){const ticks=a.worldMotionTrace.actorTickStates.actors.find(item=>item.actorId===entity.id)?.samples??[],samples=confirmedAnimalAttackSamples(preview,entity.id,entity);assert.equal(ticks[0]?.attackTargetId,entity.targetId??null);assert.equal(ticks[0]?.attackHitApplied,!!entity.hitApplied);if(ticks.length>1&&ticks.every(item=>item.status==='attacking'&&item.attackId===entity.attackId)){assert.ok(samples);accepted++;if(confirmedHistoricalParticipant(preview,entity.id,entity,'animal')==='stationary')certified++;}else if(ticks.some(item=>item.status!=='attacking'||item.attackId!==entity.attackId)){assert.equal(samples,null);assert.equal(confirmedHistoricalParticipant(preview,entity.id,entity,'animal'),null);rejected++;}}
   previous=next;
  }
  assert.ok(accepted>0,'observed an uninterrupted real strike');assert.ok(rejected>0,'observed a strike transition');assert.ok(certified>0,'real uninterrupted strike passes the stationary certificate');
 }finally{observed.dispose();baseline.dispose();}
});
