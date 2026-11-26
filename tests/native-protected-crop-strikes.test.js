import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeCropRouteSubject} from '../src/simulation/raids.js';
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

for(const expiredFirst of [false,true])test(expiredFirst?'remaining hit approaches the same crop after an expired border miss':
 'protected strike repeats from the same border and stays acquired when its shield expires',async()=>{
 const initial=deserialize(input),manifest={epoch:'crop',chunks:chunkKeys.map(key=>{
   const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const rig=await originalRig(structuredClone(initial),manifest);
 const proofs=[],facts=[];
 let stop,releaseStrike,heldSteps=0,checkedRemoval=false,firstImpact;
 const f=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,getTerrainManifest:()=>manifest,
  async onPrepare(record){
   if(record.kind.startsWith('animal-crop-'))await rig.prepare(record.resources);
   else if(record.resources.nativeShieldCropStop)stop=await rig.prepareStop(record.resources);
  },
  onCommit(record,data){
   if(record.kind.startsWith('animal-crop-')){
    const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;
    rig.commit(proof,data);proofs.push(proof);
   }else if(record.resources.nativeShieldCropStop){stop.commit(data);stop=null;}
  },
  onReady(record){
   if(!expiredFirst&&!releaseStrike&&record.kind==='animal-crop-strike'&&proofs.some(p=>p.reference.kind===27))
    return new Promise(resolve=>{releaseStrike=resolve;});
  }
 });
 try{
  await untilProduction(f,()=>proofs.length===1);
  await f.present();
  let state=f.snapshot();rig.update(structuredClone(state));
  const command={kind:'castShield',id:'shield-protected-strikes',x:90,z:expiredFirst?5.6:7.5};
  await settle(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal((await settle(f,f.structureCommand(command))).value,true);
  await settle(f,f.authority.finishNativeStructureCommand(command));
  const checkpoint=()=>f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  await untilProduction(f,()=>proofs.length===2);
  const owner=checkpoint().nativeAuthorityCheckpoint.shieldOwners[0];assert(owner);
  const plant=state.plants.find(p=>p.id==='plant-373'),priorHits=plant.attackHits;
  const pose=a=>[a.x,a.z,a.heading,a.motionPhase];
  for(let i=0;i<850&&state.raid;i++){
   const op=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
   const result=op.then?await settle(f,op):op;
   state=JSON.parse(result.snapshot);rig.update(structuredClone(state));await f.present();
   const actor=state.raid?.animals[0],events=result.events;
   facts.push(...events.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss','CropHit','CropDestroyed','RaidEnded'].includes(e.type)));
   if(!expiredFirst&&events.some(e=>e.type==='AnimalLogicalHit')){
    firstImpact={pose:pose(actor),rng:state.rng,reservation:actor.reservation};
    assert.equal(actor.approachShieldId,owner.spellId);assert.equal(actor.hitsRemaining,1);
   }
   if(actor?.status==='walking'&&proofs.at(-1)?.reference.kind===26&&proofs.at(-1).reference.purpose!=='retreat'&&state.elapsed>=proofs.at(-1).reference.endTime){
    if(firstImpact)await untilProduction(f,()=>!!releaseStrike);
    else await untilProduction(f,()=>proofs.some(p=>p.reference.kind===27&&p.reference.routeTicket===proofs.findLast(q=>q.reference.kind===26).reference.worldBoundary.ticket));
   }
   if(releaseStrike&&heldSteps<2){
    assert.deepEqual(pose(actor),firstImpact.pose);assert.equal(actor.reservation,firstImpact.reservation);
    assert.equal(state.rng,firstImpact.rng);assert.equal(actor.hitsRemaining,1);
    if(++heldSteps===2){releaseStrike();await untilProduction(f,()=>proofs.filter(p=>p.reference.kind===27).length===2);}
   }
   const removal=f.records.find(r=>r.resources.kind===4&&r.committed);
   if(removal&&!checkedRemoval){
    await settle(f,removal.packet.presented);
    const ref=proofs.at(-1),frame=f.host.inspect().nativeRouteFrame;
    assert.equal(ref.reference.kind,27);assert.equal(actor.attackId,'attack-'+ref.attackId);
    assert.equal(actor.approachShieldId,owner.spellId);
    const {x,z,yaw,phase:motionPhase}=ref.reference;
    assert.deepEqual(pose(actor),[x,z,yaw,motionPhase]);
    assert.equal(state.raid.reservations[actor.reservation],actor.id);
    assert.equal(actor.hitsRemaining,expiredFirst?2:1);
    assert.equal(state.spells.length,0);assert.equal(removal.resources.nativeShield.polygonId,owner.polygonId);
    assert.equal(removal.resources.retainsNativeAssignments,true);assert.deepEqual(frame.worldBoundary,removal.resources.worldBoundary);
    const binding=frame.bindings.find(v=>v.nativeAnimalCrop?.kind===27&&v.semantic==='relative');
    assert.deepEqual(binding.nativeAnimalCrop,ref.preparedReference);
    const age=captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(ref.preparedReference);
    assert.equal(age,binding.relativeTime);assert(age>0);rig.presented(age);
    assert.equal(checkpoint().nativeAuthorityCheckpoint.shieldOwners.length,0);
    const native={mode:3,shieldExpired:true,shieldPolygon:owner.polygonId,shieldContact:{...removal.resources.nativeShield.spell},strike:{attackId:ref.attackId}};
    assert(nativeCropRouteSubject(state,actor,null,native));
    for(const wrong of [{shieldExpired:false},{shieldPolygon:0},{mode:2},{strike:{attackId:ref.attackId+1}},{shieldContact:{...native.shieldContact,id:'other'}}]){
     assert.equal(nativeCropRouteSubject(state,actor,null,{...native,...wrong}),null);
    }
    checkedRemoval=true;
   }
  }
  assert.equal(heldSteps,expiredFirst?0:2);assert(checkedRemoval);assert.equal(state.raid,null);
  const hits=facts.filter(e=>e.type==='AnimalLogicalHit'),misses=facts.filter(e=>e.type==='AnimalLogicalMiss');
  assert.equal(hits.length,1);assert.equal(hits[0].presentation.shield?.id,expiredFirst?undefined:owner.spellId);
  assert.equal(misses.length,1);assert.equal(misses[0].reason,'shield-expired');
  const strikes=proofs.filter(p=>p.reference.kind===27);
  assert.deepEqual(strikes.map(p=>'attack-'+p.attackId),expiredFirst?[misses[0].attackId,hits[0].attackId]:[hits[0].attackId,misses[0].attackId]);
  assert.notEqual(hits[0].attackId,misses[0].attackId);
  assert(proofs.every(p=>p.reference.bodyId===1));assert.deepEqual(proofs.map(p=>p.reference.kind),[26,26,27,26,27,26]);
  assert.equal(proofs.at(-1).reference.purpose,'retreat');
  const crop=state.plants.find(p=>p.id===plant.id);
  for(const event of ['CropHit','CropDestroyed'])assert.equal(facts.filter(e=>e.type===event&&e.targetId===plant.id).length,expiredFirst?1:0);
  assert.equal(crop.alive,!expiredFirst);assert.equal(crop.attackHits,expiredFirst?1:priorHits);
  const resumed=proofs[3].reference,finished=strikes[0].reference;
  for(const key of ['actorId','bodyId','targetId','x','z','yaw','phase'])assert.equal(resumed[key],finished[key],key);
  if(expiredFirst){
    const second=strikes[1].reference;
    assert(Math.abs(Math.hypot(second.x-plant.x,second.z-plant.z)-(second.radius+.6))<2e-6);
    assert(resumed.endTime>resumed.worldBoundary.effectiveTime);
  }else assert.equal(resumed.endTime,resumed.worldBoundary.effectiveTime);
  assert.equal(facts.filter(e=>e.type==='RaidEnded').length,1);assert.deepEqual(f.faults,[]);
 }finally{releaseStrike?.();await f.close();stop?.abort();rig.close();}
});
