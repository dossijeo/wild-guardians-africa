import {nativeHomeArrivalFixture} from './helpers/native-home-arrival.js';
import {copyNativeHomeArrivalAttestation} from '../src/world/native-home-arrival.js';
import {nativeHomeRouteFixture} from './helpers/native-home-route.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
import {nativeTaskRequestFixture} from './helpers/native-task-resource-requests.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';
import {nativeTaskActionReferenceFromProposal} from '../src/world/native-task-action-presentation.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {nativeTaskSettlementReferenceFromProposal} from '../src/world/native-task-settlement.js';

const boundary={version:1,authorityEpoch:'source',nativeSession:1,ticket:3,effectiveTime:10};
const resource=()=>({version:1,kind:12,phase:'proposal',worldBoundary:{...boundary}});
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:value=>resolve(value)};};
const flush=()=>new Promise(resolve=>setTimeout(resolve,5));
function setup({prepare,timeoutMs=1000}={}){
 const {port1,port2}=new MessageChannel(),calls=[],errors=[];let live=true;
 const endpoint=attachNativeResourcePreparationEndpoint({port:port2,session:'game',isRunning:()=>live,onError:error=>errors.push(error),prepare:prepare??(async(kind,resources)=>({preparedWorldBoundary:resources.worldBoundary,valid:()=>true,commit:data=>{calls.push(['commit',data]);return true;},abort:()=>calls.push(['abort'])}))});
 const connection=createNativeResourcePreparationConnection({port:port1,session:'game',timeoutMs,onError:error=>errors.push(error)});
 return {connection,endpoint,calls,errors,port1,port2,close(){connection.dispose();endpoint.dispose();port1.close();port2.close();live=false;}};
}

test('a genuine first-task declaration crosses the retained endpoint while independent native execution advances',async()=>{
 const native=nativeTaskRequestFixture({bindBodies:true}),started=deferred(),finish=deferred();native.claim();
 const request=native.planner.pendingTaskRoute(native.state.tasks[0].workerId),proposal=native.planner.prepareNativeTaskStartProposal(request,{bodyId:1,radius:.28,runPhase:4,walkPhase:7}).proposal,reference=nativeTaskStartReferenceFromProposal(proposal);
 let received,committed;
 const f=setup({prepare:async(kind,resources,options)=>{received={kind,resources,options};started.resolve();await finish.promise;return {preparedWorldBoundary:resources.worldBoundary,preparedTaskStartTemplate:nativeTaskStartReferenceFromProposal(resources),valid:()=>true,commit:data=>{committed=data;return true;},abort(){}};}});
 try{await f.connection.ready;const preparing=f.connection.prepareNativeTaskStartResources(proposal,{minSequence:2,terrainManifest:{epoch:'terrain',chunks:[]}});await started.promise;
  assert.equal(f.connection.status().pending,1);const before=native.body(2);native.advance(12);assert(native.body(2).x>before.x);assert.deepEqual(native.planner.pendingTaskRoute(request.actorId),request);
  finish.resolve();const handle=await preparing;assert.equal(received.kind,'prepareNativeTaskStartResources');assert.equal(received.options.deferredStart,true);assert.equal(received.options.minSequence,2);assert.deepEqual(received.resources.rows,proposal.rows);assert.notEqual(received.resources.rows,proposal.rows);assert.deepEqual(handle.preparedTaskStartTemplate,reference);assert(handle.valid());
  await assert.rejects(f.connection.prepareNativeTaskStartResources(proposal),/already pending/);
  const commit={worldBoundary:proposal.worldBoundary};assert(handle.commit(commit));assert.equal(handle.commit(commit),false);await flush();assert.deepEqual(committed,commit);assert.equal(f.connection.status().retained,0);assert.deepEqual(f.errors,[]);
 }finally{finish.resolve();f.close();native.close();}
});

