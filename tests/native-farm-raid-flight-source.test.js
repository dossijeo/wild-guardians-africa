import {originalRig} from './helpers/native-animal-crop-rig.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {nativeFarmArrivalStopSourceFixture} from './helpers/native-farm-arrival-stop-source.js';
import {copyNativeHomeRequestReference, sameNativeHomeRequestReference} from '../src/world/native-home-request-reference.js';
import {nativeResourceAdmissionProfile} from '../src/world/native-resource-admission-profiles.js';
import {centerServicePoint} from '../src/world/centers.js';
import {LOCOMOTION} from '../src/simulation/locomotion-calibration.js';

function mixedDesertRaid() {
  const fixture = nativeFarmArrivalRouteFixture({peer:false});
  const state = structuredClone(fixture.state);
  fixture.close();
  state.dayPlan = {done:false,at:state.time+.8,group:['warthog']};
  const chunkKeys = Array.from({length:25}, (_,i)=>[i%5-2,Math.floor(i/5)-2].join(','));
  return {state,chunkKeys};
}

test('a southern Desert center approach and refuge acquire on their original bodies', async () => {
  const {state,chunkKeys} = mixedDesertRaid();
  const acquired = [];
  let releaseHome, home;
  const hold = new Promise(resolve => { releaseHome = resolve; });
  const world = await nativeProductionAuthority(state, {
    chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    onCommit(record,data) { acquired.push({kind:record.kind,data}); },
    async onReady(record) {
      if (record.kind === 'home-route' && !home) {
        home = record;
        await hold;
      }
    },
  });
  const pose = actor => [actor.x,actor.z,actor.motionPhase];
  async function step() {
    const ack = world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
    for (const key of ack.residency.missing) {
      const [cx,cz] = key.split(',').map(Number);
      world.command({kind:'addChunk',cx,cz});
    }
    await world.present();
    assert.deepEqual(world.faults,[]);
    return JSON.parse(ack.snapshot);
  }
  try {
    await untilProduction(world,()=>acquired.some(row=>row.kind==='farm-arrival'));
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    let next;
    for (let i=0;i<20&&!next?.raid;i++) next=await step();
    assert(next?.raid);
    const animal=next.raid.animals[0];
    assert.deepEqual(pose(animal).slice(0,2),[-16.6,-27.1]);
    assert.equal(animal.targetId,'structure-2');
    await untilProduction(world,()=>{world.snapshot();return !!home;});
    for (let i=0;i<4;i++) {
      const waiting=await step();
      assert.deepEqual(pose(waiting.raid.animals[0]),pose(animal));
      assert.equal(waiting.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
      assert(!acquired.some(row=>row.kind==='animal-crop-route'||row.kind==='home-route'));
    }
    releaseHome();
    for (let i=0;i<200&&next.workers[0].status!=='home';i++) next=await step();
    assert.equal(next.workers[0].status,'home');
    assert.equal(next.workers[0].hits,0);
    assert.equal(next.raid.animals[0].targetId,'structure-2');
    assert.equal(next.structures[0].hp,600);
    const farm=world.records.find(row=>row.kind==='farm-arrival');
    const homeReference=nativeResourceAdmissionProfile('home-route').reference(home.resources);
    assert.equal(homeReference.bodyId,farm.resources.bodyId);
    for (let i=0;i<1800&&next.raid;i++) next=await step();
    assert.equal(next.raid,null);
    const animalPrograms=acquired.filter(row=>row.kind.startsWith('animal-crop')).map(row=>
      row.data.nativeAnimalCropRouteBinding??row.data.nativeAnimalCropStrikeBinding);
    assert.deepEqual(animalPrograms.map(row=>[row.reference.kind,row.reference.purpose]),
      [[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'retreat']]);
    assert.equal(new Set(animalPrograms.map(row=>row.reference.bodyId)).size,1);
    assert.notEqual(animalPrograms[0].reference.bodyId,homeReference.bodyId);
    assert.deepEqual(next.events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560,540,520]);
    assert.equal(next.events.filter(event=>event.type==='WorkerHit'||event.type==='WorkerIncapacitated').length,0);
    for (let i=0;i<400&&next.workers[0].nativeRouteAdmission!=='native-idle';i++) next=await step();
    const arrival=acquired.find(row=>row.kind==='home-arrival').data.nativeHomeArrivalBinding;
    const returnToFarm=acquired.findLast(row=>row.kind==='farm-arrival').data.nativeFarmArrivalBinding.reference;
    assert.equal(next.workers[0].nativeRouteAdmission,'native-idle');
    assert.equal(next.workers[0].id,state.workers[0].id);
    assert.equal(returnToFarm.sourceRequest.refugeSequence,arrival.retiredSequence);
    assert.notEqual(returnToFarm.bodyId,homeReference.bodyId);
    assert.equal(returnToFarm.motionFlags,0);
    assert.deepEqual(world.faults,[]);
  } finally {
    releaseHome();
    await world.close();
  }
});

for(const blockedRefuge of [false,true])test(`the northern center corridor waits for ${blockedRefuge?'Home19 at the intersecting refuge':'the stop-safe Home suffix'} before acquiring the animal route`, async () => {
  const {state,chunkKeys} = mixedDesertRaid();
  if(blockedRefuge)state.villages.find(village=>village.id===state.workers[0].villageId).entry={x:-12,z:14};
  const acquired=[];
  let homeReady,releaseHome;
  const retained=new Promise(resolve=>{releaseHome=resolve;});
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record){if(record.kind==='home-route'&&!homeReady){homeReady=record;await retained;}},
    onCommit(record,data){acquired.push({kind:record.kind,data});}});
  try {
    await untilProduction(world,()=>world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:24},target:{x:-10,z:0}}});
    async function step(seconds=.05){const next=world.advance(seconds);await world.present();return next;}
    let next;
    for(let i=0;i<30&&!next?.raid;i++)next=await step(.025);
    assert(next?.raid);
    await untilProduction(world,()=>acquired.some(row=>row.kind==='farm-arrival-stop'));
    await untilProduction(world,()=>homeReady);
    next=world.snapshot();
    assert(homeReady,'Home18 should be admissible with the animal stationary');
    assert.equal(next.raid.animals[0].targetId,'structure-2');
    const [animal]=next.raid.animals;
    assert.equal(next.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    for(let i=0;i<3;i++){
      next=await step(.025);
      assert.deepEqual([next.raid.animals[0].x,next.raid.animals[0].z],[animal.spawn.x,animal.spawn.z]);
      assert(!world.records.some(record=>record.kind==='animal-crop-route'));
    }
    releaseHome();
    await untilProduction(world,()=>acquired.some(row=>row.kind==='home-route'));
    const home=acquired.find(row=>row.kind==='home-route').data.nativeHomeRouteBinding;
    for(let i=0;i<16;i++)next=await step();
    assert.equal(next.workers[0].nativeRouteAdmission,'native-home');
    assert(!world.records.some(record=>record.kind==='animal-crop-route'));
    const heldAt=next.elapsed,heldWorker=next.workers[0];
    world.command({kind:'pause',reason:'center-flight-suffix'});
    next=await step();
    assert.equal(next.elapsed,heldAt);
    assert.deepEqual([next.workers[0].x,next.workers[0].z],[heldWorker.x,heldWorker.z]);
    assert(!world.records.some(record=>record.kind==='animal-crop-route'));
    world.command({kind:'resume',reason:'center-flight-suffix'});
    for(let i=0;i<100&&!acquired.some(row=>row.kind==='animal-crop-route');i++){
      next=await step();
      if(!acquired.some(row=>row.kind==='animal-crop-route'))assert.deepEqual([next.raid.animals[0].x,next.raid.animals[0].z],[animal.spawn.x,animal.spawn.z]);
    }
    const animalRoute=acquired.find(row=>row.kind==='animal-crop-route')?.data.nativeAnimalCropRouteBinding;
    assert(animalRoute);
    assert(animalRoute.reference.worldBoundary.effectiveTime>home.reference.worldBoundary.effectiveTime+1.6);
    const absence=acquired.find(row=>row.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    if(blockedRefuge){
      assert(absence,'The intersecting refuge must retire its worker first');
      assert.equal(absence.reference.bodyId,home.reference.bodyId);
      assert.equal(absence.reference.sourceHome.assignmentSequence,home.assignmentSequence);
      const rows=world.records.find(row=>row.kind==='animal-crop-route').resources.rows;
      const {x,z,radius}=absence.reference.pose;
      assert(rows.some((value,i)=>i%16===1&&Math.hypot(value-x,rows[i+1]-z)<radius+animalRoute.reference.radius));
      assert(animalRoute.reference.worldBoundary.effectiveTime>=absence.reference.worldBoundary.effectiveTime);
      assert(animalRoute.reference.worldBoundary.ticket>absence.reference.worldBoundary.ticket);
    }else{
      assert(animalRoute.reference.worldBoundary.effectiveTime<home.reference.endTime);
      assert.equal(absence,undefined);
    }
    for(let i=0;i<1500&&(next.raid||next.workers[0].nativeRouteAdmission!=='native-idle');i++)next=await step();
    assert.equal(next.raid,null);
    assert.equal(next.workers[0].id,state.workers[0].id);
    assert.equal(next.workers[0].nativeRouteAdmission,'native-idle');
    assert.equal(next.workers[0].hits,0);
    assert.deepEqual(next.events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(world.faults,[]);
  } finally {
    releaseHome();
    await world.close();
  }
});

