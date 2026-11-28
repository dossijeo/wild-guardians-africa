import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './native-idle-stroll-control.js';

// Actual source/control and executed Game readback. Rendering is deliberately
// absent here; the installed permissions stand in for the component consumer.
export function nativeIdleArrivalFixture({installStroll=true,...options}={}){
 const f=controlledNativeIdleStroll(options);
 return acquireNativeIdleArrivalStroll(f,{installStroll});
}
// Keep channels connected before the moving source is acquired. A late active
// stroll bootstrap remains unsupported and must never be fabricated by tests.
export function acquireNativeIdleArrivalStroll(f,{installStroll=true}={}){
 try{
  const proposal=f.prepare(),strollLease=f.c.admitStroll(proposal.nativeIdleStroll,{preparingWorldBoundary:proposal.worldBoundary}),strollBinding=f.commitStroll(proposal);
  if(installStroll)f.c.installStrolls(strollBinding.reference.worldBoundary,[strollBinding]);
  f.planner.projectNativeIdleStroll(f.state,f.worker);
  return {...f,strollProposal:proposal,strollBinding,strollLease,
   arrive(){f.advance(strollBinding.reference.endTime-f.state.elapsed+.01);return f.planner.projectNativeIdleStroll(f.state,f.worker);},
   prepareRest(){const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');return p.proposal;},
   commitRest(proposal,{install=true,project=true}={}){
    f.commit({ticket:proposal.ticket.ticket});const binding=f.planner.nativeIdleCycleBinding(f.actor);
    if(install)f.c.installIdleCycles(binding.reference.worldBoundary,[binding]);
    if(project)f.planner.projectNativeIdleCycle(f.state,f.worker);return binding;
   }
  };
 }catch(error){f.close();throw error;}
}
