import * as THREE from 'three';
import {initializeProgramBindings} from '../../src/rendering/program-bindings.js';
import {waitForGpuPreload} from '../../src/rendering/screen-preload.js';

// QA hypothesis limited to the observed rigid crate, not a generic depth pass.
// Never draw, replace a production material or dispose borrowed geometry/maps.
export async function prepareCrateShadow(world,{bindings=initializeProgramBindings,fence=waitForGpuPreload,now=()=>performance.now()}={}){
 const started=now(),renderer=world.renderer,check=()=>{if(world.disposed||world.loading.signal.aborted)throw Error('Crate shadow preparation cancelled');};
 check();let source;
 world.scene.traverse(object=>{if(!source&&object.name==='Prop_FruitCrate_geometry_7'&&object.isMesh)source=object;});
 if(!source)throw Error('Observed crate source unavailable');
 const m=source.material;
 if(Array.isArray(m)||source.isSkinnedMesh||source.isInstancedMesh||source.customDepthMaterial||Object.keys(source.geometry.morphAttributes).length||m.alphaTest>0||m.alphaToCoverage||m.displacementMap||m.clippingPlanes?.length)throw Error('Unsupported crate shadow recipe');
 if(!world.sun.shadow.map||!renderer.shadowMap.enabled)throw Error('Native shadow target unavailable');
 // Exact plain directional-depth recipe of pinned Three r180. Native shadows
 // use an empty scene (no fog/environment) and linear render-target output.
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 depth.side=m.shadowSide??(renderer.shadowMap.type===THREE.VSMShadowMap?m.side:({[THREE.FrontSide]:THREE.BackSide,[THREE.BackSide]:THREE.FrontSide,[THREE.DoubleSide]:THREE.DoubleSide})[m.side]);
 depth.map=m.map;depth.alphaMap=m.alphaMap;depth.alphaTest=m.alphaTest;depth.wireframe=m.wireframe;depth.wireframeLinewidth=m.wireframeLinewidth;
 const probe=new THREE.Mesh(source.geometry,depth);probe.receiveShadow=source.receiveShadow;
 const target=new THREE.Scene();world.scene.traverseVisible(object=>{if(object.isLight)target.add(object.clone(false));});
 const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
 const oldTarget=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel();
 let retained=false;
 try{
  let pending;
  try{renderer.setRenderTarget(world.sun.shadow.map);pending=renderer.compileAsync(probe,world.sun.shadow.camera,target);}
  finally{renderer.setRenderTarget(oldTarget,face,level);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
  await pending;check();const bindingStats=bindings(renderer);check();await fence(renderer,{cancelled:()=>world.disposed||world.loading.signal.aborted});check();
  retained=true;let disposed=false;
  return {report:{elapsedMs:now()-started,source:source.name,bindings:bindingStats,scope:'QA only: rigid crate depth-program hypothesis; cache-key match and native benchmark still required. No draw or geometry upload.'},dispose(){if(disposed)return;disposed=true;depth.dispose();}};
 }finally{if(!retained)depth.dispose();}
}
