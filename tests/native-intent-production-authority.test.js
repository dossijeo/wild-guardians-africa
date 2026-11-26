import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {createPlant} from '../src/simulation/crops.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {rational} from '../src/simulation/money.js';
import {cropSpec} from '../src/simulation/rules.js';
import {centerDeliveryPoint,centerServicePoint} from '../src/world/centers.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeActionSave} from './helpers/native-task-action-restoration.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {copyNativeInitialIdleBodyReference,nativeInitialIdleBodySuccessor} from '../src/world/native-initial-idle-body.js';
import {copyNativeIdleStrollReference} from '../src/world/native-idle-stroll.js';

function farmDeliveryAtOccupiedCenter({gate:withGate,endOfShift=false}){
 const fixture=nativeFarmArrivalRouteFixture({peer:false});
 const saved=structuredClone(fixture.state);fixture.close();
 const [worker]=saved.workers,center=saved.structures.find(row=>row.id===worker.centerId);
 if(endOfShift){worker.profile='youngFemale';saved.people.find(row=>row.id===worker.personId).profile=worker.profile;saved.time=226;}
 Object.assign(worker,{x:-14,z:11.8});
 const person={id:'person-991001',profile:endOfShift?'youngMale':'youngFemale',recoveryUntil:0};
 const peer={...structuredClone(worker),id:'worker-900012',personId:person.id,profile:person.profile,z:13.4};
 saved.people.push(person);saved.workers.push(peer);
 const service=centerServicePoint(center,saved,.8);
 center.x+=-14-service.x;center.z+=3.2-service.z;
 saved.villages.find(row=>row.id===worker.villageId).entry={x:-14,z:14.5};
 const gate={id:'structure-1000000',created:29207,kind:'wall',material:'zarzas',gate:true,x:-14,z:8.2,yaw:0,
  maxHp:60,hp:60,status:'intact',villageId:worker.villageId,cost:10,collapseRemaining:0};
 if(withGate)saved.structures.push(gate);
 saved.nextId=Math.max(saved.nextId,1000001);
 const crop=createPlant('plant-'+saved.nextId++,'mijo',-10.6,5.3,center.id);
 crop.growth=cropSpec(crop.species).growth_seconds-9;
 for(const water of crop.water)water.status='manual';
 saved.plants.push(crop);
 const chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
 return {saved,worker,peer,crop,gate,chunkKeys,destination:centerDeliveryPoint(center,crop,saved),ledger:structuredClone(saved.ledger)};
}

test('Harvest retains the crop while its center is occupied and settles once after the Farm peer leaves for Home',async()=>{
 const {saved,worker,peer,crop,chunkKeys,destination,ledger}=farmDeliveryAtOccupiedCenter({gate:true,endOfShift:true});
 const acquired=[];
 let release,held;
 const wait=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved,{chunkKeys,onReady(record){
  if(record.resources.nativeIdleStroll?.version===3){held=record;return wait;}
 },onCommit(record,data){acquired.push({kind:record.kind,data});}});
 try{
  let view,occupied=false;
  for(let i=0;i<400;i++){
   view=f.advance();await f.present();
   assert.deepEqual(f.faults,[]);
   const current=view.workers.find(row=>row.id===worker.id),blocking=view.workers.find(row=>row.id===peer.id);
   if(current.nativeRouteAdmission==='native-action'&&current.actionRemaining===0&&
      blocking.nativeRouteAdmission==='native-farm-arrival'&&!blocking.running&&
      Math.hypot(blocking.x-destination.x,blocking.z-destination.z)<current.radius+blocking.radius){
    occupied=true;
    assert(!acquired.some(row=>row.kind==='task-consequence'));
    assert(view.plants.find(row=>row.id===crop.id).alive);
    assert(!view.crates.some(row=>row.sourcePlantId===crop.id));
    assert.deepEqual(view.ledger,ledger);
   }
   if(view.events.some(row=>row.type==='CrateDelivered'&&row.workerId===worker.id))break;
   if(view.time>=250)release();
  }
  assert(occupied);
  const home=acquired.find(row=>row.kind==='home-route'),carry=acquired.find(row=>row.kind==='task-consequence'),
    settled=acquired.find(row=>row.kind==='task-settlement');
  assert(home&&carry&&settled);
  assert(held?.aborted&&!held.committed);
  assert(acquired.indexOf(home)<acquired.indexOf(carry));
  assert.equal(home.data.nativeHomeRouteBinding.reference.bodyId,2);
  assert.equal(carry.data.nativeTaskConsequenceBinding.reference.bodyId,1);
  assert.equal(settled.data.nativeTaskSettlementBinding.reference.bodyId,1);
  const [crate]=view.crates.filter(row=>row.sourcePlantId===crop.id);
  assert.equal(crate.delivered,true);
  assert.equal(view.events.filter(row=>row.type==='CrateDelivered'&&row.targetId===crate.id).length,1);
  assert.deepEqual(Object.keys(view.ledger.entries).filter(id=>!Object.hasOwn(ledger.entries,id)),['deliver:'+crate.id]);
 }finally{release();await f.close();}
});

