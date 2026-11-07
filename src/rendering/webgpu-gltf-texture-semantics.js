import {NoColorSpace,LinearSRGBColorSpace} from 'three';

// KTX2 declares linear color space for data maps whereas ordinary glTF images
// use NoColorSpace. Canonicalize those equivalent raw-data bindings before
// pipeline preparation, never while replacing a published texture.
export function normalizeGltfDataTextures(materials,own=()=>{}){
 const colors=new Set(materials.flatMap(material=>[material.map,material.emissiveMap,material.sheenColorMap,material.specularColorMap]).filter(Boolean));
 const clones=new Map();
 for(const material of materials)for(const [key,texture] of Object.entries(material)){
  if(!texture?.isTexture||['map','emissiveMap','sheenColorMap','specularColorMap'].includes(key))continue;
  if(texture.colorSpace!==LinearSRGBColorSpace)continue;
  let data=texture;
  if(colors.has(texture)){data=clones.get(texture);if(!data){data=texture.clone();clones.set(texture,data);own(data);}material[key]=data;}
  data.colorSpace=NoColorSpace;
 }
}

// GLTFLoader caches images by URI + sampler. Reusing a single placeholder URI
// aliases unrelated base-color and normal maps and contaminates their layouts.
export function placeholderImageUri(pixel,index){return `${pixel}#wg-image-${index}`;}
