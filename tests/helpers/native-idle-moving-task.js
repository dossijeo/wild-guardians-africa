import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './native-idle-stroll-control.js';
import {nativeSuspendedBodiesFromProposal} from '../../src/world/native-suspended-body-reference.js';
import {requestNativeIdleCurrentTask,nativeIdleCurrentTaskPolicy} from './native-idle-current-task.js';

// Real moving22 and prepared stop12 before an ordinary planner/task claim.
// Component permission installation is not a graphical hardware receipt.
export function controlledNativeIdleMovingTask({stop=true,...options}={}){
 const f=controlledNativeIdleStroll(options);try{
  const p=f.prepare(),strollBinding=f.commitStroll(p);f.c.installStrolls(strollBinding.reference.worldBoundary,[strollBinding]);const walkLease=f.c.admitStroll(strollBinding.reference);f.planner.projectNativeIdleStroll(f.state,f.worker);f.advance(.12);f.planner.projectNativeIdleStroll(f.state,f.worker);
  let stopBinding,heldLease,legacyHeldLease,source;
  if(stop){
   const prepared=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(prepared.status,'proposed');const selector={kind:'native-idle-stroll-stopped-body',version:1,stop:prepared.proposal.nativeStop,actorId:f.actor};heldLease=f.c.admitStoppedBody(selector,{preparingWorldBoundary:prepared.proposal.worldBoundary});
   f.advance(.2);const refreshed=f.planner.revalidateNativeIdleStrollStopProposal(prepared.ticket);assert.equal(refreshed.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const actual=refreshed.proposal;
   stopBinding=f.planner.nativeIdleStrollStopBinding(actual.nativeStop,prepared.proposal.nativeStop,{projection:{version:1,routeEffects:actual.routeEffects,gateEffects:actual.gateEffects}});assert(stopBinding);f.c.installStrollStops(actual.worldBoundary,[stopBinding]);legacyHeldLease=f.c.admitSuspended(nativeSuspendedBodiesFromProposal(actual,actual.worldBoundary)[0]);source=f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(source.kind,'native-idle-stroll-held-execution');
  }
  const projectPeer=()=>{const peer=f.state.workers[1];if(peer)f.planner.projectNativeTaskExecution(f.state,peer);};projectPeer();
  return {...f,advance(dt){f.advance(dt);projectPeer();},strollBinding,walkLease,stopBinding,heldLease,legacyHeldLease,source,requestTask:()=>requestNativeIdleCurrentTask(f),policy:()=>nativeIdleCurrentTaskPolicy(f),prepareTask(request=f.planner.pendingTaskRoute(f.actor)){const prepared=f.planner.prepareNativeTaskStartProposal(request,nativeIdleCurrentTaskPolicy(f));assert.equal(prepared.status,'proposed',JSON.stringify(prepared));return prepared.proposal;}};
 }catch(error){f.close();throw error;}
}