for(const {name,eye,origin,clear} of [
  {name:'uses the clear Farm suffix inside its expanded bounds',eye:{x:-16,z:1.4},origin:{x:-19.01890775019956,z:2.104411808379897},clear:true},
  {name:'ignores the retired Farm prefix',eye:{x:-16,z:1},origin:{x:-19.057821163879645,z:1.5096368606466077},clear:true},
  {name:'keeps an overlapping origin outside the qualified cohort',eye:{x:-14,z:0},origin:{x:-17.1,z:0},clear:false},
])test(`Desert raid birth ${name}`,async()=>{
  const {state,chunkKeys}=mixedDesertRaid();
  let stopReady,releaseStop;
  const retained=new Promise(resolve=>{releaseStop=resolve;});
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record){if(record.kind==='farm-arrival-stop'){stopReady=record;await retained;}}});
  try{
    await untilProduction(world,()=>world.records.some(record=>record.kind==='farm-arrival'&&record.committed));
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye,target:{x:-10,z:0}}});
    let next;
    for(let i=0;i<30&&!next?.raid;i++){next=world.advance(.02);await world.present();}
    assert(next?.raid);
    const [animal]=next.raid.animals,[worker]=next.workers;
    assert.deepEqual(animal.spawn,origin);
    const gap=Math.hypot(worker.x-animal.x,worker.z-animal.z);
    assert(clear?gap>animal.radius+1.1:gap<animal.radius+.28);
    assert.equal(animal.targetId,clear?'structure-2':null);
    assert.equal(worker.nativeRouteAdmission,'pending-farm-flight-stop');
    assert(!world.records.some(record=>record.kind==='animal-crop-route'));
    if(!clear)return;
    for(let i=0;i<4;i++){
      next=world.advance(.02);await world.present();
      assert.deepEqual([next.raid.animals[0].x,next.raid.animals[0].z],[origin.x,origin.z]);
      assert.equal(next.workers[0].hits,0);
      assert.equal(next.workers[0].nativeRouteAdmission,'pending-farm-flight-stop');
      assert(!world.records.some(record=>record.kind==='animal-crop-route'));
    }
    assert(stopReady);
    assert.notDeepEqual([next.workers[0].x,next.workers[0].z],[worker.x,worker.z]);
    assert.deepEqual(world.faults,[]);
  }finally{
    releaseStop();
    await world.close();
  }
});

function gatedDesertRaid(){
  const {state,chunkKeys}=mixedDesertRaid();
  const [worker]=state.workers;
  const village=state.villages.find(v=>v.id===worker.villageId);
  const start={x:-14,z:11.799999999999999};
  const center=state.structures.find(value=>value.id===worker.centerId);
  const service=centerServicePoint(center,state,.8);
  Object.assign(worker,start);
  village.entry={...start};
  center.x+=start.x-service.x;
  center.z+=3.2-service.z;
  state.dayPlan.at=state.time+3.4;
  const gateId=1000000;
  const gate={id:'structure-'+gateId,created:29207,kind:'wall',material:'zarzas',gate:true,x:-14,z:8.2,yaw:0,
    maxHp:60,hp:60,status:'intact',villageId:village.id,cost:10,collapseRemaining:0};
  state.structures.push(gate);
  state.nextId=gateId+1;
  return {state,chunkKeys,start,center,gate,gateId};
}

for(const {workerZ,spawnDelay,approachSteps,label} of [
  {workerZ:4.5,spawnDelay:.1,approachSteps:1,label:'at the service point'},
  {workerZ:5.5,spawnDelay:.35,approachSteps:6,label:'after walking'},
])test('RaidSpawned takes the completed Farm body while the first Idle READY is held '+label, async () => {
  const {state,chunkKeys,start,center,gateId}=gatedDesertRaid();
  state.workers[0].z=workerZ;
  state.dayPlan.at=state.time+spawnDelay;
  let idle,releaseIdle;
  const held=new Promise(resolve=>{releaseIdle=resolve;});
  const acquisitions=[];
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record){if(record.kind==='idle-cycle'&&!idle){idle=record;await held;}},
    onCommit(record,data){acquisitions.push({kind:record.kind,data});}});
  const events=[];
  async function step(){
    const next=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:1});
    for(const key of next.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    events.push(...next.events);
    await world.present();
    assert.deepEqual(world.faults,[]);
    return JSON.parse(next.snapshot);
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>world.records.some(r=>r.kind==='farm-arrival'&&r.committed));
    const farm=acquisitions.find(r=>r.kind==='farm-arrival').data.nativeFarmArrivalBinding;
    let endpoint;
    for(let i=0;i<approachSteps;i++)endpoint=await step();
    await untilProduction(world,()=>!!idle);
    assert.equal(farm.reference.endTime>farm.reference.worldBoundary.effectiveTime,approachSteps>1);
    assert(endpoint.elapsed>=farm.reference.endTime);
    assert.equal(endpoint.raid,null);
    assert.equal(idle.committed,false);
    assert.deepEqual(farm.gateIds,[]);
    let current=await step();
    const spawn=events.find(e=>e.type==='RaidSpawned');
    assert(spawn);
    assert.equal(current.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    assert.equal(current.raid.animals[0].targetId,center.id);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[endpoint.workers[0].x,endpoint.workers[0].z]);
    releaseIdle();
    await untilProduction(world,()=>idle.aborted);
    assert.equal(idle.committed,false);
    for(let i=0;i<200&&current.workers[0].status!=='home';i++)current=await step();
    const home=acquisitions.find(r=>r.kind==='home-route')?.data.nativeHomeRouteBinding;
    const absence=acquisitions.find(r=>r.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    assert.equal(home?.reference.bodyId,farm.reference.bodyId);
    assert.equal(home.reference.sourceRequest.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    assert.deepEqual([home.reference.sourceRequest.pose.x,home.reference.sourceRequest.pose.z],[endpoint.workers[0].x,endpoint.workers[0].z]);
    assert.deepEqual(home.gateIds,[gateId]);
    assert(!world.records.some(r=>r.kind==='farm-arrival-stop'));
    assert.equal(absence?.reference.bodyId,farm.reference.bodyId);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    assert.equal(current.structures.find(row=>row.id==='structure-'+gateId).gateOpen,1);
    for(let i=0;i<1250&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    const resumed=acquisitions.findLast(r=>r.kind==='farm-arrival').data.nativeFarmArrivalBinding;
    assert.equal(resumed.reference.actorId,farm.reference.actorId);
    assert.notEqual(resumed.reference.bodyId,farm.reference.bodyId);
    assert.equal(resumed.reference.sourceRequest.refugeSequence,absence.retiredSequence);
    assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(current.ledger,state.ledger);
  }finally{releaseIdle();await world.close();}
});

