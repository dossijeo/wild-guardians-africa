import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {deserialize, serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {tick} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createWorkerGameRuntime} from '../src/simulation/worker-game-runtime.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {nativeAnimalStrikeClipAge} from '../src/world/native-animal-crop-resource.js';
import {nativeAnimalCropPublicationMatches,nativeCenterAttackCohort,nativeDesertIntroductoryRaid,nativeRetreatBudgetAllowed,planNight} from '../src/simulation/raids.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {recoverRouteAfterRuin} from './helpers/native-center-ruin-recovery.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {flush} from './helpers/remote-webgpu-fixture.js';

const binary = process.env.QA_BARRIER_WASM ?? new URL('../src/world/wild-engine/spatial-savanna.wasm', import.meta.url);
const module = new WebAssembly.Module(readFileSync(binary));
const recording = new URL('../docs/qa/raid-spawn-navigation/prepared-complete-browser-desert.json', import.meta.url);
const paidDesertRefuge = new URL('./fixtures/desierto712-d1-native-refuge-before-night.json.gz', import.meta.url);
const shelteredDesertNights = [
 {day:2,species:'hyena',hp:[535,510,485]},
 {day:3,species:'buffalo',hp:[450,415,380,345]},
 {day:4,species:'lion',hp:[305,265,225,185]},
 {day:5,species:'rhino',hp:[125],remainingHits:4},
];
const recorded = JSON.parse(readFileSync(recording)).timing.navigationContext;
const {activeBounds} = recorded;
const view = {bounds: activeBounds, ...recorded.raidView};
const chunkCoordinate = value => Math.floor((value + 24) / 48);
const chunkKeys = [];
for (let z = chunkCoordinate(activeBounds[1]); z <= chunkCoordinate(activeBounds[3]); z++) {
  for (let x = chunkCoordinate(activeBounds[0]); x <= chunkCoordinate(activeBounds[2]); x++) {
    chunkKeys.push(x + ',' + z);
  }
}

function residentSession(state) {
  const loaded = new Map();
  const session = createSpatialGameSession(module, state, {loaded: () => loaded});
  for (const key of chunkKeys) {
    const [cx, cz] = key.split(',').map(Number);
    if (session.core.selectChunk(cx, cz) < 0) assert(session.core.addChunk(cx, cz) >= 0);
    loaded.set(key, session.core.chunkPayload());
  }
  return session;
}

for(const {day,species,hp,remainingHits} of shelteredDesertNights)test(`the Desert enclosure admits the planned ${species} center strikes and retreat on night ${day}`,async()=>{
 const checkpoint=new URL(`./fixtures/desierto712-d${day}-enclosed-${species}-before-raid.json.gz`,import.meta.url);
 const raw=gunzipSync(readFileSync(checkpoint)).toString(),initial=deserialize(raw),saved=savedNativeAuthorityOptions(raw);
 const manifest={epoch:`desert-night-${day}`,chunks:saved.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 assert(saved.nativeWorkerLifecycle);
 assert.equal(initial.day,day);
 assert.deepEqual(initial.nightPlan.group,[species]);
 assert(initial.workers.every(worker=>worker.status==='home'));
 const walls=initial.structures.filter(structure=>structure.kind==='wall');
 assert(walls.some(wall=>wall.gate&&wall.gateOpen===0));
 const events=[],proofs=[],draws=new Map();
 let rig,f,state=initial,cropsAtRaidEnd,ruinCommit,ruinFrame;
 try{
  f=await nativeProductionAuthority(initial,{...saved,emptyBeastPhysics:true,getTerrainManifest:()=>manifest,
   async onPrepare(record){
    if(record.kind==='center-ruin')return;
    await flush();
    const source=f.snapshot();
    rig??=await originalRig(structuredClone(source),manifest);
    rig.update(structuredClone(source));
    await rig.prepare(record.resources);
   },
   onCommit(record,receipt){
    if(record.kind==='center-ruin'){
     assert.equal(ruinCommit,undefined);
     ruinCommit=receipt;
     return;
    }
    const proof=receipt.nativeAnimalCropRouteBinding??receipt.nativeAnimalCropStrikeBinding;
    rig.commit(proof,receipt);
    proofs.push(proof);
   },
  });
  for(let i=0;i<600&&state.day===day&&!state.result;i++){
   const advance=f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:true});
   if(advance instanceof Promise){
    assert.equal(species,'rhino');
    let settled=false;
    advance.then(()=>{settled=true;},()=>{settled=true;});
    for(let frame=0;frame<1000&&!settled;frame++){
     await f.present();
     assert.deepEqual(f.faults,[]);
     const drawn=f.host.inspect().nativeRouteFrame;
     if(ruinCommit&&drawn?.worldBoundary.ticket===ruinCommit.worldBoundary.ticket)ruinFrame=drawn;
    }
    assert(settled,'the ruin advance did not finish');
   }
   const publication=await advance;
   state=JSON.parse(publication.snapshot);events.push(...publication.events);
   if(publication.events.some(event=>event.type==='RaidEnded'))cropsAtRaidEnd=state.plants.map(crop=>[crop.id,crop.alive]);
   rig?.update(structuredClone(state));
   await f.present();
   assert.deepEqual(f.faults,[]);
   const frame=f.host.inspect().nativeRouteFrame;
   if(ruinCommit&&frame?.worldBoundary.ticket===ruinCommit.worldBoundary.ticket)ruinFrame??=frame;
   const binding=frame?.bindings.find(row=>row.nativeAnimalCrop);
   const ticket=frame?.worldBoundary.ticket;
   if(binding&&!draws.has(ticket)){
    draws.set(ticket,binding);
    if(state.raid)rig.presented(binding.relativeTime);
   }
  }
  if(remainingHits!==undefined){
   assert.equal(state.day,day);
   assert.equal(state.result,'defeat');
   assert.deepEqual([state.structures[0].status,state.structures[0].hp],['ruined',0]);
   const ruined=events.filter(event=>event.type==='StructureRuined');
   const retreat=events.find(event=>event.type==='AnimalRetreating');
   assert.deepEqual([retreat.reason,retreat.hitsRemaining],['no-reachable-unleased-target',remainingHits]);
   assert.deepEqual(ruined.map(event=>[event.targetId,event.simulationTime]),[['structure-2',ruinCommit.worldBoundary.effectiveTime]]);
   assert(retreat.simulationTime<ruined[0].simulationTime);
   assert.deepEqual(ruinFrame?.worldBoundary,ruinCommit.worldBoundary);
   assert.equal(ruinFrame.clockElapsed,ruined[0].simulationTime);
   assert.equal(ruinFrame.bindings.find(row=>row.nativeAnimalCrop?.purpose==='retreat')?.nativeAnimalCrop.bodyId,proofs[0].reference.bodyId);
   assert.equal(events.filter(event=>event.type==='GameOver').length,1);
   assert.equal(rig.runningReturns,1);
  }else{
   assert.equal(state.day,day+1);
   assert.equal(ruinCommit,undefined);
  }
  for(const record of f.records)await record.packet.presented;
  assert.deepEqual(proofs.map(({reference})=>[reference.kind,reference.purpose]),
   [...hp.flatMap(()=>[[26,'center'],[27,'center']]),[26,'retreat']]);
  for(const {reference} of proofs){
   assert.equal(reference.bodyId,proofs[0].reference.bodyId);
   const draw=draws.get(reference.worldBoundary.ticket);
   assert.equal(draw?.relativeTime,0);
   assert.equal(draw.nativeAnimalCrop.bodyId,reference.bodyId);
  }
  assert.deepEqual(events.filter(event=>event.type==='StructureHit').map(event=>[event.targetId,event.structureHit.hp]),
   hp.map(remaining=>['structure-2',remaining]));
  const hits=events.filter(event=>event.type==='AnimalLogicalHit');
  assert.deepEqual(hits.map(event=>event.attackId),proofs.filter(proof=>proof.reference.kind===27).map(proof=>'attack-'+proof.attackId));
  assert(hits.every(event=>event.species===species));
  assert.equal(events.filter(event=>event.type==='RaidEnded').length,1);
  assert.deepEqual(state.structures.filter(structure=>structure.kind==='wall'),walls);
  assert.deepEqual(cropsAtRaidEnd,initial.plants.map(crop=>[crop.id,crop.alive]));
  assert.deepEqual(state.plants.filter(crop=>crop.alive).map(crop=>crop.id),initial.plants.filter(crop=>crop.alive).map(crop=>crop.id));
  assert.deepEqual(state.ledger,initial.ledger);
  assert.deepEqual(f.errors,[]);
 }finally{rig?.close();await f?.close();}
});

