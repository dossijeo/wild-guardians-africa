import assert from 'node:assert/strict';
import {nativeHomeRouteFixture} from './native-home-route.js';

// Trusted ABI setup of preceding Home only. The arrival transactor must still
// obtain its own exact prepared receipt; this helper grants no GPU authority.
export function nativeHomeArrivalFixture({arrived=true,...options}={}){
 const f=nativeHomeRouteFixture(options);
 try{const p=f.prepareHome();assert.equal(p.status,'proposed');assert.equal(f.commitHome(p.proposal),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.projectNativeHomeExecution(f.state,f.worker);const source=f.planner.nativeHomeRouteBinding(f.actor);
  if(arrived){f.advance(source.reference.endTime+.05-f.state.elapsed);assert(f.planner.projectNativeHomeExecution(f.state,f.worker).arrived);}
  return {...f,homeSource:source,prepareArrival:()=>f.planner.prepareNativeHomeArrivalProposal(source),commitArrival(proposal,prepared=proposal){return f.w.nav_home_arrival_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket);}};
 }catch(error){f.close();throw error;}
}