test('RaidSpawned takes the acquired stationary Idle body across the gate', async () => {
  const {state,chunkKeys,start,center,gateId}=gatedDesertRaid();
  state.workers[0].z=5;
  state.dayPlan.at=state.time+.2;
  let stagedHome,releaseHome;
  const held=new Promise(resolve=>{releaseHome=resolve;});
  const acquisitions=[];
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record){if(record.kind==='home-route'&&!stagedHome){stagedHome=record;await held;}},
    onCommit(record,data){acquisitions.push({kind:record.kind,data});}});
  const events=[];
  const pose=worker=>[worker.x,worker.z,worker.heading,worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining];
  async function step(){
    const next=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:1});
    for(const key of next.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    events.push(...next.events);
    await world.present();
    assert.deepEqual(world.faults,[]);
    return JSON.parse(next.snapshot);
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>acquisitions.some(r=>r.kind==='farm-arrival'));
    const farm=acquisitions[0].data.nativeFarmArrivalBinding;
    const endpoint=await step();
    await untilProduction(world,()=>acquisitions.some(r=>r.kind==='idle-cycle'));
    const idle=acquisitions.find(r=>r.kind==='idle-cycle').data.nativeIdleCycleBinding;
    const resting=world.snapshot().workers[0];
    assert.equal(resting.nativeRouteAdmission,'native-idle');
    assert.equal(idle.reference.bodyId,farm.reference.bodyId);
    assert.deepEqual(pose(resting),pose(endpoint.workers[0]));
    let current;
    for(let i=0;i<4&&!current?.raid;i++)current=await step();
    const spawn=events.find(e=>e.type==='RaidSpawned');
    assert(spawn);
    assert.equal(current.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    assert.equal(current.raid.animals[0].targetId,center.id);
    const waitingAnimal={x:current.raid.animals[0].x,z:current.raid.animals[0].z};
    await untilProduction(world,()=>!!stagedHome);
    for(let i=0;i<3;i++){
      current=await step();
      const worker=current.workers[0],animal=current.raid.animals[0];
      assert.equal(worker.nativeRouteAdmission,'pending-raid-flight-resources');
      assert.equal(worker.idleState,null);
      assert.deepEqual(pose(worker),pose(resting));
      assert.deepEqual({x:animal.x,z:animal.z},waitingAnimal);
    }
    assert.equal(stagedHome.committed,false);
    assert(!acquisitions.some(r=>r.kind==='animal-crop-route'));
    releaseHome();
    for(let i=0;i<200&&current.workers[0].status!=='home';i++)current=await step();
    const home=acquisitions.find(r=>r.kind==='home-route')?.data.nativeHomeRouteBinding;
    const absence=acquisitions.find(r=>r.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    assert.equal(home?.reference.bodyId,idle.reference.bodyId);
    assert.equal(home.reference.sourceRequest.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    const source=home.reference.sourceRequest.pose;
    assert.deepEqual([source.x,source.z,source.yaw,source.runPhase,source.walkPhase,source.carryPhase,source.runRemaining],pose(resting));
    assert.deepEqual(home.gateIds,[gateId]);
    assert(!world.records.some(r=>r.kind==='farm-arrival-stop'));
    assert.equal(absence?.reference.bodyId,idle.reference.bodyId);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    for(let i=0;i<1250&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    const resumed=acquisitions.findLast(r=>r.kind==='farm-arrival').data.nativeFarmArrivalBinding;
    assert.equal(resumed.reference.actorId,idle.reference.actorId);
    assert.notEqual(resumed.reference.bodyId,idle.reference.bodyId);
    assert.equal(resumed.reference.sourceRequest.refugeSequence,absence.retiredSequence);
    assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(current.ledger,state.ledger);
  }finally{releaseHome();await world.close();}
});

function restoredGatedDesertStroll(){
  const fixture=gatedDesertRaid(),{state,start,center}=fixture;
  const worker=state.workers[0],goal=centerServicePoint(center,state,.8),anchorId='farm-'+center.id;
  const {idleSeconds}=LOCOMOTION.sources.find(row=>row.profile===worker.profile);
  Object.assign(worker,{x:start.x,z:6,status:'idle',nativeRouteAdmission:'native-idle-stroll',running:false,gateWaiting:false,destinationId:anchorId,
    idleState:{anchorId,mode:'walk',elapsed:0,remaining:idleSeconds*2,rng:1,approachRetry:0,destination:{id:anchorId,...goal}}});
  state.dayPlan.at=state.time+.3;
  return {...fixture,state:deserialize(serialize(state)),goal};
}

for(const finishWalk of [false,true])test('RaidSpawned transfers acquired Idle22 '+(finishWalk?'at its executed endpoint':'through Stop12'),async()=>{
  const {state,chunkKeys,start,center,gateId,goal}=restoredGatedDesertStroll();
  let firstStop,stopSignal,releaseStop;
  const retained=new Promise(resolve=>{releaseStop=resolve;});
  const acquisitions=[],events=[];
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record,{signal}){if(record.kind==='idle-stroll-stop'&&!firstStop){firstStop=record;stopSignal=signal;await retained;}},
    onCommit(record,data){acquisitions.push({kind:record.kind,data});}});
  async function step(steps=1){
    const result=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps});
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    events.push(...result.events);
    await world.present();
    assert.deepEqual(world.faults,[]);
    return JSON.parse(result.snapshot);
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>acquisitions.some(r=>r.kind==='idle-stroll'));
    const stroll=acquisitions[0].data.nativeIdleStrollBinding;
    let current;
    for(let i=0;i<5;i++)current=await step();
    assert.equal(current.raid,null);
    current=await step(2);
    const spawn=events.find(e=>e.type==='RaidSpawned');
    assert(spawn);
    assert(current.elapsed>spawn.simulationTime);
    assert.equal(current.raid.animals[0].targetId,center.id);
    assert(current.elapsed<stroll.reference.endTime);
    assert.equal(current.workers[0].nativeRouteAdmission,'pending-idle-flight-stop');
    assert.equal(confirmedStateSaveAvailable(current),false);
    const atSpawn=current.workers[0],animalAtSpawn=current.raid.animals[0];
    await untilProduction(world,()=>!!firstStop);
    for(let i=0;i<3;i++){
      current=await step();
      const w=current.workers[0],animal=current.raid.animals[0],sample=w.nativeIdleFlightSample;
      assert.equal(w.nativeRouteAdmission,'pending-idle-flight-stop');
      assert.equal(w.idleState,null);
      assert(w.z<atSpawn.z&&w.walkPhase>atSpawn.walkPhase);
      assert.equal(w.runRemaining,atSpawn.runRemaining);
      assert.equal(sample.bodyId,stroll.reference.bodyId);
      assert.equal(sample.at,current.elapsed);
      assert.equal(sample.nativeRoute.assignmentSequence,stroll.assignmentSequence);
      assert.deepEqual(sample.nativeRoute.routeHandle,stroll.reference.expectedRouteHandle);
      assert.deepEqual([animal.x,animal.z],[animalAtSpawn.x,animalAtSpawn.z]);
    }
    assert.equal(firstStop.committed,false);
    assert(!acquisitions.some(r=>r.kind==='animal-crop-route'));
    if(finishWalk){
      for(let i=0;i<80&&!stopSignal.aborted;i++)current=await step();
      assert(stopSignal.aborted,'the owner cancels Stop12 when the WALK reaches its endpoint');
      assert(current.elapsed>=stroll.reference.endTime);
    }
    releaseStop();
    for(let i=0;i<200&&current.workers[0].status!=='home';i++)current=await step();
    const stop=acquisitions.find(r=>r.kind==='idle-stroll-stop')?.data.nativeIdleStrollStopBinding;
    const home=acquisitions.find(r=>r.kind==='home-route')?.data.nativeHomeRouteBinding;
    const absence=acquisitions.find(r=>r.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    assert(finishWalk?firstStop.aborted:firstStop.aborted||firstStop.committed);
    assert.equal(!!stop,!finishWalk);
    assert.equal(home?.reference.bodyId,stroll.reference.bodyId);
    assert.equal(absence?.reference.bodyId,stroll.reference.bodyId);
    const source=home.reference.sourceRequest;
    assert.equal(source.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    if(stop){
      const row=stop.projection.routeEffects.rows;
      assert.deepEqual(stop.reference.sourceRoute.routeHandle,stroll.reference.expectedRouteHandle);
      assert.deepEqual(['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'].map(key=>source.pose[key]),[8,9,12,17,18,19,22].map(i=>row[i]));
    }else{
      assert.deepEqual([source.pose.x,source.pose.z],[Math.fround(goal.x),Math.fround(goal.z)]);
    }
    assert.deepEqual(home.gateIds,[gateId]);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    assert.equal(current.structures.find(row=>row.id==='structure-'+gateId).gateOpen,1);
    for(let i=0;i<1250&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    const civil=acquisitions.findLast(r=>r.kind==='farm-arrival').data.nativeFarmArrivalBinding;
    assert.equal(civil.reference.actorId,stroll.reference.actorId);
    assert.notEqual(civil.reference.bodyId,stroll.reference.bodyId);
    assert.equal(civil.reference.sourceRequest.refugeSequence,absence.retiredSequence);
    assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(current.ledger,state.ledger);
  }finally{releaseStop();await world.close();}
});

