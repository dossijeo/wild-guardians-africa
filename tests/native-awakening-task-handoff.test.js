import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {createPlant} from '../src/simulation/crops.js';
import {rational} from '../src/simulation/money.js';

function place(f,center,commandId){
 for(const [dx,dz] of [[0,4],[4,0],[-4,0],[0,-4],[2,3],[-2,3]]){
  const result=f.command({kind:'plant',id:`${commandId}-${dx}-${dz}`,species:'mijo',x:center.x+dx,z:center.z+dz});
  if(result.value===true)return JSON.parse(result.snapshot).events.findLast(e=>e.type==='CropPlaced').targetId;
 }
 throw Error('No valid crop location in the test farm');
}

async function withAssignedCrop({mode,kind='water',cycle=false},run){
 const source=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 let f,release;
 try{
  const saved=structuredClone(source.state),worker=saved.workers[0],center=saved.structures.find(row=>row.id===worker.centerId);
  Object.assign(center,{x:worker.x-6,z:worker.z+6});
  saved.ledger.balance=rational(100000);
  awakeningState(saved).enabled=true;
  awakeningState(saved).progress=100;
  let targetId,ready;
  const hold=new Promise(resolve=>{release=resolve;});
  if(kind==='water'){
   const point=source.point(-4,6),plant=createPlant(`plant-${saved.nextId++}`,'mijo',point.x,point.z,worker.centerId);
   plant.water[0].status='manual';plant.growth=plant.water[1].at-.18;
   targetId=plant.id;saved.plants.push(plant);
  }
  f=await nativeProductionAuthority(saved,{onReady:async record=>{
   if(mode==='ready'&&record.kind==='task-start'||mode==='arrived'&&record.kind==='task-action'){
    if(ready)return;
    ready=record;await hold;
   }
  }});
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));
  if(cycle)await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-cycle'&&r.committed));
  if(kind==='initial')targetId=place(f,center,'original-plant');
  const advanceUntil=async predicate=>{
   for(let i=0;i<800;i++){
    assert.deepEqual(f.faults,[]);
    if(predicate())return;
    f.advance(.05);await f.present();
   }
   throw Error('The authority did not reach the expected crop boundary');
  };
  await advanceUntil(()=>mode==='ready'||mode==='arrived'?ready:f.records.some(r=>r.kind===(mode==='acting'?'task-action':'task-start')&&r.committed));
  if(mode==='walking'){f.advance(.12);await f.present();}
  const before=f.snapshot(),task=before.tasks.find(row=>row.id===before.workers[0].taskId);
  assert.equal(task?.targetId,targetId);
  const command={kind:'bless',id:'cancel-original-crop-task',targetId};
  await run({f,before,command,center,ready,release,advanceUntil});
 }finally{release?.();await f?.close();source.close();}
}

async function settle(f,operation){
 let done=false;
 operation.then(()=>{done=true;},()=>{done=true;});
 for(let i=0;i<400&&!done;i++)await f.present();
 assert(done,'The prepared command did not settle');
 return operation;
}

function unchangedUntilCommit(snapshot,before,command){
 assert.deepEqual(snapshot.tasks,before.tasks);
 for(const k of ['enabled','progress','total'])assert.equal(snapshot.awakenings[k],before.awakenings[k]);
 assert.equal(snapshot.plants.find(p=>p.id===command.targetId).blessing,undefined);
 assert(!snapshot.commandIds.includes(command.id));
}

