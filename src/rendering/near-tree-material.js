import * as THREE from 'three';
import {recordNativeDepthHook} from './depth-recipes.js';
import {surfaceMapBias} from './surface-alpha.js';

// Both reviewed base maps are opaque. Blend RGB/material values only; the
// original normals, silhouette, shadow proxy and depth recipe stay unchanged.
export function blendNearTreeMaterial(material,original,bounds,near){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 const size=bounds.getSize(new THREE.Vector3()),packed=material.roughnessMap!==original.roughnessMap;
 const uniforms={uNearOriginalColor:{value:original.map},uNearOriginalPacked:{value:original.roughnessMap},uNearRange:{value:new THREE.Vector2(near.blendStart,near.blendEnd)},uNearBounds:{value:new THREE.Vector3((bounds.min.y+bounds.max.y)/2,size.x*.25,size.z*.25)}};
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='uniform vec2 uNearRange;uniform vec3 uNearBounds;varying vec2 vNearOriginalUV;varying float vNearWeight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vNearOriginalUV=uv;
   vec4 nearCenter=vec4(0.,uNearBounds.x,0.,1.);vec2 nearScale=vec2(1.);
   #ifdef USE_INSTANCING
    nearCenter=instanceMatrix*nearCenter;nearScale=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[2].xyz));
   #endif
   nearCenter=modelMatrix*nearCenter;
   float nearDistance=max(0.,distance(nearCenter.xyz,cameraPosition)-max(uNearBounds.y*nearScale.x,uNearBounds.z*nearScale.y));
   vNearWeight=1.-smoothstep(uNearRange.x,uNearRange.y,nearDistance);`);
  shader.fragmentShader='uniform sampler2D uNearOriginalColor,uNearOriginalPacked;varying vec2 vNearOriginalUV;varying float vNearWeight;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment);
  const anchor='diffuseColor *= sampledDiffuseColor;';if(!shader.fragmentShader.includes(anchor))throw Error('Missing near tree color anchor');
  shader.fragmentShader=shader.fragmentShader.replace(anchor,`sampledDiffuseColor.rgb=mix(texture2D(uNearOriginalColor,vNearOriginalUV,${surfaceMapBias(material.userData.nativeSurface).toFixed(2)}).rgb,sampledDiffuseColor.rgb,vNearWeight);\n${anchor}`);
  if(packed){
   shader.fragmentShader=shader.fragmentShader.replace('texture2D(roughnessMap,vRoughnessMapUv)','mix(texture2D(uNearOriginalPacked,vNearOriginalUV),texture2D(roughnessMap,vRoughnessMapUv),vNearWeight)');
   shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',THREE.ShaderChunk.metalnessmap_fragment.replace('texture2D( metalnessMap, vMetalnessMapUv )','mix(texture2D(uNearOriginalPacked,vNearOriginalUV),texture2D( metalnessMap, vMetalnessMapUv ),vNearWeight)'));
  }
 };
 recordNativeDepthHook(material,previous);
 material.customProgramCacheKey=()=>key()+`|near-tree-blend-v1:${packed}`;
}
