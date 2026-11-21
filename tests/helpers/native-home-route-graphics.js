import assert from 'node:assert/strict';
import {nativeTaskSettlementGraphicsFixture} from './native-task-settlement-graphics.js';

// Original authored resident actor and the real native delivery/Home chain.
// Rendering/admission remain doubles; no hardware receipt is issued here.
export async function nativeHomeRouteGraphicsFixture(){
 const f=await nativeTaskSettlementGraphicsFixture({home:true});let idle;
 try{
  idle=await f.roster.prepareNativeTaskSettlementProposal(f.support,{getPickAge:f.getPickAge});idle.activate();const data=f.commit();idle.finalize(data);f.sync();f.flush();const held=data.nativeTaskSettlementBinding,p=f.planner.prepareNativeHomeRouteProposal(held);assert.equal(p.status,'proposed');
  f.setPickTime(p.proposal.startTime);const support=proposal=>f.terrain.prepareNativeHomeRouteProposal(proposal,{terrainManifest:f.manifest});assert(support(p.proposal)?.valid());
  return {...f,held,proposal:p.proposal,support:support(p.proposal),supportFor:support,commitHome(proposal=p.proposal,prepared=p.proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);f.planner.commitNativeCausalClock();const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.actor);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));return {nativeHomeRouteBinding,resources:{kind:18,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(nativeHomeRouteBinding.reference.expectedRouteHandle)}};}};
 }catch(error){idle?.cancel();f.close();throw error;}
}
