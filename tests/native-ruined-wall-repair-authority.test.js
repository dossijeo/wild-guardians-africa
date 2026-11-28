import test from 'node:test';import assert from 'node:assert/strict';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {rational} from '../src/simulation/money.js';
const resident=Array.from({length:12},(_,i)=>`${i%4-1},${Math.floor(i/4)-1}`);
async function setup(options={}){
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 const state=structuredClone(fixture.state),wall=state.structures.find(item=>item.kind==='wall'&&item.status==='intact'&&!item.gate&&item.material==='zarzas');
 Object.assign(wall,fixture.point(1,4),{hp:0,status:'ruined',collapseRemaining:0});state.ledger.balance=rational(100000);
 let f;try{f=await nativeProductionAuthority(state,{chunkKeys:resident,...options});await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));assert.equal(f.command({kind:'requestRepair',id:'ruin-repair',targetId:wall.id}).value,true);return {f,wall,async close(){await f.close();fixture.close();}};}catch(e){await f?.close();fixture.close();throw e;}
}
async function advanceUntil(f,condition){for(let i=0;i<350&&!condition();i++){f.advance();await f.present();}assert(condition(),JSON.stringify(f.authority.nativeIntentProductionStatus()));}
const checkpoint=f=>f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState;
test('ordinary solid Repair holds READY, acquires exact collision once, then retains its body for Idle',async()=>{
 let release,f;const held=new Promise(r=>{release=r;});let receipt;
 const x=await setup({onReady(record){if(record.kind==='barrier-addition')return held;},onCommit(record,data){if(record.kind==='barrier-addition')receipt=data.nativeBarrierAdditionBinding;}});f=x.f;
 try{
  const before=checkpoint(f);
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='barrier-addition'&&r.packet));
  const addition=f.records.find(r=>r.kind==='barrier-addition'),action=f.records.find(r=>r.kind==='task-action'),taskId=f.snapshot().workers[0].taskId;
  for(let i=0;i<6;i++){f.advance();await f.present();}
  assert.equal(f.snapshot().structures.find(w=>w.id===x.wall.id).hp,0);assert.equal(f.snapshot().ledger.entries[`repair:${taskId}`],undefined);
  assert.equal(f.snapshot().events.some(e=>e.type==='RepairApplied'),false);assert.deepEqual(checkpoint(f).barriers,before.barriers);
  release();await untilProduction(f,()=>addition.committed);await advanceUntil(f,()=>f.snapshot().workers[0].nativeRouteAdmission==='native-idle');
  const after=f.snapshot(),body=f.records.findLast(r=>r.kind==='initial-idle-body').resources.nativeInitialIdleBody;
  assert.equal(body.bodyId,action.resources.request.bodyId);assert.equal(after.structures.find(w=>w.id===x.wall.id).hp,x.wall.maxHp);
  assert.equal(after.events.filter(e=>e.type==='RepairApplied').length,1);assert(after.ledger.entries[`repair:${taskId}`]);
  assert.equal(checkpoint(f).barriers.length,before.barriers.length+1);assert.equal(receipt.nativeIds.length,1);
  assert.equal(after.events.find(e=>e.type==='RepairApplied').repair.paidCoins,x.wall.cost);
  assert(receipt.reference.worldBoundary.effectiveTime>receipt.preparedReference.worldBoundary.effectiveTime);
  assert.equal(f.records.filter(r=>r.kind==='barrier-addition'&&r.committed).length,1);
  for(let i=0;i<6;i++){f.advance();await f.present();}assert.equal(f.snapshot().events.filter(e=>e.type==='RepairApplied').length,1);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await x.close();}
});
test('authority disposal cancels a READY ruin without a late collision, effect or payment',async()=>{
 let release;const held=new Promise(r=>{release=r;}),x=await setup({onReady:r=>r.kind==='barrier-addition'?held:undefined}),{f}=x;
 try{await advanceUntil(f,()=>f.records.some(r=>r.kind==='barrier-addition'&&r.packet));const r=f.records.find(r=>r.kind==='barrier-addition');f.authority.dispose();release();await f.present();await f.present();assert.equal(r.committed,false);assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.deepEqual(f.faults,[]);}finally{release();await x.close();}
});
test('native Host retimes the prepared Repair scalar before its first draw, without a new ordinary packet',async()=>{
 let release,f,receipt;const held=new Promise(r=>{release=r;});
 const x=await setup({onPrepare(r){if(r.kind==='barrier-addition')for(const byteOffset of [4,8])f.client.registerClockBinding(f.buffer,{byteOffset,semantic:'relative',epoch:r.resources.worldBoundary.effectiveTime,nativeBarrierAddition:r.resources.nativeBarrierAddition});},onReady:r=>r.kind==='barrier-addition'?held:undefined,onCommit(r,data){if(r.kind==='barrier-addition')receipt=data.nativeBarrierAdditionBinding;}});f=x.f;
 try{
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='barrier-addition'&&r.packet));const r=f.records.find(r=>r.kind==='barrier-addition');
  for(let i=0;i<6;i++){f.advance();await f.present();}release();await untilProduction(f,()=>r.committed);await f.present();
  const origin=receipt.reference.worldBoundary.effectiveTime;assert(origin-receipt.preparedReference.worldBoundary.effectiveTime>.5);
  const live=f.gpu.buffers.filter(b=>!b.destroyed&&b.data.length===16);assert(live.length);
  const scalar=()=>new Float32Array(live.at(-1).data.buffer)[1];assert(Math.abs(scalar())<1e-5,`first acquired age ${scalar()}`);assert.equal(new Float32Array(live.at(-1).data.buffer)[2],scalar());
  const advanced=f.advance(.05);await f.present();assert(Math.abs(scalar()-(advanced.elapsed-origin))<2e-5,`age after native advance ${scalar()}`);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await x.close();}
});
test('Host rejects a Repair uniform whose owner differs from the retained kind2 template',async()=>{
 let f;const x=await setup({onPrepare(r){if(r.kind==='barrier-addition'){const ref=structuredClone(r.resources.nativeBarrierAddition);ref.additions[0].entityId='structure-999999';f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'relative',epoch:ref.worldBoundary.effectiveTime,nativeBarrierAddition:ref});}}});f=x.f;
 try{await advanceUntil(f,()=>f.records.some(r=>r.kind==='barrier-addition'));for(let i=0;i<100&&f.authority.nativeIntentProductionStatus().phase!=='failed';i++)await f.present();assert.equal(f.authority.nativeIntentProductionStatus().phase,'failed');assert.equal(f.records.some(r=>r.kind==='barrier-addition'&&r.committed),false);assert.match([...f.errors,...f.faults,f.authority.nativeIntentProductionStatus().fault].join('\n'),/acquired origin|native solid/i);}finally{await x.close();}
});
