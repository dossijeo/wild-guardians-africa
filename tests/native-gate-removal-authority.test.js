import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from '../tests/helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from '../tests/helpers/native-production-authority.js';
import {centerServicePoint} from '../src/world/centers.js';
import {rational} from '../src/simulation/money.js';
import {awakeningState} from '../src/simulation/awakenings.js';
async function pump(f,promise){let done=false,value,error;promise.then(v=>{done=true;value=v;},e=>{done=true;error=e;});for(let i=0;i<2000&&!done;i++)await f.present();assert(done,'removal did not settle');if(error)throw error;return value;}
async function ordinary({solid=false,blessed=false,legacy=false,onReady,onCommit}={}){
 const source=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(source.state),worker=state.workers[0],center=state.structures.find(s=>s.id===worker.centerId),goal=centerServicePoint(center,state,.8);
 center.x+=-14-goal.x;center.z+=3.2-goal.z;Object.assign(worker,{x:-14,z:11.8});state.villages.find(v=>v.id===worker.villageId).entry={x:-14,z:11.8};state.ledger.balance=rational(100000);
 if(legacy){state.workers=[];state.tasks=[];}
 const gate={id:`structure-${state.nextId++}`,created:29207,kind:'wall',material:'zarzas',gate:!solid,x:solid?-6:-14,z:8.2,yaw:0,maxHp:60,hp:60,status:'intact',villageId:'village-1',cost:10,collapseRemaining:0,...(!solid?{gateOpen:0}:{})};
 state.structures.push(gate);if(blessed){const a=awakeningState(state);a.total++;gate.blessing={version:1,ordinal:a.total,day:state.day,at:state.elapsed};}
 source.close();const chunks=[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'];
 const f=await nativeProductionAuthority(state,{chunkKeys:chunks,onReady,onCommit});
 if(!legacy){await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));if(!solid){let opening=0;for(let i=0;i<100&&!(opening>0&&opening<1);i++){const s=f.advance(.05);await f.present();opening=s.structures.find(e=>e.id===gate.id).gateOpen;}assert(opening>0&&opening<1,'must remove during a real native swing');}}
 return {f,gate,command:{kind:'removeWall',id:'remove-swing-gate',targetId:gate.id}};
}
for(const mode of ['commit','cancel','stale','blessed'])test(`prepared ordinary removal during crossing: ${mode}`,async()=>{
 const {f,gate,command}=await ordinary({blessed:mode==='blessed'});try{
  const before=f.snapshot(),first=f.records.find(r=>r.kind==='farm-arrival').resources.nativeFarmArrival;
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  const stop=f.records.find(r=>r.kind==='farm-arrival-stop'&&r.committed),pending=f.records.find(r=>r.kind==='barrier-addition');assert(stop);assert(pending);assert(pending.resources.nativeBarrierAddition.removal);assert.equal(pending.committed,false);
  const held=f.snapshot();assert.equal(held.workers[0].nativeRouteAdmission,'native-farm-arrival-held');assert(held.structures.some(s=>s.id===gate.id));assert.deepEqual(held.ledger,before.ledger);assert.equal(stop.resources.nativeStop.routes[0].bodyId,first.bodyId);
  if(mode==='commit'||mode==='blessed'){
   const result=await pump(f,f.structureCommand(command));assert.equal(result.value,true,result.rejection);assert.equal(result.events.filter(e=>e.type==='WallRemoved').length,1);assert.equal(result.events.filter(e=>e.type==='BlessingRemoved').length,mode==='blessed'?1:0);
   const after=JSON.parse(result.snapshot);assert(!after.structures.some(s=>s.id===gate.id));assert.deepEqual(after.ledger.entries[command.id],rational(10));if(mode==='blessed')assert.equal(after.awakenings.destroyed,before.awakenings.destroyed+1);
   assert.equal(f.command(command).value,false);assert.deepEqual(f.snapshot().ledger,after.ledger);
  }else if(mode==='stale'){f.command({kind:'pause',reason:'removal-stale'});const result=await pump(f,f.structureCommand(command));assert.equal(result.value,false);assert.equal(result.events.some(e=>e.type==='WallRemoved'),false);}
  await pump(f,f.authority.finishNativeStructureCommand(command));if(mode==='stale')f.command({kind:'resume',reason:'removal-stale'});
  if(mode==='cancel'||mode==='stale'){assert(pending.aborted);const after=f.snapshot();assert(after.structures.some(s=>s.id===gate.id));assert.deepEqual(after.ledger,before.ledger);}
  f.advance(.05);await untilProduction(f,()=>f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length===2);
  const successor=f.records.filter(r=>r.kind==='farm-arrival'&&r.committed)[1].resources;assert.equal(successor.nativeFarmArrival.bodyId,first.bodyId);assert.equal(successor.nativeFarmArrival.actorId,first.actorId);
  if(mode==='commit'||mode==='blessed')assert.equal(successor.gates.length,0,'successor must not reacquire the removed motor');
  else assert(successor.gates.some(owner=>owner.gateId===Number(gate.id.slice(10))),'successor must reacquire the retained motor');
  const position=f.snapshot().workers[0];
  let moved=position;
  // The retained gate can require an initial hold while the leaf moves.
  for(let i=0;i<30&&moved.x===position.x&&moved.z===position.z;i++){
   f.advance(.1);
   await f.present();
   moved=f.snapshot().workers[0];
  }
  assert.notDeepEqual([moved.x,moved.z],[position.x,position.z]);
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});
for(const options of [{solid:true},{solid:true,legacy:true},{legacy:true}])test(`ordinary nonregistered removal preserves legacy semantics ${JSON.stringify(options)}`,async()=>{
 const {f,gate,command}=await ordinary(options);try{
  const n=f.records.length;await pump(f,f.authority.prepareNativeStructureCommand(command));const result=await pump(f,f.structureCommand(command));assert.equal(result.value,true,result.rejection);await pump(f,f.authority.finishNativeStructureCommand(command));const after=JSON.parse(result.snapshot);assert(!after.structures.some(s=>s.id===gate.id));assert.deepEqual(after.ledger.entries[command.id],rational(10));assert.equal(f.command(command).value,false);assert.equal(f.records.length,n);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

test('the motor reaches its target during READY and retains its prepared Stop24 projection', async () => {
 let prepared, acquired;
 const {f,gate,command}=await ordinary({
  async onReady(record){
   if(record.kind!=='farm-arrival-stop')return;
   prepared=record.resources;
   const opening=f.snapshot().structures.find(row=>row.id===gate.id).gateOpen;
   assert(opening>0&&opening<1);
   for(let i=0;i<15;i++){
    f.advance(.05);
    await f.present();
   }
   assert.equal(f.snapshot().structures.find(row=>row.id===gate.id).gateOpen,1);
  },
  onCommit(record,data){
   if(record.kind==='farm-arrival-stop')acquired=data.nativeFarmArrivalStopBinding;
  },
 });
 try {
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal(f.records.filter(record=>record.kind==='farm-arrival-stop').length,1);
  assert.equal(prepared.nativeStop.gates.length,1);
  assert.deepEqual(acquired.reference.gates,prepared.nativeStop.gates);
  assert.equal(acquired.projection.gateEffects.rows[2],1);
  assert(acquired.reference.worldBoundary.ticket>prepared.worldBoundary.ticket);
  await f.present();
  const gateId=Number(gate.id.slice(10));
  const motor=f.host.inspect().nativeRouteFrame.bindings.find(binding=>binding.nativeStopped?.gateId===gateId);
  assert.equal(motor.opening,1);
  assert(f.snapshot().structures.some(row=>row.id===gate.id));
  const result=await pump(f,f.structureCommand(command));
  assert.equal(result.value,true,result.rejection);
  await pump(f,f.authority.finishNativeStructureCommand(command));
  assert(!f.snapshot().structures.some(row=>row.id===gate.id));
  assert.deepEqual(f.faults,[]);
 } finally {
  await f.close();
 }
});
