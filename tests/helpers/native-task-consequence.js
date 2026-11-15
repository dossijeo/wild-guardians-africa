import assert from 'node:assert/strict';
import {nativeActionSave,restoreNativeActionGame} from './native-task-action-restoration.js';
import {prepareHarvestConsequence} from '../../src/simulation/game.js';
import {centerDeliveryPoint} from '../../src/world/centers.js';

// Native source component setup only: trusted action/commit ABI. Hardware and
// receipt admission are tested by the shared vertical, not granted here.
export function nativeTaskConsequenceFixture({progress=3,nearCenter=true,admitPeer=true,core=null,additionalChunks=[],runBudget=4,configureSave=null}={}){
 const {saved}=nativeActionSave({progress,runBudget});
 if(nearCenter){const worker=saved.workers[0],center=saved.structures.find(s=>s.id===worker.centerId);center.x=worker.x-6;center.z=worker.z+6;}
 if(admitPeer){const worker=saved.workers[1],task=saved.tasks.find(t=>t.id===worker.taskId),target=saved.plants.find(p=>p.id===task.targetId);target.x=worker.x+12;}
 // The nearby authored checkpoint is generated BEFORE the fresh native owner.
 // No live structure, route, fake Home intent or body is moved during staging.
 configureSave?.(saved);
 const f=restoreNativeActionGame(saved,{core,admitPeer,additionalChunks});
 try{const proposed=f.planner.prepareNativeTaskActionProposal(f.planner.nativeTaskActionRequest(f.actor));assert.equal(proposed.status,'proposed');assert.equal(f.w.nav_task_action_proposal_commit_bound(...f.tuple().slice(0,5),proposed.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeTaskActionExecution(f.state,f.worker);
  const task=f.state.tasks.find(t=>t.id===f.worker.taskId),target=f.state.plants.find(p=>p.id===task.targetId),center=f.state.structures.find(c=>c.id===f.worker.centerId),destination=centerDeliveryPoint(center,target,f.state),policy={crateId:f.state.nextId,centerId:center.id,destination};
  return {...f,task,target,center,destination,policy,source:f.planner.nativeTaskActionBinding(f.actor),preview:prepareHarvestConsequence(f.state,f.worker,task,target),
   prepare(){return f.planner.prepareNativeTaskConsequenceProposal(f.planner.nativeTaskActionBinding(f.actor),policy);},
   advance(dt){f.state.elapsed+=dt;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');assert.equal(f.planner.commitNativeCausalClock().status,'committed');},
   commitSourceOnly(prepared){return f.w.nav_task_consequence_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket);}
  };
 }catch(error){f.close();throw error;}
}
