import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleHomeFixture} from './helpers/native-idle-home.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {tick,emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeTaskSettlementGraphicsFixture} from './helpers/native-task-settlement-graphics.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

test('an active Idle cannot declare a premature Home and an expired Idle retains its actual body while its peer advances',()=>{
 const f=nativeIdleHomeFixture();try{
  const body=f.body(1),peer=f.body(3),ledger=structuredClone(f.state.ledger),pose=f.idle.reference.pose;
  assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker),/finished idle contract/);
  f.worker.contractDay=f.state.day-1;tick(f.state,.2,f.nav);
  const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert.equal(request.bodyId,f.idle.reference.bodyId);assert(request.requestSequence>f.idle.settlementSequence);assert.deepEqual(request.pose,pose);
  assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.taskId,null);assert.equal(f.worker.crateId,null);assert.equal(f.worker.path,null);
  assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.state.ledger,ledger);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),f.idle);assert.equal(f.planner.nativeGameExecutionState(),1);
  tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);
  const json=serialize(f.state);assert.equal(json.includes('native-home-request-reference'),false);assert.equal(deserialize(json).workers[0].nativeRouteAdmission,'pending-home-resources');
 }finally{f.close();}
});

for(const threaded of [false,true])test(`Idle crosses its exact end time on the common native clock (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleHomeFixture({...(runtime?{core:runtime.core}:{}),configureSave:s=>{s.time=249.95;s.workers[1].profile='youngFemale';}});
  const body=f.body(1),peer=f.body(3),ledger=structuredClone(f.state.ledger);tick(f.state,.15,f.nav);
  assert.equal(f.state.time,250.1);const request=f.planner.nativeHomeRequestReference(f.actor);assert(request);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.state.ledger,ledger);
  assert(Math.abs(request.requestedAt-(f.state.elapsed-.1))<1e-8);assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);tick(f.state,.1,f.nav);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);
 }finally{f?.close();await runtime?.dispose();}
});

test('a moving task still rejects its unsupported expiry boundary',()=>{
 const f=nativeIdleHomeFixture({configureSave:s=>{s.time=249.95;}});try{
  const body=f.body(1),peer=f.body(3),elapsed=f.state.elapsed;assert.throws(()=>tick(f.state,.1,f.nav),/unsupported return boundary/);assert.equal(f.state.elapsed,elapsed);assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),peer);assert.equal(f.worker.status,'idle');assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('a pending next task cannot cross expiry by retaining its preceding Idle body',()=>{
 const f=nativeIdleHomeFixture({configureSave:s=>{s.time=249.95;s.workers[1].profile='youngFemale';}});try{
  const target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.target.x,f.target.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:f.nav.version,pendingResources:true}),1);assert.equal(f.worker.status,'waiting-task');assert(f.worker.taskId);assert(f.planner.nativeTaskSettlementBinding(f.actor));
  const body=f.body(1),elapsed=f.state.elapsed;assert.throws(()=>tick(f.state,.1,f.nav),/unsupported return boundary/);assert.equal(f.state.elapsed,elapsed);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

test('a Home request born from Idle uses the existing prepared route and actual resource/control ports',async()=>{
 const f=nativeTaskSettlementFixture();let vertical;try{
  const body=f.body(1);
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-settlement',onPrepare({resources}){if(resources.kind===18){tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);}},onDrain(){if(f.worker.nativeRouteAdmission==='pending-home-resources')tick(f.state,.1,f.nav);else f.advance(.1);}});
  const idle=await vertical.run(options=>f.planner.startNativeTaskSettlementAfterGpuQuiescence({actorId:f.actor,...options}));assert.equal(idle.status,'committed',JSON.stringify({status:idle.status,error:idle.error}));await vertical.present();
  f.worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);const request=f.planner.nativeHomeRequestReference(f.actor),peer=f.body(3),ledger=structuredClone(f.state.ledger);
  const result=await vertical.run(options=>f.planner.startNativeHomeRouteAfterGpuQuiescence({actorId:f.actor,...options}),{kind:'home-route'});assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await vertical.present();
  assert.deepEqual(result.nativeHomeRouteBinding.reference.sourceRequest,request);assert.equal(result.nativeHomeRouteBinding.reference.sourceSettlement,undefined);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.state.ledger,ledger);
  tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.worker.taskId,null);assert.equal(f.worker.crateId,null);assert.deepEqual(vertical.errors,[]);
 }finally{await vertical?.close();f.close();}
});

test('native Idle retargeting rejects a foreign source and stays idempotent on its own held source',()=>{
 const f=nativeIdleHomeFixture();try{
  const r=f.idle.reference,worker=f.worker,village=f.state.villages.find(v=>v.id===worker.villageId),home=village.entry??village,args=[r.actorId,r.worldBoundary.nativeSession,f.idle.settlementSequence,Number(village.id.split('-').at(-1)),home.x,home.z];
  assert.equal(f.w.nav_intent_idle_home_request(args[0],args[1]+1,...args.slice(2)),-1);assert.equal(f.w.nav_intent_idle_home_request(args[0],args[1],args[2]+1,...args.slice(3)),-2);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);const q=f.planner.nativeHomeRequestReference(f.actor),body=f.body(1);assert.equal(f.w.nav_intent_idle_home_request(...args),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),q);assert.equal(f.w.nav_intent_idle_home_request(...args.slice(0,4),home.x+1,home.z),-3);assert.deepEqual(f.body(1),body);
  assert.equal(f.w.spatial_body_upsert(1,body[1]+1,body[2],body[3],0,1),0);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
 }finally{f.close();}
});

function idleControl(b){
 const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingHomeRequests:b.pendingHomeRequests??[]});
 c.acceptClock({...b.clock,anchorLogicalTime:b.clock.committedThrough,anchorAbsoluteMs:1000},{baseline:true});c.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes??[],{bootstrap:true});c.installSettlements(b.worldBoundary,b.nativeSettlements??[],{bootstrap:true});return c;
}
test('the direct Idle lease survives a real Home request and is revoked only by the issued Home route',()=>{
 const f=nativeIdleHomeFixture();let control,pending;const events=[];try{
  f.planner.intentChanges();control=idleControl(f.planner.nativeIntentControlBaseline());const lease=control.admitSettlement(f.idle.reference);assert(lease.isCurrent());
  f.worker.contractDay=f.state.day-1;f.planner.requestNativeIdleHome(f.state,f.worker);events.push(...f.planner.intentChanges());f.planner.commitNativeCausalClock();const home=events.find(e=>e.homeRequest);assert(home);assert.equal(home.taskId,null);assert.equal(home.targetId,null);
  const bad=structuredClone(home);bad.homeRequest.bodyId++;assert.throws(()=>control.accept(bad),/held Idle body/);for(const e of events.splice(0))control.accept(e);const prior=control.status().clock;cClock(control,f.planner.nativeCausalClock(),prior);assert(lease.isCurrent());
  pending=idleControl(f.planner.nativeIntentControlBaseline());assert(pending.admitSettlement(f.idle.reference).isCurrent());
  const proposal=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(proposal.status,'proposed');const prepared=control.admitHome(proposal.proposal.nativeHome,{preparingWorldBoundary:proposal.proposal.worldBoundary});assert(prepared.isPrepared());assert.equal(prepared.isCurrent(),false);
  assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),proposal.proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');events.push(...f.planner.intentChanges());for(const e of events.splice(0))control.accept(e);cClock(control,f.planner.nativeCausalClock(),control.status().clock);assert.equal(lease.isCurrent(),false);
  const binding=f.planner.nativeHomeRouteBinding(f.actor);assert.equal(control.installHomes(binding.reference.worldBoundary,[binding]),1);assert(prepared.isCurrent());
 }finally{pending?.dispose();control?.dispose();f.close();}
});
function cClock(control,next,prior){control.acceptClock({...next,anchorLogicalTime:next.reanchor?next.committedThrough:prior.anchorLogicalTime,anchorAbsoluteMs:next.reanchor?1000:prior.anchorAbsoluteMs});}

function meshIdentities(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
for(const mode of ['exact','late','cancel','remove'])test(`the original Idle actor prepares Home incrementally (${mode})`,async()=>{
 const f=await nativeTaskSettlementGraphicsFixture();let idle,part;try{
  idle=await f.roster.prepareNativeTaskSettlementProposal(f.support,{getPickAge:f.getPickAge});idle.activate();const data=f.commit();idle.finalize(data);f.sync();f.flush();const proof=data.nativeTaskSettlementBinding,actor=f.roster.get(f.actor),root=actor.root,before=meshIdentities(root),body=f.body(1),owned=f.registry.status().owned.length;
  f.worker.contractDay=f.nativeState.day-1;tick(f.nativeState,.1,f.nav);f.sync();const request=f.planner.nativeHomeRequestReference(f.actor),p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');const proposal=p.proposal,support=f.terrain.prepareNativeHomeRouteProposal(proposal,{terrainManifest:f.manifest});assert(support?.valid());
  const foreign=structuredClone(proposal);foreign.sourceRequest.bodyId=request.bodyId+9;foreign.nativeHome.sourceRequest.bodyId=request.bodyId+9;foreign.nativeHome.bodyId=request.bodyId+9;foreign.bodyId=request.bodyId+9;await assert.rejects(f.roster.prepareNativeHomeRouteProposal({...support,presentation:foreign},{getPickTime:f.getPickTime}),/source worker/);
  part=await f.roster.prepareNativeHomeRouteProposal(support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();part.rollback();assert(part.valid());for(const v of before){assert.equal(v.mesh.material,v.material);assert.equal(v.mesh.visible,v.visible);}
  if(mode==='cancel'){part.activate();assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);assert.deepEqual(f.planner.nativeTaskSettlementBinding(f.actor),proof);}
  else if(mode==='remove'){part.activate();f.state.workers=[];f.roster.sync();assert.equal(part.valid(),false);f.flush();assert.equal(f.registry.status().owned.length,0);assert.equal(part.cancel(),false);}
  else{let actual=proposal;if(mode==='late'){tick(f.nativeState,.2,f.nav);f.sync();const next=f.planner.revalidateNativeHomeRouteProposal(proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);actual=next.proposal;}
   part.activate();assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();const binding=f.planner.nativeHomeRouteBinding(f.actor);part.finalize({nativeHomeRouteBinding:binding,resources:{kind:18,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(binding.reference.expectedRouteHandle)}});f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);for(const v of before){assert.equal(v.mesh.geometry,v.geometry);assert.equal(v.mesh.geometry.index,v.index);}assert.equal(f.roster.releaseNativeTaskSettlement(f.actor,proof),false);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);
  }
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();idle?.cancel();f.close();}
});
