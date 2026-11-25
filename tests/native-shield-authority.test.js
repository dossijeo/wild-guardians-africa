import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {centerServicePoint} from '../src/world/centers.js';
import {rational} from '../src/simulation/money.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';

const chunkKeys=[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'];
const command={kind:'castShield',id:'shield-across-native-farm',x:-14,z:8.2};

async function fixture(options){
 const source=nativeFarmArrivalRouteFixture({peer:false});
 const state=structuredClone(source.state),worker=state.workers[0],start={x:-14,z:11.8};
 const center=state.structures.find(value=>value.id===worker.centerId),service=centerServicePoint(center,state,.8);
 center.x+=-14-service.x;center.z+=3.2-service.z;
 Object.assign(worker,start);state.villages.find(value=>value.id===worker.villageId).entry=start;
 state.ledger.balance=rational(100000);state.cooldowns.shield=0;source.close();
 const f=await nativeProductionAuthority(state,{chunkKeys,...options});
 try{
  await untilProduction(f,()=>f.records.some(item=>item.kind==='farm-arrival'&&item.committed));
  f.advance(.14);await f.present();
  return f;
 }catch(error){await f.close();throw error;}
}

async function pump(f,promise){
 let settled=false;promise.then(()=>{settled=true;},()=>{settled=true;});
 await untilProduction(f,()=>settled);
 return promise;
}

test('a ready Shield keeps its polygon, spell and Farm cursor private until the same ticket draws',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve;});
 const f=await fixture({onReady(record){if(record.kind==='shield')return wait;}});
 try{
  const snap=()=>f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  const before=snap(),source=JSON.parse(before.snapshot),prior=before.nativeAuthorityCheckpoint.spatialState;
  const pending=f.authority.prepareNativeStructureCommand(command);pending.catch(()=>{});
  await untilProduction(f,()=>f.records.some(item=>item.kind==='shield'&&item.packet));
  const record=f.records.find(item=>item.kind==='shield');
  assert.equal(record.committed,false);assert.equal(record.resources.kind,3);
  assert.deepEqual(snap().nativeAuthorityCheckpoint.spatialState,prior);
  assert.deepEqual(f.snapshot().spells,source.spells);
  release();await pump(f,pending);
  const result=await pump(f,f.structureCommand(command));
  await f.authority.finishNativeStructureCommand(command);
  assert.equal(result.value,true,result.rejection);
  const game=JSON.parse(result.snapshot),event=result.events.filter(item=>item.type==='SpellActivated');
  assert.equal(event.length,1);assert.equal(event[0].commandId,command.id);
  assert.deepEqual(game.ledger,source.ledger);
  assert.deepEqual(game.workers[0],source.workers[0]);
  const receipt=result.nativeWorldResources[0],shield=receipt.nativeShield;
  assert.equal(receipt.kind,3);assert.deepEqual(receipt.worldBoundary,record.resources.worldBoundary);
  assert.deepEqual(game.spells,[shield.spell]);assert.equal(event[0].spellId,shield.spell.id);
  const spatial=snap().nativeAuthorityCheckpoint.spatialState;
  assert.deepEqual(spatial.polygons.map(item=>item.id),[...prior.polygons.map(item=>item.id),shield.polygonId]);
  let shown=false;record.packet.presented.then(()=>{shown=true;});await untilProduction(f,()=>shown);
  const current=f.advance(.05);assert.equal(current.workers[0].nativeRouteAdmission,'native-farm-arrival');
  assert.notEqual(current.workers[0].z,source.workers[0].z);
  assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('a Shield READY for an older native clock cannot commit a polygon or an activation',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve;});
 const f=await fixture({onReady(record){if(record.kind==='shield')return wait;}});
 try{
  const pending=f.authority.prepareNativeStructureCommand(command);pending.catch(()=>{});
  await untilProduction(f,()=>f.records.some(item=>item.kind==='shield'&&item.packet));
  const record=f.records.find(item=>item.kind==='shield');
  const advanced=f.advance(.05);
  assert(advanced.elapsed>record.resources.effectiveTime);
  release();await pump(f,pending);
  const result=await pump(f,f.structureCommand(command));
  assert.equal(result.value,false);assert.match(result.rejection,/stale/);
  await f.authority.finishNativeStructureCommand(command);
  const after=f.snapshot();
  assert.deepEqual(after.spells,[]);assert(!after.commandIds.includes(command.id));
  assert.equal(record.committed,false);assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('cold Shield bootstrap keeps the second acquired polygon and the next allocation',async()=>{
 const f=await fixture();
 let restored;
 const activate=async(f,id)=>{
  const order={...command,id};
  await pump(f,f.authority.prepareNativeStructureCommand(order));
  const result=await pump(f,f.structureCommand(order));
  await f.authority.finishNativeStructureCommand(order);
  assert.equal(result.value,true,result.rejection);
  return result.nativeWorldResources[0].nativeShield;
 };
 const cooldown=async f=>{
  let current=f.snapshot();
  for(let i=0;i<100&&current.cooldowns.shield>0;i++){current=f.advance(.5);await f.present();}
  assert.equal(current.cooldowns.shield,0);
  assert.deepEqual(current.spells,[]);
 };
 try{
  const first=await activate(f,'first-shield');await cooldown(f);
  const second=await activate(f,'second-shield');
  assert.equal(second.polygonId,first.polygonId+1);
  const current=f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  const checkpoint=prepareWorkerCheckpoint(current,{slotId:JSON.parse(current.snapshot).slotId,policy:{nativeAuthority:true},savedAt:0});
  assert.equal(checkpoint.saved,true);
  const options=savedNativeAuthorityOptions(JSON.stringify(checkpoint.state)),bootstrap=options.nativeBootstrap;
  assert.equal(bootstrap.version,3);assert.deepEqual(bootstrap.shieldOwners,[{spellId:second.spell.id,polygonId:second.polygonId}]);
  const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const rebuild=source=>createSimulationAuthority(wasm,options.snapshot,options.chunkKeys,{...options,nativeBootstrap:source});
  for(const version of [1,2]){
   const legacy=structuredClone(bootstrap);legacy.version=version;delete legacy.shieldOwners;
   if(version===1)delete legacy.wallOwners;
   const loaded=rebuild(legacy);
   try{assert(loaded.verifyNativeBootstrap(legacy));}finally{loaded.dispose();}
  }
  for(const alter of [
   cp=>cp.shieldOwners[0].spellId='different',
   cp=>cp.shieldOwners.push({...cp.shieldOwners[0]}),
   cp=>cp.spatialState.polygons.find(row=>row.id===second.polygonId).points[0].x+=.25,
   cp=>cp.spatialState.polygons[0].points[0].x+=.25,
   cp=>cp.spatialState.nextPolygonId=second.polygonId
  ]){
   const bad=structuredClone(bootstrap);alter(bad);assert.throws(()=>rebuild(bad),/shield|polygon/i);
  }
  const ambiguous=structuredClone(bootstrap);ambiguous.version=2;delete ambiguous.shieldOwners;
  ambiguous.spatialState.polygons.push({...structuredClone(ambiguous.spatialState.polygons.at(-1)),id:ambiguous.spatialState.nextPolygonId++});
  assert.throws(()=>rebuild(ambiguous),/ambiguous legacy native shield/i);
  restored=await nativeProductionAuthority(checkpoint.state,{nativeBootstrap:bootstrap,chunkKeys:options.chunkKeys});
  assert(restored.authority.verifyNativeBootstrap(bootstrap));
  const after=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(after.nativeAuthorityCheckpoint.spatialState,bootstrap.spatialState);
  assert.deepEqual(JSON.parse(after.snapshot).spells,[second.spell]);
  await cooldown(restored);const third=await activate(restored,'third-shield');
  assert.equal(third.polygonId,bootstrap.spatialState.nextPolygonId);
  assert.notEqual(third.spell.id,second.spell.id);
  assert.deepEqual([...f.faults,...restored.faults],[]);
 }finally{await restored?.close();await f.close();}
});
