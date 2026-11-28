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
test('Shield expiry is qualified when the protected strike would finish in the same substep',async()=>{
 const initial=deserialize(input),manifest={epoch:'crop',chunks:chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const rig=await originalRig(structuredClone(initial),manifest);
 let stop,held,release,removal,releaseRemoval;
 const routes=[],strikes=[];
 const f=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,getTerrainManifest:()=>manifest,
  async onPrepare(record){
   if(record.kind.startsWith('animal-crop-'))await rig.prepare(record.resources);
   else if(record.resources.nativeShieldCropStop||record.resources.nativeShieldCropExpiry?.completionSequence)stop=await rig.prepareStop(record.resources);
  },
  onCommit(record,data){
   if(record.kind.startsWith('animal-crop-')){
    const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;
    rig.commit(proof,data);(proof.reference.kind===26?routes:strikes).push(proof);
   }else if(record.resources.nativeShieldCropStop||record.resources.nativeShieldCropExpiry?.completionSequence){stop.commit(data);stop=null;}
  },
  onReady(record){
   if(record.kind==='animal-crop-strike'&&!held){
    held=record;return new Promise(resolve=>{release=resolve;});
   }
   if(record.resources.nativeShieldCropExpiry?.completionSequence){
    removal=record;return new Promise(resolve=>{releaseRemoval=resolve;});
   }
  }
 });
 try{
  await untilProduction(f,()=>routes.length===1);
  await f.present();rig.update(structuredClone(f.snapshot()));
  const command={kind:'castShield',id:'shield-expiry-strike-same-substep',x:90,z:7.5};
  await settle(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal((await settle(f,f.structureCommand(command))).value,true);
  await settle(f,f.authority.finishNativeStructureCommand(command));
  await untilProduction(f,()=>routes.length===2);
  let state=f.snapshot();const due=state.elapsed+state.spells[0].remaining;
  const advance=seconds=>f.command({kind:'advance',seconds,steps:1,nightFastForward:false});
  const observe=async op=>{
   const result=op.then?await settle(f,op):op;
   state=JSON.parse(result.snapshot);rig.update(structuredClone(state));await f.present();
   return result;
  };
  const step=seconds=>observe(advance(seconds));
  for(let i=0;i<360&&state.elapsed<routes[1].reference.endTime;i++)await step(.05);
  await untilProduction(f,()=>!!held);
  const acquire=due-held.resources.reference.duration-.005;
  assert(acquire>state.elapsed);
  await step(acquire-state.elapsed);
  release();await untilProduction(f,()=>strikes.length===1);
  await settle(f,held.packet.presented);
  assert(Math.abs(strikes[0].reference.endTime-due+.005)<1e-8);
  while(due-state.elapsed-.01>.25)await step(.25);
  await step(due-state.elapsed-.01);
  assert.equal(state.raid.animals[0].status,'attacking');
  const expected=strikes[0].reference,visible=f.host.inspect().nativeRouteFrame,before=state;
  assert(visible.bindings.some(binding=>binding.nativeAnimalCrop?.kind===27));
  const crossing=advance(.03);crossing.catch(()=>{});
  await untilProduction(f,()=>!!releaseRemoval);
  const proof=removal.resources.nativeShieldCropExpiry;
  assert.equal(removal.committed,false);
  assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.ticket,visible.worldBoundary.ticket);
  assert(!proof.requestSequence&&proof.completionSequence>0);
  assert.equal(proof.strikeTicket,expected.worldBoundary.ticket);
  assert.equal(proof.attackId,strikes[0].attackId);
  for(const k of ['bodyId','targetId','x','z','yaw','phase'])assert.equal(proof[k],expected[k],k);
  assert(Math.abs(proof.worldBoundary.effectiveTime-due)<1e-8);
  releaseRemoval();const crossed=await settle(f,crossing);
  await settle(f,removal.packet.presented);
  await untilProduction(f,()=>removal.committed&&!stop);
  await observe(crossed);
  assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.ticket,proof.worldBoundary.ticket);
  assert.deepEqual(f.host.inspect().nativeRouteFrame.bindings,[]);
  assert.equal(state.spells.length,0);
  assert(Math.abs(state.elapsed-before.elapsed-.03)<1e-8);
  const hitFacts=crossed.events.filter(e=>['AnimalLogicalMiss','AnimalLogicalHit','CropHit'].includes(e.type));
  assert.deepEqual(hitFacts.map(e=>[e.type,e.reason,e.attackId,e.simulationTime]),
   [['AnimalLogicalMiss','shield-expired','attack-'+proof.attackId,proof.worldBoundary.effectiveTime]]);
  assert.equal(state.raid.animals[0].hitsRemaining,1);
  assert.equal(state.raid.animals[0].reservation,before.raid.animals[0].reservation);
  assert.deepEqual(state.ledger,before.ledger);
  await untilProduction(f,()=>routes.length===3);
  const replacement=routes[2].reference;
  for(const k of ['bodyId','targetId','x','z','yaw','phase'])assert.equal(replacement[k],proof[k],k);
  assert(replacement.endTime>replacement.worldBoundary.effectiveTime);
  const checkpoint=f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  assert.deepEqual(checkpoint.nativeAuthorityCheckpoint.shieldOwners,[]);
  assert.deepEqual(f.faults,[]);
 }finally{release?.();releaseRemoval?.();await f.close();stop?.abort();rig.close();}
});
