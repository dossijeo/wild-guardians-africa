import assert from 'node:assert/strict';
import {nativeIdleFailedCycleGame} from './native-idle-failed-cycle-game.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';
import {tick} from '../../src/simulation/game.js';

// Fresh real Game/native authority and the original authored GLB/clip banks.
// Renderer, resource admission and submitted picking clocks remain doubles.
export async function nativeIdleFailedCycleGraphics(options={}){
 const native=await nativeIdleFailedCycleGame(options);let f,age=0,offset;
 try{
  f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id,close(){}},{idle:true,alert:true,clips:['Walk_Skip','Run','Idle','Alert']});
  const supportFor=p=>f.terrain.prepareNativeIdleCycle(p.nativeIdleCycle),prepare=()=>{const proposal=native.prepareCycle(),support=supportFor(proposal);assert(support?.valid());return {proposal,support};};
  const first=prepare();
  return {...f,...first,nativeActor:native.sourceRequest.actorId,sourceRequest:native.sourceRequest,prepare,supportFor,
   getPickAge:()=>age,getPickPhaseOffset:()=>offset,setPickClock(value,phaseOffset){age=value;offset=phaseOffset;},
   advance:seconds=>tick(f.nativeState,seconds,f.nav),advanceCycle:native.advanceCycle,
   sync(){f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();},
   commit(proposal=first.proposal){const binding=native.commitCycle(proposal);return {worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding,resources:{version:1,kind:21,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding}};},
   async dispose(){f.close();await native.dispose();}
  };
 }catch(error){f?.close();await native.dispose();throw error;}
}
