import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHomeRouteFixture} from './helpers/native-home-route.js';
import {nativeHomeRouteReferenceFromProposal} from '../src/world/native-home-route.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {tick,projectNativeHomeRouteExecution} from '../src/simulation/game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Native/WASM and the actual shared source transactor. Prepared packet/drain
// doubles are explicit here; this is not a graphical or hardware Home test.
function admission(f,{prepare=()=>{},drain=()=>{},receipt=x=>x}={}){
 let status={closed:false,session:'source-home-route'},released=null,commits=0;const source={status:()=>({...status}),ownsGpuConsumer:c=>c===source,
  async quiesceGpuForMutation(options){const before={...status};await drain(options);return receipt({authorityEpoch:before.authorityEpoch,session:before.session,sequence:before.sentSequence,effectiveTime:before.sentTime,clockSequence:before.clockSequence,holdId:1,preparedWorldBoundary:options.preparedWorldBoundary,preparedFrameSequence:1,nativeHomeRouteVersion:1,preparedHomeRouteTemplate:options.preparedHomeRouteTemplate});},releaseGpuAfterMutation(_receipt,data){released=data;},dispose(){status.closed=true;}};
 const stop=f.planner.observeNativeIntentControl({gpuConsumer:{publication:source,owner:source},onBaseline:b=>{status={...status,authorityEpoch:b.authorityEpoch,sentSequence:b.sequence,sentTime:b.effectiveTime,clockSequence:b.clock.clockSequence};},onChanges:changes=>{for(const e of changes){status.sentSequence=e.sequence;status.sentTime=e.effectiveTime;}},onClock:c=>{status.clockSequence=c.clockSequence;status.sentSequence=c.intentSequence;status.sentTime=c.committedThrough;}});
 return {run:signal=>f.planner.startNativeHomeRouteAfterGpuQuiescence({actorId:f.actor,getPublication:()=>source,signal,prepareResources:async data=>{await prepare(data);return {preparedWorldBoundary:data.resources.worldBoundary,preparedHomeRouteTemplate:nativeHomeRouteReferenceFromProposal(data.resources),valid:()=>!data.signal.aborted,commit(value){commits++;assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'native-home');assert(value.nativeHomeRouteBinding);return true;},abort(){}};}}),close:stop,get released(){return released;},get commits(){return commits;}};
}