function restoredGatedDesertInitialIdle(){
  const fixture=gatedDesertRaid(),{state,start,center}=fixture;
  Object.assign(state.workers[0],{x:start.x,z:5,status:'idle',nativeRouteAdmission:'native-idle',running:false,gateWaiting:false,destinationId:null,
    idleState:{anchorId:'farm-'+center.id,mode:'rest',elapsed:0,remaining:2.3,rng:1,approachRetry:0}});
  state.dayPlan.at=state.time+.3;
  return {...fixture,state:deserialize(serialize(state))};
}

for(const mode of ['stopped','arrived','pending Action15','foreign Task','foreign raid'])test('RaidSpawned transfers the acquired Task14 body: '+mode,async()=>{
  const {state,chunkKeys,start,gate,gateId}=restoredGatedDesertInitialIdle();
  const wall={...gate,id:`structure-${state.nextId++}`,gate:false,x:-11,z:1,hp:0,status:'ruined'};
  state.structures.push(wall);
  const pendingAction=mode==='pending Action15',raidDelay=pendingAction?4.5:1.35;
  state.dayPlan.at=state.time+raidDelay;
  const spawnAt=state.elapsed+raidDelay;
  const worker=state.workers[0],events=[],acquisitions=[];
  let ready,readySignal,releaseReady,birth,homeRequest;
  const held=new Promise(resolve=>{releaseReady=resolve;});
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record,{signal}){if(record.kind===(pendingAction?'task-action':'task-route-stop')&&!ready){ready=record;readySignal=signal;await held;}},
    onCommit(record,data){acquisitions.push({kind:record.kind,data});}});
  const post=world.controlPort.postMessage;
  world.controlPort.postMessage=change=>{
    if(change.raidFlightBirth){
      birth=change.raidFlightBirth;
      if(mode==='foreign Task')change={...change,raidFlightBirth:{...birth,taskTicket:birth.taskTicket+1}};
    }
    if(change.homeRequest?.version===2){
      homeRequest=change.homeRequest;
      if(mode==='foreign raid')change={...change,homeRequest:{...homeRequest,raidSpawnSequence:homeRequest.raidSpawnSequence+1}};
    }
    post(change);
  };
  async function step(steps=1){
    const result=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps});
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    events.push(...result.events);
    await world.present();
    if(!mode.startsWith('foreign'))assert.deepEqual(world.faults,[]);
    return JSON.parse(result.snapshot);
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>acquisitions.some(row=>row.kind==='initial-idle-body'));
    assert.equal(world.command({kind:'requestRepair',id:'interrupt-repair-task',targetId:wall.id}).value,true);
    let current;
    for(let i=0;i<18;i++)current=await step();
    const route=acquisitions.find(row=>row.kind==='task-start')?.data.nativeTaskStartBinding;
    assert(route);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-task');
    assert.equal(current.workers[0].taskId,`task-${route.reference.taskId}`);
    while(current.elapsed<spawnAt-.050001)current=await step();
    if(pendingAction){
      await untilProduction(world,()=>!!ready);
      assert.equal(readySignal.aborted,false);
      assert.equal(current.raid,null);
      const action=nativeResourceAdmissionProfile('task-action').reference(ready.resources);
      assert.equal(action.request.bodyId,route.reference.bodyId);
      assert.equal(action.request.nativeRoute.assignmentSequence,route.assignmentSequence);
      assert.deepEqual(action.request.nativeRoute.routeHandle,route.reference.expectedRouteHandle);
      assert.equal(action.request.actionKind,'repair');
      assert.equal(action.request.taskId,route.reference.taskId);
      assert(action.startTime>=route.reference.endTime);
    }
    current=await step(2);
    const spawn=events.find(e=>e.type==='RaidSpawned');
    assert(spawn&&current.elapsed>spawn.simulationTime);
    assert.deepEqual([birth.taskTicket,birth.sourceSequence,birth.workerBody],
      [route.reference.worldBoundary.ticket,route.assignmentSequence,route.reference.bodyId]);
    if(mode==='foreign Task'){
      await assert.rejects(untilProduction(world,()=>false),/Crop birth lacks its current raid flight peer/);
      assert.equal(acquisitions.filter(row=>row.kind==='task-route-stop'||row.kind==='home-route').length,0);
      return;
    }
    assert.equal(current.raid.animals[0].targetId,'structure-2');
    assert.equal(current.workers[0].taskId,null);
    assert(!current.tasks.some(task=>task.id===`task-${route.reference.taskId}`));
    await untilProduction(world,()=>!!ready);
    const born=current.raid.animals[0];
    const before=current.workers[0].nativeTaskFlightSample;
    assert.equal(before.bodyId,route.reference.bodyId);
    assert.equal(before.nativeRoute.assignmentSequence,route.assignmentSequence);
    assert.equal(confirmedStateSaveAvailable(current),false);
    const limit=pendingAction?current.elapsed:mode==='arrived'?route.reference.endTime:current.elapsed+.145;
    while(current.elapsed<limit){
      current=await step();
      assert.deepEqual([current.raid.animals[0].x,current.raid.animals[0].z],[born.x,born.z]);
      assert(!acquisitions.some(row=>row.kind==='animal-crop-route'));
    }
    if(mode==='arrived'||pendingAction)await untilProduction(world,()=>readySignal.aborted);
    else assert.equal(readySignal.aborted,false);
    assert.equal(ready.committed,false);
    releaseReady();
    if(mode==='foreign raid'){
      await assert.rejects(untilProduction(world,()=>false),/Native gate resources not committed|Native raid flight requires its Farm, Idle or Task source/);
      assert(world.errors.some(error=>/Native raid flight requires its Farm, Idle or Task source/.test(String(error))));
      assert(!acquisitions.some(row=>row.kind==='home-route'));
      return;
    }
    for(let i=0;i<230&&current.workers[0].status!=='home';i++)current=await step();
    const stop=acquisitions.find(row=>row.kind==='task-route-stop')?.data.nativeTaskRouteStopBinding;
    assert.equal(!!stop,mode==='stopped');
    assert.equal(homeRequest.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    if(stop){
      assert.equal(stop.reference.sourceRoute.assignmentSequence,route.assignmentSequence);
      const row=stop.projection.routeEffects.rows.slice(8);
      assert.deepEqual(['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'].map(key=>homeRequest.pose[key]),
        [0,1,4,9,10,11,14].map(index=>row[index]));
    }else{
      assert(homeRequest.requestedAt>=route.reference.endTime);
      if(pendingAction){
        for(const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'])
          assert.equal(homeRequest.pose[key],before.pose[key==='yaw'?'heading':key]);
        assert(!acquisitions.some(row=>row.kind==='task-action'));
      }
    }
    const home=acquisitions.find(row=>row.kind==='home-route')?.data.nativeHomeRouteBinding;
    const refuge=acquisitions.find(row=>row.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    assert.deepEqual(home.reference.sourceRequest,homeRequest);
    assert.equal(home.reference.bodyId,route.reference.bodyId);
    assert.equal(refuge.reference.bodyId,route.reference.bodyId);
    assert.deepEqual(home.gateIds,[gateId]);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    for(let i=0;i<1450&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].id,worker.id);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    assert.equal(current.structures.find(s=>s.id===wall.id).hp,0);
    assert(!events.some(e=>e.type==='RepairApplied'||e.type==='WorkerHit'));
    assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
    const civil=acquisitions.findLast(row=>row.kind==='farm-arrival').data.nativeFarmArrivalBinding.reference;
    assert.notEqual(civil.bodyId,route.reference.bodyId);
    assert.equal(civil.sourceRequest.refugeSequence,refuge.retiredSequence);
    assert.deepEqual(current.ledger,state.ledger);
  }finally{releaseReady();await world.close();}
});