test('solid additions carry the wall projection and consume only their retained native association',async()=>{
 const additions=[{entityId:'wall-1',x:4,z:8,halfX:1,halfZ:.25,yaw:0,passMask:0}];
 const prepared={kind:'native-barrier-addition-reference',version:1,worldBoundary:boundary,sourceControlSequence:19,additions};
 const proposal={kind:'native-barrier-addition-proposal',version:1,worldBoundary:boundary,nativeBarrierAddition:prepared,authorizedAutonomy:false,authorizedConsequences:false};
 const walls=[{id:'wall-1',type:'wall',x:4,z:8}];let committed;
 const f=setup({prepare:async(kind,resources,options)=>{
  assert.equal(kind,'prepareNativeBarrierAdditionResources');assert.equal(options.deferredStart,true);assert.deepEqual(options.nativeBarrierWallEntities,walls);
  return {preparedWorldBoundary:resources.worldBoundary,preparedBarrierAdditionTemplate:resources.nativeBarrierAddition,valid:()=>true,commit:data=>{committed=data;return true;},abort(){}};
 }});
 try{
  await f.connection.ready;
  await assert.rejects(f.connection.prepareNativeBarrierAdditionResources(proposal),/presentation declaration/);
  await assert.rejects(f.connection.prepareNativeGateResources(proposal),/resource request class mismatch/);
  const handle=await f.connection.prepareNativeBarrierAdditionResources(proposal,{nativeBarrierWallEntities:walls});
  assert.deepEqual(handle.preparedBarrierAdditionTemplate,prepared);assert.equal(handle.refresh,undefined);
  const effective={...boundary,ticket:4,effectiveTime:11};
  const bind=preparedReference=>({kind:'native-barrier-addition-attestation',version:1,reference:{...preparedReference,worldBoundary:effective},preparedReference,nativeIds:[17]});
  assert.throws(()=>handle.commit({worldBoundary:effective}),/another family/);
  assert.throws(()=>handle.commit({worldBoundary:effective,nativeBarrierAdditionBinding:bind({...prepared,sourceControlSequence:20})}),/differs from retained template/);
  assert(handle.valid());
  const data={worldBoundary:effective,nativeBarrierAdditionBinding:bind(prepared)};
  assert(handle.commit(data));assert.equal(handle.commit(data),false);await flush();
  assert.deepEqual(committed,data);assert.deepEqual(f.errors,[]);assert.equal(f.connection.status().retained,0);
 }finally{f.close();}
});

test('an actual arrived action declaration retains its own resource class through the existing port and refresh',async()=>{
 const native=createNativeTaskGameFixture();tick(native.state,native.proposals[0].endTime-native.state.elapsed+.05,native.nav);const actor=native.state.workers[0].id,proposal=native.planner.prepareNativeTaskActionProposal(native.planner.nativeTaskActionRequest(actor)).proposal;let current=proposal,prepared=0,invalidated=0,committed;
 const f=setup({prepare:async(kind,resources,options)=>{assert.equal(kind,'prepareNativeTaskActionResources');assert.equal(options.deferredStart,true);assert.equal(resources.kind,'native-task-action-proposal');prepared++;return {get preparedWorldBoundary(){return current.worldBoundary;},get preparedTaskActionTemplate(){return nativeTaskActionReferenceFromProposal(current);},valid:()=>true,invalidate(){invalidated++;return true;},refresh(next){current=next;return true;},commit(data){committed=data;return true;},abort(){}};}});
 try{await f.connection.ready;const handle=await f.connection.prepareNativeTaskActionResources(proposal);assert(handle.valid());assert.deepEqual(handle.preparedTaskActionTemplate,nativeTaskActionReferenceFromProposal(proposal));assert.equal(native.planner.nativeTaskActionBinding(actor),null);assert(handle.invalidate());native.state.elapsed+=.2;native.planner.advanceNativeRouteExecution(native.state.elapsed);native.planner.commitNativeCausalClock();const next=native.planner.revalidateNativeTaskActionProposal(proposal.ticket).proposal;assert(await handle.refresh(next));assert.deepEqual(handle.preparedTaskActionTemplate,nativeTaskActionReferenceFromProposal(next));assert.equal(prepared,1);assert.equal(invalidated,1);assert(handle.commit({worldBoundary:next.worldBoundary}));await flush();assert.deepEqual(committed,{worldBoundary:next.worldBoundary});assert.equal(f.connection.status().retained,0);assert.deepEqual(f.errors,[]);}finally{f.close();native.close();}
});

test('the action resource port rejects a template from another declaration',async()=>{
 const native=createNativeTaskGameFixture();tick(native.state,native.proposals[0].endTime-native.state.elapsed+.05,native.nav);const proposal=native.planner.prepareNativeTaskActionProposal(native.planner.nativeTaskActionRequest(native.state.workers[0].id)).proposal;
 const f=setup({prepare:async()=>({preparedWorldBoundary:proposal.worldBoundary,preparedTaskActionTemplate:{},abort(){}})});try{await f.connection.ready;await assert.rejects(f.connection.prepareNativeTaskActionResources(proposal),/template receipt/);assert.equal(f.connection.status().retained,0);assert.equal(native.planner.nativeTaskActionBindings().length,0);}finally{f.close();native.close();}
});

