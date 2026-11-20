import test from 'node:test';
import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {wallSpec} from '../src/simulation/rules.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

test('a paid wall holds an affected native Farm body while its replacement route prepares',async()=>{
 const source=nativeFarmArrivalRouteFixture({peer:false});
 const saved=structuredClone(source.state),from=source.point(0,-3),to=source.point(0,3);
 const points=[[from.x,from.z],[to.x,to.z]],commandId='build-crosses-native-farm';
 saved.ledger.balance=rational(100000);
 let f,release,farmPreparations=0;
 const preparing=new Promise(resolve=>{release=resolve;});
 try{
  f=await nativeProductionAuthority(saved,{onPrepare(record){
   if(record.kind==='farm-arrival'&&++farmPreparations===2)return preparing;
  }});
  await untilProduction(f,()=>f.records.some(record=>record.kind==='farm-arrival'&&record.committed));
  const original=f.records[0].resources.nativeFarmArrival;
  const actor=s=>s.workers.find(item=>item.id===saved.workers[0].id);
  const actorPosition=s=>[actor(s).x,actor(s).z];
  const initial=actorPosition(f.snapshot());
  for(let i=0;i<2;i++){f.advance();await f.present();}
  const before=f.snapshot(),position=actorPosition(before);
  assert.equal(actor(before).nativeRouteAdmission,'native-farm-arrival');
  assert.notDeepEqual(position,initial);

  const build={kind:'buildWallChain',id:commandId,material:'zarzas',points,options:{smooth:false,snap:false}};
  const placed=f.command(build),snapshot=JSON.parse(placed.snapshot);
  const event=placed.events.find(item=>item.type==='WallChainBuilt');
  assert.equal(placed.value,true);
  assert.equal(event.commandId,commandId);
  assert.equal(event.count,2);
  assert.equal(event.gates,0);
  assert.equal(placed.events.filter(item=>item.type==='WallChainBuilt').length,1);
  assert.deepEqual(snapshot.ledger.entries[commandId],rational(-2*wallSpec('zarzas').cost));
  const previousIds=new Set(before.structures.map(item=>item.id));
  assert.deepEqual(snapshot.structures.filter(item=>!previousIds.has(item.id)).map(item=>item.id),event.presentation.targetIds);
  assert.deepEqual(actorPosition(snapshot),position);
  const duplicate=f.command(build);
  assert.equal(duplicate.value,false);
  assert.deepEqual(duplicate.events,[]);

  let elapsed=snapshot.elapsed;
  for(let i=0;i<7;i++){
   const after=f.advance();await f.present();
   assert.equal(actor(after).nativeRouteAdmission,'native-farm-arrival-held');
   assert.deepEqual(actorPosition(after),position);
   assert(after.elapsed>elapsed);
   elapsed=after.elapsed;
  }
  const replacement=f.records.find(record=>record.kind==='farm-arrival'&&!record.committed);
  assert(replacement,'the authority must request a replacement preparation');
  assert.equal(replacement.resources.nativeFarmArrival.bodyId,original.bodyId);
  assert.equal(replacement.resources.nativeFarmArrival.actorId,original.actorId);
  assert.equal(f.records.filter(record=>record.committed).length,1);
  assert.deepEqual(f.faults,[]);
 }finally{
  const closing=f?.close();release();
  try{await closing;}finally{source.close();}
 }
});

test('a paid wall outside the Farm corridor keeps the acquired route and its prepared body',async()=>{
 const source=nativeFarmArrivalRouteFixture({peer:false});
 const saved=structuredClone(source.state),from=source.point(0,8),to=source.point(0,14);
 saved.ledger.balance=rational(100000);
 let f;
 try{
  f=await nativeProductionAuthority(saved);
  await untilProduction(f,()=>f.records.some(record=>record.kind==='farm-arrival'&&record.committed));
  for(let i=0;i<2;i++){f.advance();await f.present();}
  const before=f.snapshot().workers[0],frame=f.host.inspect().nativeRouteFrame;
  const binding=frame.bindings.find(item=>item.nativeFarmArrival);
  assert(binding);
  assert.equal(before.nativeRouteAdmission,'native-farm-arrival');

  const placed=f.command({kind:'buildWallChain',id:'build-away-from-native-farm',material:'zarzas',
   points:[[from.x,from.z],[to.x,to.z]],options:{smooth:false,snap:false}});
  assert.equal(placed.value,true);
  const event=placed.events.find(item=>item.type==='WallChainBuilt');
  assert.equal(event.count,3);
  assert.equal(event.gates,0);
  let after;
  for(let i=0;i<7;i++){
   after=f.advance().workers[0];await f.present();
   assert.equal(after.nativeRouteAdmission,'native-farm-arrival');
  }
  assert.notDeepEqual([after.x,after.z],[before.x,before.z]);
  assert.equal(f.records.length,1,'a wall outside the route must not request another body preparation');
  const current=f.host.inspect().nativeRouteFrame;
  assert.deepEqual(current.worldBoundary,frame.worldBoundary);
  assert.deepEqual(current.bindings.find(item=>item.nativeFarmArrival)?.nativeFarmArrival,binding.nativeFarmArrival);
  assert.deepEqual(f.faults,[]);
 }finally{
  try{await f?.close();}finally{source.close();}
 }
});
