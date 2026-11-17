import assert from 'node:assert/strict';
import {nativeFarmArrivalGraphicsFixture} from './native-farm-arrival-route-graphics.js';
import {NATIVE_STOP_POSE_FIELDS} from '../../src/world/native-farm-arrival-stop.js';
import {floorFloat32} from '../../src/float32-time.js';

// Actual Farm23/24, Game mirror, authored actor/banks and terrain. Renderer,
// admission and submitted pick witness are doubles, not hardware acceptance.
export async function nativeFarmArrivalStopGraphicsFixture(options={}){
 const f=await nativeFarmArrivalGraphicsFixture(options);let arrival,parts=[];
 try{
  arrival=await f.roster.prepareNativeFarmArrivalProposal(f.support,{getPickTime:f.getPickTime});arrival.activate();const data=f.commitFarm();arrival.finalize(data);f.sync();f.flush();f.advance(.03);f.sync();
  const before=f.planner.prepareNativeFarmArrivalStopProposal(f.nativeActor);assert.equal(before.status,'proposed');const p=before.proposal,view={get:(cx,cz)=>(f.residency.getVisible??f.residency.get).call(f.residency,cx,cz),changedKeys:new Set()};let submitted,proof,source;
  const args={stopEffects:p,boundary:p.worldBoundary,nativeFarmArrivalStopTemplate:p.nativeStop,prepareBodySupport:(r,pose)=>f.terrain.prepareNativeBody(r,pose),getPickTime:()=>{throw Error('Farm stop cannot borrow a legacy clock');},getStoppedProjection:()=>submitted};
  return {...f,view,args,preparedStop:before,
   async prepare(overrides={}){const result=await f.roster.prepareNativeTerrainStops(view,{...args,...overrides});parts=result.parts;return result;},
   commitStop(){const fresh=f.planner.revalidateNativeFarmArrivalStopProposal(before.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),before.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=fresh.proposal;proof=f.planner.nativeFarmArrivalStopBinding(p.nativeStop,before.proposal.nativeStop,{projection:{version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects}});assert(proof);source=f.planner.nativeFarmArrivalHeldExecution(f.nativeActor);return proof;},
   projectHeld(){assert(f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker));f.sync();},
   submit(){const row=proof.projection.routeEffects.rows.slice(8,26);submitted={at:f.nativeState.elapsed,relativeTime:floorFloat32(f.nativeState.elapsed-f.proposal.startTime),age:floorFloat32(source.suspendedAt-data.nativeFarmArrivalBinding.reference.worldBoundary.effectiveTime),...Object.fromEntries(Object.entries(NATIVE_STOP_POSE_FIELDS).map(([field,index])=>[field,Math.fround(row[index])]))};return submitted;},
   get source(){return source;},get proof(){return proof;},
   close(){for(const part of parts.slice().reverse())part.cancel();arrival?.cancel();f.close();}
  };
 }catch(error){for(const part of parts.reverse())part.cancel();arrival?.cancel();f.close();throw error;}
}
