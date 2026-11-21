import assert from 'node:assert/strict';
import {savedNativeInitialIdleOutside} from './native-initial-idle-outside-source.js';
import {selectedApproachGame} from './native-idle-selected-approach-game.js';

// Genuine saved REST/WATCH → fresh authority → acquired20. Thereafter actual
// Game.tick and existing projections, with trusted native commits in this
// fixture only. No raw legacy Home peer, rendering permit or normal producer.
export async function initialIdleOutsideGame({mode='rest',profile='youngMale',threaded=false,retry=mode==='watch'?'watch':1,acquireBody=true}={}){
 const {saved,oldCycle}=await savedNativeInitialIdleOutside({mode,profile,threaded,retry});
 const f=await selectedApproachGame({saved,profile,threaded});
 try{
  const {planner,actor,state,worker,w,tuple}=f,q=planner.nativeInitialIdleRequestReference(actor);assert(q);assert.notEqual(q.authorityEpoch,oldCycle.reference.worldBoundary.authorityEpoch);
  const prepareBody=()=>{const p=planner.prepareNativeInitialIdleBodyProposal(q);assert.equal(p.status,'proposed');return p.proposal;};
  const commitBody=p=>{assert.equal(w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),p.ticket.ticket),1);planner.commitNativeCausalClock();assert(planner.projectNativeInitialIdleBody(state,worker));return planner.nativeInitialIdleBodyBinding(actor);};
  const body20=acquireBody?commitBody(prepareBody()):null;
  return {...f,q,body20,saved,oldCycle,prepareBody,commitBody,
   prepareCycle(){const p=planner.prepareNativeIdleCycleProposal(actor);assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},
   commitCycle(p,{project=true}={}){assert.equal(w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),p.ticket.ticket),1);planner.commitNativeCausalClock();if(project)assert(planner.projectNativeIdleCycle(state,worker));return planner.nativeIdleCycleBinding(actor);}
  };
 }catch(error){await f.dispose();throw error;}
}
