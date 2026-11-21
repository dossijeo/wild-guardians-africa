// Warm directional shadow depth variants. The temporary
// materials remain alive until the native shadow draw has claimed programs.
import {MeshDepthMaterial,WebGLRenderTarget,RGBADepthPacking,FrontSide,BackSide,DoubleSide,Vector4,VSMShadowMap} from 'three';
import {compileLoadingPrograms} from './loading-programs.js';
import {initializeValidatedProgramBindings} from './program-bindings.js';
import {loadingSyncWitness} from './loading-sync-witness.js';
import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';

export function canPrepareSkinnedShadowPrograms(renderer,scene){
 let compatible=renderer.shadowMap.enabled&&renderer.shadowMap.type!==VSMShadowMap;
 scene.traverseVisible(object=>{if(object.isLight&&object.castShadow&&!object.isDirectionalLight)compatible=false;});
 return compatible;
}

export async function prepareSkinnedShadowPrograms(renderer,scene,camera,{onSubmit,signal,cancelled=()=>false,getEpoch=()=>0,compile=compileLoadingPrograms,prepareBindings=initializeValidatedProgramBindings,nextFrame}={}){
 const materials=[],meshes=[],bindings=new Set();scene.traverseVisible(object=>{if(object.isSkinnedMesh&&object.castShadow&&!object.customDepthMaterial)meshes.push(object);});
 // Three's shadow pass calls renderBufferDirect with a null scene, which uses
 // an empty scene for fog/environment while retaining the current light state.
 const shadowScene=Object.create(scene);shadowScene.fog=null;shadowScene.background=null;shadowScene.environment=null;
 const target=new WebGLRenderTarget(1,1),gl=renderer.getContext(),epoch=getEpoch();let complete=false;
 const check=()=>{if(signal?.aborted||cancelled()||renderer.getContext()!==gl||gl.isContextLost()||getEpoch()!==epoch)throw Error('Shadow preparation cancelled');};
 try{
  for(const mesh of meshes){
   check();
   const original=mesh.material,source=Array.isArray(original)?original:[original];
   const shadows=source.map(material=>{
    const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking});
    depth.side=material.shadowSide??(material.side===FrontSide?BackSide:material.side===BackSide?FrontSide:DoubleSide);
    for(const key of ['visible','wireframe','alphaMap','alphaTest','map','clipShadows','clippingPlanes','clipIntersection','displacementMap','displacementScale','displacementBias','wireframeLinewidth','linewidth'])depth[key]=material[key];
    if(material.alphaToCoverage)depth.alphaTest=.5;materials.push(depth);return depth;
   });
   const before=renderer.getRenderTarget(),cube=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),view={traverse:fn=>fn(mesh),traverseVisible:()=>{}};let pending;
   try{mesh.material=Array.isArray(original)?shadows:shadows[0];renderer.setRenderTarget(target);pending=compile(renderer,view,camera,shadowScene,{onSubmit,signal,cancelled,getEpoch,onProgramReady:program=>{if(!bindings.has(program)){loadingSyncWitness(onSubmit,'shadow-binding-preparation',()=>prepareBindings(renderer,program));bindings.add(program);}}});}
   finally{renderer.setRenderTarget(before,cube,mip);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);mesh.material=original;}
   await pending;check();await waitGpuFrame({check,signal,nextFrame});
  }
  check();
  complete=true;let disposed=false;return {meshes:meshes.length,keys:(renderer.info.programs??[]).map(p=>p.cacheKey).filter(k=>k.startsWith('depth,')),dispose:()=>{if(!disposed){disposed=true;materials.forEach(material=>material.dispose());}}};
 }finally{target.dispose();if(!complete)materials.forEach(material=>material.dispose());}
}
