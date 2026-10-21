import * as THREE from 'three';
import {standardDepthMaterial} from '/src/rendering/standard-depth.js';
export function installIsolatedFadeDepth(w){
 const renderer=w.renderer,original=renderer.render,entries=new Map();let busy=false,draws=0;
 const size=new THREE.Vector2();
 renderer.render=function(scene,camera){
  if(scene!==w.scene||busy||w.qaIsolatedFadeDepth?.enabled===false)return original.call(this,scene,camera);
  const target=renderer.getRenderTarget(),auto=renderer.autoClear,shadow=renderer.shadowMap.enabled;
  renderer.getDrawingBufferSize(size);scene.updateMatrixWorld(true);busy=true;
  try{
   for(const g of w.assetGroups.colors.values())for(const fade of g.smoothFades??[]){
    if(!fade.visible)continue;
    let e=entries.get(fade);
    if(!e){
     const base=fade.userData.qaDepthSource,source=standardDepthMaterial(base);if(!source)throw Error('No isolated fade depth recipe');
     const material=source.clone();material.onBeforeCompile=(shader,r)=>{source.onBeforeCompile(shader,r);shader.fragmentShader=shader.fragmentShader.replace('if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}','if(vNativeVisibility<.002)discard;')};material.customProgramCacheKey=()=>source.customProgramCacheKey()+'|isolated-fade';material.side=THREE.FrontSide;
     const rt=new THREE.WebGLRenderTarget(size.x,size.y,{depthTexture:new THREE.DepthTexture(size.x,size.y,THREE.UnsignedIntType)});
     const mesh=new THREE.InstancedMesh(fade.geometry,material,1);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;const isolated=new THREE.Scene();isolated.add(mesh);
     const uniform={value:rt.depthTexture},resolution={value:size.clone()},compile=fade.material.onBeforeCompile,key=fade.material.customProgramCacheKey.bind(fade.material);
     fade.material.onBeforeCompile=(shader,r)=>{compile(shader,r);shader.uniforms.uQaIsolatedDepth=uniform;shader.uniforms.uQaIsolatedResolution=resolution;shader.fragmentShader='uniform sampler2D uQaIsolatedDepth;uniform vec2 uQaIsolatedResolution;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(gl_FragCoord.z>texture2D(uQaIsolatedDepth,gl_FragCoord.xy/uQaIsolatedResolution).r+0.0000002)discard;')};fade.material.customProgramCacheKey=()=>key()+'|isolated-nearest-surface-v1';fade.material.needsUpdate=true;
     e={rt,mesh,material,isolated,resolution};entries.set(fade,e);
     fade.material.addEventListener('dispose',()=>{rt.dispose();material.dispose();mesh.dispose();entries.delete(fade)});
    }
    if(e.rt.width!==size.x||e.rt.height!==size.y){e.rt.setSize(size.x,size.y);e.resolution.value.copy(size)}
    e.mesh.matrix.copy(fade.matrixWorld);e.mesh.instanceMatrix.array.set(fade.instanceMatrix.array);e.mesh.instanceMatrix.needsUpdate=true;
    renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setRenderTarget(e.rt);original.call(renderer,e.isolated,camera);draws++;
   }
  }finally{renderer.setRenderTarget(target);renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;busy=false;}
  return original.call(this,scene,camera);
 };
 return w.qaIsolatedFadeDepth={enabled:true,audit:()=>({targets:entries.size,depthDraws:draws,width:size.x,height:size.y})};
}
