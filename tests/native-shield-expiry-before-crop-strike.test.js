import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';

const input=gunzipSync(readFileSync('tests/fixtures/sabana712-d1-native-active-raid.json.gz')).toString();
const {chunkKeys}=JSON.parse(readFileSync('docs/guardian/performance/native-ordinary-attack-crops-20261121.json'));
async function settle(f,request){
 let done=false;
 const promise=Promise.resolve(request);
 promise.finally(()=>done=true).catch(()=>{});
 for(let i=0;i<500&&!done;i++)await f.present();
 assert(done);
 return promise;
}
for(const source of ['prepared','moving','arrived'])test('Shield expiry with the border approach still '+source,async()=>{
 let readyCount=0,release,releaseStrike,stop;
 const initial=deserialize(input),manifest={epoch:'crop',chunks:chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const rig=await originalRig(structuredClone(initial),manifest);
 const byRequest=new Set();
 const f=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,getTerrainManifest:()=>manifest,
  async onPrepare(record){
   if(record.kind==='animal-crop-route'){
    if(source==='prepared'&&readyCount===1)return;
    await rig.prepare(record.resources);byRequest.add(record);
   }else if(record.resources.nativeShieldCropStop)stop=await rig.prepareStop(record.resources);
  },
  onCommit(record,data){
   if(byRequest.has(record))rig.commit(data.nativeAnimalCropRouteBinding,data);
   else if(data.resources?.nativeShieldCropStop){stop.commit(data);stop=null;}
  },
  onReady(record){
   if(record.kind==='animal-crop-route'&&++readyCount===2)return new Promise(resolve=>{release=resolve;});
   if(source==='arrived'&&record.kind==='animal-crop-strike')return new Promise(resolve=>{releaseStrike=resolve;});
  }
 });
 try{
  const routes=()=>f.records.filter(r=>r.kind==='animal-crop-route');
  await untilProduction(f,()=>routes()[0]?.committed);
  await f.present();
  rig.update(structuredClone(f.snapshot()));
  const start=f.snapshot().elapsed,command={kind:'castShield',id:'shield-expiry-before-strike',x:90,z:7.5};
  await settle(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal((await settle(f,f.structureCommand(command))).value,true);
  await settle(f,f.authority.finishNativeStructureCommand(command));
  const step=async seconds=>{
   const value=await settle(f,f.command({kind:'advance',nightFastForward:false,seconds,steps:1}));
   rig.update(JSON.parse(value.snapshot));await f.present();return value;
  };
  await untilProduction(f,()=>!!release);
  const [old,border]=routes();
  assert.equal(old.resources.reference.bodyId,border.resources.reference.bodyId);
  assert.equal(border.resources.reference.targetId,373);
  assert.equal(border.committed,false);
  if(source!=='arrived')for(let i=0;i<24;i++)await step(.25);
  if(source!=='prepared'){
   release();
   await untilProduction(f,()=>border.committed);
   await settle(f,border.packet.presented);
  }
  for(let i=0;i<(source==='arrived'?79:55);i++)await step(.25);
  const before=f.snapshot(),animal=before.raid.animals[0];
  assert(Math.abs(before.elapsed-(start+19.75))<1e-8);
  assert.equal(before.spells[0].id,animal.approachShieldId);
  assert.equal(animal.hitsRemaining,2);
  assert(!f.records.some(r=>r.kind==='animal-crop-strike'&&r.committed));
  if(source==='arrived')assert(releaseStrike);
  assert.equal(border.committed,source!=='prepared');
  const crossing=await settle(f,f.command({kind:'advance',nightFastForward:false,seconds:.27,steps:1}));
  const projected=JSON.parse(crossing.snapshot),next=projected.raid.animals[0];
  assert.equal(crossing.stepsExecuted,1);
  assert(Math.abs(projected.elapsed-(start+20.02))<1e-8);
  assert.equal(projected.spells.length,0);
  assert.deepEqual(projected.ledger,before.ledger);
  assert.equal(next.hitsRemaining,2);
  assert.equal(next.targetId,animal.targetId);
  assert(!next.approachShieldId);
  const removals=f.records.filter(r=>r.resources.kind===4);
  assert.equal(removals.length,1);
  const [removal]=removals;
  await untilProduction(f,()=>removal.committed);
  await settle(f,removal.packet.presented);
  rig.update(structuredClone(projected));
  const stopProof=removal.resources.nativeShieldCropStop;
  assert.equal(!!stopProof,source!=='prepared');
  if(stopProof){
   assert.equal(stopProof.removal,true);assert.equal(stopProof.bodyId,border.resources.reference.bodyId);
   assert.deepEqual([next.x,next.z,next.heading,next.motionPhase],[stopProof.x,stopProof.z,stopProof.yaw,stopProof.phase]);
   if(source==='moving')assert(next.motionPhase>animal.motionPhase);
  }else{
   assert.deepEqual([next.x,next.z,next.heading,next.motionPhase],[animal.x,animal.z,animal.heading,animal.motionPhase]);
   release();await f.present();assert.equal(border.aborted,true);assert.equal(border.committed,false);
  }
  if(releaseStrike){
   const strike=f.records.find(r=>r.kind==='animal-crop-strike');
   releaseStrike();await f.present();assert(strike.aborted);assert.equal(strike.committed,false);
  }
  await untilProduction(f,()=>routes()[2]?.committed);
  await settle(f,routes()[2].packet.presented);
  const nextRoute=routes()[2].resources.reference;
  assert.equal(nextRoute.bodyId,border.resources.reference.bodyId);
  assert.equal(nextRoute.targetId,373);
  assert.equal(nextRoute.phase,next.motionPhase);
  assert.notEqual(nextRoute.generation,border.resources.reference.generation);
  const rows=routes()[2].resources.rows,tail=rows.length-16;
  assert(Math.abs(Math.hypot(rows[tail+1]-90,rows[tail+2]-7.5)-1.7)<2e-6);
  assert(!crossing.events.some(e=>e.type==='AnimalLogicalHit'||e.type==='AnimalLogicalMiss'));
  assert.deepEqual(f.faults,[]);
 }finally{release?.();releaseStrike?.();await f.close();stop?.abort();rig.close();}
});