for(const foreign of [false,true])test('RaidSpawned transfers acquired Repair Action15'+(foreign?' only with its exact source':' while the wall restoration READY is retained'),async()=>{
  const {state,chunkKeys,start,gate,gateId}=restoredGatedDesertInitialIdle();
  const wall={...gate,id:`structure-${state.nextId++}`,gate:false,x:-11,z:1,hp:0,status:'ruined'};
  state.structures.push(wall);
  state.dayPlan.at=state.time+4.8;
  const worker=state.workers[0],spawnAt=state.elapsed+4.8,events=[],acquisitions=[];
  let restoration,restorationSignal,homeReady,releaseRestoration,releaseHome;
  let handoff,birth;
  const held=new Promise(resolve=>{releaseRestoration=resolve;}),heldHome=new Promise(resolve=>{releaseHome=resolve;});
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record,{signal}){
      if(record.kind==='barrier-addition'&&!restoration){restoration=record;restorationSignal=signal;await held;}
      if(record.kind==='home-route'&&!homeReady){homeReady=record;await heldHome;}
    },onCommit(record,data){acquisitions.push({kind:record.kind,data});}});
  const post=world.controlPort.postMessage;
  world.controlPort.postMessage=change=>{
    if(change.repairFlightSequence!==undefined){
      handoff=change;
      if(foreign)change={...change,repairFlightSequence:change.repairFlightSequence+1};
    }
    if(change.raidFlightBirth)birth=change.raidFlightBirth;
    post(change);
  };
  async function step(steps=1){
    const result=world.command({kind:'advance',seconds:.05,steps,nightFastForward:false});
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    events.push(...result.events);
    await world.present();
    if(!foreign)assert.deepEqual(world.faults,[]);
    return JSON.parse(result.snapshot);
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>acquisitions.some(row=>row.kind==='initial-idle-body'));
    assert.equal(world.command({kind:'requestRepair',id:'interrupt-acquired-repair',targetId:wall.id}).value,true);
    let current=await step();
    while(current.elapsed<spawnAt-.050001)current=await step();
    await untilProduction(world,()=>!!restoration);
    const action=acquisitions.find(row=>row.kind==='task-action')?.data.nativeTaskActionBinding;
    const before=current.workers[0];
    assert.equal(before.nativeRouteAdmission,'native-action');
    assert.equal(before.taskId,`task-${action.reference.request.taskId}`);
    assert.equal(restoration.nativeBarrierWallEntities[0].id,wall.id);
    assert.equal(restorationSignal.aborted,false);
    assert.equal(restoration.committed,false);
    current=await step(2);
    const spawn=events.find(event=>event.type==='RaidSpawned');
    assert(spawn&&spawn.simulationTime<current.elapsed);
    assert.equal(handoff.repairFlightSequence,action.actionSequence);
    assert.equal(handoff.homeRequest.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    assert.equal(handoff.homeRequest.bodyId,action.reference.request.bodyId);
    const keys=['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'];
    assert.deepEqual(keys.map(key=>handoff.homeRequest.pose[key]),keys.map(key=>before[key==='yaw'?'heading':key]));
    if(foreign){
      await assert.rejects(untilProduction(world,()=>false),/Native Home flight lacks its acquired Repair action/);
      assert(!acquisitions.some(row=>row.kind==='home-route'||row.kind==='barrier-addition'));
      return;
    }
    assert.equal(current.raid.animals[0].targetId,'structure-2');
    assert.equal(current.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    assert.equal(birth.sourceSequence,handoff.homeRequest.requestSequence);
    assert.equal(birth.workerBody,handoff.homeRequest.bodyId);
    await untilProduction(world,()=>restorationSignal.aborted);
    releaseRestoration();
    await untilProduction(world,()=>restoration.aborted&&!!homeReady);
    const animal=current.raid.animals[0];
    for(let i=0;i<3;i++){
      current=await step();
      assert.deepEqual(keys.map(key=>current.workers[0][key==='yaw'?'heading':key]),keys.map(key=>before[key==='yaw'?'heading':key]));
      assert.deepEqual([current.raid.animals[0].x,current.raid.animals[0].z],[animal.x,animal.z]);
    }
    releaseHome();
    for(let i=0;i<230&&current.workers[0].status!=='home';i++)current=await step();
    const home=acquisitions.find(row=>row.kind==='home-route')?.data.nativeHomeRouteBinding;
    const refuge=acquisitions.find(row=>row.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    assert.deepEqual(home.reference.sourceRequest,handoff.homeRequest);
    assert.equal(refuge.reference.bodyId,handoff.homeRequest.bodyId);
    assert.deepEqual(home.gateIds,[gateId]);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    for(let i=0;i<1450&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].id,worker.id);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    const civil=acquisitions.findLast(row=>row.kind==='farm-arrival').data.nativeFarmArrivalBinding.reference;
    assert.notEqual(civil.bodyId,refuge.reference.bodyId);
    assert.equal(civil.sourceRequest.refugeSequence,refuge.retiredSequence);
    assert(!acquisitions.some(row=>row.kind==='barrier-addition'||row.kind==='task-route-stop'));
    assert.equal(current.structures.find(s=>s.id===wall.id).hp,0);
    assert(!events.some(e=>e.type==='RepairApplied'||e.type==='WorkerHit'));
    assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(current.ledger,state.ledger);
  }finally{releaseRestoration();releaseHome();await world.close();}
});

