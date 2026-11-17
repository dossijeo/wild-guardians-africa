import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {nativeFarmArrivalGameFixture} from './helpers/native-farm-arrival-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {tick} from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';

const close=(a,b,e=1e-8)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);

test('the unpublished farm corridor retains its exact source and body while a real Task peer advances',()=>{
 const f=fixture({peer:true});try{
  const body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),rng=f.state.rng,sequence=f.w.nav_intent_transition_sequence(),p=f.stage();assert.equal(p.status,1,JSON.stringify(p));assert.equal(f.tuple()[5],23);assert.equal(p.header[21],f.requestSource.requestSequence);assert.equal(p.header[22],f.requestSource.requestedAt);assert.equal(p.header[23],sequence);assert(p.header[12]>0);assert.equal(p.header[18],p.points.length/2);assert.equal(p.header[19],p.rows.length/16);assert.equal(p.header[6],0);
  const goal=f.requestSource.goal;assert(Math.hypot(p.points.at(-2)-goal.x,p.points.at(-1)-goal.z)<=2);assert(Math.hypot(p.points.at(-2)-goal.x,p.points.at(-1)-goal.z)>1.99);assert.equal(f.binding(),null);assert.equal(f.execution(),null);assert.deepEqual(f.sourceSnapshot(p.ticket).slice(18),[goal.x,goal.z,goal.centerX,goal.centerZ,2]);assert.equal(f.stage().status,-4);
  f.move(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_farm_arrival_route_proposal_cancel(f.w.nav_intent_session(),p.ticket+1),0);assert.equal(f.w.nav_farm_arrival_route_proposal_cancel(f.w.nav_intent_session(),p.ticket),1);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),f.requestSource);assert.equal(f.binding(),null);
 }finally{f.close();}
});

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'urgent':'walking'} arrival uses the same native motion and holds its actual approach endpoint`,()=>{
 const f=fixture({profile:profile.id,peer:true});try{
  const body=f.body(1),worker=structuredClone(f.worker),p=f.stage({urgent});assert.equal(p.status,1,JSON.stringify(p));assert.equal(f.commit(p),1);const b=f.binding();assert(b);assert.deepEqual(b.slice(4,28),p.header);assert.deepEqual(b.slice(28),p.header);assert.equal(f.sourceSnapshot()[3],f.requestSource.requestSequence);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.w.nav_intent_game_execution_state(),-1);
  assert.equal(f.w.nav_intent_finish(f.actor),0);assert.equal(f.w.nav_intent_cancel_home(f.actor),0);assert.equal(f.w.spatial_body_upsert(1,body.x+.1,body.z,body.radius,0,1),0);assert.throws(()=>f.planner.nativeIntentControlBaseline(),/farm arrival routes require prepared graphical admission/);assert.throws(()=>f.planner.intentChanges(),/farm arrival routes require prepared graphical admission/);
  f.move(.2);const e=f.execution();assert(e);assert.equal(e[7],b[1]);assert.equal(e[11],f.requestSource.requestSequence);assert.equal(e[8],f.state.elapsed);assert.equal(e[18],0);const distance=e[14];assert(Math.hypot(e[12]-body.x,e[13]-body.z)<=distance+1e-8);close(distance,.2*(urgent?2.4:1.08));close(e[21]-f.worker.runPhase,urgent?.2:0);close(e[22]-f.worker.walkPhase,urgent?0:distance/.72);close(e[26],f.worker.runRemaining-(urgent?distance:0));
  f.move(p.header[11]+.1-f.state.elapsed);const end=f.execution();assert.equal(end[18],1);assert(Math.hypot(end[12]-f.requestSource.goal.x,end[13]-f.requestSource.goal.z)<=2);close(end[12],p.points.at(-2));close(end[13],p.points.at(-1));const arrived=f.body(1);f.move(.3);assert.deepEqual(f.body(1),arrived);assert.deepEqual(f.worker,worker);assert.equal(f.binding()[1],b[1]);
 }finally{f.close();}
});

test('an already reached approach remains zero length with the exact double pose, yaw, phases and budget',()=>{
 const f=fixture({inside:true,peer:true});try{
  const body=f.body(1),p=f.stage({urgent:true});assert.equal(p.status,1);assert.equal(p.points.length,0);assert.equal(p.header[12],0);assert.equal(p.header[10],p.header[11]);assert.equal(p.rows.length,16);assert.equal(p.rows[5],f.worker.heading);assert.equal(f.commit(p),1);const e=f.execution();assert.equal(e[18],1);assert.equal(e[12],body.x);assert.equal(e[13],body.z);assert.equal(e[16],f.worker.heading);assert.deepEqual(e.slice(21,24),[f.worker.runPhase,f.worker.walkPhase,f.worker.carryPhase]);assert.equal(e[26],f.worker.runRemaining);f.move(.3);assert.deepEqual(f.body(1),body);assert.equal(f.execution()[16],f.worker.heading);
 }finally{f.close();}
});

test('a worker occupying the exact service point does not block the clear two-metre arrival zone',()=>{
 const f=fixture();try{const g=f.requestSource.goal;assert.equal(f.w.spatial_body_upsert(77,g.x,g.z,.28,0,1),1);const p=f.stage();assert.equal(p.status,1,JSON.stringify(p));assert(Math.hypot(p.points.at(-2)-g.x,p.points.at(-1)-g.z)>1.99);assert.equal(f.commit(p),1);f.move(p.header[11]+.1-f.state.elapsed);assert.equal(f.execution()[18],1);assert(Math.hypot(f.body(1).x-g.x,f.body(1).z-g.z)>1.99);}finally{f.close();}
});

test('a real physical conflict at the chosen approach preserves the request without a speculative route',()=>{
 const f=fixture();try{const p=f.stage();assert.equal(p.status,1);assert.equal(f.w.nav_farm_arrival_route_proposal_cancel(f.w.nav_intent_session(),p.ticket),1);const body=f.body(1),sequence=f.w.nav_intent_transition_sequence();assert.equal(f.w.spatial_body_upsert(77,p.points.at(-2),p.points.at(-1),.28,0,1),1);assert.equal(f.stage().status,0);const witness=f.read('nav_intent_route_reservation_result_ptr',6);assert.equal(witness[1],77);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),f.requestSource);assert.equal(f.binding(),null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);}finally{f.close();}
});

test('retiming retains exact source and relative program, rejects a different preparation and preserves source provenance',()=>{
 const f=fixture({peer:true});try{
  const body=f.body(1),p=f.stage({urgent:true});assert.equal(p.status,1);f.move(.2);assert.equal(f.w.nav_farm_arrival_route_proposal_revalidate(f.w.nav_intent_session(),p.ticket),1);const t=f.tuple(),translation=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_farm_arrival_route_proposal_time_translation_ptr(...t.slice(0,2)),11));assert(t[1]>p.ticket);assert.equal(translation[9],1);assert.equal(translation[10],1);assert.equal(f.w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),p.ticket+1000),-9);assert.deepEqual(f.body(1),body);assert.equal(f.commit(p),1);const b=f.binding();assert.equal(b[2],p.ticket);assert.equal(b[3],t[1]);assert.deepEqual(b.slice(4,28),p.header);assert.equal(b[38],translation[5]);assert.equal(f.sourceSnapshot()[3],f.requestSource.requestSequence);
 }finally{f.close();}
});

test('stale read sets, foreign sessions and old source sequences cannot acquire or replace the farm body',()=>{
 const f=fixture();try{
  assert.equal(f.stage({session:f.w.nav_intent_session()+1}).status,-1);assert.equal(f.stage({sequence:f.requestSource.requestSequence+1}).status,-2);assert.equal(f.w.nav_farm_arrival_route_proposal_stage(f.actor,f.w.nav_intent_session(),f.requestSource.requestSequence,2),-1);const p=f.stage(),body=f.body(1);assert.equal(p.status,1);const t=f.tuple();assert.equal(f.w.spatial_body_upsert(77,body.x+30,body.z+30,.28,0,1),1);assert.equal(f.w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),p.ticket),-2);assert.deepEqual(f.body(1),body);assert.equal(f.binding(),null);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),f.requestSource);
 }finally{f.close();}
});

test('changing the native service point invalidates a pending draft and the admitted cohort before any next body write',()=>{
 for(const admitted of [false,true]){const f=fixture({peer:true});try{
  const p=f.stage();assert.equal(p.status,1);if(admitted)assert.equal(f.commit(p),1);const body=f.body(1),peer=f.body(3),t=admitted?null:f.tuple(),r=f.requestSource;const ptr=f.w.nav_intent_changes_ptr(1);new Float64Array(f.w.memory.buffer,ptr,10).set([1,6,r.centerId,4,r.goal.x+.2,r.goal.z,0,0,0,0]);assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,1),1);
  if(admitted){assert.equal(f.w.nav_intent_farm_arrival_execution(f.actor),0);assert.equal(f.w.nav_intent_execution_advance(f.state.elapsed+.1),-3);}else assert.equal(f.w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),p.ticket),-2);assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);
 }finally{f.close();}}
});

test('a moving farm body cannot be released by an immediate Task replacement or legacy Game route',()=>{
 const f=fixture({peer:true});try{
  const p=f.stage();assert.equal(p.status,1);assert.equal(f.commit(p),1);f.move(.2);const body=f.body(1),at=f.state.elapsed,target=f.point(6,0),rows=[[1,2,910001,0,target.x,target.z,1,0,0,0],[1,3,920001,f.requestSource.centerId,0,0,0,910001,1,1]],ptr=f.w.nav_intent_changes_ptr(rows.length);new Float64Array(f.w.memory.buffer,ptr,rows.length*10).set(rows.flat());assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,rows.length),1);assert(f.w.nav_intent_plan_tasks()>0);assert.equal(f.w.nav_intent_commit_resource_requests(),0);assert.deepEqual(f.body(1),body);assert(f.binding());assert.throws(()=>tick(f.state,.1,f.nav),/unsupported mover|no current native declaration/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('a cold declaration and a task-free actor without this source cannot stage a farm route',()=>{
 for(const options of [{bound:false},{declare:false}]){const f=nativeFarmArrivalGameFixture(options);try{const sequence=f.planner.nativeFarmArrivalDeclarationReference(f.actor)?.requestSequence??1;assert.equal(f.w.nav_farm_arrival_route_proposal_stage(f.actor,f.w.nav_intent_session(),sequence,0),-2);assert.equal(f.w.nav_farm_arrival_route_binding_snapshot(f.actor),0);}finally{f.close();}}
});

test('ordinary reads of an empty native log do not scan the farm cohort or query actor associations',()=>{
 const f=fixture({peer:true});try{
  f.planner.intentChanges();let scans=0,probes=0;const wasm={...f.w,nav_farm_arrival_route_binding_actors(){scans++;return f.w.nav_farm_arrival_route_binding_actors();},nav_farm_arrival_route_binding_snapshot(actor){probes++;return f.w.nav_farm_arrival_route_binding_snapshot(actor);}};
  const bridge=createSpatialIntentBridge({...f.session,core:{...f.session.core,wasm}});for(let i=0;i<100;i++)assert.deepEqual(bridge.intentChanges(),[]);assert.equal(scans,0);assert.equal(probes,0);assert.deepEqual(f.body(1),{x:f.worker.x,z:f.worker.z,radius:.28,kind:0,flags:1});
 }finally{f.close();}
});

test('paused farm execution retains both bodies and removal retires the route association in its existing slot',()=>{
 const f=fixture({peer:true});try{const p=f.stage({urgent:true});assert.equal(p.status,1);assert.equal(f.commit(p),1);const body=f.body(1),peer=f.body(3);assert.equal(f.w.nav_intent_clock_commit(1,1),1);assert.equal(f.w.nav_intent_execution_advance(f.state.elapsed+.2),-5);assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);assert.equal(f.w.nav_intent_clock_commit(1,0),1);f.move(.2);assert.notDeepEqual(f.body(1),body);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.binding(),null);assert.equal(f.execution(),null);assert.equal(f.w.nav_farm_arrival_route_binding_actors(),0);assert.equal(f.sourceSnapshot(),null);}finally{f.close();}
});

test('exact two-metre boundary remains a zero route; a fresh session cannot reuse the previous pending ticket',()=>{
 const f=fixture({configureState(state,{center}){const goal=centerServicePoint(center,state,.8);Object.assign(state.workers[0],{x:goal.x-2,z:goal.z});}});try{const body=f.body(1),p=f.stage();assert.equal(p.status,1);assert.equal(p.points.length,0,JSON.stringify({source:f.requestSource,distance:Math.hypot(body.x-f.requestSource.goal.x,body.z-f.requestSource.goal.z)}));const t=f.tuple();f.w.nav_intent_reset();assert.notEqual(f.w.nav_intent_session(),t[0]);assert.equal(f.w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),p.ticket),-1);assert.equal(f.binding(),null);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_farm_arrival_route_source_snapshot(f.actor,p.ticket),0);}finally{f.close();}
});

test('both canonical artifacts export the complete farm route ABI and pthread executes the same physical corridor',async()=>{
 const names=['version','stage','snapshot','header_ptr','points','points_ptr','rows','rows_ptr','gates','gate','cancel','revalidate','time_translation_ptr','commit_bound'].map(n=>'nav_farm_arrival_route_proposal_'+n).concat(['snapshot','ptr','actors','gates'].map(n=>'nav_farm_arrival_route_binding_'+n),['nav_farm_arrival_route_source_snapshot','nav_intent_farm_arrival_execution','nav_intent_farm_arrival_execution_ptr']);const exports=new Set(WebAssembly.Module.exports(new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'))).map(e=>e.name));for(const name of names)assert(exports.has(name),name);
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{for(const name of names)assert.equal(typeof runtime.core.wasm[name],'function',name);f=fixture({core:runtime.core,peer:true,reverse:true});const p=f.stage({urgent:true});assert.equal(p.status,1);assert.equal(f.commit(p),1);f.move(.2);assert(f.execution());f.move(p.header[11]+.1-f.state.elapsed);assert.equal(f.execution()[18],1);assert.equal(f.w.nav_farm_arrival_route_binding_actors(),1);assert.equal(f.w.nav_farm_arrival_route_binding_gates(f.actor),0);}finally{f?.close();await runtime.dispose();}
});
