import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DoubleSide} from 'three';
// Replace one existing native slot; do not add instances or an overlay layer.
export async function applyNativeShortGrass(world){
 const gltf=await new GLTFLoader().loadAsync('/docs/qa/global-visual-lab/native-short-grass/native-short-grass.glb');
 gltf.scene.updateMatrixWorld(true);
 const source=world.prototypes[8][0].material,material=source.clone();
 material.map=material.normalMap=material.roughnessMap=material.metalnessMap=null;
 material.vertexColors=true;material.alphaTest=0;material.roughness=.95;material.metalness=0;material.side=DoubleSide;
 material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=()=>source.customProgramCacheKey()+'|qa-native-short-grass';
 // The copied hook already contains AfricanToon; registering must not wrap it twice.
 world.toon.materials.add(material);material.needsUpdate=true;
 const lods=[];
 for(let i=0;i<3;i++){
  const mesh=gltf.scene.getObjectByName('ShortGrass_LOD'+i);if(!mesh)throw Error('Missing grass LOD '+i);
  const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const b=geometry.boundingBox;if(b.min.y<-.001||b.max.y>.451||b.min.x<-.546||b.max.x>.546||b.min.z<-.491||b.max.z>.491)throw Error('Grass exceeds original slot bounds');
  world.prototypes[8][i].geometry=geometry;world.prototypes[8][i].material=material;lods.push(geometry);
 }
 const changed=[];
 world.scene.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.nativeLodBatch?.slot===8){const level=mesh.userData.nativeLodLevel;mesh.geometry=lods[level];mesh.material=material;mesh.boundingBox=mesh.boundingSphere=null;world.materialRegistry.refresh(mesh);const batch=mesh.userData.nativeLodBatch;batch.shadow.geometry=lods[2];batch.shadow.material=material;changed.push({level,instances:mesh.count});}});
 // Merged draw groups cache private geometry views by slot/LOD, not source ID.
 // Retire this slot so the first fixed-camera frame actually uses the study.
 const retired=[];for(const key of [...world.assetGroups.colors.keys()])if(key.startsWith('8:')){world.assetGroups.retire(world.assetGroups.colors,key);retired.push(key);}
 return {slot:8,changed,retiredMergedGroups:retired,lods:lods.map(g=>({triangles:(g.index?.count??g.attributes.position.count)/3,bytes:Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength??0),min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()})),addedInstances:0,sourceMapsRetainedForOtherSlots:true};
}
