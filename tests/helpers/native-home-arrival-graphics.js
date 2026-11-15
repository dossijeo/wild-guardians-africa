import assert from 'node:assert/strict';
import {nativeHomeRouteGraphicsFixture} from './native-home-route-graphics.js';
import {copyNativeHomeArrivalAttestation} from '../../src/world/native-home-arrival.js';

// Original resident graphics and actual CPP endpoint/removal. The direct ABI
// commit is trusted test setup, not an actual prepared GPU/drain receipt.
export async function nativeHomeArrivalGraphicsFixture(){
 const f=await nativeHomeRouteGraphicsFixture();let home;
 try{home=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});home.activate();const data=f.commitHome();home.finalize(data);f.sync();f.flush();const source=data.nativeHomeRouteBinding;
  f.advance(source.reference.endTime+.05-f.nativeState.elapsed);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker).arrived);f.setPickTime(source.reference.endTime);f.sync();const p=f.planner.prepareNativeHomeArrivalProposal(source);assert.equal(p.status,'proposed');
  return {...f,homeSource:source,proposal:p.proposal,commitArrival(actual=p.proposal,prepared=p.proposal){const t=f.tuple();assert.equal(f.w.nav_home_arrival_proposal_commit_bound(...t.slice(0,5),prepared.ticket.ticket),1);const a=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_home_arrival_result_ptr(),52));assert.equal(a[0],1);assert.equal(a[1],f.w.nav_intent_transition_sequence());assert.equal(a[2],prepared.ticket.ticket);assert.equal(a[3],actual.ticket.ticket);assert.equal(a[44],actual.worldBoundary.effectiveTime);assert.equal(f.body(1),null);f.planner.commitNativeCausalClock();const binding=copyNativeHomeArrivalAttestation({kind:'native-home-arrival-attestation',version:1,projectionVersion:1,retiredSequence:a[1],reference:actual.nativeHomeArrival,preparedReference:prepared.nativeHomeArrival});return {worldBoundary:actual.worldBoundary,nativeHomeArrivalBinding:binding,resources:{version:1,kind:19,phase:'committed',worldBoundary:actual.worldBoundary,nativeHomeArrivalBinding:binding}};}};
 }catch(error){home?.cancel();f.close();throw error;}
}