for(const {label,holdKind,flightField,restore,negative,taskOwner,terminal} of [
  {label:'replaces pending Idle22',holdKind:'idle-stroll',flightField:'strollFlightSequence',restore:restoredGatedDesertStroll,negative:/Native Home flight lacks its pending restored stroll source/},
  {label:'replaces pending Idle20',holdKind:'initial-idle-body',flightField:'initialIdleFlightSequence',restore:restoredGatedDesertInitialIdle,negative:/Native Home flight lacks its initial Idle source/},
  {label:'takes acquired Idle20 with pending Idle21',holdKind:'idle-cycle',flightField:'initialIdleFlightSequence',restore:restoredGatedDesertInitialIdle,negative:/Native Home flight lacks its initial Idle source/},
  {label:'cancels pending Task14 from Idle20',holdKind:'task-start',taskOwner:20,flightField:'initialIdleFlightSequence',restore:restoredGatedDesertInitialIdle,negative:/Native pending Task cancellation lacks its retained Idle owner/},
  {label:'cancels pending Task14 from Idle21',holdKind:'task-start',taskOwner:21,restore:restoredGatedDesertInitialIdle,negative:/Native pending Task cancellation lacks its retained Idle owner/},
  {label:'cancels pending Task14 from terminal Idle21',holdKind:'task-start',taskOwner:21,terminal:true,restore:restoredGatedDesertInitialIdle,negative:/Native pending Task cancellation lacks its retained Idle owner/},
])for(const tampered of terminal?[false]:[false,true])test('RaidSpawned '+label+(tampered?' only with its native source':' with the original stationary body'),async()=>{
  const {state,chunkKeys,start,center,gateId,gate}=restore(),initial=state.workers[0];
  const raidDelay=terminal?7.05:.3;
  let repairWall;
  if(taskOwner){
    repairWall={...gate,id:`structure-${state.nextId++}`,gate:false,x:-11,z:1,hp:0,status:'ruined'};
    state.structures.push(repairWall);
    state.dayPlan.at=state.time+raidDelay;
  }
  let old,oldSignal,homeReady,releaseOld,releaseHome;
  const oldReady=new Promise(resolve=>{releaseOld=resolve;}),newReady=new Promise(resolve=>{releaseHome=resolve;});
  const events=[],acquisitions=[];
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record,{signal}){
      if(record.kind===holdKind&&!old){old=record;oldSignal=signal;await oldReady;}
      if(record.kind==='home-route'&&!homeReady){homeReady=record;await newReady;}
    },
    onCommit(record,data){acquisitions.push({kind:record.kind,data});}});
  const post=world.controlPort.postMessage;
  let handoff,birth,cancellation;
  world.controlPort.postMessage=change=>{
    if(change.pendingTaskCancellation){
      assert.equal(handoff,undefined,'cancellation must precede Home');
      cancellation=change.pendingTaskCancellation;
      if(tampered&&taskOwner)change={...change,pendingTaskCancellation:{...cancellation,owner:{...cancellation.owner,ticket:cancellation.owner.ticket+1}}};
    }
    if(change.homeRequest?.version===2){
      handoff=change;
      if(tampered&&!taskOwner)change={...change,[flightField]:change[flightField]+1};
    }
    if(change.raidFlightBirth)birth=change.raidFlightBirth;
    post(change);
  };
  const pose=w=>[w.x,w.z,w.heading,w.runPhase,w.walkPhase,w.carryPhase,w.runRemaining];
  async function step(steps=1){
    const result=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps});
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    events.push(...result.events);
    await world.present();
    if(!tampered)assert.deepEqual(world.faults,[]);
    return JSON.parse(result.snapshot);
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    let current;
    if(taskOwner){
      await untilProduction(world,()=>acquisitions.some(row=>row.kind==='initial-idle-body'));
      if(taskOwner===21){world.snapshot();await untilProduction(world,()=>acquisitions.some(row=>row.kind==='idle-cycle'));}
      assert.equal(world.command({kind:'requestRepair',id:'cancel-pending-repair',targetId:repairWall.id}).value,true);
      current=await step();
    }
    await untilProduction(world,()=>!!old);
    const installed=acquisitions.find(r=>r.kind==='initial-idle-body')?.data.nativeInitialIdleBodyBinding;
    assert.equal(!!installed,holdKind==='idle-cycle'||!!taskOwner);
    const cycle=acquisitions.find(r=>r.kind==='idle-cycle')?.data.nativeIdleCycleBinding;
    assert.equal(!!cycle,taskOwner===21);
    const request=installed?.reference.sourceRequest??nativeResourceAdmissionProfile(holdKind).reference(old.resources).sourceRequest;
    const sourceSequence=installed?.bodySequence??request.requestSequence;
    while((current?.elapsed??state.elapsed)<state.elapsed+raidDelay-.050001)current=await step();
    assert.equal(current.raid,null);
    assert.deepEqual(pose(current.workers[0]),pose(initial));
    const pendingTaskId=current.workers[0].taskId;
    current=await step(2);
    const spawn=events.find(e=>e.type==='RaidSpawned');
    assert(spawn);
    if(tampered){
      await assert.rejects(untilProduction(world,()=>false),negative);
      assert(!world.records.some(r=>r.kind==='home-route'&&r.committed));
      return;
    }
    assert.equal(current.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    assert.equal(current.raid.animals[0].targetId,center.id);
    assert.equal(confirmedStateSaveAvailable(current),false);
    await untilProduction(world,()=>oldSignal.aborted&&!!handoff&&!!birth);
    if(flightField)assert.equal(handoff[flightField],sourceSequence);
    if(taskOwner){
      const oldRoute=nativeResourceAdmissionProfile(holdKind).reference(old.resources);
      assert.equal(cancellation.effectiveTime,spawn.simulationTime);
      assert.equal(cancellation.owner.kind,taskOwner);
      assert.equal(cancellation.owner.sequence,cycle?.cycleSequence??installed.bodySequence);
      assert.equal(cancellation.owner.ticket,(cycle??installed).reference.worldBoundary.ticket);
      assert.equal(cancellation.owner.bodyId,request.bodyId);
      assert.equal(cancellation.request.requestSequence,oldRoute.requestSequence);
      assert.equal(pendingTaskId,`task-${cancellation.request.taskId}`);
      assert.equal(cancellation.request.targetId,oldRoute.targetId);
      assert.deepEqual(cancellation.request.requestHandle,oldRoute.sourceRequestHandle);
      assert.equal(current.workers[0].taskId,null);
      assert(!current.tasks.some(t=>t.id===pendingTaskId));
      if(terminal)assert(spawn.simulationTime>cancellation.owner.endTime,`Spawn ${spawn.simulationTime} must be after Idle21 end ${cancellation.owner.endTime}`);
    }
    assert.equal(handoff.homeRequest.bodyId,request.bodyId);
    assert.equal(handoff.homeRequest.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    assert.deepEqual(handoff.homeRequest.pose,request.pose);
    assert.equal(birth.sourceSequence,handoff.homeRequest.requestSequence);
    assert.equal(birth.workerBody,request.bodyId);
    assert.equal(birth.raidSpawnSequence,handoff.homeRequest.raidSpawnSequence);
    releaseOld();
    await untilProduction(world,()=>old.aborted&&!!homeReady);
    const born=current.raid.animals[0];
    for(let i=0;i<3;i++){
      current=await step();
      assert.equal(current.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
      assert.deepEqual(pose(current.workers[0]),pose(initial));
      assert.deepEqual([current.raid.animals[0].x,current.raid.animals[0].z],[born.x,born.z]);
    }
    assert.equal(old.committed,false);
    assert.equal(homeReady.committed,false);
    releaseHome();
    for(let i=0;i<200&&current.workers[0].status!=='home';i++)current=await step();
    const home=acquisitions.find(r=>r.kind==='home-route')?.data.nativeHomeRouteBinding;
    const absence=acquisitions.find(r=>r.kind==='home-arrival')?.data.nativeHomeArrivalBinding;
    assert.equal(home?.reference.bodyId,request.bodyId);
    assert.deepEqual(home.reference.sourceRequest,handoff.homeRequest);
    assert.deepEqual(home.gateIds,[gateId]);
    assert.equal(absence?.reference.bodyId,request.bodyId);
    assert(!world.records.some(r=>['idle-stroll-stop','farm-arrival-stop','task-route-stop'].includes(r.kind)));
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    assert.equal(current.structures.find(row=>row.id==='structure-'+gateId).gateOpen,1);
    for(let i=0;i<1250&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    const civil=acquisitions.findLast(r=>r.kind==='farm-arrival').data.nativeFarmArrivalBinding;
    assert.equal(civil.reference.actorId,request.actorId);
    assert.notEqual(civil.reference.bodyId,request.bodyId);
    assert.equal(civil.reference.sourceRequest.refugeSequence,absence.retiredSequence);
    assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(current.ledger,state.ledger);
    if(taskOwner){
      assert(!world.records.some(r=>r.kind==='task-start'&&r.committed));
      assert(!events.some(e=>e.type==='RepairApplied'));
      assert.equal(current.structures.find(s=>s.id===repairWall.id).hp,0);
    }
  }finally{releaseOld();releaseHome();await world.close();}
});

test('the Desert Farm gate remains with Home while the animal takes a different corridor', async () => {
  const {state,chunkKeys,start,center,gate,gateId}=gatedDesertRaid();
  const acquisitions=[];
  const manifest={epoch:'desert-gated',chunks:chunkKeys.map(key=>{
    const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
  })};
  let rig,rigReady;
  async function ensureRig(current){
    rigReady??=originalRig(structuredClone(current),manifest);
    rig=await rigReady;
  }
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    getTerrainManifest:()=>manifest,
    async onPrepare(record){
      if(!record.kind.startsWith('animal-crop-'))return;
      const current=world.snapshot();
      if(!rig)await ensureRig(current);
      rig.update(current);
      await rig.prepare(record.resources);
    },
    onCommit(record,data){
      const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;
      if(proof)rig.commit(proof,data);
      acquisitions.push({kind:record.kind,data});
    }});
  async function step(){
    const result=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});}
    const current=JSON.parse(result.snapshot);
    if(current.raid&&!rig)await ensureRig(current);
    rig?.update(current);
    await world.present();
    return current;
  }
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>acquisitions.some(row=>row.kind==='farm-arrival'));
    assert.deepEqual(acquisitions[0].data.nativeFarmArrivalBinding.gateIds,[gateId]);
    let current,atSpawn;
    for(let i=0;i<160;i++){
      current=await step();
      if(current.raid&&!atSpawn){
        atSpawn=current;
        await untilProduction(world,()=>{world.snapshot();return acquisitions.some(row=>row.kind==='farm-arrival-stop');});
      }
      if(atSpawn&&current.workers[0].status==='home')break;
    }
    assert(atSpawn);
    assert(Math.abs(atSpawn.workers[0].z-gate.z)<.65);
    assert.deepEqual(acquisitions.map(row=>row.kind),['farm-arrival','farm-arrival-stop','home-route','animal-crop-route','home-arrival']);
    const [farm, ,home,animal,absence]=acquisitions.map(row=>row.data);
    assert.deepEqual(home.nativeHomeRouteBinding.gateIds,[gateId]);
    assert.equal(home.nativeHomeRouteBinding.reference.bodyId,farm.nativeFarmArrivalBinding.reference.bodyId);
    assert.notEqual(animal.nativeAnimalCropRouteBinding.reference.bodyId,home.nativeHomeRouteBinding.reference.bodyId);
    assert.equal(animal.nativeAnimalCropRouteBinding.reference.purpose,'center');
    assert.deepEqual(absence.nativeHomeArrivalBinding.reference.sourceHome.gateIds,[gateId]);
    assert.equal(current.workers[0].hits,0);
    assert.deepEqual([current.workers[0].x,current.workers[0].z],[start.x,start.z]);
    assert.equal(current.structures.find(value=>value.id===gate.id).gateOpen,1);
    assert.equal(current.raid.animals[0].targetId,center.id);
    for(let i=0;i<900&&(current.raid||current.workers[0].nativeRouteAdmission!=='native-idle');i++)current=await step();
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    assert.equal(current.workers[0].id,state.workers[0].id);
    assert.equal(current.workers[0].hits,0);
    assert.equal(current.structures.find(value=>value.id===gate.id).hp,60);
    assert.deepEqual(current.events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560,540,520]);
    assert.deepEqual(current.ledger,state.ledger);
    const retreat=acquisitions.findLast(row=>row.kind==='animal-crop-route').data.nativeAnimalCropRouteBinding.reference;
    const returnFarm=acquisitions.findLast(row=>row.kind==='farm-arrival').data.nativeFarmArrivalBinding;
    assert.equal(retreat.purpose,'retreat');
    assert.equal(retreat.bodyId,animal.nativeAnimalCropRouteBinding.reference.bodyId);
    assert.notEqual(returnFarm.reference.bodyId,farm.nativeFarmArrivalBinding.reference.bodyId);
    assert.equal(returnFarm.reference.sourceRequest.refugeSequence,absence.nativeHomeArrivalBinding.retiredSequence);
    assert.equal(returnFarm.reference.motionFlags,0);
    assert.deepEqual(returnFarm.gateIds,[gateId]);
    assert.equal(rig.centerReturns,4);assert.equal(rig.runningReturns,1);
    assert.deepEqual(world.faults,[]);
  }finally{await world.close();rig?.close();}
});