for(const gate of [true,false])test(`same-shift Harvest delivers once after its Farm peer yields within a crop anchor (${gate?'gate':'open'})`,async()=>{
 const {saved,worker,peer,crop,chunkKeys,destination,ledger}=farmDeliveryAtOccupiedCenter({gate});
 let release,held;
 const wait=new Promise(resolve=>{release=resolve;});
 const acquired=[];
 const f=await nativeProductionAuthority(saved,{chunkKeys,onReady(record){
  if(record.resources.nativeIdleStroll?.version===3&&!held){held=record;return wait;}
 },onCommit(record,data){acquired.push({kind:record.kind,data});}});
 try{
  for(let i=0;i<290&&!held;i++){f.advance();await f.present();assert.deepEqual(f.faults,[]);}
  assert(held,'a lateral step must use the prepared Walk22');
  const ref=held.resources.nativeIdleStroll,prior=f.snapshot(),holder=prior.workers.find(row=>row.id===peer.id);
  assert.equal(ref.bodyId,2);
  assert.equal(ref.actorId,Number(peer.id.split('-').at(-1)));
  assert.equal(ref.sourceFarm.bodyId,ref.bodyId);
  assert.equal(holder.nativeRouteAdmission,'native-farm-arrival');
  assert.equal(prior.workers.find(row=>row.id===worker.id).actionRemaining,0);
  assert.equal(prior.plants.find(row=>row.id===crop.id).alive,true);
  assert(!prior.crates.some(row=>row.sourcePlantId===crop.id));
  assert.deepEqual(prior.ledger,ledger);
  assert.deepEqual([holder.x,holder.z],[ref.pose.x,ref.pose.z]);
  assert(Math.hypot(holder.x-destination.x,holder.z-destination.z)<2*ref.pose.radius);
  assert.deepEqual(ref.anchor,{...ref.anchor,id:Number(crop.id.split('-').at(-1)),x:crop.x,z:crop.z});
  assert(Math.hypot(ref.destination.x-ref.anchor.x,ref.destination.z-ref.anchor.z)<=ref.anchor.radius);
  assert(Math.hypot(ref.destination.x-destination.x,ref.destination.z-destination.z)>2*ref.pose.radius);
  assert.throws(()=>copyNativeIdleStrollReference({...ref,version:1}),/actual Farm source/);
  assert.throws(()=>copyNativeIdleStrollReference({...ref,destination:{x:ref.anchor.x,z:ref.anchor.z}}),/lateral Farm destination/);
  assert.throws(()=>copyNativeIdleStrollReference({...ref,sourceFarm:undefined}));
  assert(!held.committed);
  release();await untilProduction(f,()=>held.committed);
  let view;
  for(let i=0;i<570;i++){
   view=f.advance();await f.present();assert.deepEqual(f.faults,[]);
   if(view.events.some(row=>row.type==='CrateDelivered')&&view.workers.every(row=>row.nativeRouteAdmission==='native-idle'))break;
  }
  const carry=acquired.find(row=>row.kind==='task-consequence'),settlement=acquired.find(row=>row.kind==='task-settlement');
  assert(carry&&settlement);
  assert.equal(carry.data.nativeTaskConsequenceBinding.reference.bodyId,1);
  assert.deepEqual(carry.data.nativeTaskConsequenceBinding.reference.destination,{x:destination.x,z:destination.z});
  assert.equal(settlement.data.nativeTaskSettlementBinding.reference.bodyId,1);
  assert(!acquired.some(row=>row.kind==='home-route'));
  assert(view.workers.every(row=>row.nativeRouteAdmission==='native-idle'&&row.contractDay===holder.contractDay));
  const [crate]=view.crates.filter(row=>row.sourcePlantId===crop.id);
  assert.equal(crate.delivered,true);
  assert.equal(view.events.filter(row=>row.type==='CrateDelivered'&&row.targetId===crate.id).length,1);
  assert.deepEqual(Object.keys(view.ledger.entries).filter(id=>!Object.hasOwn(ledger.entries,id)),['deliver:'+crate.id]);
  assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

for(const profile of PROFILES)test(`${profile.id} ordinary authority binds a restored22 once and admits it automatically through both existing ports`,async()=>{
 const saved=nativeIdleStrollGameSave({profile:profile.id}),old=structuredClone(saved.state.workers[0]);const f=await nativeProductionAuthority(saved.state,{attach:false});try{
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');const before=f.snapshot();assert.equal(before.workers[0].nativeRouteAdmission,'pending-stroll-resources');assert.equal(f.records.length,0);
  await f.attach();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));await f.present();
  const state=f.snapshot(),record=f.records[0];assert.equal(record.kind,'idle-stroll');assert.equal(record.resources.bodyId,1);assert(record.minSequence>=1);assert.equal(state.workers[0].nativeRouteAdmission,'native-idle-stroll');
  for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(state.workers[0][key],old[key]);assert(Math.abs(state.workers[0].heading-old.heading)<1e-12);assert.deepEqual(state.workers[0].idleState,old.idleState);
  const moved=f.advance();assert.notDeepEqual([moved.workers[0].x,moved.workers[0].z],[old.x,old.z]);assert.equal(moved.rng,state.rng);assert.equal(f.records.filter(r=>r.kind==='idle-stroll').length,1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('authority produces restored20, watch21, WALK22 and arrival REST21 without direct commits',async()=>{
 const source=nativeIdleCycleGameFixture({mode:'watch',remaining:.03,rng:1,peer:false});let f;try{
  f=await nativeProductionAuthority(source.state);await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));await f.present();assert.equal(f.records.length,1,'next family waits for a real Game publication');f.snapshot();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-cycle'&&r.committed));
  assert.deepEqual(f.records.map(r=>r.kind),['initial-idle-body','idle-cycle']);assert.equal(f.snapshot().workers[0].idleState.mode,'watch');
  assert(f.records[1].minSequence>f.records[0].minSequence);
  f.advance();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));assert.equal(f.snapshot().workers[0].idleState.mode,'walk');
  for(let i=0;i<150&&f.records.filter(r=>r.kind==='idle-cycle').length<2;i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.filter(r=>r.kind==='idle-cycle'&&r.committed).length===2);const state=f.snapshot();assert.equal(state.workers[0].idleState.mode,'rest');assert.equal(state.workers[0].nativeRouteAdmission,'native-idle');assert.equal(state.rng,source.state.rng);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();source.close();}
});

test('a genuine harvest command replaces a pending restored WALK and production uses the new Task request',async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0],target=createPlant(`plant-${saved.state.nextId++}`,'mijo',worker.x+1,worker.z,worker.centerId);target.growth=999999;saved.state.plants.push(target);let release;const waiting=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved.state,{async onPrepare(record){if(record.kind==='idle-stroll')await waiting;}});try{
  await untilProduction(f,()=>f.records.length===1);assert.equal(f.command({kind:'harvest',id:'production-harvest',targetId:target.id}).value,true);const pending=f.advance();assert.equal(pending.workers[0].nativeRouteAdmission,'pending-resources');assert.equal(pending.tasks.find(t=>t.id===pending.workers[0].taskId).targetId,target.id);
  release();await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  const state=f.advance();assert.equal(state.workers[0].nativeRouteAdmission,'native-task');assert.equal(f.records.filter(r=>r.kind==='idle-stroll'&&r.committed).length,0);assert.equal(f.host.inspect().failed,false);assert.equal(f.host.inspect().preparationRecoveryRequired,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('authority automatically acquires fresh Home and its prepared absence at the real endpoint',async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0];Object.assign(worker,{status:'returning',nativeRouteAdmission:'pending-home-resources',idleState:null,destinationId:null});saved.state.villages.find(v=>v.id===worker.villageId).entry={x:worker.x+6,z:worker.z};
 const f=await nativeProductionAuthority(saved.state);try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));
  for(let i=0;i<200&&!f.records.some(r=>r.kind==='home-arrival');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-arrival'&&r.committed));const state=f.snapshot();assert.equal(state.workers[0].status,'home');assert.equal(state.workers[0].nativeRouteAdmission,undefined);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const stroll of [false,true])test(`restored harvest produces Carry, settlement and prepared ${stroll?'Walk22':'Rest21'} on the same body`,async()=>{
 const saved=nativeActionSave().saved,worker=saved.workers[0];saved.workers=[worker];saved.tasks=saved.tasks.filter(t=>t.workerId===worker.id);saved.plants=saved.plants.filter(p=>p.id===saved.tasks[0].targetId);
 // Same authored clear-corridor checkpoint as nativeTaskConsequenceFixture;
 // configure before constructing the fresh authority, never mutate live goals.
 const center=saved.structures.find(s=>s.id===worker.centerId);center.x=worker.x-6;center.z=worker.z+6;
 const delivery=centerDeliveryPoint(center,saved.plants[0],saved);
 const anchor=createPlant(`plant-${saved.nextId++}`,'mijo',delivery.x+(stroll?5:1.5),delivery.z+.5,center.id);
 for(const water of anchor.water)water.status='manual';
 saved.plants.push(anchor);
 const kind=stroll?'idle-stroll':'idle-cycle',commits=[];
 let first,release;const held=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved,{
  onReady(record){if(record.kind===kind&&!first){first=record;return held;}},
  onCommit(record,data){commits.push({kind:record.kind,data});}
 });try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-action'&&r.committed));
  for(let i=0;i<400&&!first;i++){f.advance();await f.present();}
  await untilProduction(f,()=>!!first);
  const before=f.snapshot(),settlement=commits.find(r=>r.kind==='task-settlement').data.nativeTaskSettlementBinding;
  assert.deepEqual(commits.map(r=>r.kind),['task-action','task-consequence','task-settlement']);
  const source=stroll?first.resources.nativeIdleStroll.sourceSettlement:first.resources.nativeIdleCycle.sourceBody;
  assert.equal(source.bodyId,settlement.reference.bodyId);
  assert.equal(source.sourceSequence,settlement.settlementSequence);
  assert.deepEqual(source.pose,settlement.reference.pose);
  assert.equal(source.idleState.anchorId,`farm-${anchor.id}`);
  assert.equal(before.workers[0].nativeRouteAdmission,undefined);
  assert.equal(before.workers[0].idleState,null);
  assert.equal(before.crates[0].delivered,true);

  if(!stroll){
   f.command({kind:'pause',reason:'menu'});release();
   await untilProduction(f,()=>first.aborted);
   assert.equal(first.committed,false);
   assert.equal(f.snapshot().workers[0].idleState,null);
   f.command({kind:'resume',reason:'menu'});
  }else{f.advance();await f.present();release();}
  await untilProduction(f,()=>commits.some(r=>r.kind===kind));
  const state=f.snapshot(),bound=commits.find(r=>r.kind===kind).data[stroll?'nativeIdleStrollBinding':'nativeIdleCycleBinding'];
  assert.deepEqual(stroll?bound.reference.sourceSettlement:bound.reference.sourceBody,source);
  assert.equal(state.workers[0].nativeRouteAdmission,stroll?'native-idle-stroll':'native-idle');
  assert.equal(state.workers[0].idleState.mode,stroll?'walk':'rest');
  assert.equal(state.workers[0].crateId,null);
  assert.deepEqual(state.ledger,before.ledger);
  assert.equal(state.events.filter(e=>e.type==='CrateDelivered').length,1);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('ordinary Multiply follows the same crop through native Harvest, Carry and one settlement',async()=>{
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 let f;
 try{
  const state=structuredClone(fixture.state),worker=state.workers[0];
  const center=state.structures.find(structure=>structure.id===worker.centerId);
  Object.assign(center,{x:worker.x-6,z:worker.z+6});
  state.crates=[];
  delete state.agriculturalPower;
  state.ledger.balance=rational(100000);
  const {x,z}=fixture.point(-4,6);
  const crop=createPlant(`plant-${state.nextId++}`,'mijo',x,z,center.id);
  crop.growth=cropSpec(crop.species).growth_seconds-1;
  for(const water of crop.water)water.status='manual';
  state.plants.push(crop);

  f=await nativeProductionAuthority(state);
  const committed=kind=>f.records.find(record=>record.kind===kind&&record.committed);
  await untilProduction(f,()=>committed('initial-idle-body'));
  const command={kind:'castAgricultural',id:'multiply-before-native-harvest',spell:'multiply',x,z,selection:{targetId:crop.id}};
  const spell=f.command(command);
  assert.equal(spell.value,true);
  const [activation]=spell.events.filter(event=>event.type==='SpellActivated');
  assert.equal(activation.targetId,crop.id);
  assert.deepEqual(activation.power.amount,rational(132,13));
  assert.equal(f.command(command).value,false);

  const events=new Map();
  for(let i=0;i<450&&!committed('task-settlement');i++){
   for(const event of f.advance().events)events.set(event.id,event);
   await f.present();
   assert.deepEqual(f.faults,[]);
  }
  const after=f.snapshot(),[crate]=after.crates;
  assert(committed('task-settlement'),JSON.stringify({
   worker:after.workers[0],tasks:after.tasks,crates:after.crates,
   status:f.authority.nativeIntentProductionStatus(),preparations:f.records.map(record=>record.kind),
  }));
  assert.equal(after.crates.length,1);
  assert.equal(crate.sourcePlantId,crop.id);
  assert.equal(crate.delivered,true);
  assert.equal(crate.carrierId,null);
  assert.equal(crate.multiplyPowerSettled,true);
  assert.deepEqual(crate.multiplyIncome,rational(10));
  assert.deepEqual(crate.value,rational(66,5));
  assert.deepEqual(after.ledger.entries[`deliver:${crate.id}`],rational(24));
  assert.deepEqual(after.ledger.balance,rational(100024));
  assert.equal([...events.values()].filter(event=>event.type==='CropPicked'&&event.targetId===crop.id).length,1);
  assert.equal(after.workers[0].id,worker.id);
  assert.equal(committed('task-settlement').resources.nativeSettlement.bodyId,committed('task-start').resources.bodyId);
  assert.deepEqual(f.errors,[]);
 }finally{await f?.close();fixture.close();}
});

