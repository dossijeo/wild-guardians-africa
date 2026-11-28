import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {copyNativeBarrierAdditionAttestation} from '../src/world/native-barrier-addition.js';
import {rational} from '../src/simulation/money.js';
import {wallSpec} from '../src/simulation/rules.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
async function pump(f,promise){let done=false,result,error;promise.then(value=>{done=true;result=value;},value=>{done=true;error=value;});for(let i=0;i<2000&&!done;i++)await f.present();if(!done)throw Error('Native Build directed test timed out');if(error)throw error;return result;}
async function setup(away=false){
 const source=nativeFarmArrivalRouteFixture({peer:false}),saved=structuredClone(source.state),a=source.point(0,away?8:-3),b=source.point(0,away?14:3);saved.ledger.balance=rational(100000);
 const f=await nativeProductionAuthority(saved,{chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1']});
 await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));for(let i=0;i<2;i++){f.advance();await f.present();}
 return {f,command:{kind:'buildWallChain',id:away?'native-solid-away':'native-solid-crossing',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}},async close(){try{await f.close();}finally{source.close();}}};
}
for(const away of [false,true])test(`ordinary native solid Build ${away?'outside':'across'} Farm commits only in its own command and preserves immediate checkpoint`,async()=>{
 const x=await setup(away),{f,command}=x;try{
  const before=f.snapshot(),original=f.records.find(r=>r.kind==='farm-arrival').resources.nativeFarmArrival;
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  const ready=f.records.find(r=>r.kind==='barrier-addition');assert(ready);assert.equal(ready.committed,false);assert.equal(f.snapshot().ledger.entries[command.id],undefined);
  const intermediate=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(intermediate.events.some(e=>e.type==='WallChainBuilt'),false);assert.equal(JSON.parse(intermediate.snapshot).ledger.entries[command.id],undefined);assert.equal(intermediate.nativeWorldResources?.some(r=>r.kind===2)??false,false);
  const result=await pump(f,f.structureCommand(command)),after=JSON.parse(result.snapshot),event=result.events.find(e=>e.type==='WallChainBuilt');
  assert.equal(result.value,true,JSON.stringify({rejection:result.rejection,events:result.events,faults:f.faults}));assert(event);assert.equal(event.commandId,command.id);assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);assert.equal(event.gates,0);
  assert.deepEqual(after.ledger.entries[command.id],rational(-event.count*wallSpec(command.material).cost));assert.equal(after.structures.length,before.structures.length+event.count);
  const record=result.nativeWorldResources?.find(r=>r.kind===2);assert(record?.nativeBarrierAdditionBinding);assert.equal(result.terrainChanged,false);assert.deepEqual(record.chunks,[]);assert.deepEqual(record.removed,[]);
  const nextTick=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(nextTick.events.some(e=>e.type==='WallChainBuilt'),false);
  const checkpoint=f.command({kind:'snapshot',visualTerrain:true});assert.deepEqual(checkpoint.terrainCheckpoint.nativeWorldBoundary,record.worldBoundary);assert.equal(checkpoint.events.some(e=>e.type==='WallChainBuilt'),false);
  const duplicate=f.command(command);assert.equal(duplicate.value,false);assert.equal(duplicate.events.some(e=>e.type==='WallChainBuilt'),false);
  await pump(f,f.authority.finishNativeStructureCommand(command));await f.present();assert(ready.committed,JSON.stringify({faults:f.faults,errors:f.errors.map(String),aborted:ready.aborted,host:f.host.inspect()}));assert.deepEqual(f.faults,[]);
  assert.deepEqual(ready.resources.nativeBarrierAddition.additions.map(x=>x.entityId),event.presentation.targetIds);
  if(away){assert.equal(f.records.some(r=>r.kind==='farm-arrival-stop'),false);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival');}
  else{const stopped=f.records.find(r=>r.kind==='farm-arrival-stop'&&r.committed);assert(stopped);assert.equal(stopped.resources.nativeStop.sourceRoute.actorId,original.actorId);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival-held');}
 }finally{await x.close();}
});
test('cancelling a ready native solid Build retires its preparation without consuming the purchase',async()=>{
 const x=await setup(true),{f,command}=x;try{
  const before=f.snapshot();await pump(f,f.authority.prepareNativeStructureCommand(command));const record=f.records.find(r=>r.kind==='barrier-addition');assert(record);
  await pump(f,f.authority.finishNativeStructureCommand(command));await f.present();const late=f.command(command),after=JSON.parse(late.snapshot);assert.equal(late.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);assert.equal(record.committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});
test('native solid Build rejects an expired quote in its command and never charges',async()=>{
 const x=await setup(true),{f,command}=x;try{
  await pump(f,f.authority.prepareNativeStructureCommand(command));const before=f.snapshot();f.command({kind:'pause',reason:'test-build-stale'});
  const result=await pump(f,f.structureCommand(command)),after=JSON.parse(result.snapshot);assert.equal(result.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);assert.equal(result.nativeWorldResources?.some(r=>r.kind===2)??false,false);assert.equal(result.events.some(e=>e.type==='WallChainBuilt'),false);
  await pump(f,f.authority.finishNativeStructureCommand(command));assert.equal(f.records.find(r=>r.kind==='barrier-addition').committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});

const enclosureCommand={kind:'buildWallChain',id:'paid-sheltered-crops-enclosure',material:'zarzas',
 points:[[96,-5],[102,-5],[102,-13],[96,-13],[96,-5]],options:{smooth:false,snap:false,requireComplete:true}};
const enclosureStart=()=>deserialize(gunzipSync(readFileSync(new URL('./fixtures/desierto712-two-crops-prehire.json.gz',import.meta.url))).toString('utf8'));
const wallOwners=reply=>reply.nativeAuthorityCheckpoint.wallOwners;
const enclosureAuthority=(state=enclosureStart())=>nativeProductionAuthority(state,savedNativeAuthorityOptions(serialize(state)));

test('one native Build installs the automatic gate and twelve solid walls together across a disk reload',async()=>{
 const f=await enclosureAuthority();let reloaded;
 try{
  const before=f.snapshot(),original=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  await pump(f,f.authority.prepareNativeStructureCommand(enclosureCommand));
  const [ready]=f.records.filter(record=>record.kind==='barrier-addition');
  assert(ready,'the native mixed Build must produce a single READY');
  assert.equal(ready.committed,false);
  assert.deepEqual(f.snapshot().structures,before.structures);
  assert.deepEqual(wallOwners(f.command({kind:'snapshot',nativeAuthorityCheckpoint:true})),wallOwners(original));
  assert.equal(f.snapshot().ledger.entries[enclosureCommand.id],undefined);
  const {gates,additions,version}=ready.resources.nativeBarrierAddition;
  assert.equal(version,4);assert.equal(gates.length,1);assert.equal(additions.length,12);
  assert.equal(gates[0].entityId,'structure-19');assert.equal(gates[0].opening,0);
  assert.equal(gates[0].openingDirection,-1);
  assert.deepEqual(gates[0].proxies.map(proxy=>proxy.passMask),[0,0,1]);
  assert.deepEqual(ready.nativeBarrierWallEntities.map(piece=>piece.id),[gates[0].entityId,...additions.map(piece=>piece.entityId)]);

  const reply=await pump(f,f.structureCommand(enclosureCommand));
  assert.equal(reply.value,true,JSON.stringify({rejection:reply.rejection,faults:f.faults}));
  await pump(f,f.authority.finishNativeStructureCommand(enclosureCommand));await f.present();
  assert.equal(f.records.filter(record=>record.kind==='barrier-addition').length,1);
  assert.equal(ready.committed,true);
  const [event]=reply.events.filter(event=>event.type==='WallChainBuilt');
  assert.deepEqual(reply.events.filter(event=>event.type==='WallChainBuilt'),[event]);
  assert.deepEqual([event.count,event.gates,event.targetId],[13,1,'structure-7']);
  const committed=reply.nativeWorldResources.filter(resource=>resource.kind===2);
  assert.equal(committed.length,1);
  const binding=committed[0].nativeBarrierAdditionBinding,{nativeIds}=binding;
  assert.equal(nativeIds.length,15);
  const wrongDirection=structuredClone(binding);delete wrongDirection.reference.gates[0].openingDirection;
  assert.throws(()=>copyNativeBarrierAdditionAttestation(wrongDirection),/differs from its preparation/);
  const wrongIds=structuredClone(binding);[wrongIds.nativeIds[0],wrongIds.nativeIds[3]]=[wrongIds.nativeIds[3],wrongIds.nativeIds[0]];
  assert.throws(()=>copyNativeBarrierAdditionAttestation(wrongIds),/differs from its preparation/);
  const checkpoint=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  const owners=new Map(wallOwners(checkpoint).map(({entityId,ids})=>[entityId,ids]));
  assert.deepEqual(owners.get('structure-19'),nativeIds.slice(0,3));
  assert.deepEqual(additions.map(({entityId})=>owners.get(entityId)),nativeIds.slice(3).map(id=>[id]));
  const saved=prepareWorkerCheckpoint(checkpoint,{slotId:before.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(saved.saved);assert.deepEqual(saved.state.ledger.entries[enclosureCommand.id],rational(-130));
  assert.deepEqual(saved.state.ledger.balance,rational(270));
  reloaded=await enclosureAuthority(deserialize(serialize(saved.state)));
  const restored=reloaded.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(wallOwners(restored),wallOwners(checkpoint));
  // Compare the snapshot representation across disk, where signed zero is
  // stored as zero. Every barrier ID, coordinate and counter must survive.
  assert.deepEqual(restored.nativeAuthorityCheckpoint.spatialState,JSON.parse(JSON.stringify(checkpoint.nativeAuthorityCheckpoint.spatialState)));
  assert.deepEqual(reloaded.snapshot().structures,saved.state.structures);
  assert.equal(reloaded.snapshot().structures.find(piece=>piece.id==='structure-19').gateOpenDirection,-1);
  assert.equal(reloaded.command(enclosureCommand).value,false);
  const nextCommand={kind:'buildWallChain',id:'next-wall-after-enclosure',material:'zarzas',points:[[89,5],[92,5]],options:{smooth:false,snap:false}};
  await pump(reloaded,reloaded.authority.prepareNativeStructureCommand(nextCommand));
  const next=await pump(reloaded,reloaded.structureCommand(nextCommand));assert.equal(next.value,true,next.rejection);
  const [nextId]=next.nativeWorldResources.find(resource=>resource.kind===2).nativeBarrierAdditionBinding.nativeIds;
  assert.equal(nextId,nativeIds.at(-1)+1);
  await pump(reloaded,reloaded.authority.finishNativeStructureCommand(nextCommand));
  assert.deepEqual([...f.faults,...reloaded.faults],[]);
 }finally{await f.close();await reloaded?.close();}
});

test('cancelling the automatic gate batch leaves its ledger, gate and solid barrier IDs unused',async()=>{
 const f=await enclosureAuthority();
 try{
  const before=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  await pump(f,f.authority.prepareNativeStructureCommand(enclosureCommand));
  const record=f.records.find(record=>record.kind==='barrier-addition');assert(record);
  await pump(f,f.authority.finishNativeStructureCommand(enclosureCommand));await f.present();
  assert.equal(record.committed,false);assert.equal(record.aborted,true);
  assert.equal(f.command(enclosureCommand).value,false);
  assert.deepEqual(f.snapshot().ledger,JSON.parse(before.snapshot).ledger);
  const after=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(wallOwners(after),wallOwners(before));
  assert.deepEqual(after.nativeAuthorityCheckpoint.spatialState,before.nativeAuthorityCheckpoint.spatialState);
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});
