import * as THREE from 'three';

// A command is acknowledged only after its mesh participated in the main
// camera's draw. Shadow and pipeline-preparation passes do not count.
export function createCropFrameTracker(camera){
 if(!camera?.isCamera)throw TypeError('Invalid crop frame camera');
 const watches=new Map(),drawn=new Set(),position=new THREE.Vector3();let inMainDraw=false;
 return {
  watch(id){if(typeof id!=='string'||!id)throw TypeError('Invalid crop frame ID');watches.set(id,null);},
  target(id,target){if(watches.has(id)&&typeof target==='string'&&target)watches.set(id,target);},
  forget(id){watches.delete(id);drawn.delete(id);},
  has(id){return watches.has(id);},
  destroyed(target){for(const [id,value] of watches)if(value===target)this.forget(id);},
  beginFrame(){drawn.clear();inMainDraw=false;},
  startMainDraw(){inMainDraw=true;},
  endMainDraw(){inMainDraw=false;},
  drawn(renderCamera,entries){if(!inMainDraw||renderCamera!==camera)return;for(const entry of entries){if(!entry||![entry.x,entry.y,entry.z].every(Number.isFinite))continue;position.set(entry.x,entry.y+.1,entry.z).project(camera);if(position.z< -1||position.z>1||Math.abs(position.x)>1||Math.abs(position.y)>1)continue;for(const [id,target] of watches)if(entry.id===`provisional-${id}`||target&&entry.id===target)drawn.add(id);}},
  rendered(id){return drawn.has(id);},
  clear(){watches.clear();drawn.clear();}
 };
}
