import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from '../tests/helpers/native-route-execution.js';
import {nativeFarmArrivalRouteFixture} from '../tests/helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from '../tests/helpers/native-production-authority.js';
import {centerServicePoint} from '../src/world/centers.js';
import {rational} from '../src/simulation/money.js';

const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function nativeFixture({peerCrossing=false}={}){
 const f=createNativeRouteExecutionFixture({core:createSpatialWorld(module)}),p=f.point(0,0),w=f.w;f.session.core.setSettlement(p.x,p.z,24,24);
 assert.equal(w.nav_gate_addition_stop_query_version?.(),1,'canonical build must include native gate impact query');
 f.worker(1,f.point(0,-6),f.point(0,6));f.worker(2,peerCrossing?f.point(.8,-6):f.point(-6,-8),peerCrossing?f.point(.8,6):f.point(6,-8));
 assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.bridge.commitNativeCausalClock().status,'committed');
 const args=[990010,1,p.x,p.z,0,1,1];
 return {...f,args,query(){const count=w.nav_gate_addition_inspect_stops(...args);return {count,actors:count>0?Array.from(new Float64Array(w.memory.buffer,w.nav_gate_addition_stop_actors_ptr(),count)):[]};},close(){f.session.dispose();}};
}
test('native gate impact reports its actual corridor, not the allowed passage proxy or unrelated route',()=>{
 const f=nativeFixture();try{
  const before=f.session.core.snapshot(),a=f.body(1),b=f.body(2),sequence=f.w.nav_intent_last_sequence();
  assert.deepEqual(f.query(),{count:1,actors:[900011]});assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  assert.equal(f.w.nav_gate_state(990010),0);assert.equal(f.w.nav_intent_last_sequence(),sequence);assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.body(1),a);assert.deepEqual(f.body(2),b);
  assert.equal(f.w.spatial_world_gate_addition_stage(...f.args),-5,'inspection cannot authorize keeping the old crossing');
  assert.deepEqual(f.query(),{count:1,actors:[900011]});
  assert.equal(f.advance(f.state.elapsed+.1).status,'advanced');assert.equal(f.bridge.commitNativeCausalClock().status,'committed');assert.notDeepEqual(f.body(2),b,'unrelated native reservation still executes');
 }finally{f.close();}
});
test('gate impact follows remaining corridor and cannot consume another prepared proposal',()=>{
 const f=nativeFixture();try{
  assert.equal(f.query().count,1);assert.equal(f.advance(f.state.elapsed+30).status,'advanced');assert.equal(f.bridge.commitNativeCausalClock().status,'committed');
  assert.deepEqual(f.query(),{count:0,actors:[]},'old crossed corridor is no longer affected');
  assert.equal(f.w.spatial_world_gate_addition_stage(...f.args),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const t=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));
  assert.equal(f.query().count,-4);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6)),t);
  assert.equal(f.w.nav_intent_barrier_proposal_cancel(...t.slice(0,2)),1);f.w.spatial_world_proposal_resource_release(...t.slice(0,2));
 }finally{f.close();}
});
test('gate impact includes a distinct acquired reservation through the same mechanism',()=>{
 const f=nativeFixture({peerCrossing:true});try{const before=[f.body(1),f.body(2)];assert.deepEqual(f.query(),{count:2,actors:[900011,900012]});assert.deepEqual([f.body(1),f.body(2)],before);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.w.spatial_world_gate_addition_stage(...f.args),-5);}finally{f.close();}
});
test('foreign occupancy blocks preflight without stopping either reservation',()=>{
 const f=nativeFixture();try{
  const [,,x,z]=f.args;assert.equal(f.w.spatial_body_upsert(91,x+1.3,z,1,0,1),1);
  const a=f.body(1),b=f.body(2),before=f.session.core.snapshot();assert(f.query().count<0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.body(1),a);assert.deepEqual(f.body(2),b);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.close();}
});

async function pump(f,promise){let done=false,result,error;promise.then(v=>{done=true;result=v;},e=>{done=true;error=e;});for(let i=0;i<2000&&!done;i++)await f.present();assert(done,'gate transaction did not settle');if(error)throw error;return result;}
async function ordinary(){
 const source=nativeFarmArrivalRouteFixture({peer:false}),saved=structuredClone(source.state),worker=saved.workers[0],center=saved.structures.find(r=>r.id===worker.centerId),goal=centerServicePoint(center,saved,.8);
 center.x+=-14-goal.x;center.z+=3.2-goal.z;Object.assign(worker,{x:-14,z:11.8});saved.villages.find(v=>v.id===worker.villageId).entry={x:-14,z:11.8};saved.ledger.balance=rational(100000);source.close();
 const chunkKeys=[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'];
 const f=await nativeProductionAuthority(saved,{chunkKeys});await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));f.advance(.16);await f.present();
 return {f,command:{kind:'placeStructure',id:'gate-crossing-handoff',structure:{kind:'wall',material:'zarzas',gate:true,yaw:0,x:-14,z:8.2}}};
}
for(const mode of ['commit','cancel','stale'])test(`ordinary gate in acquired Farm corridor: ${mode} preserves the body and unique purchase boundary`,async()=>{
 const {f,command}=await ordinary();try{
  const before=f.snapshot(),first=f.records.find(r=>r.kind==='farm-arrival').resources.nativeFarmArrival;
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  const stop=f.records.find(r=>r.kind==='farm-arrival-stop'&&r.committed),gate=f.records.find(r=>r.kind==='barrier-addition');assert(stop);assert(gate);assert.equal(gate.committed,false);
  const held=f.snapshot();assert.equal(held.workers[0].nativeRouteAdmission,'native-farm-arrival-held');assert.deepEqual(held.structures,before.structures);assert.deepEqual(held.ledger,before.ledger);assert.equal(stop.resources.nativeStop.routes.find(r=>r.nativeRoute.actorId===first.actorId).bodyId,first.bodyId);
  if(mode==='commit'){
   const result=await pump(f,f.structureCommand(command));assert.equal(result.value,true,result.rejection);assert.equal(result.events.filter(e=>e.type==='PlacementCommitted').length,1);const after=JSON.parse(result.snapshot);assert.deepEqual(after.ledger.entries[command.id],{n:'-10',d:'1'});assert.equal(after.structures.length,before.structures.length+1);assert.equal(f.command(command).value,false);
  }else if(mode==='stale'){
   f.command({kind:'pause',reason:'gate-quote-stale'});const result=await pump(f,f.structureCommand(command));assert.equal(result.value,false);assert.equal(result.events.some(e=>e.type==='PlacementCommitted'),false);
  }
  await pump(f,f.authority.finishNativeStructureCommand(command));
  if(mode==='stale')f.command({kind:'resume',reason:'gate-quote-stale'});
  if(mode!=='commit'){assert.equal(gate.aborted,true);const after=f.snapshot();assert.deepEqual(after.structures,before.structures);assert.deepEqual(after.ledger,before.ledger);}
  f.advance(.05);await untilProduction(f,()=>f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length===2);
  const successor=f.records.filter(r=>r.kind==='farm-arrival'&&r.committed)[1].resources.nativeFarmArrival;assert.equal(successor.actorId,first.actorId);assert.equal(successor.bodyId,first.bodyId);
  if(mode==='commit')assert(f.records.filter(r=>r.kind==='farm-arrival'&&r.committed)[1].resources.gates.length>0,'new route must acquire original gate mechanism');
  const position=f.snapshot().workers[0];f.advance(.1);await f.present();const moved=f.snapshot().workers[0];assert.notDeepEqual([moved.x,moved.z],[position.x,position.z]);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});