test('a gate in an unacquired Farm proposal grants no mixed admission away from the refuge', async () => {
  const {state,chunkKeys,gateId,start}=gatedDesertRaid();
  state.workers[0].z=start.z+.25;
  let release;
  const hold=new Promise(resolve=>{release=resolve;});
  let farm;
  const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
    async onReady(record){if(record.kind==='farm-arrival'){farm=record;await hold;}}});
  try{
    world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}}});
    await untilProduction(world,()=>!!farm);
    assert.deepEqual(farm.resources.gates.map(gate=>gate.gateId),[gateId]);
    let atSpawn;
    for(let i=0;i<90&&!atSpawn?.raid;i++){
      const result=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:1});
      atSpawn=JSON.parse(result.snapshot);
      await world.present();
    }
    assert.equal(atSpawn.raid?.animals[0].targetId,null);
    release();
    await untilProduction(world,()=>farm.aborted);
    assert.equal(farm.committed,false);
    assert.equal(world.snapshot().workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
    assert.deepEqual(world.records.map(row=>row.kind),['farm-arrival']);
    assert.deepEqual(world.faults,[]);
  }finally{release();await world.close();}
});

for (const moving of [false, true]) {
  test('RaidSpawned transfers ' + (moving ? 'an acquired Farm through Stop24' : 'a pending Farm despite late READY') + ' to its stationary refuge request', async () => {
    const fixture = nativeFarmArrivalRouteFixture({peer: false});
    const save = structuredClone(fixture.state);
    fixture.close();
    save.dayPlan = {done: false, at: save.time + 0.8, group: ['warthog']};
    save.ledger.balance = {n: '100000', d: '1'};
    const chunkKeys = Array.from({length: 25}, (_, i) => (i % 5 - 2) + ',' + (Math.floor(i / 5) - 2));
    let release, farm, stopGo;
    const ready = new Promise(resolve => { release = resolve; });
    const f = await nativeProductionAuthority(save, {
      qualifyFarmFlee: true, chunkKeys,
      onCommit(record, data) { if (record.kind === 'farm-arrival-stop') stopGo = data.worldBoundary; },
      async onReady(record) {
        if (record.kind === 'farm-arrival' && !farm) {
          farm = record;
          if (!moving) await ready;
        }
      },
    });
    // Let the semantic request overtake the first RAF after Stop24 GO.
    // The stopped rig must already be drawable with the new intent watermark.
    const present = f.host.present.bind(f.host);
    let holdStopRaf = moving;
    f.host.present = (...args) => {
      if (holdStopRaf && f.records.some(r => r.kind === 'farm-arrival-stop' && r.committed)) return;
      return present(...args);
    };
    const requests = [];
    const post = f.controlPort.postMessage;
    f.controlPort.postMessage = data => {
      if (data.homeRequest) requests.push(data.homeRequest);
      post(data);
    };
    try {
      await untilProduction(f, () => moving ? farm?.committed : !!farm);
      f.command({kind: 'setNavigationView', view: {bounds: [-48,-48,48,48], eye: {x: -10,z: 24}, target: {x: -10,z: 0}}});
      let state;
      for (let i = 0; i < 25; i++) {
        const step = f.command({kind: 'advance', seconds: 0.05, nightFastForward: false, steps: 1});
        state = JSON.parse(step.snapshot);
        if (state.raid) break;
        for (const key of step.residency?.missing ?? []) {
          const [cx, cz] = key.split(',').map(Number);
          f.command({kind: 'addChunk', cx, cz});
        }
        await f.present();
      }
      const spawn = state.events.findLast(event => event.type === 'RaidSpawned');
      assert.ok(spawn);
      assert.equal(state.workers[0].status, 'fleeing');
      assert.equal(state.workers[0].nativeRouteAdmission, moving ? 'pending-farm-flight-stop' : 'pending-raid-flight-resources');
      release();
      await untilProduction(f, () => {
        f.snapshot();
        return requests.length > 0 && (moving ? f.records.some(r => r.kind === 'farm-arrival-stop' && r.committed) : farm.aborted);
      });
      if (moving) {
        const stop = f.records.find(r => r.kind === 'farm-arrival-stop');
        await f.present();
        const pending = f.host.inspect();
        assert.ok(pending.pendingSequence);
        const clock = pending.nativeCausalClock;
        assert.equal(clock.committedThrough, state.elapsed);
        assert.ok(clock.intentSequence >= requests.at(-1).requestSequence, 'Stationary request exceeds draw clock watermark');
        assert.ok(stopGo);
        assert.equal(pending.samples.some(row => row.nativeWorldBoundary?.ticket === stopGo.ticket), false);
        holdStopRaf = false;
        await f.present();
        assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.effectiveTime, state.elapsed);
        assert.deepEqual(f.host.inspect().nativeRouteFrame.worldBoundary, stopGo);
        await stop.packet.presented;
      }
      const final = f.snapshot(), worker = final.workers[0], request = requests.at(-1);
      assert.equal(final.elapsed, state.elapsed);
      assert.equal(worker.nativeRouteAdmission, 'pending-raid-flight-resources');
      assert.equal(confirmedStateSaveAvailable(final), false);
      assert.throws(() => serialize(final), /Solicitud de recursos/);
      assert.deepEqual(f.records.map(r => r.kind), moving ? ['farm-arrival', 'farm-arrival-stop'] : ['farm-arrival']);
      assert.equal(farm.committed, moving);
      assert.equal(request.version, 2);
      assert.equal(request.raidSpawnSequence, Number(spawn.id.split('-').at(-1)));
      assert.equal(request.bodyId, farm.resources.bodyId);
      const village = state.villages.find(v => v.id === worker.villageId);
      assert.deepEqual(request.home, {villageId: Number(village.id.split('-').at(-1)), x: village.entry.x, z: village.entry.z});
      for (const field of ['x','z','runPhase','walkPhase','carryPhase','runRemaining']) assert.equal(request.pose[field], worker[field], field);
      assert.equal(request.pose.yaw, worker.heading);
      assert.deepEqual(f.faults, []);
    } finally {
      release();
      await f.close();
    }
  });
}

