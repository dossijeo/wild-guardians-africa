import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';

const input=gunzipSync(readFileSync('tests/fixtures/sabana712-d1-native-active-raid.json.gz')).toString();
const {chunkKeys}=JSON.parse(readFileSync('docs/guardian/performance/native-ordinary-attack-crops-20261121.json'));

async function settle(f,promise){
 let settled=false;
 promise.finally(()=>settled=true).catch(()=>{});
 for(let i=0;i<500&&!settled;i++)await f.present();
 assert(settled);
 return promise;
}
function qualifiedDraw(f){
 return f.host.inspect().nativeRouteFrame.bindings.find(row=>row.nativeAnimalCrop?.kind===26&&row.semantic==='relative');
}
function checkpoint(f){
 return f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
}

for(const variant of ['clear','intersecting','blocked','expired READY'])test('acquired crop and '+variant+' Shield',async()=>{
 const intersects=variant!=='clear',blocked=variant==='blocked',stale=variant==='expired READY';
 let allowShield,allowDetour;
 const holdShield=new Promise(resolve=>allowShield=resolve),holdDetour=new Promise(resolve=>allowDetour=resolve);
 let count=0;
  const initial=deserialize(input),manifest={epoch:'crop',chunks:chunkKeys.map(key=>{
   const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
  })};
  const rig=await originalRig(structuredClone(initial),manifest);let preparedStop;
  const f=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,getTerrainManifest:()=>manifest,
  async onPrepare(r){
   if(r.kind==='animal-crop-route')await rig.prepare(r.resources);
   else if(r.kind==='shield'&&r.resources.routeEffects.rows.length)preparedStop=await rig.prepareStop(r.resources);
  },
  onCommit(r,data){
   if(r.kind==='animal-crop-route')rig.commit(data.nativeAnimalCropRouteBinding,data);
   else if(r.resources.nativeShieldCropStop&&preparedStop){preparedStop.commit(data);preparedStop=null;}
  },
  onReady(row){
   if(row.resources.kind===3)return holdShield;
   if(row.kind==='animal-crop-route'&&++count===2)return holdDetour;
  }
 });
 try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='animal-crop-route'&&r.committed));await f.present();
  const old=qualifiedDraw(f).nativeAnimalCrop;
  const a=checkpoint(f),before=JSON.parse(a.snapshot),animal=before.raid.animals[0];
  rig.update(structuredClone(before));
  const [x,z]=blocked?[91.25,10.55]:intersects?[84,21]:[62,0];
  const command={kind:'castShield',id:'shield-crop-host',x,z};
  let prepareError;
  const prepare=f.authority.prepareNativeStructureCommand(command);prepare.catch(error=>prepareError=error);
  for(let i=0;i<500&&!prepareError&&!f.records.some(r=>r.kind==='shield'&&r.packet);i++)await f.present();
  if(prepareError)throw prepareError;
  const shield=f.records.find(r=>r.kind==='shield'&&r.packet);
  assert(shield);
  assert.equal(shield.committed,false);
  assert.equal(shield.resources.retainsNativeAssignments,!intersects);
  assert.equal(shield.resources.routeEffects.rows.length,intersects?26:0);
  assert.deepEqual(qualifiedDraw(f).nativeAnimalCrop,old);
  assert.deepEqual(f.snapshot().spells,[]);
  assert.deepEqual(f.snapshot().ledger,before.ledger);
  if(stale){
   const step=await f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
   assert(step.elapsed>shield.resources.effectiveTime);
   allowShield();await settle(f,prepare);
   const denied=await settle(f,Promise.resolve(f.structureCommand(command)));
   assert.equal(denied.value,false);
   assert.match(denied.rejection,/stale/);
   await settle(f,f.authority.finishNativeStructureCommand(command));
   assert.equal(shield.committed,false);
   assert.deepEqual(f.snapshot().spells,[]);
   assert.deepEqual(checkpoint(f).nativeAuthorityCheckpoint.spatialState.polygons,a.nativeAuthorityCheckpoint.spatialState.polygons);
   assert.deepEqual(qualifiedDraw(f).nativeAnimalCrop,old);
   assert.deepEqual(f.faults,[]);
   return;
  }
  allowShield();
  await settle(f,prepare);
  const result=await settle(f,Promise.resolve(f.structureCommand(command)));
  assert.equal(result.value,true);
  await settle(f,f.authority.finishNativeStructureCommand(command));
  await settle(f,shield.packet.presented);
  const first=f.host.inspect().nativeRouteFrame;
  assert.deepEqual(first.worldBoundary,shield.resources.worldBoundary);
  assert.equal(!!qualifiedDraw(f),!intersects);
  const cast=checkpoint(f),after=JSON.parse(cast.snapshot),stopped=after.raid.animals[0];
  const owner=cast.nativeAuthorityCheckpoint.shieldOwners[0];
  assert.equal(cast.nativeAuthorityCheckpoint.shieldOwners.length,1);
  assert.equal(after.spells.length,1);
  assert.equal(after.events.filter(e=>e.type==='SpellActivated'&&e.commandId===command.id).length,1);
  assert.deepEqual(after.ledger,before.ledger);
  assert(after.cooldowns.shield>before.cooldowns.shield);
  for(const field of ['x','z','heading','motionPhase','targetId','hitsRemaining','reservation'])
   assert.equal(stopped[field],animal[field],field);
  assert.equal(owner.spellId,after.spells[0].id);
  if(!intersects){
   assert.deepEqual(qualifiedDraw(f).nativeAnimalCrop,old);
   assert.equal(count,1);
  }else{
   if(blocked){
    assert.equal(count,1);
    let state=after;
    for(let i=0;i<42&&state.spells.length;i++){
     const r=await settle(f,Promise.resolve(f.command({kind:'advance',seconds:.5,steps:1,nightFastForward:false})));
     state=JSON.parse(r.snapshot);
     for(const field of ['x','z','heading','motionPhase','targetId','hitsRemaining','reservation'])
      assert.equal(state.raid.animals[0][field],animal[field],field);
     if(state.spells.length)assert.equal(count,1);
    }
    assert.deepEqual(state.spells,[]);
    assert.equal(checkpoint(f).nativeAuthorityCheckpoint.shieldOwners.length,0);
    await f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
   }
   for(let i=0;i<500&&!f.records.some(r=>r.kind==='animal-crop-route'&&r!==f.records[0]&&r.packet);i++)await f.present();
   const detour=f.records.filter(r=>r.kind==='animal-crop-route')[1];
   assert(detour?.packet,JSON.stringify({faults:f.faults,production:f.authority.nativeIntentProductionStatus()}));
   assert.equal(detour.committed,false);
   const holdStep=await f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
   const whileHeld=JSON.parse(holdStep.snapshot).raid.animals[0];
   for(const field of ['x','z','heading','motionPhase','targetId','hitsRemaining','reservation'])
    assert.equal(whileHeld[field],animal[field],field);
   allowDetour();
   await untilProduction(f,()=>detour.committed);
   await settle(f,detour.packet.presented);
   const next=qualifiedDraw(f).nativeAnimalCrop;
   assert.equal(next.bodyId,old.bodyId);
   assert.equal(next.targetId,old.targetId);
   assert.equal(next.phase,old.phase);
   assert.notEqual(next.generation,old.generation);
   assert(next.worldBoundary.ticket>shield.resources.ticket);
   for(let i=0;i<80;i++){
    const r=await f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
    const p=JSON.parse(r.snapshot).raid.animals[0];
    if(!blocked)assert(Math.hypot(p.x-command.x,p.z-command.z)>3.05);
    assert.equal(p.hitsRemaining,stopped.hitsRemaining);
   }
   assert(f.snapshot().raid.animals[0].motionPhase>stopped.motionPhase);
  }
  assert.deepEqual(f.faults,[]);
 }finally{allowShield();allowDetour();await f.close();preparedStop?.abort();rig.close();}
});

test('unprepared native raid Shield cannot revoke a drawn approach',async()=>{
 const f=await nativeProductionAuthority(deserialize(input),{chunkKeys,qualifyAnimalCrop:true});
 try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='animal-crop-route'&&r.committed));
  await f.present();
  const command={kind:'castShield',id:'unprepared-native-crop-shield',x:84,z:21};
  const old=qualifiedDraw(f).nativeAnimalCrop,before=checkpoint(f);
  const denied=await f.command(command);
  assert.equal(denied.value,false);
  assert.match(denied.rejection,/preparar la presentación/);
  const after=checkpoint(f);
  assert.deepEqual(after.nativeAuthorityCheckpoint.spatialState,before.nativeAuthorityCheckpoint.spatialState);
  assert.deepEqual(JSON.parse(after.snapshot).spells,[]);
  assert.deepEqual(qualifiedDraw(f).nativeAnimalCrop,old);
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});
