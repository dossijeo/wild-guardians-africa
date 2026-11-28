import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHomeArrivalFixture} from './helpers/native-home-arrival.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {registerNativeAdmissionContract} from './helpers/native-admission-contract.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {tick} from '../src/simulation/game.js';
import {copyNativeHomeRequestReference} from '../src/world/native-home-request-reference.js';
import {copyNativeHomeRouteReference} from '../src/world/native-home-route.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {readFileSync} from 'node:fs';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function movingHomeSave(options={}){
 const f=nativeHomeArrivalFixture({arrived:false,...options});try{
  f.advance(.37);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));
  return {saved:deserialize(serialize(f.state)),oldHome:f.planner.nativeHomeRouteBinding(f.actor)};
 }finally{f.close();}
}

test('the existing authority can observe a Home declaration before physical binding',()=>{
 const {saved}=movingHomeSave(),module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),errors=[];
 const authority=createSimulationAuthority(module,serialize(saved),Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),{onNativeIntentControlError:error=>errors.push(error)});
 try{const status=authority.nativeIntentControlStatus();assert.equal(status.current,null);assert.equal(status.cohort.closed,false);assert.equal(status.cohort.fault,null);assert.equal(status.cohort.coherent,false);assert.equal(status.cohort.consumers,0);const response=authority.execute({kind:'advance',sequence:1,seconds:.1,nightFastForward:false,steps:2}),worker=deserialize(response.snapshot).workers[0];assert.equal(worker.x,saved.workers[0].x);assert.equal(worker.z,saved.workers[0].z);assert.equal(worker.path,null);assert.equal(worker.nativeRouteAdmission,'pending-home-resources');assert.deepEqual(errors,[]);}finally{authority.dispose();}
});

test('loading a moving Home declares a fresh task-free request and holds its saved pose',()=>{
 const {saved,oldHome}=movingHomeSave(),f=restoreNativeActionGame(saved);try{
  const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert.notEqual(request.authorityEpoch,oldHome.reference.worldBoundary.authorityEpoch);assert.equal(request.home.villageId,Number(f.worker.villageId.split('-').at(-1)));assert.equal(request.pose.x,saved.workers[0].x);assert.equal(request.pose.z,saved.workers[0].z);
  assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.status,'returning');assert.equal(f.worker.path,null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);
  const baseline=f.planner.nativeIntentControlBaseline();assert.deepEqual(baseline.pendingHomeRequests,[request]);assert.equal(baseline.nativeHomes,undefined);assert.equal(baseline.nativeSettlements,undefined);
  const worker=structuredClone(f.worker),body=f.body(1),peer=f.body(3),ledger=structuredClone(f.state.ledger);tick(f.state,.2,f.nav);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.state.ledger,ledger);
  const json=serialize(f.state);assert.equal(json.includes('native-home-request-reference'),false);assert.equal(json.includes('native-home-route-attestation'),false);assert.equal(deserialize(json).workers[0].nativeRouteAdmission,'pending-home-resources');
 }finally{f.close();}
});

test('a fresh Home candidate retains the semantic source across native revalidation',()=>{
 const f=restoreNativeActionGame(movingHomeSave().saved);try{
  const request=f.planner.nativeHomeRequestReference(f.actor),p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');assert.deepEqual(p.proposal.nativeHome.sourceRequest,request);assert.equal(p.proposal.sourceSettlement,undefined);assert.equal(p.proposal.nativeHome.sourceSettlement,undefined);
  assert.throws(()=>copyNativeHomeRequestReference({...request,sourceSettlement:{}}),/Home request/);assert.throws(()=>copyNativeHomeRouteReference({...p.proposal.nativeHome,sourceSettlement:{}}),/exactly one/);
  tick(f.state,.2,f.nav);const next=f.planner.revalidateNativeHomeRouteProposal(p.proposal.ticket);assert.equal(next.status,'revalidated');assert.equal(next.timeTranslation.sameNativeMotion,true);assert.deepEqual(next.proposal.sourceRequest,request);assert(next.proposal.startTime>p.proposal.startTime);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.planner.cancelNativeHomeRouteProposal(next.proposal.ticket),true);
  for(const patch of [{requestSequence:request.requestSequence+1},{bodyId:3},{authorityEpoch:request.authorityEpoch+'-foreign'},{pose:{...request.pose,yaw:request.pose.yaw+.1}}])assert.equal(f.planner.prepareNativeHomeRouteProposal({...request,...patch}).status,'stale');
 }finally{f.close();}
});