for(const options of [
 {mode:'ready',cycle:false,label:'pending Task from Idle20'},
 {mode:'ready',cycle:true,label:'pending Task from Idle21'},
 {mode:'walking',label:'walking Water'},
 {mode:'arrived',label:'arrived Water with pending action'},
 {mode:'acting',kind:'initial',label:'acquired Plant action'}
])test(`prepared Awakening supersedes ${options.label} before assigning a second crop`,async()=>{
 await withAssignedCrop(options,async({f,before,command,center,ready,release,advanceUntil})=>{
  const prepared=f.authority.prepareNativeStructureCommand(command);
  prepared.catch(()=>{});
  await f.present();unchangedUntilCommit(f.snapshot(),before,command);
  release();await settle(f,prepared);
  if(options.mode==='acting'){f.advance(.2);await f.present();}
  const held=f.snapshot();unchangedUntilCommit(held,before,command);
  const result=await settle(f,f.structureCommand(command));
  assert.equal(result.value,true,result.rejection);
  const changed=JSON.parse(result.snapshot),worker=changed.workers[0];
  assert.equal(worker.nativeRouteAdmission,'native-idle');
  assert.deepEqual([worker.x,worker.z],[held.workers[0].x,held.workers[0].z]);
  assert.equal(changed.awakenings.progress,0);
  assert.equal(changed.events.filter(e=>e.type==='BlessingApplied'&&e.commandId===command.id).length,1);
  assert(!changed.tasks.some(t=>t.targetId===command.targetId));
  await f.authority.finishNativeStructureCommand(command);await f.present();
  if(ready)assert.equal(ready.aborted,true);
  const released=f.records.filter(r=>r.kind==='initial-idle-body'&&r.committed);
  if(options.mode==='ready')assert.equal(released.length,1,'retain the stationary owner without a new packet');
  else assert.equal(released.at(-1).resources.nativeInitialIdleBody.cancellationSource.phase,options.mode==='walking'?25:options.mode==='arrived'?14:15);
  assert.equal(f.command(command).value,false);
  const replacement=place(f,center,'replacement-plant');
  await advanceUntil(()=>f.snapshot().events.some(e=>e.type==='WaterSatisfied'&&e.targetId===replacement));
  const final=f.snapshot();
  assert.equal(final.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===replacement).length,1);
  assert(!final.events.some(e=>e.type==='WaterSatisfied'&&e.targetId===command.targetId));
  assert.equal(f.records.find(r=>r.kind==='task-start'&&r.resources.targetId===Number(replacement.split('-').at(-1))).resources.bodyId,1);
  assert.equal(f.host.inspect().failed,false);
 });
});

test('aborting Awakening after Task25 returns the same body to the original crop',async()=>{
 await withAssignedCrop({mode:'walking'},async({f,before,command,advanceUntil})=>{
  await settle(f,f.authority.prepareNativeStructureCommand(command));
  assert(f.records.some(r=>r.kind==='task-route-stop'&&r.committed));
  const proposed=f.records.findLast(r=>r.kind==='initial-idle-body');
  f.advance(.2);await f.present();unchangedUntilCommit(f.snapshot(),before,command);
  await f.authority.finishNativeStructureCommand(command);
  unchangedUntilCommit(f.snapshot(),before,command);
  await advanceUntil(()=>f.snapshot().events.some(e=>e.type==='WaterSatisfied'&&e.targetId===command.targetId));
  assert(proposed.aborted);
  assert(f.records.some(r=>r.kind==='initial-idle-body'&&r.committed&&r.resources.nativeInitialIdleBody.cancellationSource?.phase===25));
  assert(!f.snapshot().events.some(e=>e.type==='BlessingApplied'&&e.commandId===command.id));
  assert.equal(f.host.inspect().failed,false);
 });
});

test('a pending Task cancellation can restore a terminal Idle21 and acquire its normal successor',async()=>{
 await withAssignedCrop({mode:'ready',cycle:true},async({f,before,command,release,advanceUntil})=>{
  const old=f.records.find(r=>r.kind==='idle-cycle'&&r.committed),proposal=old.resources.nativeIdleCycle;
  const end=proposal.worldBoundary.effectiveTime+proposal.duration;
  await advanceUntil(()=>f.snapshot().elapsed>end+.05);
  unchangedUntilCommit(f.snapshot(),before,command);
  const prepared=f.authority.prepareNativeStructureCommand(command);
  prepared.catch(()=>{});release();await settle(f,prepared);
  const result=await settle(f,f.structureCommand(command));
  assert.equal(result.value,true,result.rejection);
  await f.authority.finishNativeStructureCommand(command);
  await advanceUntil(()=>f.records.some(r=>r!==old&&['idle-cycle','idle-stroll'].includes(r.kind)&&r.committed));
  assert.equal(f.records.filter(r=>r.kind==='initial-idle-body'&&r.committed).length,1);
  assert.equal(f.host.inspect().failed,false);
 });
});