for (const pending of [true, false]) {
  test('Native flight keeps the ' + (pending ? 'pending' : 'stopped') + ' Farm body and proves its own route', () => {
    const module = new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM ?? new URL('../src/world/wild-engine/spatial-savanna.wasm', import.meta.url)));
    const core = createSpatialWorld(module);
    const f = pending ? nativeFarmArrivalRouteFixture({core, peer: false}) : nativeFarmArrivalStopSourceFixture({core, peer: false});
    try {
      const {w, actor} = f, session = w.nav_intent_session();
      const village = f.state.villages.find(v => v.id === f.worker.villageId);
      const issue = (seq, generation, event = 29208) => w.nav_intent_farm_flight_request(
        actor, session, seq, generation, Number(village.id.split('-').at(-1)), village.entry.x, village.entry.z, event);
      let seq, generation, pose, stale;
      if (pending) {
        seq = f.requestSource.requestSequence;
        generation = 0;
        pose = f.requestSource.pose;
        f.stage();
        stale = f.tuple();
        assert.equal(issue(seq + 1, 0), -2);
        assert.equal(w.nav_farm_arrival_route_proposal_snapshot(...stale.slice(0,2)), 1);
      } else {
        assert.equal(issue(f.binding.assignmentSequence, f.handle.generation), -2);
        const stop = f.stop();
        assert.equal(f.commitStop(stop), 1);
        assert.ok(w.nav_intent_clock_commit(1, 0) >= 0);
        const held = f.planner.nativeFarmArrivalHeldExecution(actor);
        seq = held.assignmentSequence;
        generation = held.resumeHandle.generation;
        pose = held.pose;
      }
      assert.equal(issue(seq, generation), 1);
      assert.equal(issue(seq, generation), 1);
      assert.equal(issue(seq, generation, 29209), -2);
      if (stale) assert.notEqual(w.nav_farm_arrival_route_proposal_commit_bound(...stale.slice(0,5), stale[1]), 1);
      const source = f.planner.nativeHomeRequestReference(actor);
      assert.equal(source.bodyId, 1);
      assert.equal(source.raidSpawnSequence, 29208);
      assert.throws(() => copyNativeHomeRequestReference({...source, version: 1}));
      assert.equal(sameNativeHomeRequestReference(source, {...source, raidSpawnSequence: 29209}), false);
      for (const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining']) assert.equal(source.pose[key], pose[key]);
      assert.ok(w.nav_intent_clock_commit(1, 0) >= 0);
      assert.equal(w.nav_home_route_proposal_stage(actor, session, source.requestSequence), 1);
      const tuple = f.tuple();
      assert.equal(w.nav_home_flight_event(actor, tuple[1]), 29208);
      assert.equal(w.nav_home_route_proposal_commit_bound(...tuple.slice(0,5), tuple[1]), 1);
      assert.equal(w.nav_intent_execution_begin(), 1);
      assert.ok(w.nav_intent_clock_commit(1, 0) >= 0);
      f.move(.05);
      assert.equal(w.nav_intent_home_execution(actor), 1);
      const execution = f.read('nav_intent_home_execution_ptr', 30);
      assert.equal(execution[2], source.bodyId);
      assert.equal(execution[26], pose.runRemaining);
      assert.ok(execution[21] > pose.runPhase);
      assert.ok(Math.abs(execution[28] - 2.4) < 1e-12);
    } finally {
      f.close();
    }
  });
}