test('the direct control mirror rejects a foreign body, phase or request birth for prepared Home',()=>{
 const f=restoreNativeActionGame(movingHomeSave().saved);let control;try{
  const request=f.planner.nativeHomeRequestReference(f.actor),p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');const baseline=f.planner.nativeIntentControlBaseline();control=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes,pendingHomeRequests:baseline.pendingHomeRequests});control.acceptClock({...f.planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:f.planner.nativeCausalClock().committedThrough},{baseline:true});assert(control.admitHome(p.proposal.nativeHome,{preparingWorldBoundary:p.proposal.worldBoundary}).isPrepared());
  for(const patch of [{bodyId:3},{requestSequence:request.requestSequence+1},{pose:{...request.pose,walkPhase:request.pose.walkPhase+.1}}]){const sourceRequest={...request,...patch},reference={...p.proposal.nativeHome,bodyId:sourceRequest.bodyId,sourceRequest};assert.throws(()=>control.admitHome(reference,{preparingWorldBoundary:p.proposal.worldBoundary}),/Home.*obsolete/);}
  assert.throws(()=>createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes,pendingHomeRequests:[request,request]}),/pending Home baseline/);
  const foreign=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes,pendingHomeRequests:[{...request,nativeSession:request.nativeSession+1}]});try{assert.throws(()=>foreign.acceptClock({...f.planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:f.planner.nativeCausalClock().committedThrough},{baseline:true}),/pending Home session/);}finally{foreign.dispose();}
 }finally{control?.dispose();f.close();}
});

registerNativeAdmissionContract('home-restoration',async hooks=>{
 const f=restoreNativeActionGame(movingHomeSave().saved);let vertical;try{
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'home-route',...hooks});
  return {vertical,time:()=>f.state.elapsed,held:()=>f.body(1),peer:()=>f.body(3),binding:()=>f.planner.nativeHomeRouteBinding(f.actor),
   advance:dt=>tick(f.state,dt,f.nav),run:signal=>vertical.run(options=>f.planner.startNativeHomeRouteAfterGpuQuiescence({...options,actorId:f.actor}),{signal}),
   cancel(){assert.equal(f.w.spatial_body_remove(1),1);f.planner.flushNativeIntentControl();f.planner.commitNativeCausalClock();},
   async close(){await vertical.close();f.close();}};
 }catch(error){await vertical?.close();f.close();throw error;}
});

test('fresh Home admission executes a new complete corridor without old settlement history',async()=>{
 const {saved,oldHome}=movingHomeSave(),f=restoreNativeActionGame(saved);let vertical;try{
  const pose=structuredClone(f.worker),ledger=structuredClone(f.state.ledger);vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'home-route'});
  const r=await vertical.run(options=>f.planner.startNativeHomeRouteAfterGpuQuiescence({...options,actorId:f.actor}));assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));await vertical.present();const b=f.planner.nativeHomeRouteBinding(f.actor);assert(b.reference.sourceRequest);assert.equal(b.reference.sourceSettlement,undefined);assert.notEqual(b.reference.worldBoundary.authorityEpoch,oldHome.reference.worldBoundary.authorityEpoch);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.worker.x,pose.x);assert.equal(f.worker.z,pose.z);
  const before=f.body(1);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),before);assert.equal(f.worker.x,f.body(1)[1]);assert.equal(f.worker.z,f.body(1)[2]);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.deepEqual(vertical.errors,[]);
  await vertical.present();assert(captureNativeRoutePickFrame(vertical.host.inspect()).getHomeTime(b.preparedReference)>=0);
 }finally{await vertical?.close();f.close();}
});