function beforeRaid() {
  const state = deserialize(recorded.state);
  assert.equal(state.biome, 'desierto');
  assert.equal(state.workers.length, 0);
  assert.equal(state.plants.length, 0);
  state.dayPlan = {done:false, at:state.time+.05, group:['warthog']};
  return state;
}

function beforeIntroductoryDesertNight() {
  const state = deserialize(recorded.state);
  state.initialPreparation = false;
  state.nightPlan = null;
  planNight(state);
  assert.deepEqual(state.nightPlan.group,['warthog']);
  assert.equal(state.nightPlan.introductory,true);
  state.elapsed = state.time = state.nightPlan.at-.05;
  return state;
}

test('a completed Desert center strike retains the still-clear arrived approach', {timeout:30000}, async()=>{
  const source = await nativeProductionAuthority(beforeIntroductoryDesertNight(),{chunkKeys,navigationView:view});
  const damage=[], hits=[];
  try {
    for(let i=0;i<1000&&hits.length<2;i++){
      const result=await source.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
      for(const event of result.events){
        if(event.type==='StructureHit')damage.push(event.structureHit);
        if(event.type==='AnimalLogicalHit')hits.push(event);
        assert.notEqual(event.type,'AnimalRouteUnavailable','completing a strike must not invalidate its arrived approach');
      }
    }
    assert.deepEqual(damage.map(event=>[event.previousHp,event.hp]),[[600,580],[580,560]]);
    assert.deepEqual(hits[0].presentation.animal,hits[1].presentation.animal);
    assert.deepEqual(hits.map(event=>event.targetId),['structure-2','structure-2']);
    assert.notEqual(hits[0].attackId,hits[1].attackId);
    assert.deepEqual(source.faults,[]);
  }finally{await source.close();}
});

test('ordinary Desert authority admits the first night center raid from birth through Retreat', {timeout:30000}, async()=>{
 const waiting=new Map(),events=[];
 const source=await nativeProductionAuthority(beforeIntroductoryDesertNight(),{
  chunkKeys,navigationView:view,nativeWorkerLifecycle:true,emptyBeastPhysics:true,
  onReady(record){
   if(!waiting.has(record.kind)&&['animal-crop-route','animal-crop-strike'].includes(record.kind))
    return new Promise(release=>waiting.set(record.kind,{record,release}));
  }
 });
 const advance=async()=>{
  const batch=await source.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  events.push(...batch.events);
  await source.present();
  return JSON.parse(batch.snapshot);
 };
 const pose=animal=>[animal.x,animal.z,animal.motionPhase,animal.hitsRemaining];
 try{
  for(const kind of ['animal-crop-route','animal-crop-strike']){
   for(let step=0;step<800&&!waiting.has(kind);step++)await advance();
   const hold=waiting.get(kind);
   assert.ok(hold,`Expected READY for ${kind}`);
   const before=source.snapshot();
   assert.equal(hold.record.committed,false);
   assert.equal(before.structures[0].hp,600);
   const held=await advance();
   assert.deepEqual(pose(held.raid.animals[0]),pose(before.raid.animals[0]));
   assert.equal(held.raid.animals[0].attackId,null);
   assert.equal(held.structures[0].hp,600);
   assert(held.elapsed>before.elapsed);
   hold.release();
   await untilProduction(source,()=>hold.record.committed);
  }
  let current;
  for(let step=0;step<800&&!events.some(event=>event.type==='RaidEnded');step++)current=await advance();
  assert.equal(events.filter(event=>event.type==='RaidSpawned').length,1);
  assert.equal(events.filter(event=>event.type==='RaidEnded').length,1);
  assert.equal(current.raid,null);
  const acquired=source.records.filter(record=>record.committed);
  const references=acquired.map(record=>record.resources.reference);
  assert.deepEqual(references.map(r=>[r.kind,r.purpose]),[[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'retreat']]);
  assert.equal(new Set(references.map(reference=>reference.bodyId)).size,1);
  const impacts=events.filter(event=>event.type==='AnimalLogicalHit');
  assert.deepEqual(impacts.map(event=>event.targetId),['structure-2','structure-2']);
  assert.notEqual(impacts[0].attackId,impacts[1].attackId);
  assert.deepEqual(impacts[0].presentation.animal,impacts[1].presentation.animal);
  assert.deepEqual(events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560]);
  assert.deepEqual(source.faults,[]);
 }finally{
  for(const hold of waiting.values())hold.release();
  await source.close();
 }
});