test('an unprepared Awakening keeps an acquired watering task and its charge intact',async()=>{
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 let f;
 try{
  const state=structuredClone(fixture.state),worker=state.workers[0];
  const center=state.structures.find(structure=>structure.id===worker.centerId);
  Object.assign(center,{x:worker.x-6,z:worker.z+6});
  awakeningState(state).enabled=true;
  awakeningState(state).progress=100;
  const {x,z}=fixture.point(-4,6),plant=createPlant(`plant-${state.nextId++}`,'mijo',x,z,center.id);
  plant.water[0].status='manual';
  plant.growth=plant.water[1].at-.2;
  state.plants.push(plant);
  f=await nativeProductionAuthority(state);
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));
  for(let i=0;i<15&&!f.records.some(r=>r.kind==='task-start'&&r.committed);i++){
   f.advance();await f.present();
  }
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  const before=f.snapshot(),owner=before.workers[0];
  assert.equal(owner.nativeRouteAdmission,'native-task');
  assert.equal(before.tasks.find(task=>task.id===owner.taskId).targetId,plant.id);

  const command={kind:'bless',id:'unprepared-awakening-of-assigned-crop',targetId:plant.id};
  const result=f.command(command),after=JSON.parse(result.snapshot);
  assert.equal(result.value,false);
  assert.match(result.rejection,/prepara/);
  assert(!after.commandIds.includes(command.id));
  assert.equal(after.plants.find(p=>p.id===plant.id).blessing,undefined);
  assert.deepEqual(after.awakenings,before.awakenings);
  assert.deepEqual(after.tasks,before.tasks);

  const next=f.advance(.1),continued=next.workers[0];
  assert.equal(continued.id,owner.id);
  assert.equal(continued.taskId,owner.taskId);
  assert.equal(continued.nativeRouteAdmission,'native-task');
  assert.notDeepEqual([continued.x,continued.z],[owner.x,owner.z]);
  assert.deepEqual(f.faults,[]);
 }finally{await f?.close();fixture.close();}
});

