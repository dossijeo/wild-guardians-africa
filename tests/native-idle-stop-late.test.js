import test from 'node:test';import assert from 'node:assert/strict';
import {createPlant} from '../src/simulation/crops.js';
import {idleFarmAnchor} from '../src/simulation/game.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

test('automatic Water survives arrival while its ordinary Stop12 preparation is pending',async()=>{
 const source=nativeIdleCycleGameFixture({mode:'watch',remaining:.03,rng:0,peer:false});const saved={state:structuredClone(source.state)},point=source.point(-6,3);source.close();const worker=saved.state.workers[0];
 const plant=createPlant(`plant-${saved.state.nextId++}`,'mijo',point.x,point.z,worker.centerId);plant.water[0].status='manual';plant.growth=plant.water[1].at-.4;saved.state.plants.push(plant);
 let release;const hold=new Promise(r=>release=r);let f;
 try{
  f=await nativeProductionAuthority(saved.state,{onPrepare:r=>r.kind==='idle-stroll-stop'?hold:undefined});
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-cycle'&&r.committed));f.advance(.05);
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));
  f.advance(.4);await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll-stop'));
  const stop=f.records.find(r=>r.kind==='idle-stroll-stop'),stroll=f.records.find(r=>r.kind==='idle-stroll');
  while(f.snapshot().elapsed<stroll.resources.endTime+.1){f.advance(.1);await f.present();}release();
  for(let i=0;i<100;i++){f.snapshot();await f.present();if(f.records.filter(r=>r.kind==='idle-cycle').length===2)break;}
  const arrival=f.snapshot(),actor=arrival.workers[0],nearest=idleFarmAnchor(arrival,actor,arrival.structures.find(s=>s.id===actor.centerId));
  assert.equal(nearest.id,`farm-${plant.id}`,'the new crop is now nearer than the acquired WALK anchor');
  assert.equal(actor.idleState.anchorId,'farm-plant-900098','source completion retains its acquired semantic anchor');
  assert.equal(f.records.filter(r=>r.kind==='idle-cycle').length,2,JSON.stringify({message:'actual REST21 must be requested after obsolete12 cancels',production:f.authority.nativeIntentProductionStatus(),resources:f.authority.nativeResourcePreparationStatus()}));
  await untilProduction(f,()=>f.records.filter(r=>r.kind==='idle-cycle'&&r.committed).length===2);
  const rest=f.snapshot().workers[0];assert.equal(rest.x,actor.x);assert.equal(rest.z,actor.z);assert.equal(rest.idleState.mode,'rest');assert.equal(rest.taskId,null);
  f.advance(.05);await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  for(let i=0;i<1000&&!f.snapshot().events.some(e=>e.type==='WaterSatisfied'&&e.targetId===plant.id);i++){f.advance(.1);await f.present();}
  assert.equal(f.snapshot().events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===plant.id).length,1);assert.equal(stop.committed,false);
  const task=f.records.find(r=>r.kind==='task-start');assert.equal(task.resources.bodyId,stroll.resources.nativeIdleStroll.bodyId);assert.equal(task.resources.targetId,Number(plant.id.split('-').at(-1)));
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f?.close();}
});
