import assert from 'node:assert/strict';
import {restoredNativeIdleStrollGame,nativeIdleStrollGameSave} from './native-idle-stroll-restoration-game.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';
import {tick} from '../../src/simulation/game.js';

// Real semantic save/load, fresh native source and original authored actor.
// Renderer/admission remain doubles; hardware is validated separately.
export async function nativeIdleStrollRestorationGraphicsFixture({profile='youngMale',advance=null,saved=null,clips=['Walk_Skip','Idle'],alert=false,core=null,historicalMotion=null}={}){
 const native=restoredNativeIdleStrollGame(saved??nativeIdleStrollGameSave({profile,...advance?{advance}:{}}),{core});let f;
 try{
  f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id},{idle:true,alert,clips,historicalMotion});const proposal=native.prepare(),supportFor=value=>f.terrain.prepareNativeIdleStrollProposal(value,{terrainManifest:f.manifest});assert(supportFor(proposal)?.valid());
  return {...f,nativeActor:Number(native.actor.split('-').at(-1)),proposal,support:supportFor(proposal),supportFor,advance:seconds=>tick(f.nativeState,seconds,f.nav),
   sync(){f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();},
   commitStroll(prepared=proposal){const binding=native.commit(prepared),nativeRoute={actorId:binding.reference.actorId,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence},worldBoundary=binding.reference.worldBoundary;return {worldBoundary,nativeIdleStrollBinding:binding,resources:{version:1,kind:22,phase:'committed',worldBoundary,nativeRoute,nativeIdleStrollBinding:binding,presentation:f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle)}};}
  };
 }catch(error){if(f)f.close();else native.close();throw error;}
}