for(const threaded of [false,true])test(`the real Game tick projects a task-free Home corridor and keeps arrival protected (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f,a;try{if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}f=nativeHomeRouteFixture(runtime?{core:runtime.core}:{});const body=f.body(1),peer=f.body(3),ledger=JSON.stringify(f.state.ledger),home=f.held.reference.home;a=admission(f,{prepare:()=>{assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,undefined);assert.equal(f.worker.status,'returning');}});const result=await a.run();assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));assert.equal(a.commits,1);assert.equal(a.released.committed,true);assert.deepEqual(a.released.nativeHomes,[result.nativeHomeRouteBinding]);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.worker.taskId,null);assert.equal(f.worker.crateId,null);assert.equal(f.worker.path,null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.worker.x,f.body(1)[1]);assert.equal(f.worker.z,f.body(1)[2]);assert.equal(f.worker.status,'returning');assert.equal(JSON.stringify(f.state.ledger),ledger);const b=result.nativeHomeRouteBinding;f.advance(b.reference.endTime+.1-f.state.elapsed);assert(f.planner.projectNativeHomeExecution(f.state,f.worker).arrived);assert.equal(f.worker.x,Math.fround(home.x));assert.equal(f.worker.z,Math.fround(home.z));const arrived=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),arrived);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.w.nav_intent_finish(b.reference.actorId),0);assert.equal(JSON.stringify(f.state.ledger),ledger);assert.equal((await a.run()).status,'unsupported');
 }finally{a?.close();f?.close();await runtime?.dispose();}
});

test('Home admission revalidates against the later common native time while the old stationary owner holds the body',async()=>{
 const f=nativeHomeRouteFixture();let a;try{const body=f.body(1),peer=f.body(3);a=admission(f,{prepare:()=>f.advance(.4),drain:()=>f.advance(.2)});const r=await a.run();assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));assert(r.timeTranslation.sameFloat32Motion);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert(r.nativeHomeRouteBinding.reference.worldBoundary.effectiveTime>r.nativeHomeRouteBinding.preparedReference.worldBoundary.effectiveTime);
 }finally{a?.close();f.close();}
});

for(const missing of ['version','template'])test(`a consumer lacking the exact Home ${missing} cannot retire the stationary owner`,async()=>{
 const f=nativeHomeRouteFixture();let a;try{const before=JSON.stringify(f.state),body=f.body(1);a=admission(f,{receipt:r=>{delete r[missing==='version'?'nativeHomeRouteVersion':'preparedHomeRouteTemplate'];return r;}});const r=await a.run();assert.equal(r.status,'invalid-receipt',JSON.stringify({status:r.status,error:r.error}));assert.equal(JSON.stringify(f.state),before);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.held);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(a.commits,0);
 }finally{a?.close();f.close();}
});

test('changed village semantics or cancellation discard Home preparation without moving or crediting again',async()=>{
 for(const mode of ['entry','incapacitated','pose','phase','cancel']){const f=nativeHomeRouteFixture(),controller=new AbortController();let a;try{const body=f.body(1),ledger=JSON.stringify(f.state.ledger);a=admission(f,{prepare:()=>{if(mode==='entry'){const village=f.state.villages.find(v=>v.id===f.worker.villageId);(village.entry??village).x+=1;}else if(mode==='incapacitated')f.worker.incapacitated=true;else if(mode==='pose')f.worker.x+=1;else if(mode==='phase')f.worker.walkPhase+=1;else controller.abort();}});const r=await a.run(controller.signal);assert.equal(r.status,mode==='cancel'?'control-failed':'stale',JSON.stringify({status:r.status,error:r.error}));if(mode==='cancel')assert.match(r.error,/cancel|abort/i);assert.deepEqual(f.body(1),body);assert.equal(JSON.stringify(f.state.ledger),ledger);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.held);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.worker.status,'returning');
  }finally{a?.close();f.close();}}
});

test('Home projection requires its actual current native route and the same Game village',()=>{
 const f=nativeHomeRouteFixture();try{assert.equal(projectNativeHomeRouteExecution(f.state,f.worker,f.planner),null);const p=f.prepareHome();assert.equal(f.commitHome(p.proposal),1);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));const old=f.worker.villageId;f.worker.villageId='village-999999';assert.throws(()=>f.planner.projectNativeHomeExecution(f.state,f.worker),/executed game boundary/);f.worker.villageId=old;assert.throws(()=>f.planner.projectNativeHomeExecution({...f.state},f.worker),/another game/);assert.equal(f.w.nav_intent_retire_actor(f.held.reference.actorId),1);assert.equal(projectNativeHomeRouteExecution(f.state,f.worker,f.planner),null);
 }finally{f.close();}
});

test('a newly attached source observer reports the actual Home association, not a current stationary or TaskStart source',async()=>{
 const f=nativeHomeRouteFixture();let a,stop;try{a=admission(f);const r=await a.run();assert.equal(r.status,'committed');let baseline;stop=f.planner.observeNativeIntentControl({onBaseline:b=>{baseline=b;},onChanges(){}});assert.deepEqual(baseline.nativeHomes,[r.nativeHomeRouteBinding]);assert.deepEqual(f.planner.nativeHomeRouteBindings(),baseline.nativeHomes);assert.equal(baseline.nativeSettlements,undefined);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);
 }finally{stop?.();a?.close();f.close();}
});

test('Home saves retain semantic pose and village but never restore their former native execution permission',async()=>{
 const f=nativeHomeRouteFixture();let a;try{a=admission(f);assert.equal((await a.run()).status,'committed');tick(f.state,.1,f.nav);const json=serialize(f.state),saved=deserialize(json),session=f.w.nav_intent_session(),body=f.body(1),binding=f.planner.nativeHomeRouteBinding(f.actor);assert.equal(saved.workers[0].status,'returning');assert.equal(saved.workers[0].villageId,f.worker.villageId);assert.equal(saved.workers[0].x,f.worker.x);assert.equal(saved.workers[0].path,null);assert.equal(json.includes('native-home-route-attestation'),false);assert.equal(json.includes('native-task-settlement-reference'),false);assert.throws(()=>f.planner.resetFromState(saved),/Home restoration requires a fresh physical world/);assert.equal(f.w.nav_intent_session(),session);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),binding);
 }finally{a?.close();f.close();}
});