test('the same retained port carries stationary preparation, invalidation, refresh and its exact issued association',async()=>{
 const native=nativeTaskSettlementFixture(),proposal=native.prepareSettlement().proposal,started=deferred(),finish=deferred();let current=proposal,committed,prepared=0,invalidated=0;
 const f=setup({prepare:async(kind,resources,options)=>{assert.equal(kind,'prepareNativeTaskSettlementResources');assert.equal(options.deferredStart,true);assert.equal(resources.kind,'native-task-settlement-proposal');prepared++;started.resolve();await finish.promise;return {get preparedWorldBoundary(){return current.worldBoundary;},get preparedTaskSettlementTemplate(){return nativeTaskSettlementReferenceFromProposal(current);},valid:()=>true,invalidate(){invalidated++;return true;},refresh(next){current=next;return true;},commit(data){committed=data;return true;},abort(){}};}});
 try{await f.connection.ready;const preparing=f.connection.prepareNativeTaskSettlementResources(proposal);await started.promise;const peer=native.body(3);native.advance(.2);assert.notDeepEqual(native.body(3),peer);assert.equal(native.planner.nativeTaskSettlementBinding(native.actor),null);finish.resolve();const handle=await preparing;assert(handle.valid());assert.deepEqual(handle.preparedTaskSettlementTemplate,proposal.nativeSettlement);await assert.rejects(f.connection.prepareNativeTaskSettlementResources(proposal),/already pending/);assert(handle.invalidate());const next=native.planner.revalidateNativeTaskSettlementProposal(proposal.ticket);assert.equal(next.status,'revalidated');assert(await handle.refresh(next.proposal));assert.deepEqual(handle.preparedTaskSettlementTemplate,next.proposal.nativeSettlement);assert.equal(prepared,1);assert.equal(invalidated,1);assert.equal(native.commitSettlement(next.proposal),1);const data={nativeTaskSettlementBinding:native.planner.nativeTaskSettlementBinding(native.actor)};assert(handle.commit(data));assert.equal(handle.commit(data),false);await flush();assert.deepEqual(committed,data);assert.equal(f.connection.status().retained,0);assert.deepEqual(f.errors,[]);}finally{finish.resolve();f.close();native.close();}
});

test('a stationary port receipt cannot name another prepared body pose or opt out of deferred admission',async()=>{
 const native=nativeTaskSettlementFixture(),proposal=native.prepareSettlement().proposal,foreign=structuredClone(proposal.nativeSettlement);foreign.pose.yaw+=.1;
 const f=setup({prepare:async()=>({preparedWorldBoundary:proposal.worldBoundary,preparedTaskSettlementTemplate:foreign,abort(){}})});
 try{await f.connection.ready;await assert.rejects(f.connection.prepareNativeTaskSettlementResources(proposal,{deferredStart:false}),/deferred start/);await assert.rejects(f.connection.prepareNativeTaskActionResources(proposal),/action proposal/);await assert.rejects(f.connection.prepareNativeTaskSettlementResources(proposal),/template receipt/);assert.equal(f.connection.status().retained,0);assert.equal(native.planner.nativeTaskSettlementBinding(native.actor),null);}finally{f.close();native.close();}
});

test('abort during preparation disposes a handle that arrives late and permits a later request',async()=>{
 const started=deferred(),finish=deferred();let aborted=0,count=0;
 const f=setup({prepare:async(kind,resources)=>{if(++count===1){started.resolve();await finish.promise;}return {preparedWorldBoundary:resources.worldBoundary,valid:()=>true,commit:()=>true,abort(){aborted++;}};}});
 try{await f.connection.ready;const controller=new AbortController(),preparing=f.connection.prepareNativeGateResources(resource(),{signal:controller.signal});await started.promise;controller.abort();await assert.rejects(preparing,{name:'AbortError'});await flush();finish.resolve();await flush();assert.equal(aborted,1);assert.equal(f.connection.status().pending,0);
  const next=await f.connection.prepareNativeGateResources(resource());assert(next.valid());next.abort();await flush();assert.equal(aborted,2);
 }finally{finish.resolve();f.close();}
});

test('abort after ready retires its proxy and releases capacity for the next request',async()=>{
 const f=setup();try{await f.connection.ready;const controller=new AbortController(),handle=await f.connection.prepareNativeGateResources(resource(),{signal:controller.signal});controller.abort();assert.equal(handle.valid(),false);assert.equal(handle.commit({}),false);assert.equal(f.connection.status().retained,0);await flush();const next=await f.connection.prepareNativeGateResources(resource());next.abort();}finally{f.close();}
});