test('the first Desert night keeps the paid worker home and the protected crop intact', {timeout:30000}, async()=>{
 const text=gunzipSync(readFileSync(paidDesertRefuge)).toString();
 const initial=deserialize(text),options=savedNativeAuthorityOptions(text);
 assert.equal(options.nativeWorkerLifecycle,true);
 const [worker]=initial.workers,[crop]=initial.plants;
 assert.equal(worker.status,'home');
 assert.equal(worker.nativeRouteAdmission,undefined);
 assert.equal(crop.alive,true);
 assert(initial.ledger.entries['first-paid-desert-hire']);
 assert(initial.ledger.entries['first-paid-desert-crop']);
 let release,approach;
 const ready=new Promise(resolve=>{release=resolve;});
 const source=await nativeProductionAuthority(initial,{...options,emptyBeastPhysics:true,onReady(record){
  if(!approach&&record.kind==='animal-crop-route'){approach=record;return ready;}
 }});
 const events=[];
 const advance=async()=>{
  const batch=await source.command({kind:'advance',seconds:.05,steps:2,nightFastForward:true});
  events.push(...batch.events);
  await source.present();
  const state=JSON.parse(batch.snapshot);
  const [resident]=state.workers;
  assert.equal(state.workers.length,1);
  assert(!resident.path?.length);
  assert.deepEqual({...resident,path:worker.path},worker);
  assert.deepEqual(state.plants,[crop]);
  assert.deepEqual(state.ledger,initial.ledger);
  return state;
 };
 try{
  for(let step=0;step<60&&!approach;step++)await advance();
  assert.ok(approach,'expected the center approach READY');
  assert.equal(approach.committed,false);
  const [born]=source.snapshot().raid.animals;
  const held=await advance();
  assert.deepEqual([held.raid.animals[0].x,held.raid.animals[0].z],[born.x,born.z]);
  assert.equal(held.raid.introCropLimit,0);
  assert.equal(held.raid.animals[0].targetId,'structure-2');
  const eligible=structuredClone(held);
  eligible.plants.push(createPlant('plant-1000000','platano',100,-7,'structure-2'));
  eligible.raid.introPlantCount=2;
  eligible.raid.introCropLimit=1;
  assert(!nativeCenterAttackCohort(eligible),'a raid with eligible crops needs a different admission');
  release();
  await untilProduction(source,()=>approach.committed);
  for(let step=0;step<1000&&!events.some(event=>event.type==='RaidEnded');step++)await advance();
  assert.equal(events.filter(event=>event.type==='RaidSpawned').length,1);
  assert.equal(events.find(event=>event.type==='RaidSpawned').raidFacts.exposedLiving,1);
  assert.equal(events.filter(event=>event.type==='RaidEnded').length,1);
  assert.equal(source.snapshot().raid,null);
  const acquired=source.records.filter(record=>record.committed).map(record=>record.resources.reference);
  assert.deepEqual(acquired.map(r=>[r.kind,r.purpose]),[[26,'center'],[27,'center'],[26,'center'],[27,'center'],[26,'retreat']]);
  assert.equal(new Set(acquired.map(reference=>reference.bodyId)).size,1);
  const impacts=events.filter(event=>event.type==='AnimalLogicalHit');
  assert.deepEqual(impacts.map(event=>event.targetId),['structure-2','structure-2']);
  assert.notEqual(impacts[0].attackId,impacts[1].attackId);
  assert.deepEqual(events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560]);
  assert.deepEqual(source.faults,[]);
 }finally{release();await source.close();}
});

function savedAttack() {
  const state = beforeRaid();
  const session = residentSession(state);
  try {
    const nav = createSpatialNavigationMovement(session, state);
    nav.setActiveBounds(activeBounds);
    nav.raidView = recorded.raidView;
    nav.intentTaskPlanner = createEventDrivenTaskPlanner(session);
    nav.intentTaskPlanner.resetFromState(state);
    for (let i = 0; i < 5 && !state.raid?.animals[0]?.targetId; i++) tick(state, .05, nav);
    assert.equal(state.raid.animals[0].targetId, 'structure-2');
    assert.equal(state.structures[0].hp, 600);
    return serialize(state);
  } finally {
    session.dispose();
  }
}