for(const kind of ['initial','water'])test(`completed ${kind} irrigates only when retained Idle adopts the same body`,async()=>{
 const {saved,oldBinding}=nativeActionSave({kind}),worker=saved.workers[0];
 saved.workers=[worker];saved.tasks=saved.tasks.filter(task=>task.workerId===worker.id);
 const plant=saved.plants.find(plant=>plant.id===saved.tasks[0].targetId);
 Object.assign(plant,createPlant(plant.id,plant.species,plant.x,plant.z,plant.centerId));
 if(kind==='water'){
  plant.water[0].status='manual';plant.water[1].status='due';plant.growth=plant.water[1].at;
 }
 const next=createPlant(`plant-${saved.nextId++}`,'mijo',worker.x-4,worker.z,worker.centerId);
 next.growth=999999;for(const slot of next.water)slot.status='manual';
 saved.plants=[plant,next];
 let release;const held=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved,{onPrepare(record){if(record.resources.nativeInitialIdleBody?.wateringSource)return held;}});try{
  await untilProduction(f,()=>f.records.some(record=>record.kind==='task-action'&&record.committed));
  const admitted=f.records[0],duration=oldBinding.reference.request.duration;
  for(let i=0;i<200&&f.snapshot().workers[0].nativeTaskAction.elapsed<duration;i++){
   f.advance();await f.present();
  }
  const prepared=()=>f.records.find(record=>record.resources.nativeInitialIdleBody?.wateringSource);
  await untilProduction(f,prepared);const state=f.snapshot(),current=state.workers[0];
  assert.equal(current.nativeTaskAction.elapsed,duration);
  assert.equal(current.nativeRouteAdmission,'native-action');
  assert.equal(current.taskId,saved.tasks[0].id);
  assert.deepEqual([current.x,current.z],[worker.x,worker.z]);
  assert.equal(state.plants[0].water[kind==='initial'?0:1].status,'due');
  assert.equal(state.crates.length,0);
  const idle=prepared();assert.equal(idle.committed,false);
  assert.equal(idle.resources.nativeInitialIdleBody.bodyId,admitted.resources.request.bodyId);
  assert.equal(idle.resources.nativeInitialIdleBody.wateringSource.reference.request.taskId,Number(saved.tasks[0].id.split('-').at(-1)));
  release();await untilProduction(f,()=>idle.committed);const settled=f.snapshot(),available=settled.workers[0];
  assert.equal(available.status,'idle');assert.equal(available.taskId,null);
  assert.deepEqual([available.x,available.z],[worker.x,worker.z]);
  assert.equal(settled.plants[0].water[kind==='initial'?0:1].status,'manual');
  assert.equal(settled.tasks.some(task=>task.id===saved.tasks[0].id),false);
  assert.equal(settled.crates.length,0);
  assert.equal(settled.events.filter(event=>event.type==='WaterSatisfied'&&event.targetId===plant.id).length,1);
  assert.equal(f.advance().events.filter(event=>event.type==='WaterSatisfied'&&event.targetId===plant.id).length,1);
  assert.equal(f.command({kind:'harvest',id:`production-after-${kind}`,targetId:next.id}).value,true);
  f.advance();await untilProduction(f,()=>f.records.some(record=>record.kind==='task-start'&&record.committed));
  const task=f.records.find(record=>record.kind==='task-start');
  assert.equal(task.resources.bodyId,idle.resources.nativeInitialIdleBody.bodyId);
  assert.equal(task.resources.targetId,Number(next.id.split('-').at(-1)));
  assert.equal(f.records.some(record=>record.kind==='task-consequence'),false);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

for(const kind of ['center','wall'])test(`repairing an intact ${kind} debits and restores HP only after the same body acquires its prepared Idle`,async()=>{
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 let f,release;const held=new Promise(resolve=>{release=resolve;});
 try{
  const state=structuredClone(fixture.state),worker=state.workers[0],center=state.structures.find(item=>item.id===worker.centerId);
  const structure=kind==='center'?center:state.structures.find(item=>item.kind==='wall'&&item.status==='intact'&&!item.gate&&item.material==='zarzas');
  Object.assign(structure,fixture.point(kind==='center'?5:1,4));structure.hp=Math.floor(structure.maxHp/2);state.ledger.balance=rational(100000);
  let next=null;
  if(kind==='wall'){
   const {x,z}=fixture.point(-4,6);
   next=createPlant(`plant-${state.nextId++}`,'mijo',x,z,center.id);
   next.growth=999999;for(const slot of next.water)slot.status='manual';state.plants.push(next);
  }
  f=await nativeProductionAuthority(state,{onPrepare(record){
   if(record.kind==='initial-idle-body'&&f.records.some(item=>item.kind==='task-action'&&item.committed))return held;
  }});
  await untilProduction(f,()=>f.records.some(record=>record.kind==='initial-idle-body'&&record.committed));
  assert.equal(f.command({kind:'requestRepair',id:'repair-after-task',targetId:structure.id}).value,true);
  const expected=()=>f.records.find((record,index)=>record.kind==='initial-idle-body'&&index>0);
  for(let i=0;i<240&&!expected();i++){f.advance();await f.present();}
  const action=f.records.find(record=>record.kind==='task-action'&&record.committed),prepared=expected();
  assert.equal(action?.resources.request.actionKind,'repair');
  assert.ok(prepared,'the completed repair must request prepared stationary resources');
  const before=f.snapshot(),taskId=before.workers[0].taskId,paymentId=`repair:${taskId}`;
  assert.equal(before.structures.find(item=>item.id===structure.id).hp,structure.hp);
  assert.equal(Object.hasOwn(before.ledger.entries,paymentId),false);
  assert.equal(before.events.some(event=>event.type==='RepairApplied'),false);
  assert.equal(prepared.resources.nativeInitialIdleBody.bodyId,action.resources.request.bodyId);
  const repairSource=prepared.resources.nativeInitialIdleBody[`${kind}RepairSource`];
  assert.equal(repairSource.reference.request.targetId,Number(structure.id.split('-').at(-1)));
  if(kind==='wall'){
   const reference=prepared.resources.nativeInitialIdleBody,{wallRepairSource,...stationary}=reference;
   assert.throws(()=>copyNativeInitialIdleBodyReference({...reference,centerRepairSource:wallRepairSource}),/Multiple native initial Idle action sources/);
   assert.equal(nativeInitialIdleBodySuccessor(reference,{...stationary,centerRepairSource:wallRepairSource}),false);
  }
  release();await untilProduction(f,()=>prepared.committed);
  const after=f.snapshot(),target=after.structures.find(item=>item.id===structure.id);
  assert.equal(target.hp,structure.maxHp);assert.equal(target.status,'intact');
  if(kind==='wall')for(const key of ['gate','autoGate','x','z','yaw','baseScaleX'])assert.equal(target[key],structure[key]);
  assert.equal(after.workers[0].taskId,null);assert.equal(after.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(after.events.filter(event=>event.type==='RepairApplied'&&event.repair.paymentId===paymentId).length,1);
  assert.equal(Object.hasOwn(after.ledger.entries,paymentId),true);
  assert.equal(f.advance().events.filter(event=>event.type==='RepairApplied').length,1);
  if(next){
   const healthy=f.command({kind:'requestRepair',id:'repair-healthy-wall',targetId:structure.id});
   assert.equal(healthy.value,false);assert.equal(Object.hasOwn(f.snapshot().ledger.entries,'repair-healthy-wall'),false);
   const targetId=Number(next.id.split('-').at(-1));
   assert.equal(f.command({kind:'harvest',id:'harvest-after-wall-repair',targetId:next.id}).value,true);
   const nextTask=()=>f.records.find(record=>record.kind==='task-start'&&record.committed&&record.resources.targetId===targetId);
   for(let i=0;i<120&&!nextTask();i++){f.advance();await f.present();}
   assert.equal(nextTask()?.resources.bodyId,action.resources.request.bodyId);
   assert.equal(f.snapshot().events.filter(event=>event.type==='RepairApplied').length,1);
  }
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f?.close();fixture.close();}
});

test('a ruined wall stays outside the stationary repair consequence',async()=>{
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 let f;
 try{
  const state=structuredClone(fixture.state),wall=state.structures.find(item=>item.kind==='wall'&&item.status==='intact'&&!item.gate&&item.material==='zarzas');
  Object.assign(wall,fixture.point(1,4),{hp:0,status:'ruined',collapseRemaining:0});state.ledger.balance=rational(100000);
  f=await nativeProductionAuthority(state);
  await untilProduction(f,()=>f.records.some(record=>record.kind==='initial-idle-body'&&record.committed));
  assert.equal(f.command({kind:'requestRepair',id:'ruined-wall-repair',targetId:wall.id}).value,true);
  const action=()=>f.records.find(record=>record.kind==='task-action'&&record.committed);
  for(let i=0;i<240&&!action();i++){f.advance();await f.present();}
  assert.equal(action()?.resources.request.actionKind,'repair');
  const before=f.snapshot(),paymentId=`repair:${before.workers[0].taskId}`;
  for(let i=0;i<15;i++){f.advance();await f.present();}
  const after=f.snapshot(),target=after.structures.find(item=>item.id===wall.id);
  assert.equal(target.hp,0);assert.equal(target.status,'ruined');assert.equal(Object.hasOwn(after.ledger.entries,paymentId),false);
  assert.equal(f.records.filter(record=>record.kind==='initial-idle-body').length,1);
  assert.equal(after.events.some(event=>event.type==='RepairApplied'&&event.targetId===wall.id),false);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();fixture.close();}
});

test('closing the authority aborts its one pending preparation without publishing a late WALK',async()=>{
 const saved=nativeIdleStrollGameSave();let release;const waiting=new Promise(resolve=>{release=resolve;});const f=await nativeProductionAuthority(saved.state,{async onPrepare(){await waiting;}});try{
  await untilProduction(f,()=>f.records.length===1);f.authority.dispose();release();await f.present();assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.equal(f.records.filter(r=>r.committed).length,0);assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('a preparation failure is observable and cannot turn into a repeated failed production loop',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{onPrepare(){throw Error('production fixture failure');}});try{
  for(let i=0;i<1000&&f.authority.nativeIntentProductionStatus().phase!=='failed';i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'failed');assert.match(f.authority.nativeIntentProductionStatus().fault,/production fixture failure/);assert.equal(f.records.length,1);assert.throws(()=>f.snapshot(),/production failed/);assert.equal(f.records.length,1);
 }finally{await f.close();}
});

test('a mixed legacy roster keeps native activation closed until every mover has a source projection',async()=>{
 const saved=nativeIdleStrollGameSave(),a=saved.state.workers[0];saved.state.workers.push({...structuredClone(a),id:'worker-900012',z:a.z+6,nativeRouteAdmission:undefined,idleState:null,destinationId:null});
 const f=await nativeProductionAuthority(saved.state);try{assert.equal(f.authority.nativeIntentProductionStatus().phase,'unsupported-cohort');f.snapshot();await f.present();assert.equal(f.records.length,0);assert.deepEqual(f.faults,[]);}finally{await f.close();}
});

test('real authority Home peer advances while restored WALK waits for resource preparation',async()=>{
 const saved=nativeIdleStrollGameSave(),a=saved.state.workers[0],peer={...structuredClone(a),id:'worker-900012',x:a.x,z:a.z+6,status:'returning',idleState:null,destinationId:null,nativeRouteAdmission:'pending-home-resources'};
 saved.state.workers=[peer,a];saved.state.villages.find(v=>v.id===a.villageId).entry={x:a.x+12,z:a.z+6};let release;const waiting=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved.state,{async onPrepare(record){if(record.kind==='idle-stroll')await waiting;}});try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'));assert(f.records[0].committed);const before=f.snapshot(),next=f.advance();assert.equal(next.workers[0].nativeRouteAdmission,'native-home');assert.notDeepEqual([next.workers[0].x,next.workers[0].z],[before.workers[0].x,before.workers[0].z]);assert.deepEqual(next.workers[1],before.workers[1]);assert.equal(f.authority.nativeResourcePreparationStatus().pending,1);
  release();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));await f.present();const acquired=f.snapshot();assert.equal(acquired.workers[1].nativeRouteAdmission,'native-idle-stroll');assert.equal(f.records[1].resources.bodyId,2);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('a Home missing resident data does not starve the next ready restored stroll',async()=>{
 const saved=nativeIdleStrollGameSave(),a=saved.state.workers[0],peer={...structuredClone(a),id:'worker-900012',x:a.x,z:a.z+6,status:'returning',idleState:null,destinationId:null,nativeRouteAdmission:'pending-home-resources'};saved.state.workers=[peer,a];saved.state.villages.find(v=>v.id===a.villageId).entry={x:10000,z:10000};
 const f=await nativeProductionAuthority(saved.state);try{
  await untilProduction(f,()=>f.authority.nativeIntentProductionStatus().last?.kind==='home-route');assert.equal(f.records.length,0);const before=f.snapshot();
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));const state=f.snapshot();assert.equal(state.workers[1].nativeRouteAdmission,'native-idle-stroll');assert.deepEqual(state.workers[0],before.workers[0]);assert.equal(state.workers[0].nativeRouteAdmission,'pending-home-resources');assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('changed ordinary run urgency cancels a pending Task14 even when its request handle is unchanged',async()=>{
 const source=createNativeTaskGameFixture(),state=source.state,worker=state.workers[0];state.workers=[worker];state.tasks=state.tasks.filter(t=>t.workerId===worker.id);state.plants=state.plants.filter(p=>p.id===state.tasks[0].targetId);
 const targets=Array.from({length:3},(_,i)=>{const p=createPlant(`plant-${state.nextId++}`,'mijo',worker.x+i+1,worker.z-3.3,worker.centerId);p.growth=999999;return p;});state.plants.push(...targets);let release;const waiting=new Promise(resolve=>{release=resolve;});let f;
 try{
  f=await nativeProductionAuthority(state,{async onPrepare(record){if(record.kind==='task-start'&&f.records.filter(r=>r.kind==='task-start').length===1)await waiting;}});
  await untilProduction(f,()=>f.records.length===1);assert.equal(f.records[0].resources.runDistance,0);const request=f.records[0].resources.sourceRequestHandle;assert(request);
  for(const target of targets)assert.equal(f.command({kind:'harvest',id:`urgency-${target.id}`,targetId:target.id}).value,true);
  release();await untilProduction(f,()=>f.records.filter(r=>r.kind==='task-start').length===2&&f.records[1].committed);
  assert.deepEqual(f.records[1].resources.sourceRequestHandle,request);assert(f.records[1].resources.runDistance>0);assert.equal(f.records[0].committed,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f?.close();source.close();}
});


test('ordinary native production waits for the terrain publisher and forwards its exact current manifest',async()=>{
 let manifest=null,reads=0;const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{getTerrainManifest(){reads++;return manifest;}});try{
  f.snapshot();await f.present();assert.equal(f.records.length,0);assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');assert(reads>0);
  manifest={epoch:'real-publisher-test',chunks:[{cx:0,cz:0,revision:7}]};f.snapshot();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));
  assert.deepEqual(f.records[0].terrainManifest,manifest);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
