import * as THREE from 'three';

// Bioma Lab V4.0 terrain renderer: direction, 8-unit focus grid and the
// updateLight(150, focus) projection. The menu owns its independent renderer.
export const NATIVE_LIGHT_DIRECTION=new THREE.Vector3(-.82,.52,.31).normalize();
export const nativeShadowSize=quality=>quality==='alta'?2048:['baja','muy_baja'].includes(quality)?768:1024;

export function configureShadowCamera(light){
  const camera=light.shadow.camera;camera.left=camera.bottom=-75;camera.right=camera.top=75;camera.near=.1;camera.far=540;camera.updateProjectionMatrix();
}

export function updateShadowCamera(light,target){
  const x=Math.round(target.x/8)*8,z=Math.round(target.z/8)*8,key=x+','+z;
  if(light.userData.nativeShadowFocus===key)return false;
  light.target.position.set(x,0,z);light.position.copy(light.target.position).addScaledVector(NATIVE_LIGHT_DIRECTION,240);
  light.userData.nativeShadowFocus=key;light.shadow.needsUpdate=true;return true;
}

export function resizeShadowMap(light,quality){
  const size=nativeShadowSize(quality),shadow=light.shadow;
  if(shadow.mapSize.x===size&&shadow.mapSize.y===size)return false;
  // Three 0.180 only allocates its render target when map===null. Changing
  // mapSize alone leaves the existing texture at the previous resolution.
  shadow.map?.dispose();shadow.map=null;shadow.mapPass?.dispose();shadow.mapPass=null;
  shadow.mapSize.set(size,size);shadow.needsUpdate=true;return true;
}