const introductoryDesertCases=[
 {count:1,fixture:'desierto712-d1-two-crops-before-night'},
 {count:2,fixture:'desierto712-d1-two-workers-refuge-before-night'},
 {count:2,fixture:'desierto712-d1-paid-gate-before-night',gateId:'structure-7'},
 {count:2,fixture:'desierto712-d1-paid-defenses-before-night',gateId:'structure-7',wallCount:4},
];
for(const {count,fixture,gateId,wallCount=0} of introductoryDesertCases)
for(const reload of gateId?[null,'crop approach','crop strike','center approach','center strike','retreat']:[null,'crop strike'])
test(`the introductory Desert raid spends one hit on a crop and one on the center with ${count} sheltered workers${wallCount?' and paid defenses':gateId?' and a paid gate':''}${reload?' after a public '+reload+' reload':''}`, {timeout:30000}, async()=>{
 const path=new URL(`./fixtures/${fixture}.json.gz`,import.meta.url);
 const disk=gunzipSync(readFileSync(path)).toString(),initial=deserialize(disk),options=savedNativeAuthorityOptions(disk);
 assert.deepEqual(initial.plants.map(crop=>[crop.id,crop.alive]),[['plant-3',true],['plant-5',true]]);
 const workerOwners=workers=>workers.map(w=>[w.id,w.personId,w.status,w.x,w.z,w.hits,w.contractDay]);
 const sheltered=workerOwners(initial.workers);
 const firstWorker=wallCount?13:gateId?9:8;
 assert.deepEqual(sheltered,Array.from({length:count},(_,i)=>[
  `worker-${firstWorker+2*i}`,`person-${firstWorker+2*i-1}`,'home',88,0,0,1
 ]));
 const defenses=state=>state.structures.filter(row=>row.kind==='wall');
 const originalDefenses=defenses(initial);
 if(gateId){
  assert.equal(originalDefenses.length,wallCount+1);
  assert.equal(originalDefenses.find(row=>row.id===gateId).gateOpen,0);
  const expectedOwners=[{entityId:gateId,ids:[1,2,3]}];
  for(let i=0;i<wallCount;i++)expectedOwners.push({entityId:`structure-${8+i}`,ids:[4+i]});
  expectedOwners.sort((a,b)=>a.entityId.localeCompare(b.entityId));
  assert.deepEqual(initial.workerNativeAuthorityCheckpoint.wallOwners,expectedOwners);
  assert.equal(initial.ledger.balance.n,wallCount?'270':'310');
 }
 assert.equal(options.nativeWorkerLifecycle,true);
 let release,firstRoute,replacement;
 const ready=new Promise(resolve=>{release=resolve;});
 const source=await nativeProductionAuthority(initial,{...options,emptyBeastPhysics:true,onReady(record){
  if(!firstRoute&&record.kind==='animal-crop-route'){firstRoute=record;return ready;}
 }});
 let authority=source;
 const history=[];
 const advance=async()=>{
  const next=await authority.command({kind:'advance',seconds:.05,steps:2,nightFastForward:true});
  history.push(...next.events);
  await authority.present();
  const state=JSON.parse(next.snapshot);
  assert.deepEqual(workerOwners(state.workers),sheltered);
  assert.deepEqual(state.ledger,initial.ledger);
  assert.deepEqual(defenses(state),originalDefenses);
  return state;
 };
 try{
  for(let i=0;i<70&&!firstRoute;i++)await advance();
  assert(firstRoute);
  assert.equal(firstRoute.resources.reference.targetId,3);
  assert.equal(firstRoute.resources.reference.purpose,undefined);
  const [birth]=source.snapshot().raid.animals;
  const [held]=(await advance()).raid.animals;
  assert.equal(firstRoute.committed,false);
  assert.deepEqual([held.x,held.z,held.hitsRemaining],[birth.x,birth.z,2]);
  if(gateId&&!reload){
   const scene=source.snapshot(),gate=scene.structures.find(row=>row.id===gateId),[animal]=scene.raid.animals;
   assert(nativeDesertIntroductoryRaid(scene,animal));
   gate.gateOpen=.5;
   assert.equal(nativeDesertIntroductoryRaid(scene,animal),false);
   gate.gateOpen=0;gate.status='ruined';
   assert.equal(nativeDesertIntroductoryRaid(scene,animal),false);
  }
  release();
  await untilProduction(source,()=>firstRoute.committed);
  let cutAnimal;
  if(reload){
   const strike=reload.endsWith('strike');
   const targetId=reload.startsWith('crop ')?'plant-3':'structure-2';
   for(let i=0;i<1200&&!cutAnimal;i++){
    const [animal]=(await advance()).raid.animals;
    const midStrike=animal.status==='attacking'&&animal.attackRemaining<animal.attackDuration-.15&&animal.attackRemaining>.5;
    const retreating=animal.status==='retreating'&&authority.records.some(row=>row.committed&&row.resources.reference.purpose==='retreat');
    if(reload==='retreat'?retreating:animal.targetId===targetId&&(strike?midStrike:animal.status==='walking'))cutAnimal=animal;
   }
   assert(cutAnimal);
   const checkpoint=source.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
   assert.equal(checkpoint.nativeAuthorityCheckpoint.workerLifecycle,1);
   if(gateId){
    const original=initial.workerNativeAuthorityCheckpoint,current=checkpoint.nativeAuthorityCheckpoint;
    assert.deepEqual(current.wallOwners,original.wallOwners);
    assert.deepEqual(current.spatialState.barriers,original.spatialState.barriers);
   }
   const stored=prepareWorkerCheckpoint(checkpoint,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert(stored.saved);
   const saved=serialize(stored.state);
   replacement=await nativeProductionAuthority(deserialize(saved),{...savedNativeAuthorityOptions(saved),emptyBeastPhysics:true});
   authority=replacement;
   const [same]=replacement.snapshot().raid.animals;
   for(const key of ['id','targetId','attackId','attackRemaining','hitsRemaining','x','z','motionPhase'])assert.equal(same[key],cutAnimal[key],key);
   const firstResource=strike?'animal-crop-strike':'animal-crop-route';
   await untilProduction(replacement,()=>replacement.records.some(record=>record.kind===firstResource&&record.committed));
  }
  let final;
  for(let i=0;i<1300&&!history.some(event=>event.type==='RaidEnded');i++)final=await advance();
  assert.equal(final.raid,null);
  assert.deepEqual(final.plants.map(crop=>[crop.id,crop.alive,crop.attackHits??0]),
   [['plant-3',false,1],['plant-5',true,0]]);
  assert.equal(final.structures[0].hp,580);
  assert.deepEqual(history.filter(event=>['CropDestroyed','AnimalLogicalHit','StructureHit','RaidEnded'].includes(event.type))
    .map(event=>[event.type,event.targetId]),
   [['CropDestroyed','plant-3'],['AnimalLogicalHit','plant-3'],['StructureHit','structure-2'],['AnimalLogicalHit','structure-2'],['RaidEnded',undefined]]);
  const [cropHit,centerHit]=history.filter(event=>event.type==='AnimalLogicalHit');
  assert.notEqual(cropHit.attackId,centerHit.attackId);
  if(reload==='crop strike')assert.equal(cropHit.attackId,cutAnimal.attackId);
  if(reload==='center strike'||reload==='retreat')assert.equal(centerHit.attackId,cutAnimal.attackId);
  const programs=authority.records.filter(record=>record.committed).map(record=>record.resources.reference);
  const suffix=['crop approach','crop strike','center approach','center strike','retreat'].indexOf(reload);
  assert.deepEqual(programs.map(r=>[r.kind,r.purpose]),
   [[26,undefined],[27,undefined],[26,'center'],[27,'center'],[26,'retreat']].slice(Math.max(suffix,0)));
  assert.equal(new Set(programs.map(r=>r.bodyId)).size,1);
  assert.deepEqual(source.faults,[]);
  if(reload)assert.deepEqual(replacement.faults,[]);
 }finally{
  release();
  try{await source.close();}finally{await replacement?.close();}
 }
});

import {copyPublishedNativeWorldBoundary} from '../src/world/native-world-boundary.js';

for(const scenario of ['saved corridor','terminal pose','pending source'])test(`the sheltered Savanna center approach reacquires its ${scenario}`, {timeout:30000}, async()=>{
 const arrived=scenario==='terminal pose',pending=scenario==='pending source';
 const snapshot=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d5-before-rhino.json.gz',import.meta.url))).toString();
 const initial=deserialize(snapshot),options=savedNativeAuthorityOptions(snapshot);
 const manifest={epoch:'sheltered-center-approach',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 let releaseOriginalStrike,releaseOriginalRoute;
 const source=await nativeProductionAuthority(initial,{...options,getTerrainManifest:()=>manifest,observeWorldMotion:pending,
  onReady:record=>{
   if(pending&&record.kind==='animal-crop-route')return new Promise(resolve=>{releaseOriginalRoute=resolve;});
   if(arrived&&record.kind==='animal-crop-strike')return new Promise(resolve=>{releaseOriginalStrike=resolve;});
  }});
 let restored,releaseReady;
 const step=authority=>authority.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
 try{
  source.command({kind:'setNavigationView',view:options.navigationView});
  let original,birthCheckpoint;
  for(let i=0;i<800&&!original;i++){
   const batch=await step(source);
   if(pending&&batch.events.some(event=>event.type==='RaidSpawned'))
    birthCheckpoint=source.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
   await source.present();
   original=source.records.find(row=>row.kind==='animal-crop-route'&&(pending?releaseOriginalRoute:row.committed));
  }
  assert.ok(original);
  if(!pending)for(let i=0;i<12;i++){await step(source);await source.present();}
  if(arrived){
   for(let i=0;i<600&&!releaseOriginalStrike;i++){await step(source);await source.present();}
   assert.ok(releaseOriginalStrike,'expected an acquired approach awaiting its first Strike27');
  }
  const readyCheckpoint=source.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  if(pending)assert.ok(birthCheckpoint,'capture a public save at RaidSpawned before the first GO');
  const checkpoint=pending?birthCheckpoint:readyCheckpoint;
  const stored=prepareWorkerCheckpoint(checkpoint,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert.equal(stored.saved,true);
  const [animal]=stored.state.raid.animals,saved=savedNativeAuthorityOptions(serialize(stored.state));
  assert.equal(saved.nativeWorkerLifecycle,true);
  assert.ok(animal.path?.length);
  assert.equal(animal.targetId,'structure-2');
  if(pending){
   const ready=prepareWorkerCheckpoint(readyCheckpoint,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert.equal(ready.saved,true);
   assert.equal(readyCheckpoint.nativeAuthorityCheckpoint.workerLifecycle,1);
   assert.deepEqual(ready.state.raid.animals[0],animal);
   assert.deepEqual(ready.state.raid.reservations,stored.state.raid.reservations);
   assert.equal(original.committed,false);
   assert(original.packet.valid());
   assert.equal(animal.motionPhase,original.resources.reference.phase);
   let now=0,wake,live=null,sequence=0,observedAdvance=false;
   const receiver={accept(publication){
    const next=JSON.parse(publication.snapshot);
    if(publication.worldMotionTrace){
     assert.equal(publication.worldMotionTrace.actorTickStates.complete,true);
     validateConfirmedMotion(publication,next,live.elapsed,live);
     observedAdvance=true;
    }
    live=next;sequence=publication.sequence;
    return {accepted:true};
   },status:()=>({sequence,lastElapsed:live?.elapsed??0})};
   const runtime=createWorkerGameRuntime({session:'checkpoint-publication',startupSuspended:true,nightFastForward:false,
    client:{ready:Promise.resolve(),submit:command=>({accepted:true,result:Promise.resolve(source.command(command))}),dispose(){}},
    world:{createConfirmedReceiver:()=>receiver},now:()=>now,schedule:fn=>{wake=fn;return 1;},cancel(){}});
   try{
    await runtime.start();
    const liveAnimal=live.raid.animals[0];
    assert.equal(liveAnimal.path,null);
    const autosave=await runtime.submit({kind:'snapshot',nativeAuthorityCheckpoint:true});
    assert.deepEqual(JSON.parse(autosave.snapshot).raid.animals[0].path,animal.path);
    runtime.activateClock();
    now=50;wake();
    await runtime.queueBarrier();
    assert(observedAdvance);
    assert.deepEqual(live.raid.animals[0],liveAnimal);
    assert.equal(original.committed,false);
   }finally{runtime.dispose();}
  }else assert(animal.motionPhase>original.resources.reference.phase);
  if(arrived)assert.deepEqual(animal.path,[{x:animal.x,z:animal.z}]);
  else assert(animal.path[0].x!==animal.x||animal.path[0].z!==animal.z);
  const missing=structuredClone(stored.state);missing.raid.animals[0].path=null;
  assert.throws(()=>createSimulationAuthority(module,serialize(missing),saved.chunkKeys,saved),/no restorable corridor/);
  const invalid=structuredClone(stored.state);invalid.raid.animals[0].path[0].x+=1000;
  assert.throws(()=>createSimulationAuthority(module,serialize(invalid),saved.chunkKeys,saved),/corridor ends at another site|lost its corridor|Native attack intention rejected/);

  restored=await nativeProductionAuthority(stored.state,{...saved,getTerrainManifest:()=>manifest,
   onReady:record=>record.kind==='animal-crop-route'&&!releaseReady?new Promise(resolve=>{releaseReady=resolve;}):undefined});
  restored.command({kind:'setNavigationView',view:saved.navigationView});
  await untilProduction(restored,()=>releaseReady);
  const [route]=restored.records,{reference,rows}=route.resources;
  assert.equal(reference.purpose,'center');
  assert.notEqual(reference.worldBoundary.authorityEpoch,original.resources.worldBoundary.authorityEpoch);
  assert.equal(reference.targetId,original.resources.reference.targetId);
  assert.deepEqual(Array.from(rows.slice(1,5)),[animal.x,animal.z,0,animal.motionPhase]);
  if(arrived)assert.equal(rows.length,16);
  else assert.deepEqual(Array.from(rows.slice(17,19)),[animal.path[0].x,animal.path[0].z]);
  const held=await step(restored),heldState=JSON.parse(held.snapshot);
  assert.ok(held.elapsed>checkpoint.elapsed);
  assert.deepEqual(heldState.raid.animals[0],animal);
  assert.deepEqual(heldState.raid.reservations,stored.state.raid.reservations);
  assert.equal(route.committed,false);
  const heldCheckpoint=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(heldCheckpoint.nativeAuthorityCheckpoint.workerLifecycle,1);
  assert.deepEqual(JSON.parse(heldCheckpoint.snapshot).raid.animals[0].path,animal.path);
  releaseReady();
  await untilProduction(restored,()=>route.committed);
  await restored.present();
  await route.packet.presented;
  assert(restored.host.inspect().nativeRouteFrame.bindings.some(row=>row.nativeAnimalCrop?.purpose==='center'&&row.relativeTime===0));

  const events=[];
  let final=heldState;
  for(let i=0;i<500&&!events.some(event=>event.type==='StructureHit');i++){
   const next=await step(restored);events.push(...next.events);final=JSON.parse(next.snapshot);await restored.present();
  }
  assert.deepEqual(events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[125]);
  assert.equal(events.filter(event=>event.type==='AnimalLogicalHit').length,1);
  assert.deepEqual(final.ledger,stored.state.ledger);
  assert.deepEqual(restored.faults,[]);
 }finally{releaseReady?.();releaseOriginalRoute?.();releaseOriginalStrike?.();try{await restored?.close();}finally{await source.close();}}
});

async function restoreShelteredRetreat(checkpoint,manifest,source){
 const state=JSON.parse(checkpoint.snapshot);
 assert.equal(checkpoint.saveAvailable,true);
 const stored=prepareWorkerCheckpoint(checkpoint,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
 assert.equal(stored.saved,true);
 const [animal]=stored.state.raid.animals,options=savedNativeAuthorityOptions(serialize(stored.state));
 assert.ok(animal.path?.length);
 assert.equal(options.nativeWorkerLifecycle,true);
 const missingCorridor=structuredClone(stored.state);
 missingCorridor.raid.animals[0].path=null;
 assert.throws(()=>createSimulationAuthority(module,serialize(missingCorridor),options.chunkKeys,options),/Saved native Retreat has no restorable corridor/);

 let releaseReady;
 const restored=await nativeProductionAuthority(stored.state,{...options,getTerrainManifest:()=>manifest,
  onReady:()=>new Promise(resolve=>{releaseReady=resolve;})});
 const advance=()=>restored.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
 try{
  restored.command({kind:'setNavigationView',view:options.navigationView});
  await untilProduction(restored,()=>releaseReady);
  const [route]=restored.records,{reference,rows}=route.resources;
  assert.equal(reference.purpose,'retreat');
  assert.notEqual(reference.worldBoundary.authorityEpoch,source.retreat.reference.worldBoundary.authorityEpoch);
  assert.deepEqual(Array.from(rows.slice(1,5)),[animal.x,animal.z,0,animal.motionPhase]);
  assert.equal(reference.yaw,animal.heading);
  assert.deepEqual([reference.targetX,reference.targetZ],[animal.exit.x,animal.exit.z]);
  const rebuilt=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(rebuilt.nativeAuthorityCheckpoint.spatialState,checkpoint.nativeAuthorityCheckpoint.spatialState);
  assert.equal(rebuilt.nativeAuthorityCheckpoint.workerLifecycle,1);
  assert.deepEqual(JSON.parse(rebuilt.snapshot).raid.animals[0].path,animal.path);
  const held=await advance();
  assert.ok(held.elapsed>checkpoint.elapsed);
  assert.deepEqual(JSON.parse(held.snapshot).raid.animals[0],animal);
  assert.equal(route.committed,false);
  releaseReady();
  await untilProduction(restored,()=>route.committed);
  await route.packet.presented;
  const {bindings}=restored.host.inspect().nativeRouteFrame;
  assert(bindings.some(row=>row.nativeAnimalCrop?.purpose==='retreat'&&row.relativeTime===0));

  let final=JSON.parse(held.snapshot);
  const facts=[];
  for(let i=0;i<500&&!final.result;i++){
   const next=await advance();facts.push(...next.events);final=JSON.parse(next.snapshot);await restored.present();
  }
  assert.equal(final.result,'defeat');
  assert.equal(final.raid,null);
  assert.deepEqual(final.ledger,state.ledger);
  assert.deepEqual(facts.map(row=>row.type),['RaidEnded','GameOver']);
  assert.deepEqual(restored.faults,[]);
 }finally{releaseReady?.();await restored.close();}
}

async function restoreShelteredRetreatBeforeRuin(checkpoint,manifest,source){
 const saved=JSON.parse(checkpoint.snapshot);
 const stored=prepareWorkerCheckpoint(checkpoint,{slotId:saved.slotId,policy:{nativeAuthority:true},savedAt:0});
 assert.equal(stored.saved,true);
 const options=savedNativeAuthorityOptions(serialize(stored.state)),[animal]=stored.state.raid.animals;
 assert.equal(options.nativeWorkerLifecycle,true);
 assert.ok(animal.path?.length);
 assert.equal(saved.structures[0].status,'collapsing');
 let releaseRoute,releaseRuin;
 const restored=await nativeProductionAuthority(stored.state,{...options,getTerrainManifest:()=>manifest,
  onReady:row=>new Promise(resolve=>{
   if(row.kind==='animal-crop-route')releaseRoute=resolve;
   else if(row.kind==='center-ruin')releaseRuin=resolve;
   else resolve();
  })});
 let prefix,failure;
 const wait=async condition=>{
  for(let i=0;i<1000;i++){
   if(failure)throw failure;
   assert.deepEqual(restored.faults,[]);
   if(condition())return;
   await restored.present();
  }
  assert.fail('restored Retreat did not reach its graphical boundary');
 };
 try{
  restored.command({kind:'setNavigationView',view:options.navigationView});
  await wait(()=>releaseRoute);
  const [route]=restored.records,{reference,rows}=route.resources;
  assert.equal(route.committed,false);
  assert.equal(reference.purpose,'retreat');
  assert.equal(reference.worldBoundary.effectiveTime,saved.elapsed);
  assert.deepEqual(Array.from(rows.slice(1,5)),[animal.x,animal.z,0,animal.motionPhase]);
  const before=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(before.nativeAuthorityCheckpoint.spatialState,checkpoint.nativeAuthorityCheckpoint.spatialState);
  const command={kind:'advance',seconds:.05,steps:2,nightFastForward:false};
  const advancing=restored.command(command);
  assert(advancing instanceof Promise);
  advancing.then(value=>{prefix=value;},error=>{failure=error;});
  await restored.present();
  assert.equal(prefix,undefined);
  assert.equal(restored.records.length,1);
  assert.equal(restored.host.inspect().nativeCausalClock.committedThrough,saved.elapsed);

  releaseRoute();
  await wait(()=>prefix&&route.committed);
  const motion=prefix.centerMotionPublication;
  assert.equal(motion?.kind,26);
  assert.deepEqual(prefix.events,[]);
  assert.equal(releaseRuin,undefined);

  const sameStep=motion.remainingSeconds===command.seconds;
  const partial=restored.command({...command,seconds:motion.remainingSeconds,
   steps:sameStep?command.steps-prefix.stepsExecuted:1});
  let continued=false;
  assert(partial instanceof Promise);
  partial.then(()=>{continued=true;},error=>{failure=error;});
  await wait(()=>releaseRuin);
  const [,ruin]=restored.records;
  const proof=ruin.resources.nativeCenterRuin;
  assert.deepEqual(motion.worldBoundary,proof.retreat.reference.worldBoundary);
  assert.equal(route.committed,true);
  await route.packet.presented;
  assert.equal(ruin.committed,false);
  assert.equal(continued,false);
  assert.equal(proof.polygon,source.polygon);
  assert.equal(proof.end,source.end);
  assert.notEqual(proof.boundary.authorityEpoch,source.boundary.authorityEpoch);
  releaseRuin();
  await wait(()=>ruin.committed);
  await restored.present();
  await ruin.packet.presented;
  const result=await partial,full=command.steps-prefix.stepsExecuted-result.stepsExecuted;
  const last=full?await restored.command({...command,steps:full}):result;
  const state=JSON.parse(last.snapshot);
  assert.equal(prefix.stepsExecuted+result.stepsExecuted+(full?last.stepsExecuted:0),2);
  assert(Math.abs(state.elapsed-saved.elapsed-.1)<1e-9);
  const events=[...result.events,...(full?last.events:[])];
  assert.deepEqual(events.map(event=>[event.type,event.simulationTime]),[['StructureRuined',source.end]]);
  assert.equal(state.structures[0].status,'ruined');
  assert.equal(state.raid.animals[0].hitsRemaining,animal.hitsRemaining);
  assert.deepEqual(state.ledger,saved.ledger);
  const after=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert(!after.nativeAuthorityCheckpoint.spatialState.polygons.some(polygon=>polygon.id===source.polygon));
  assert.deepEqual(restored.host.inspect().nativeRouteFrame.worldBoundary,ruin.commit.worldBoundary);
 }finally{releaseRoute?.();releaseRuin?.();await restored.close();}
}

for(const mode of ['Desert','Savanna','introductory Desert','sheltered Desert'])test(`center ruin spends its retained ticket inside the ordinary ${mode} Retreat substep`, {timeout:90000}, async()=>{
 const savanna=mode==='Savanna',introductory=mode==='introductory Desert',sheltered=mode==='sheltered Desert';
 const snapshot=savanna?gunzipSync(readFileSync(new URL('./fixtures/sabana714-d5-before-rhino.json.gz',import.meta.url))).toString():
  sheltered?gunzipSync(readFileSync(paidDesertRefuge)).toString():introductory?null:savedAttack();
 const initial=introductory?beforeIntroductoryDesertNight():deserialize(snapshot);
 const options=savanna||sheltered?{...savedNativeAuthorityOptions(snapshot),emptyBeastPhysics:sheltered}:{chunkKeys,navigationView:view,
  ...(introductory?{nativeWorkerLifecycle:true,emptyBeastPhysics:true}:{qualifyAnimalCrop:true})};
 if(savanna)assert.equal(options.nativeWorkerLifecycle,true);
 else {
  initial.structures[0].hp=140;
  if(mode==='Desert')initial.raid.animals[0].hitsRemaining=1;
 }
 let releaseReady,replacement;
 const readyGate=new Promise(resolve=>{releaseReady=resolve;});
 const manifest={epoch:'savanna-rhino-loss',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const fixture=await nativeProductionAuthority(initial,{...options,getTerrainManifest:()=>manifest,
  onReady:record=>record.kind==='center-ruin'?readyGate:undefined});
 const checkpoint=()=>fixture.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
 const polygonIds=result=>result.nativeAuthorityCheckpoint.spatialState.polygons.map(row=>row.id);
 try{
  fixture.command({kind:'setNavigationView',view:options.navigationView});
  if(mode==='Desert')await untilProduction(fixture,()=>fixture.records.some(row=>row.kind==='animal-crop-route'&&row.committed));
  const intact=checkpoint();
  let previous=JSON.parse(intact.snapshot),result,steps,beforeRuin;
  const events=[];
  for(let command=0;command<1100;command++){
   const collapsing=previous.structures[0].status==='collapsing';
   if(savanna&&collapsing&&previous.structures[0].collapseRemaining<=.10)beforeRuin=checkpoint();
   steps=fixture.command({kind:'advance',seconds:collapsing?.05:.10,steps:2,nightFastForward:false,visualTerrain:collapsing});
   if(steps instanceof Promise)break;
   events.push(...steps.events);
   previous=JSON.parse(steps.snapshot);
   await fixture.present();
   assert.deepEqual(fixture.faults,[]);
  }
  assert(steps instanceof Promise,'expected the ordinary batch to wait at the terminal substep');
  let advanceError=null;
  steps.catch(error=>{advanceError=error;});
  const wait=async condition=>{
   for(let retry=0;retry<1000;retry++){
    if(advanceError)throw advanceError;
    assert.deepEqual(fixture.faults,[]);
    if(condition())return;
    await fixture.present();
   }
   assert.fail('center ruin did not reach its graphical boundary');
  };
  let retention;
  await wait(()=>!!(retention=fixture.records.find(row=>row.kind==='center-ruin'&&row.packet)));
  const source=retention.resources.nativeCenterRuin;
  assert(polygonIds(intact).includes(source.polygon));
  assert.equal(previous.structures[0].status,'collapsing');
  assert(previous.elapsed<source.boundary.effectiveTime,'fixture must keep the last publication before the substep');
  assert.throws(()=>fixture.authority.execute({kind:'snapshot',sequence:-1}),/owns this advance/);
  const activeBefore=(await fixture.client.inspectAsync()).consumer.activeSequence;
  await fixture.present();
  assert.equal((await fixture.client.inspectAsync()).consumer.activeSequence,activeBefore);
  assert.equal(retention.committed,false);
  releaseReady();
  await wait(()=>retention.committed);
  let submitted=null;
  const presentation=retention.packet.presented.then(value=>{submitted=value;});
  presentation.catch(error=>{advanceError=error;});
  await wait(()=>submitted!==null);
  await presentation;
  result=await steps;
  events.push(...result.events);
  const state=JSON.parse(result.snapshot),acquired={...source.boundary,effectiveTime:source.end};
  assert.equal(result.stepsExecuted,2);
  assert(state.elapsed>source.end);
  assert.deepEqual(retention.commit.worldBoundary,acquired);
  assert.equal(submitted.sequence,retention.packet.sequence);
  const display=(await fixture.client.inspectAsync()).consumer.nativeRouteFrame;
  assert.equal(display.sequence,submitted.sequence);
  assert.equal(display.clockElapsed,source.end);
  assert.deepEqual(display.worldBoundary,acquired);
  assert(display.bindings.some(binding=>binding.nativeAnimalCrop?.purpose==='retreat'));
  assert.equal(state.structures[0].status,'ruined');
  assert.equal(state.structures[0].hp,0);
  assert.equal(state.raid.animals[0].status,'retreating');
  assert(!polygonIds(checkpoint()).includes(source.polygon));
  const ruins=events.filter(row=>row.type==='StructureRuined');
  assert.deepEqual(ruins.map(row=>[row.targetId,row.simulationTime]),[[source.center,source.end]]);
  assert.equal(events.filter(row=>row.type==='AnimalLogicalHit').length,1);
  if(introductory||sheltered){
   const [animal]=state.raid.animals;
   const departure=events.find(event=>event.type==='AnimalRetreating');
   assert.deepEqual([animal.species,animal.hitsRemaining],['warthog',1]);
   assert.deepEqual([departure.reason,departure.hitsRemaining],['no-reachable-unleased-target',1]);
   assert(nativeAnimalCropPublicationMatches(state,{reference:source.retreat.reference}));
  }
  if(sheltered){
   assert.equal(state.workers[0].status,'home');
   assert.deepEqual(state.plants,initial.plants);
   assert.deepEqual(state.ledger,initial.ledger);
  }
  if(savanna){
   const [animal]=state.raid.animals;
   const ref=source.retreat.reference,matching={reference:ref};
   const departure=events.find(event=>event.type==='AnimalRetreating');
   const centerHit=events.find(event=>event.type==='StructureHit');
   assert.deepEqual([animal.species,animal.hitsRemaining],['rhino',4]);
   assert.deepEqual([centerHit.structureHit.previousHp,centerHit.structureHit.hp],[185,125]);
   assert.deepEqual([departure.reason,departure.hitsRemaining],['no-reachable-unleased-target',4]);
   assert.equal(events.filter(event=>event.type==='AnimalTargetUnavailable').length,1);
   const programs=fixture.records.filter(row=>row.resources.reference).map(row=>row.resources.reference);
   assert.deepEqual(programs.map(row=>[row.kind,row.purpose]),[[26,'center'],[27,'center'],[26,'retreat']]);
   assert(programs.every(row=>row.bodyId===ref.bodyId&&row.actorId===ref.actorId));
   assert.deepEqual(state.ledger,initial.ledger);
   assert(nativeAnimalCropPublicationMatches(state,matching));
   const unrelated=structuredClone(state);unrelated.raid.animals[0].attackId='attack-1';
   assert(!nativeAnimalCropPublicationMatches(unrelated,matching));
   const withoutDeparture={...state,events:state.events.filter(event=>event.type!=='AnimalRetreating')};
   assert(!nativeAnimalCropPublicationMatches(withoutDeparture,matching));
   const selecting=structuredClone(state),candidate=selecting.raid.animals[0];
   candidate.status='walking';selecting.structures[0].status='collapsing';
   assert(nativeRetreatBudgetAllowed(selecting,candidate));
   const target=createPlant('plant-1000000','platano',86,-3,source.center);
   selecting.plants.push(target);
   assert(!nativeRetreatBudgetAllowed(selecting,candidate));
   candidate.status='retreating';
   assert(nativeAnimalCropPublicationMatches(selecting,matching));
  }
  assert.deepEqual(copyPublishedNativeWorldBoundary(result,source.previous),acquired);
  const [record]=result.nativeWorldResources;
  assert.throws(()=>copyPublishedNativeWorldBoundary({...result,nativeWorldResources:[
   {...record,nativeCenterRuin:{...record.nativeCenterRuin,polygon:source.polygon+1}},
  ]},source.previous),/differs from its committed boundary/);
  if(savanna){
   await restoreShelteredRetreatBeforeRuin(beforeRuin,manifest,source);
   await restoreShelteredRetreat(checkpoint(),manifest,source);
   // Destroy the original Draw only after it submitted the kind4 packet.
   replacement=await recoverRouteAfterRuin(fixture,retention.commit.nativeCenterRuin,state.elapsed,state);
   const step=()=>fixture.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
   let final=state;
   for(let i=0;i<500&&!final.result;i++){
    const next=await step();events.push(...next.events);final=JSON.parse(next.snapshot);
    await fixture.present();
   }
   assert.equal(final.raid,null);
   assert.equal(final.result,'defeat');
   assert.deepEqual(final.ledger,initial.ledger);
   const ended=events.filter(event=>event.type==='RaidEnded');
   assert.equal(ended.length,1);
   const gameOver=events.filter(event=>event.type==='GameOver');
   assert.deepEqual(gameOver.map(event=>event.simulationTime),[ended[0].simulationTime]);
   const stopped=await step();
   assert.equal(stopped.elapsed,final.elapsed);
   assert.deepEqual(stopped.events,[]);
   assert.deepEqual(fixture.faults,[]);
  }
 }finally{
  releaseReady();
  try{await fixture.close();}
  finally{replacement?.client.dispose();await replacement?.host.dispose();}
 }
});

test('the sheltered Savanna center strike regains exactly its remaining action', {timeout:30000}, async()=>{
 const snapshot=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d5-before-rhino.json.gz',import.meta.url))).toString();
 const initial=deserialize(snapshot),options=savedNativeAuthorityOptions(snapshot);
 const manifest={epoch:'sheltered-center-strike',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const source=await nativeProductionAuthority(initial,{...options,getTerrainManifest:()=>manifest});
 const step=f=>f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
 let restored,releaseReady,binding;
 try{
  source.command({kind:'setNavigationView',view:options.navigationView});
  let original;
  for(let i=0;i<800&&!original;i++){
   await step(source);await source.present();
   original=source.records.find(row=>row.kind==='animal-crop-strike'&&row.committed);
  }
  assert.ok(original);
  for(let i=0;i<6;i++){await step(source);await source.present();}
  const checkpoint=source.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  const disk=prepareWorkerCheckpoint(checkpoint,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert.equal(disk.saved,true);
  const saved=savedNativeAuthorityOptions(serialize(disk.state)),[animal]=disk.state.raid.animals;
  assert.equal(saved.nativeWorkerLifecycle,true);
  assert.equal(animal.status,'attacking');
  assert(animal.attackRemaining>0&&animal.attackRemaining<animal.attackDuration);
  const stale=structuredClone(disk.state);stale.raid.animals[0].x+=.25;
  assert.throws(()=>createSimulationAuthority(module,serialize(stale),saved.chunkKeys,saved),/Saved native animal request rejected/);
  restored=await nativeProductionAuthority(disk.state,{...saved,getTerrainManifest:()=>manifest,
   onReady:record=>record.kind==='animal-crop-strike'?new Promise(resolve=>{releaseReady=resolve;}):undefined,
   onCommit:(record,data)=>{if(record.kind==='animal-crop-strike')binding=data.nativeAnimalCropStrikeBinding;}});
  restored.command({kind:'setNavigationView',view:saved.navigationView});
  await untilProduction(restored,()=>releaseReady);
  const [action]=restored.records,ref=action.resources.reference;
  assert.deepEqual([ref.kind,ref.purpose,ref.targetId,ref.centerId],[27,'center',2,2]);
  assert.equal(ref.restore.attackId,Number(animal.attackId.slice(7)));
  assert.equal(ref.restore.remaining,animal.attackRemaining);
  assert.equal(ref.restore.duration,animal.attackDuration);
  assert.equal(ref.routeTicket,undefined);
  assert.notEqual(ref.worldBoundary.authorityEpoch,original.resources.worldBoundary.authorityEpoch);
  const hold=await step(restored),held=JSON.parse(hold.snapshot);
  assert.deepEqual(held.raid.animals[0],animal);
  assert.equal(held.rng,disk.state.rng);
  assert.equal(held.sequence,disk.state.sequence);
  assert.equal(action.committed,false);
  const heldCheckpoint=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(heldCheckpoint.nativeAuthorityCheckpoint.workerLifecycle,1);
  releaseReady();
  await untilProduction(restored,()=>action.committed);
  await restored.present();
  await action.packet.presented;
  assert.ok(binding);
  assert.equal(binding.reference.endTime,held.elapsed+animal.attackRemaining);
  const witness=restored.host.inspect().nativeRouteFrame.bindings.find(row=>row.nativeAnimalCrop?.kind===27);
  assert.equal(witness.relativeTime,0);
  assert.equal(nativeAnimalStrikeClipAge(witness.nativeAnimalCrop,witness.relativeTime),Math.fround(animal.attackDuration-animal.attackRemaining));
  const events=[];
  let final=held;
  for(let i=0;i<120&&!events.some(event=>event.type==='StructureHit');i++){
   const next=await step(restored);events.push(...next.events);final=JSON.parse(next.snapshot);await restored.present();
  }
  assert.deepEqual(events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[125]);
  const hits=events.filter(event=>event.type==='AnimalLogicalHit');
  assert.deepEqual(hits.map(event=>[event.attackId,event.targetId]),[[animal.attackId,animal.targetId]]);
  assert(hits[0].simulationTime>=binding.reference.endTime);
  assert.equal(final.raid.animals[0].hitsRemaining,animal.hitsRemaining-1);
  assert.equal(final.rng,disk.state.rng);
  assert.deepEqual(final.ledger,disk.state.ledger);
  await step(restored);
  await untilProduction(restored,()=>restored.records.some(row=>row.kind==='animal-crop-route'&&row.committed));
  const retreat=restored.records.find(row=>row.kind==='animal-crop-route');
  assert.equal(retreat.resources.reference.purpose,'retreat');
  assert.equal(retreat.resources.reference.bodyId,ref.bodyId);
  assert.deepEqual(restored.faults,[]);
 }finally{releaseReady?.();try{await restored?.close();}finally{await source.close();}}
});