test('the retained endpoint supports invalidate and refresh without a new preparation',async()=>{
 let prepared=0,invalidated=0,refreshed=0;const current=resource();
 const f=setup({prepare:async(kind,resources)=>{prepared++;return {get preparedWorldBoundary(){return current.worldBoundary;},valid:()=>true,invalidate(){invalidated++;return true;},refresh(next){refreshed++;current.worldBoundary=next.worldBoundary;return true;},commit:()=>true,abort(){}};}});
 try{await f.connection.ready;const initial={kind:'native-route-resume-proposal',worldBoundary:current.worldBoundary},handle=await f.connection.prepareNativeResumeResources(initial);assert(handle.invalidate());assert.equal(handle.valid(),false);const next={...initial,worldBoundary:{...boundary,ticket:4,effectiveTime:12}};assert(await handle.refresh(next));assert(handle.valid());assert.deepEqual(handle.preparedWorldBoundary,next.worldBoundary);assert.equal(prepared,1);assert.equal(invalidated,1);assert.equal(refreshed,1);handle.abort();}finally{f.close();}
});

test('incompatible refresh and failed refresh both release the retained proxy',async()=>{
 for(const result of [false,'reject']){const f=setup({prepare:async(kind,resources)=>({preparedWorldBoundary:resources.worldBoundary,valid:()=>true,refresh:()=>{if(result==='reject')throw Error('changed');return false;},commit:()=>true,abort(){}})});try{await f.connection.ready;const resources={kind:'native-route-resume-proposal',worldBoundary:boundary},handle=await f.connection.prepareNativeResumeResources(resources);if(result==='reject')await assert.rejects(handle.refresh(resources),/changed/);else assert.equal(await handle.refresh(resources),false);assert.equal(f.connection.status().retained,0);assert.equal(handle.valid(),false);}finally{f.close();}}
});

test('a duplicate refresh cannot release the first refresh or its retained reservation',async()=>{
 const started=deferred(),finish=deferred(),f=setup({prepare:async(kind,resources)=>({preparedWorldBoundary:resources.worldBoundary,valid:()=>true,refresh:async()=>{started.resolve();await finish.promise;return true;},commit:()=>true,abort(){}})});
 try{await f.connection.ready;const resources={kind:'native-route-resume-proposal',worldBoundary:boundary},handle=await f.connection.prepareNativeResumeResources(resources),refreshing=handle.refresh(resources);await started.promise;
  await assert.rejects(handle.refresh(resources),/already pending/);assert.equal(f.connection.status().retained,1);finish.resolve();assert(await refreshing);assert(handle.valid());assert.equal(f.connection.status().retained,1);await assert.rejects(f.connection.prepareNativeGateResources(resource()),/already pending/);handle.abort();
 }finally{finish.resolve();f.close();}
 const g=setup();try{await g.connection.ready;const handle=await g.connection.prepareNativeGateResources(resource());assert.equal(handle.refresh,undefined);assert.equal(handle.invalidate,undefined);handle.abort();}finally{g.close();}
});

test('connection disposal invalidates ready proxies and rejects a pending preparation',async()=>{
 const f=setup();try{await f.connection.ready;const handle=await f.connection.prepareNativeGateResources(resource());f.connection.dispose();assert.equal(handle.valid(),false);assert.equal(handle.commit({}),false);await flush();assert.equal(f.endpoint.status().closed,true);}finally{f.close();}
 const started=deferred(),finish=deferred(),g=setup({prepare:async()=>{started.resolve();await finish.promise;return {abort(){}};}});try{await g.connection.ready;const pending=g.connection.prepareNativeGateResources(resource());await started.promise;g.connection.dispose();await assert.rejects(pending,/disposed/);}finally{finish.resolve();g.close();}
});

test('preparation timeout cancels the existing retained handle without closing the healthy endpoint',async()=>{
 const started=deferred(),finish=deferred(),f=setup({timeoutMs:30,prepare:async()=>{started.resolve();await finish.promise;return {abort(){}};}});
 try{await f.connection.ready;const pending=f.connection.prepareNativeGateResources(resource());await started.promise;await assert.rejects(pending,/timed out/);await flush();assert.equal(f.connection.status().phase,'running');assert.equal(f.endpoint.status().pending,null);}finally{finish.resolve();f.close();}
});

