import test from 'node:test';import assert from 'node:assert/strict';
import {nativeIdleStrollGraphicsFixture} from './helpers/native-idle-stroll-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';

// Real native endpoint, original authored actor/banks and roster. Renderer
// doubles do not provide a hardware acquisition or presentation receipt.
async function fixture(profile){const f=await nativeIdleStrollGraphicsFixture({profile});let walk;try{
 walk=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});walk.activate();const data=f.commitStroll();walk.finalize(data);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();f.flush();
 f.advance(data.nativeIdleStrollBinding.reference.endTime-f.nativeState.elapsed+.1);const terminal=f.planner.projectNativeIdleStroll(f.nativeState,f.worker);assert(terminal.arrived);f.setPickTime(f.nativeState.elapsed);f.sync();f.nativeState.time=PROFILES.find(p=>p.id===profile).end;
 const request=f.planner.requestNativeIdleHome(f.nativeState,f.worker);assert(request);f.planner.commitNativeCausalClock();f.sync();const staged=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(staged.status,'proposed');const proposal=staged.proposal;f.setPickTime(proposal.startTime);
 return {...f,terminal,request,homeProposal:proposal,homeSupport:f.terrain.prepareNativeHomeRouteProposal(proposal,{terrainManifest:f.manifest}),commitHome(actual=proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();const binding=f.planner.nativeHomeRouteBinding(f.nativeActor);return {nativeHomeRouteBinding:binding,resources:{version:1,kind:18,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeHomeRouteBinding:binding,presentation:f.planner.captureNativeRoutePresentation(binding.reference.expectedRouteHandle)}};}};
 }catch(e){walk?.cancel();f.close();throw e;}}
const meshes=root=>{const result=[];root.traverse(n=>{if(n.isMesh)result.push({mesh:n,geometry:n.geometry,index:n.geometry.index});});return result;};
for(const p of PROFILES)test(`${p.id} completed WALK admits Home on the same authored actor, geometry, bank and native body`,async()=>{
 const f=await fixture(p.id);let part;try{
  const actor=f.roster.get(f.actor),original=meshes(actor.root),body=f.body(1),bodyCount=f.w.spatial_body_count(),rng=f.nativeState.rng;
  part=await f.roster.prepareNativeHomeRouteProposal(f.homeSupport,{getPickTime:f.getPickTime});assert(part.valid());f.advance(.15);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();assert(part.valid());assert.deepEqual(f.body(1),body);
  const refreshed=f.planner.revalidateNativeHomeRouteProposal(f.homeProposal.ticket);assert.equal(refreshed.status,'revalidated');assert(refreshed.timeTranslation.sameFloat32Motion);part.activate();const data=f.commitHome(refreshed.proposal);part.finalize(data);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);f.sync();f.flush();f.setPickTime(data.nativeHomeRouteBinding.reference.worldBoundary.effectiveTime);const restore=actor.preparePick();restore();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.w.spatial_body_count(),bodyCount);assert.equal(data.nativeHomeRouteBinding.reference.bodyId,f.terminal.bodyId);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.nativeState.rng,rng);assert.deepEqual(f.body(1),body);for(const item of original){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
for(const changed of [false,true])test(`completed WALK Home ${changed?'rejects a changed contract':'cancellation retains the endpoint owner'}`,async()=>{
 const f=await fixture('youngMale');let part;try{const actor=f.roster.get(f.actor),body=f.body(1);part=await f.roster.prepareNativeHomeRouteProposal(f.homeSupport,{getPickTime:f.getPickTime});assert(part.valid());if(changed){f.state.workers[0].contractDay--;f.roster.sync();assert(!part.valid());}else{part.activate();assert(part.cancel());f.flush();assert.equal(f.roster.get(f.actor),actor);}assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});
