import * as THREE from 'three';

// Terrain-mode resize from Bioma Lab V4.0. The fourth game profile shares
// eco's DPR cap but additionally selects the unlit ground material.
export function nativeRenderResolution(width,height,deviceRatio,quality,pixelRatioLimit=Infinity){
  if(!(pixelRatioLimit>0))throw new RangeError('Pixel ratio limit must be positive');
  const dpr=Math.min(deviceRatio||1,['baja','muy_baja'].includes(quality)?1:quality==='alta'?2:1.5,pixelRatioLimit);
  const cap=Math.min(1,Math.sqrt(2600000/Math.max(1,width*height*dpr*dpr))),actual=dpr*cap;
  return {width:Math.max(1,Math.round(width*actual)),height:Math.max(1,Math.round(height*actual)),dpr:actual,cssWidth:width,cssHeight:height};
}

export function nativeGroundMaterial(quality){
  const material=quality==='muy_baja'?new THREE.MeshBasicMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  Object.assign(material.userData,{toonGround:true,nativeGroundColor:true});return material;
}

export function updateGroundQuality(meshes,quality,onMaterialChange=null){
  const basic=quality==='muy_baja',replacements=new Map();
  for(const mesh of meshes){
    const old=mesh.material;if(!!old.isMeshBasicMaterial===basic)continue;
    if(!replacements.has(old)){const material=nativeGroundMaterial(quality);Object.assign(material.userData,old.userData);replacements.set(old,material);}
    mesh.material=replacements.get(old);onMaterialChange?.(mesh);
  }
  for(const old of replacements.keys())old.dispose();return replacements.size;
}
