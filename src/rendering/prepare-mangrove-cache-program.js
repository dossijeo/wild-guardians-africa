import {Vector4,WebGLRenderTarget} from 'three';
import {compileLoadingPrograms} from './loading-programs.js';
import {initializeValidatedProgramBindings} from './program-bindings.js';

// Loading-only: compile the actual cache material for a linear render target.
// Submission is synchronous; restore shared renderer state before awaiting.
export async function prepareMangroveCacheProgram(renderer,cache,{
 signal,cancelled=()=>false,getEpoch=()=>0,onSubmit,compile=compileLoadingPrograms,
 prepareBindings=initializeValidatedProgramBindings,makeTarget=()=>new WebGLRenderTarget(1,1)
}={}){
 const gl=renderer.getContext(),epoch=getEpoch();let lost=false;
 const invalid=()=>signal?.aborted||cancelled()||cache.disposed||lost||renderer.getContext()!==gl||gl.isContextLost()||getEpoch()!==epoch;
 const check=()=>{if(invalid())throw Error('Ground cache preparation cancelled');};
 const lose=()=>{lost=true;};check();gl.canvas?.addEventListener('webglcontextlost',lose);let target;
 try{
  target=makeTarget();const before=renderer.getRenderTarget(),cube=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest();let bindings=0,pending;
  try{renderer.setRenderTarget(target);pending=cache.prepareProgram((scene,camera)=>compile(renderer,scene,camera,scene,{signal,cancelled:invalid,getEpoch,onSubmit,onProgramReady:program=>{check();prepareBindings(renderer,program);bindings++;}}));}
  finally{renderer.setRenderTarget(before,cube,mip);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
  await pending;check();if(!bindings)throw Error('Ground cache program was not prepared');return {bindings};
 }finally{target?.dispose();gl.canvas?.removeEventListener('webglcontextlost',lose);}
}
