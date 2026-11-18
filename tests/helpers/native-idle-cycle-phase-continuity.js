import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {nativeIdleFailedCycleGraphics} from './native-idle-failed-cycle-graphics.js';
import {createNativeAdmissionVertical} from './native-admission-vertical.js';
import {captureNativeRoutePickFrame} from '../../src/rendering/native-route-pick-frame.js';
import {flush} from './remote-webgpu-fixture.js';

// Original authored actor/GLB and actual WASM, both resource/control ports and
// Host. GPU buffers and renderer/admission are doubles; this is not Surface.
export async function nativeIdleCyclePhaseContinuity({mode='rest',onPrepare=()=>{},onDrain=()=>{},...options}={}){
 const f=await nativeIdleFailedCycleGraphics({retry:mode==='rest'?.25:'rest-end',...options});let v,part,frame,proof;const phases=[],periods=['Idle','Alert'].map(clip=>f.bakes.get(clip).meta.duration),actor=f.roster.get(f.actor),original=actor.prepareNativeMotionVariant;
 actor.prepareNativeMotionVariant=(phase,settings)=>{phases.push(phase);return original(phase,settings);};
 try{
  assert(f.planner.cancelNativeIdleCycleProposal(f.proposal.ticket));
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.nativeState.elapsed,kind:'idle-cycle',retainStaticBuffer:true,idleCycleIdlePhase:true,idleCyclePhasePeriods:[...new Set(periods)],
   async onPrepare(e){await onPrepare(f,e);part=await f.roster.prepareNativeIdleCycleProposal(f.terrain.prepareNativeIdleCycle(e.resources.nativeIdleCycle),{getPickAge:r=>frame?.getIdleCycleElapsed(r)??0,getPickPhaseOffset:(r,duration)=>frame?.getIdleCyclePhaseOffset(r,duration)??0});},
   onReady(){part.activate();},onDrain:e=>onDrain(f,e),onCommit({data}){part.finalize(data);proof=data.nativeIdleCycleBinding;}
  });
  async function draw(){await flush();await v.host.idle();v.host.present();const inspect=await v.host.inspect();assert.equal(inspect.failed,false);frame=captureNativeRoutePickFrame(inspect);return {frame,inspect};}
  async function run(){const result=await v.run(o=>f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,...o}),{kind:'idle-cycle'});assert.equal(result.status,'committed',JSON.stringify(result));await v.present();f.sync();f.flush();await draw();return proof;}
  function vertices(){const restore=actor.preparePick(),points=[];try{actor.root.updateMatrixWorld(true);actor.root.traverse(mesh=>{if(mesh.isMesh&&mesh.visible&&mesh.userData.wgCpuPickProxy)for(let i=0;i<mesh.geometry.attributes.position.count;i+=Math.max(1,Math.floor(mesh.geometry.attributes.position.count/30)))points.push(mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));});return points;}finally{restore();}}
  return {...f,v,graphicsActor:actor,phases,periods,run,draw,vertices,get proof(){return proof;},get frame(){return frame;},phase(clip=mode==='rest'?'Idle':'Alert'){return phases.at(-1).sampleForClip(clip,f.bakes.get(clip).meta.duration);},async dispose(){part?.cancel();await v.close();await f.dispose();}};
 }catch(error){part?.cancel();await v?.close();await f.dispose();throw error;}
}
