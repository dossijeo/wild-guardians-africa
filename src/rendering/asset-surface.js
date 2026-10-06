import * as THREE from 'three';
import {SLOTS} from '../world/terrain.js';
import {describeSurface} from './surface-source.js';
import {recordNativeDepthHook} from './depth-recipes.js';
import {surfaceMapBias,surfaceMapFragment} from './surface-alpha.js';

export function nativeAssetSurface(pack,asset,index){
  return {...asset,group:pack.profile.assetGroups?.[index]??SLOTS[index].g};
}

export function nativeAssetMaterial(pack,asset,index,textures,bounds){
  const surface=describeSurface(nativeAssetSurface(pack,asset,index),0,pack.biomeId),factor=pack.material.baseColorFactor??[1,1,1,1];
  const material=new THREE.MeshStandardMaterial({map:textures.baseColor,normalMap:textures.normal,roughnessMap:textures.metallicRoughness,metalnessMap:textures.metallicRoughness,roughness:surface.params[0],metalness:surface.params[1],alphaTest:.35,opacity:factor[3],side:THREE.DoubleSide});
  material.color.fromArray(factor);material.normalScale.setScalar(pack.material.normalScale??.6);
  material.userData.nativeSurface=surface;
  material.userData.artBounds={min:bounds.min.clone(),size:bounds.getSize(new THREE.Vector3()),crown:nativeAssetSurface(pack,asset,index).group===0?.68:.43};
  const uniforms={uNativeVolcanicGlow:{value:pack.material.volcanicGlow??0},uNativeSurface:{value:new THREE.Vector4(...surface.params)},uNativeMinY:{value:bounds.min.y},uNativeSizeY:{value:bounds.max.y-bounds.min.y}};
  material.userData.nativeVolcanicGlow=uniforms.uNativeVolcanicGlow;
  const previous=material.onBeforeCompile;material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    if(surfaceMapBias(surface))shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',surfaceMapFragment(surface));
    shader.vertexShader='varying float vNativeHeight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNativeHeight=position.y;');
    shader.fragmentShader='varying float vNativeHeight;uniform vec4 uNativeSurface;uniform float uNativeMinY,uNativeSizeY,uNativeVolcanicGlow;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness;
      #ifdef USE_ROUGHNESSMAP
        roughnessFactor=clamp(mix(roughnessFactor,texture2D(roughnessMap,vRoughnessMapUv).g,.26),.24,.98);
      #endif
      vec3 nativeGlowTexel=sRGBTransferOETF(vec4(diffuseColor.rgb,1.)).rgb;
      vec3 nativeTexel=pow(max(diffuseColor.rgb,vec3(0.)),vec3(1./2.2));
      float nativeLeaf=smoothstep(.013,.115,nativeTexel.g-nativeTexel.r*.85)*smoothstep(.028,.12,nativeTexel.g-nativeTexel.b*.85)*uNativeSurface.z;
      roughnessFactor=mix(roughnessFactor,.54,nativeLeaf);
      float nativeRelH=clamp((vNativeHeight-uNativeMinY)/max(uNativeSizeY,.05),0.,1.);
      float nativeWet=uNativeSurface.w*(1.-smoothstep(.04,.3,nativeRelH));
      roughnessFactor=mix(roughnessFactor,.38,nativeWet*.68);
      diffuseColor.rgb*=pow(mix(vec3(1.),vec3(.63,.66,.54),nativeWet*(1.-nativeLeaf*.5)),vec3(2.2));`);
  };
  recordNativeDepthHook(material,previous,'surface');material.customProgramCacheKey=()=> 'native-asset-surface-v4|map-bias='+surfaceMapBias(surface);return material;
}
