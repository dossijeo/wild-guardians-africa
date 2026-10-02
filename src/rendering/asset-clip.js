import * as THREE from 'three';

// Bioma Lab V4.0 main FS: minima included, maxima excluded. Its solid shadow
// pass deliberately has no clipping. World bounds travel with each instance,
// allowing the atlas material to remain shared across adjacent chunks.
export const nativeAssetClipFragment=`if(uNativeClip>.5){bool within=vNativeClipWorld.x>=vNativeClipBounds.x&&vNativeClipWorld.z>=vNativeClipBounds.y&&vNativeClipWorld.x<vNativeClipBounds.z&&vNativeClipWorld.z<vNativeClipBounds.w;if((uNativeClip<1.5&&!within)||(uNativeClip>1.5&&within))discard;}`;
export const nativeAssetClipRequired=(slot,biome)=>slot===19&&!['gran-canon','desierto'].includes(biome);

export function assetClipGeometry(source,bounds,capacity){
  const geometry=new THREE.BufferGeometry();
  // Own attribute identities so unloading one chunk cannot delete a borrowed
  // vertex buffer belonging to another chunk or the detached shadow proxy.
  if(source.index)geometry.setIndex(new THREE.BufferAttribute(source.index.array,source.index.itemSize,source.index.normalized));
  for(const [key,a] of Object.entries(source.attributes))geometry.setAttribute(key,new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
  geometry.groups=source.groups.map(g=>({...g}));geometry.drawRange={...source.drawRange};
  geometry.boundingBox=source.boundingBox?.clone()??null;geometry.boundingSphere=source.boundingSphere?.clone()??null;
  const array=new Float32Array(capacity*4);for(let i=0;i<capacity;i++)array.set(bounds,i*4);
  geometry.setAttribute('nativeClipBounds',new THREE.InstancedBufferAttribute(array,4));geometry.userData.nativeChunkClip=true;
  return geometry;
}

export function assetClipMaterial(material){
  if(material.userData.nativeChunkClip)return;
  const uniform={value:1};material.userData.nativeChunkClip=uniform;
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.defaultAttributeValues={...material.defaultAttributeValues,nativeClipBounds:[-1e8,-1e8,1e8,1e8]};
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);shader.uniforms.uNativeClip=uniform;
    shader.vertexShader='attribute vec4 nativeClipBounds;varying vec4 vNativeClipBounds;varying vec3 vNativeClipWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 nativeClipPosition=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        nativeClipPosition=instanceMatrix*nativeClipPosition;
      #endif
      vNativeClipWorld=(modelMatrix*nativeClipPosition).xyz;vNativeClipBounds=nativeClipBounds;`);
    shader.fragmentShader='varying vec4 vNativeClipBounds;varying vec3 vNativeClipWorld;uniform float uNativeClip;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+nativeAssetClipFragment);
  };
  material.customProgramCacheKey=()=>cache()+'|native-chunk-clip';material.needsUpdate=true;
}
