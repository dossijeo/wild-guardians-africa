import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as Game from '../../src/simulation/game.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
const rows=[];
for(const biome of ['sabana','manglares']){
 const {state,nav,session,start}=await createSpatialCampaignOpening({biome,runtimeFactory:()=>createThreadedSpatialWorld(factory)});
 let pending=0,jobs=0,published=0,stale=0,overlapTicks=0,raidOverlapTicks=0,steps=0;
 const p=session.core.preparation;
 try{
  const crop=start.farm[0];assert(Game.plant(state,'thread-first-crop','mijo',crop.x,crop.z,nav));
  Game.openInitialHiring(state);Game.hire(state,'thread-first-hire',{olderFemale:1});assert.equal(state.workers.length,1);
  const worker=state.workers[0],origin={x:worker.x,z:worker.z};let movement=0;
  for(;steps<1500&&state.day===1&&!state.result;steps++){
   if(!pending&&steps%30===0){pending=p.start(20+jobs,20);assert(pending>0);jobs++;}
   if(p.status()===2){overlapTicks++;if(state.raid)raidOverlapTicks++;}
   Game.tick(state,.5,nav);movement=Math.max(movement,Math.hypot(worker.x-origin.x,worker.z-origin.z));
   if(pending&&p.status()===3){const result=p.publish(pending,19+jobs,20);if(result===-2)stale++;else {assert(result>0);published++;}p.release();pending=0;}
   await new Promise(r=>setTimeout(r,0));
  }
  assert.equal(state.day,2);assert.equal(state.result,null);assert.equal(state.raid,null);
  assert(state.events.some(e=>e.type==='RaidSpawned'));assert(state.events.some(e=>e.type==='RaidEnded'));assert(overlapTicks>0);assert(raidOverlapTicks>0);assert(movement>1);assert(published>0);
  rows.push({biome,steps,jobs,published,stale,overlapTicks,raidOverlapTicks,workerMaxDisplacement:movement,day:state.day,raidEnded:true,scope:'Headless real first-day simulation with threaded initial stream and background native publication; raid-demand helper still uses synchronous loading, no renderer timing'});
 }finally{await session.dispose();}
}
await writeFile('docs/qa/wild-engine-pthreads/thread-first-day.json',JSON.stringify({rows},null,2)+'\n');console.log(JSON.stringify(rows));
