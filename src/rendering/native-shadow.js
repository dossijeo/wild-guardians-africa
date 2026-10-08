import * as THREE from 'three';
import {ShadowCache,shadowSnapshot} from './shadow-cache.js';
import {nativeShadowFunctions} from './native-shadow-source.js';

export function createNativeShadowUniforms(){
  // An active sampler2DShadow requires a valid comparison texture even when
  // the uniform branch disables shadows. Three's null placeholder is RGBA.
  const fallback=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);fallback.compareFunction=THREE.LessEqualCompare;fallback.needsUpdate=true;
  const uniforms={uNativeShadowFiltered:{value:fallback},uNativeLightVP:{value:new THREE.Matrix4()},uNativeShadowOn:{value:0},uNativeShadowTexel:{value:1/1024},uNativeShadowLight:{value:new THREE.Vector3()}};
  Object.defineProperty(uniforms,'fallback',{value:fallback});return uniforms;
}

export function ensureNativeShadowTarget(light){
  const shadow=light.shadow;
  if(shadow.map?.depthTexture)return shadow.map;
  shadow.map?.dispose();
  const size=shadow.mapSize,depth=new THREE.DepthTexture(size.x,size.y,THREE.UnsignedIntType);
  depth.format=THREE.DepthFormat;depth.internalFormat='DEPTH_COMPONENT24';depth.compareFunction=THREE.LessEqualCompare;
  depth.minFilter=depth.magFilter=THREE.LinearFilter;depth.wrapS=depth.wrapT=THREE.ClampToEdgeWrapping;
  // DEST still reads Three's packed-color depth. The same geometry also writes
  // the depth attachment used by the native hardware-comparison PCF sampler.
  const target=new THREE.WebGLRenderTarget(size.x,size.y,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:depth});
  target.texture.name='native_shadow_packed';depth.name='native_shadow_depth24';shadow.map=target;return target;
}

export function updateNativeShadowUniforms(uniforms,renderer,light){
  const shadow=light.shadow;uniforms.uNativeShadowOn.value=renderer.shadowMap.enabled&&light.castShadow&&shadow.map?.depthTexture?1:0;
  uniforms.uNativeShadowFiltered.value=shadow.map?.depthTexture??uniforms.fallback;
  uniforms.uNativeShadowTexel.value=1/shadow.mapSize.x;
  uniforms.uNativeLightVP.value.multiplyMatrices(shadow.camera.projectionMatrix,shadow.camera.matrixWorldInverse);
  uniforms.uNativeShadowLight.value.copy(light.position).sub(light.target.position).normalize();
}

export function installNativeShadow(renderer,light,uniforms){
  let map=renderer.shadowMap,original=map.render;const cache=new ShadowCache();
  const canvas=renderer.domElement,reset=()=>cache.invalidate();
  const restore=()=>{reset();const next=renderer.shadowMap;if(next===map)return;if(map.render===render)map.render=original;map=next;original=map.render;map.render=render;};
  canvas?.addEventListener('webglcontextlost',reset);canvas?.addEventListener('webglcontextrestored',restore);
  function render(lights,scene,camera){
    const active=map.enabled&&(map.autoUpdate||map.needsUpdate)&&lights.includes(light)&&light.castShadow&&(light.shadow.autoUpdate||light.shadow.needsUpdate);
    if(!active){updateNativeShadowUniforms(uniforms,renderer,light);return original.call(this,lights,scene,camera);}
    ensureNativeShadowTarget(light);
    const snapshot=cache.enabled&&lights.length===1?shadowSnapshot(renderer,light,scene,camera):null;
    if(cache.enabled&&cache.matches(snapshot,map.needsUpdate||light.shadow.needsUpdate)){
      cache.stats.hits++;updateNativeShadowUniforms(uniforms,renderer,light);return;
    }
    cache.invalidate();
    const originalDraw=renderer.renderBufferDirect,materials=new Map();
    function draw(...args){const material=args[3];if(!materials.has(material))materials.set(material,[material.polygonOffset,material.polygonOffsetFactor,material.polygonOffsetUnits]);material.polygonOffset=true;material.polygonOffsetFactor=material.polygonOffsetUnits=1;return originalDraw.apply(this,args);}
    renderer.renderBufferDirect=draw;
    try{const result=original.call(this,lights,scene,camera);cache.commit(snapshot);return result;}
    finally{if(renderer.renderBufferDirect===draw)renderer.renderBufferDirect=originalDraw;for(const [material,saved] of materials)[material.polygonOffset,material.polygonOffsetFactor,material.polygonOffsetUnits]=saved;updateNativeShadowUniforms(uniforms,renderer,light);}
  }
  map.render=render;let released=false;
  const release=()=>{if(released)return;released=true;canvas?.removeEventListener('webglcontextlost',reset);canvas?.removeEventListener('webglcontextrestored',restore);cache.invalidate();if(map.render===render)map.render=original;uniforms.uNativeShadowOn.value=0;uniforms.uNativeShadowFiltered.value=null;uniforms.fallback.dispose();};
  release.cache=cache;return release;
}

// Apply the same visibility to the Standard direct-light term and cel grading.
// Three's other light types retain their existing shadow implementations.
export function patchNativeShadow(shader,uniforms,worldPosition){
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=nativeShadowFunctions+'\n'+shader.fragmentShader;
  const lights=THREE.ShaderChunk.lights_fragment_begin.replace('getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )','nativeDirectVisibility');
  // Derivatives must be evaluated before the per-light visible branch.
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',`float nativeDirectVisibility=1.-nativeShadowOcclusion(inverseTransformDirection(normal,viewMatrix),${worldPosition});\n`+lights);
}
