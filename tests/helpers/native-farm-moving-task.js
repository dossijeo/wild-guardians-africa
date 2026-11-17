import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './native-farm-arrival-route.js';
import {requestNativeIdleCurrentTask as requestOrdinaryTask,nativeIdleCurrentTaskPolicy as taskPolicy} from './native-idle-current-task.js';

// Real Farm23/24, public ordinary task planner and native Task14. No controller
// or graphical receipt is installed. The shared test helpers above use only
// task APIs/physical phases; they create no Idle history for this Farm source.
export function nativeFarmMovingTaskFixture({stop=true,...options}={}){
 const f=nativeFarmArrivalRouteFixture({peer:true,...options}),events=[];let detach;
 try{
  detach=f.planner.observeNativeIntentControl({onBaseline(){},onChanges:rows=>events.push(...rows),onClock(){}});
  const p=f.stage({urgent:true});assert.equal(p.status,1);assert.equal(f.commit(p),1);const farmBinding=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));f.move(.03);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));let source,stopBinding;
  if(stop){const before=f.planner.prepareNativeFarmArrivalStopProposal(f.actor);assert.equal(before.status,'proposed');f.move(.2);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker));const fresh=f.planner.revalidateNativeFarmArrivalStopProposal(before.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),before.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=fresh.proposal;stopBinding=f.planner.nativeFarmArrivalStopBinding(p.nativeStop,before.proposal.nativeStop,{projection:{version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects}});source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert.equal(source.kind,'native-farm-arrival-held-execution');}
  const projectPeer=()=>{const peer=f.state.workers[1];if(peer)return f.planner.projectNativeTaskExecution(f.state,peer);};projectPeer();
  return {...f,events,farmBinding,source,stopBinding,advance(dt){f.move(dt);projectPeer();},requestTask:()=>requestOrdinaryTask(f),policy:()=>taskPolicy(f),prepareTask(request=f.planner.pendingTaskRoute(f.actor)){const p=f.planner.prepareNativeTaskStartProposal(request,taskPolicy(f));assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},close(){detach?.();f.close();}};
 }catch(error){detach?.();f.close();throw error;}
}