test('Home preserves an unspent running budget and its existing walking policy',async()=>{
 const {saved}=movingHomeSave({runBudget:72});assert.equal(saved.workers[0].running,false);assert(saved.workers[0].runRemaining>0);
 const f=await nativeWorkerGraphicsFixture(restoreNativeActionGame(saved),{idle:true});let part;try{
  const request=f.planner.nativeHomeRequestReference(f.actor),budget=f.worker.runRemaining,phase=f.worker.runPhase;assert.equal(f.worker.running,false);assert.equal(budget,saved.workers[0].runRemaining);assert.equal(phase,saved.workers[0].runPhase);tick(f.nativeState,.2,f.nav);assert.equal(f.worker.runRemaining,budget);assert.equal(f.worker.runPhase,phase);
  const proposed=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(proposed.status,'proposed');assert.equal(proposed.proposal.runDistance,0);assert.equal(proposed.proposal.rows.some((v,i)=>i%16===14&&v===1),false);const support=f.terrain.prepareNativeHomeRouteProposal(proposed.proposal,{terrainManifest:f.manifest}),actor=f.roster.get(f.actor),root=actor.root;part=await f.roster.prepareNativeHomeRouteProposal(support,{getPickTime:f.getPickTime});assert(part.valid());assert.equal(f.acquires,1);part.activate();assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),proposed.proposal.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();const binding=f.planner.nativeHomeRouteBinding(f.actor);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));part.finalize({nativeHomeRouteBinding:binding,resources:{kind:18,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(binding.reference.expectedRouteHandle)}});tick(f.nativeState,.2,f.nav);assert.equal(f.worker.running,false);assert.equal(f.worker.runRemaining,budget);assert.equal(f.worker.runPhase,phase);assert(f.worker.walkPhase>request.pose.walkPhase);assert.equal(actor.root,root);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('a restored Home body cannot be moved or rebound before resource admission',()=>{
 const f=restoreNativeActionGame(movingHomeSave().saved);try{
  const body=f.body(1),request=f.planner.nativeHomeRequestReference(f.actor);assert.equal(f.w.spatial_body_upsert(1,body[1]+.1,body[2],body[3],body[4],body[5]),0);assert.deepEqual(f.body(1),body);
  assert.equal(f.w.spatial_body_upsert(77,body[1]-100,body[2]-100,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(request.actorId,77),0);assert.equal(f.planner.nativeHomeRequestReference(f.actor).bodyId,1);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(f.planner.nativeHomeRequestReferences(),[]);assert.equal(f.planner.prepareNativeHomeRouteProposal(request).status,'stale');
 }finally{f.close();}
});

test('the newly admitted Home can reach its village and retire through the actual absence protocol',async()=>{
 const f=restoreNativeActionGame(movingHomeSave().saved);let vertical;try{
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'home-route'});
  const home=await vertical.run(options=>f.planner.startNativeHomeRouteAfterGpuQuiescence({...options,actorId:f.actor}));assert.equal(home.status,'committed');await vertical.present();const ledger=structuredClone(f.state.ledger);
  f.state.elapsed=home.nativeHomeRouteBinding.reference.endTime+.05;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');f.planner.commitNativeCausalClock();assert(f.planner.projectNativeHomeExecution(f.state,f.worker).arrived);const body=f.body(1);assert(body);
  const arrival=await vertical.run(options=>f.planner.startNativeHomeArrivalAfterGpuQuiescence({...options,actorId:f.actor}),{kind:'home-arrival'});assert.equal(arrival.status,'committed',JSON.stringify({status:arrival.status,error:arrival.error}));assert.equal(arrival.receipt.nativeHomeArrivalVersion,1);await vertical.present();assert.equal(f.body(1),null);assert.equal(f.worker.status,'home');assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);assert.deepEqual(f.state.ledger,ledger);assert.equal(arrival.nativeHomeArrivalBinding.reference.sourceHome.reference.sourceSettlement,undefined);assert(arrival.nativeHomeArrivalBinding.reference.sourceHome.reference.sourceRequest);assert.deepEqual(vertical.errors,[]);
 }finally{await vertical?.close();f.close();}
});

test('threaded restoration uses the same fresh Home request and first-route executor',async()=>{
 const {saved}=movingHomeSave();saved.workers=saved.workers.slice(0,1);saved.tasks=[];const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{
  f=restoreNativeActionGame(saved,{core:runtime.core,admitPeer:false});const request=f.planner.nativeHomeRequestReference(f.actor),p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.planner.commitNativeCausalClock();f.planner.projectNativeHomeExecution(f.state,f.worker);const before=f.body(1);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),before);assert.equal(f.worker.x,f.body(1)[1]);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);
 }finally{f?.close();await runtime.dispose();}
});

for(const mode of ['cancel','exact','late'])test(`fresh Home prepares the resident authored actor without a fake stationary owner (${mode})`,async()=>{
 const f=await nativeWorkerGraphicsFixture(restoreNativeActionGame(movingHomeSave().saved),{idle:true});let part;try{
  const actor=f.roster.get(f.actor);assert(actor);const root=actor.root,anchor=root.position.clone(),before=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)before.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});
  const p=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(p.status,'proposed');const support=f.terrain.prepareNativeHomeRouteProposal(p.proposal,{terrainManifest:f.manifest}),body=f.body(1);assert(support?.valid());part=await f.roster.prepareNativeHomeRouteProposal(support,{getPickTime:f.getPickTime});assert(part.valid());assert.equal(f.acquires,1);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.deepEqual(f.body(1),body);
  part.activate();part.rollback();for(const v of before){assert.equal(v.mesh.material,v.material);assert.equal(v.mesh.visible,v.visible);assert.equal(v.mesh.geometry,v.geometry);}
  if(mode==='cancel'){assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);return;}
  let actual=p.proposal;if(mode==='late'){tick(f.nativeState,.3,f.nav);const next=f.planner.revalidateNativeHomeRouteProposal(p.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);actual=next.proposal;}
  part.activate();assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.planner.commitNativeCausalClock();const binding=f.planner.nativeHomeRouteBinding(f.actor);assert.equal(binding.reference.worldBoundary.ticket,actual.ticket.ticket);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));part.finalize({nativeHomeRouteBinding:binding,resources:{kind:18,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(binding.reference.expectedRouteHandle)}});
  f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert(root.position.equals(anchor));for(const v of before){assert.equal(v.mesh.geometry,v.geometry);assert.equal(v.mesh.geometry.index,v.index);}assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
