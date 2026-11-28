import * as THREE from 'three';

// NodeMaterial.copy copies node fields but Three r180 does not copy the
// built-in surface fields of its backing material (map, color, roughness…).
// Copy those fields separately, leaving the already cloned nodes intact.
export function cloneWebGpuNodeMaterial(source){
 if(!source?.isNodeMaterial)throw TypeError('Expected node material');
 const clone=source.clone();
 const type=source.isMeshPhysicalMaterial?THREE.MeshPhysicalMaterial:source.isMeshStandardMaterial?THREE.MeshStandardMaterial:source.isMeshToonMaterial?THREE.MeshToonMaterial:source.isMeshPhongMaterial?THREE.MeshPhongMaterial:source.isMeshLambertMaterial?THREE.MeshLambertMaterial:source.isMeshBasicMaterial?THREE.MeshBasicMaterial:null;
 if(!type){clone.dispose();throw TypeError('Unsupported node material surface');}
 type.prototype.copy.call(clone,source);
 return clone;
}
