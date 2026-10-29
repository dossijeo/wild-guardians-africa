import {Vector3} from 'three';
import {BeastRecovery} from './beast-recovery.js';
const cache=new WeakMap(),point=new Vector3();
export function animalFootSamples(model){
 let samples=cache.get(model);if(samples)return samples;
 samples=BeastRecovery.contactSamples(model).filter(({mesh,index})=>{
  const {skinIndex,skinWeight}=mesh.geometry.attributes;let foot=0;
  for(let k=0;k<4;k++)if(/(?:Foot|ToeBase)$/.test(mesh.skeleton.bones[skinIndex.getComponent(index,k)].name))foot+=skinWeight.getComponent(index,k);
  return foot>.5;
 });cache.set(model,samples);return samples;
}
// Existing animation grounding resets model Y before this call. Apply only the
// extra world-up clearance demanded by terrain under the animated feet.
export function supportAnimalOnTerrain(data,surface){
 const model=data.model,samples=animalFootSamples(model);if(!samples.length)return 0;
 model.updateWorldMatrix(true,true);let lift=0;
 for(const {mesh,index}of samples){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);lift=Math.max(lift,.01+surface(point.x,point.z)-point.y);}
 if(lift>0){model.getWorldPosition(point);point.y+=lift;model.position.copy(model.parent?model.parent.worldToLocal(point):point);model.updateMatrixWorld(true);}
 return lift;
}
