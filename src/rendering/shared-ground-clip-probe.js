import * as THREE from 'three';
// Smoke-only raster binding proof after genuine World readiness. Its offscreen
// output recipe can differ from the screen program; identities are reported.
export function probeSharedGroundClip(world){
 const renderer=world.renderer,resident=world.terrainMeshes.find(mesh=>mesh.material.isMeshBasicMaterial&&mesh.material.userData.biomeGround)?.material,horizon=world.horizon?.group?.children.find(mesh=>mesh.material.isMeshBasicMaterial&&mesh.material.userData.horizonBounds)?.material;
 if(!resident||!horizon)throw Error('Ground binding probe requires prepared Basic resident/horizon materials');
 const check=()=>{if(world.disposed||world.loading?.signal.aborted||renderer.getContext().isContextLost())throw Error('Ground binding probe cancelled');};check();
 const bounds=horizon.userData.horizonBounds,originalBounds=bounds.clone(),center=new THREE.Vector3((bounds.x+bounds.z)/2,0,(bounds.y+bounds.w)/2);
 const state={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),level:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear};
 const identity=material=>{const p=renderer.properties.get(material).currentProgram;return {id:p?.id??null,cacheKey:p?.cacheKey??null};},screen={resident:identity(resident),horizon:identity(horizon)},steps=[],pixel=new Uint8Array(4);
 let geometry,target,scene;
 try{
  geometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));
  target=new THREE.WebGLRenderTarget(4,4);scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10),mesh=new THREE.Mesh(geometry,resident);mesh.position.copy(center);scene.add(mesh);scene.fog=world.scene.fog;camera.up.set(0,0,-1);camera.position.copy(center).add(new THREE.Vector3(0,2,0));camera.lookAt(center);
 try{
  renderer.setRenderTarget(target);renderer.setViewport(0,0,4,4);renderer.setScissorTest(false);renderer.autoClear=false;renderer.setClearColor(0,0);
  const draw=(label,material,expectedAlpha)=>{check();mesh.material=material;renderer.clear(true,true,true);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,2,2,1,1,pixel);check();steps.push({label,alpha:pixel[3],expectedAlpha,program:identity(material),bounds:material===horizon?bounds.toArray():[0,0,0,0]});if(pixel[3]!==expectedAlpha)throw Error('Ground binding raster mismatch: '+label+' alpha='+pixel[3]);};
  draw('resident-before',resident,255);draw('horizon-clipped',horizon,0);draw('resident-after',resident,255);bounds.set(center.x+10,center.z+10,center.x+11,center.z+11);draw('horizon-moved',horizon,255);
  return {passed:true,steps,screenProgramsBefore:screen,sharedGroundClip:world.toon.sharedGroundClip,scope:'Alternating borrowed materials in private 4x4 offscreen raster; records offscreen identities, not assumed same screen variant. Temporary QA horizon bounds restored synchronously; no renderer/simulation replacement.'};
 }finally{
  let restoreError;for(const restore of [()=>bounds.copy(originalBounds),()=>renderer.setRenderTarget(state.target,state.face,state.level),()=>renderer.setViewport(state.viewport),()=>renderer.setScissor(state.scissor),()=>renderer.setScissorTest(state.scissorTest),()=>renderer.setClearColor(state.clear,state.alpha),()=>{renderer.autoClear=state.autoClear;}]){try{restore();}catch(error){restoreError??=error;}}if(restoreError)throw restoreError;
 }
 }finally{try{geometry?.dispose();}finally{try{target?.dispose();}finally{scene?.clear();}}}
}
