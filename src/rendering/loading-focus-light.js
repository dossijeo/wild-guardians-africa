import * as THREE from 'three';

// Presentation-only light falloff, in already existing material/sky-haze draws.
// No texture, buffer, target, additional draw, animation or per-plant work.
export const LOADING_FOCUS_GLSL=`
uniform vec2 uLoadingFocusSize,uLoadingFocusCentre;
uniform float uLoadingFocusAmount,uLoadingFocusNight;
float loadingFocusEdge(){
 vec2 offset=gl_FragCoord.xy/max(uLoadingFocusSize,vec2(1.))-uLoadingFocusCentre;
 offset.x*=uLoadingFocusSize.x/max(1.,uLoadingFocusSize.y);
 return smoothstep(.028,.42,dot(offset,offset));
}
float loadingFocusGain(){
 return mix(1.,mix(1.025,mix(.74,.82,uLoadingFocusNight),loadingFocusEdge()),uLoadingFocusAmount);
}
`;
export class LoadingFocusLight {
 constructor({enabled=true}={}){
  this.enabled=enabled;this.point=new THREE.Vector3();this.direction=new THREE.Vector3();
  this.uniforms={uLoadingFocusSize:{value:new THREE.Vector2(1,1)},uLoadingFocusCentre:{value:new THREE.Vector2(.5,.5)},uLoadingFocusAmount:{value:enabled?1:0},uLoadingFocusNight:{value:0}};
 }
 update(renderer,camera,focus,night){
  renderer.getDrawingBufferSize(this.uniforms.uLoadingFocusSize.value);
  camera.updateMatrixWorld();this.point.copy(focus).project(camera);
  this.uniforms.uLoadingFocusCentre.value.set(Number.isFinite(this.point.x)?.5*(this.point.x+1):.5,Number.isFinite(this.point.y)?.5*(this.point.y+1):.5);
  camera.getWorldDirection(this.direction);
  this.uniforms.uLoadingFocusAmount.value=this.enabled?1-THREE.MathUtils.smoothstep(this.direction.y,.08,.72):0;
  this.uniforms.uLoadingFocusNight.value=night;
 }
 apply(material){
  const compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey(),uniforms=this.uniforms;
  material.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);
   Object.assign(shader.uniforms,uniforms);
   const token='#include <opaque_fragment>';
   if(!shader.fragmentShader.includes(token))throw Error('Missing loading focus material output');
   shader.fragmentShader=LOADING_FOCUS_GLSL+shader.fragmentShader.replace(token,'outgoingLight*=loadingFocusGain();\n'+token);
  };
  material.customProgramCacheKey=()=>cacheKey+'|loading-focus-light-v1';
 }
}
