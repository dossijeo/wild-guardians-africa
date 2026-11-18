import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './native-farm-arrival-route.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';
import {copyNativeFarmArrivalRouteResources} from '../../src/world/native-farm-arrival-route.js';

// Actual native source, authored worker/bakes and terrain. Renderer/admission
// are fixture doubles; raw ABI commit is not a graphical receipt.
export async function nativeFarmArrivalGraphicsFixture({urgent=false,idleCycle=false,...options}={}){
 const native=nativeFarmArrivalRouteFixture({peer:true,...options});let f;
 try{f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id},{idle:true,alert:idleCycle,clips:['Walk_Skip','Run','Idle',...(idleCycle?['Alert']:[])]});const p=native.planner.prepareNativeFarmArrivalRouteProposal(native.requestSource,{urgent});assert.equal(p.status,'proposed');const proposal=p.proposal,supportFor=value=>f.terrain.prepareNativeFarmArrivalProposal(value,{terrainManifest:f.manifest});assert(supportFor(proposal)?.valid());
  return {...f,nativeActor:native.actor,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},
   sync(){f.state.workers=[structuredClone(f.worker)];for(const key of ['tasks','crates','structures','elapsed','time','day'])f.state[key]=structuredClone(f.nativeState[key]);f.roster.sync();},
   advance(seconds){native.move(seconds);assert(native.planner.projectNativeFarmArrivalExecution(native.state,native.worker));},
   commitFarm(prepared=proposal){assert.equal(native.commit({ticket:prepared.ticket.ticket}),1);assert(native.planner.projectNativeFarmArrivalExecution(native.state,native.worker));const binding=native.planner.nativeFarmArrivalRouteBinding(native.actor),nativeRoute={actorId:binding.reference.actorId,assignmentSequence:binding.assignmentSequence,routeHandle:binding.reference.expectedRouteHandle},worldBoundary=binding.reference.worldBoundary,presentation=native.planner.captureNativeRoutePresentation(nativeRoute.routeHandle);
    // Raw source association supplies the actual boundary; no GPU consumer
    // prepared it in this fixture, just as in native route-data source tests.
    const resources=copyNativeFarmArrivalRouteResources({version:1,kind:23,phase:'committed',worldBoundary,nativeRoute,nativeFarmArrivalBinding:binding,presentation:{...presentation,worldBoundary}});return {worldBoundary,nativeRoute,nativeFarmArrivalBinding:binding,resources};}
  };
 }catch(error){if(f)f.close();else native.close();throw error;}
}