test('wrong-session and unsolicited responses close the connection and invalidate retained handles',async()=>{
 for(const response of [{session:'foreign',kind:'nativeGateResourcesResult',id:1},{session:'game',kind:'nativeGateResourcesResult',id:999}]){const f=setup();try{await f.connection.ready;const handle=await f.connection.prepareNativeGateResources(resource());f.port2.postMessage(response);await flush();assert.equal(f.connection.status().phase,'failed');assert.equal(handle.valid(),false);assert.equal(f.errors.length,1);}finally{f.close();}}
});

test('aborting before the handshake does not dispatch a resource request',async()=>{
 const {port1,port2}=new MessageChannel(),messages=[];port2.onmessage=({data})=>messages.push(data);const connection=createNativeResourcePreparationConnection({port:port1,session:'game'});connection.ready.catch(()=>{});
 try{const controller=new AbortController(),preparing=connection.prepareNativeGateResources(resource(),{signal:controller.signal});controller.abort();await assert.rejects(preparing,{name:'AbortError'});assert.equal(messages.length,0);}finally{connection.dispose();port2.close();}
});

test('genuine Home preparation, invalidation and refresh retain their typed template on the existing direct endpoint',async()=>{
 const native=nativeHomeRouteFixture();let current=null,committed=null;const f=setup({prepare:async(kind,resources)=>{assert.equal(kind,'prepareNativeHomeRouteResources');current=resources;return {get preparedWorldBoundary(){return current.worldBoundary;},get preparedHomeRouteTemplate(){return current.nativeHome;},valid:()=>true,invalidate:()=>true,async refresh(next){current=next;return true;},commit(data){committed=data;return true;},abort(){}};}});
 try{const p=native.prepareHome().proposal;await f.connection.ready;const handle=await f.connection.prepareNativeHomeRouteResources(p,{minSequence:2,terrainManifest:{epoch:'terrain',chunks:[]}});assert.deepEqual(handle.preparedHomeRouteTemplate,p.nativeHome);assert(handle.invalidate());const body=native.body(1);native.advance(.2);assert.deepEqual(native.body(1),body);const next=native.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(next.status,'revalidated');assert(await handle.refresh(next.proposal));assert.deepEqual(handle.preparedHomeRouteTemplate,next.proposal.nativeHome);assert.equal(native.commitHome(next.proposal),1);const binding=native.planner.nativeHomeRouteBinding(native.actor);assert(handle.commit({nativeHomeRouteBinding:binding}));await flush();assert.deepEqual(committed.nativeHomeRouteBinding,binding);assert.equal(f.connection.status().retained,0);assert.deepEqual(f.errors,[]);
 }finally{f.close();native.close();}
});


test('Home absence preparation and refresh use the same retained direct resource endpoint',async()=>{
 const native=nativeHomeArrivalFixture();let current=null,committed=null;const f=setup({prepare:async(kind,resources)=>{assert.equal(kind,'prepareNativeHomeArrivalResources');current=resources;return {get preparedWorldBoundary(){return current.worldBoundary;},get preparedHomeArrivalTemplate(){return current.nativeHomeArrival;},valid:()=>true,invalidate:()=>true,async refresh(next){current=next;return true;},commit(data){committed=data;return true;},abort(){}};}});
 try{const p=native.prepareArrival().proposal;await f.connection.ready;const handle=await f.connection.prepareNativeHomeArrivalResources(p,{minSequence:3});assert.deepEqual(handle.preparedHomeArrivalTemplate,p.nativeHomeArrival);assert(handle.invalidate());const body=native.body(1);native.advance(.2);assert.deepEqual(native.body(1),body);const next=native.planner.revalidateNativeHomeArrivalProposal(p.ticket);assert.equal(next.status,'revalidated');assert(await handle.refresh(next.proposal));assert.deepEqual(handle.preparedHomeArrivalTemplate,next.proposal.nativeHomeArrival);assert.equal(native.commitArrival(next.proposal),1);const a=Array.from(new Float64Array(native.w.memory.buffer,native.w.nav_home_arrival_result_ptr(),52)),binding=copyNativeHomeArrivalAttestation({kind:'native-home-arrival-attestation',version:1,projectionVersion:1,retiredSequence:a[1],reference:next.proposal.nativeHomeArrival,preparedReference:next.proposal.nativeHomeArrival});assert(handle.commit({worldBoundary:next.proposal.worldBoundary,nativeHomeArrivalBinding:binding}));await flush();assert.deepEqual(committed.nativeHomeArrivalBinding,binding);assert.equal(f.connection.status().retained,0);assert.equal(native.body(1),null);assert.deepEqual(f.errors,[]);}finally{f.close();native.close();}
});
