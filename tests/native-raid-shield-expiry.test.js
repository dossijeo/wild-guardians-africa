import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

test('a restored Shield expires within an acquired crop approach and keeps its submitted route',async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d1-native-active-raid.json.gz')).toString());
 const {chunkKeys}=JSON.parse(readFileSync('docs/guardian/performance/native-ordinary-attack-crops-20261121.json'));
 state.spells.push({id:'spell-'+state.nextId++,kind:'shield',x:62,z:0,radius:1.95,remaining:.026});
 let release;
 const held=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(state,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,
  onReady:row=>row.resources.kind===4?held:undefined});
 try{
  await untilProduction(f,()=>f.records.some(row=>row.kind==='animal-crop-route'&&row.committed));
  await f.present();
  const clock=()=>f.host.inspect().nativeRouteFrame.bindings.find(row=>row.nativeAnimalCrop?.kind===26&&row.semantic==='relative');
  const previousClock=clock(),route=previousClock.nativeAnimalCrop;
  const snapshot=()=>f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  const before=snapshot(),old=JSON.parse(before.snapshot),owner=before.nativeAuthorityCheckpoint.shieldOwners[0];
  const order={kind:'advance',seconds:.02,steps:2,nightFastForward:false,captureClockSegments:true,visualTerrain:true};
  let complete=false;
  const pending=Promise.resolve(f.command(order)).finally(()=>{complete=true;});
  pending.catch(()=>{});
  let ready;
  for(let i=0;i<500&&!complete&&!ready;i++){
   await f.present();
   ready=f.records.find(row=>row.resources.kind===4&&row.packet);
  }
  if(complete)await pending;
  assert(ready);
  assert.equal(ready.committed,false);
  assert.equal(ready.resources.nativeShield.polygonId,owner.polygonId);
  assert(Math.abs(ready.resources.effectiveTime-old.elapsed-.026)<1e-9);
  assert.deepEqual(clock().nativeAnimalCrop,route);
  release();
  let presented=false;
  ready.packet.presented.then(()=>{presented=true;});
  for(let i=0;i<500&&!presented;i++)await f.present();
  assert(presented);
  const result=await pending,after=JSON.parse(result.snapshot),actual=clock();
  assert.equal(result.stepsExecuted,2);
  assert.equal(result.sequence,before.sequence+1);
  assert(Math.abs(result.elapsed-old.elapsed-.04)<1e-9);
  assert.deepEqual(after.spells,[]);
  assert.deepEqual(after.ledger,old.ledger);
  assert.equal(after.raid.animals[0].targetId,old.raid.animals[0].targetId);
  assert(after.raid.animals[0].motionPhase>old.raid.animals[0].motionPhase);
  assert.deepEqual(actual.nativeAnimalCrop,route);
  assert.equal(actual.executionEpoch,previousClock.executionEpoch);
  assert(actual.relativeTime>previousClock.relativeTime);
  assert.deepEqual(result.nativeWorldResources.map(row=>row.kind),[4]);
  assert.deepEqual(f.host.inspect().nativeRouteFrame.worldBoundary,ready.resources.worldBoundary);
  const checkpoint=snapshot().nativeAuthorityCheckpoint;
  assert.deepEqual(checkpoint.shieldOwners,[]);
  assert.deepEqual(checkpoint.spatialState.polygons,before.nativeAuthorityCheckpoint.spatialState.polygons.filter(row=>row.id!==owner.polygonId));
  assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});
