import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {texture,uniform,uv} from 'three/tsl';

// Experimental fallback only. Unsupported material recipes retain their own
// faithful fallback; no source material, texture or geometry is modified.
export function createSharedCharacterFallback(seedSource){
 const parameters=new WeakMap(),white=new THREE.Color(1,1,1);
 const seedMap=seedSource.map,hasMap=!!seedMap;
 const map=hasMap?texture(seedMap,uv()).onObjectUpdate(({object})=>parameters.get(object)?.map??seedMap):null;
 const tint=uniform(white).onObjectUpdate(({object})=>parameters.get(object)?.color??white);
 const roughness=uniform(1).onObjectUpdate(({object})=>parameters.get(object)?.roughness??1);
 const metalness=uniform(0).onObjectUpdate(({object})=>parameters.get(object)?.metalness??0);
 const material=new MeshStandardNodeMaterial();material.name='QA shared fallback';material.side=seedSource.side;material.vertexColors=seedSource.vertexColors;material.colorNode=hasMap?map.rgb.mul(tint):tint;material.roughnessNode=roughness;material.metalnessNode=metalness;
 function supports(object,source){
  const image=source?.map;
  const compatibleMap=!hasMap?!image:!!(object?.geometry?.getAttribute('uv')&&image?.isTexture&&image.colorSpace===THREE.SRGBColorSpace&&image.channel===0&&image.offset.x===0&&image.offset.y===0&&image.repeat.x===1&&image.repeat.y===1&&image.rotation===0);
  return !!(source?.type==='MeshStandardMaterial'&&compatibleMap&&source.side===seedSource.side&&source.vertexColors===seedSource.vertexColors&&(!source.vertexColors||object?.geometry?.getAttribute('color'))&&!source.transparent&&source.opacity===1&&!source.alphaTest&&!source.flatShading&&source.depthTest&&source.depthWrite&&source.colorWrite&&source.toneMapped&&!source.alphaMap&&!source.aoMap&&!source.bumpMap&&!source.displacementMap&&!source.emissiveMap&&!source.envMap&&!source.lightMap&&!source.metalnessMap&&!source.roughnessMap&&source.emissive?.r===0&&source.emissive?.g===0&&source.emissive?.b===0);
 }
 return {material,supports,bind(object,source){if(!supports(object,source))return false;parameters.set(object,{map:source.map,color:source.color.clone(),roughness:source.roughness,metalness:source.metalness});return true;},parameters(object){return parameters.get(object);},release(object){parameters.delete(object);},dispose(){material.dispose();}};
}
