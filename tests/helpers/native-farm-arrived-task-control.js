import assert from 'node:assert/strict';
import {controlledNativeFarmArrival} from './native-farm-arrival-control.js';
import {requestNativeIdleCurrentTask,nativeIdleCurrentTaskPolicy} from './native-idle-current-task.js';

// Actual terminal23 and ordered native control. Trusted installation only;
// no retained GPU packet, renderer or graphical drain is manufactured here.
export function controlledNativeFarmArrivedTask({installFarm=true,...options}={}){
 const f=controlledNativeFarmArrival({peer:true,...options});try{
  const p=f.prepare(true),farmBinding=f.commit(p);
  if(installFarm)f.c.installFarmArrivals(farmBinding.reference.worldBoundary,[farmBinding]);
  const farm=f.c.admitFarmArrival(farmBinding.reference);
  f.advance(Math.max(0,farmBinding.reference.endTime-f.state.elapsed)+.05);
  const source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(source.arrived);assert.equal(source.currentSpeed,0);f.planner.projectNativeTaskExecution(f.state,f.state.workers[1]);
  return {...f,farmBinding,farm,source,requestTask:()=>requestNativeIdleCurrentTask(f),
   prepareTask(){const p=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),nativeIdleCurrentTaskPolicy(f));assert.equal(p.status,'proposed');return p.proposal;},
   commitTask(p){assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.nativeTaskStartBinding(f.actor);}};
 }catch(error){f.close();throw error;}
}
