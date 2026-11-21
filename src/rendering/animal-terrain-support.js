import {Vector3} from 'three';
import {BeastRecovery} from './beast-recovery.js';
const cache=new WeakMap(),point=new Vector3();
export function animalFootSamples(model){
 let samples=cache.get(model);if(samples)return samples;
 samples=BeastRecovery.contactSamples(model).filter(({mesh,index})=>{
  const {skinIndex,skinWeight}=mesh.geometry.attributes;let foot=0;
  for(let k=0;k<4;k++)if(/(?:Foot|ToeBase)$/.test(mesh.skeleton.bones[skinIndex.getComponent(index,k)].name))foot+=skinWeight.getComponent(index,k);
  return foot>.5;
 });
 // Walking feet need the lower support envelope. Select nine downward-facing
 // extrema per bone from the existing candidates; retain separate mesh groups.
 const groups=new Map();for(const sample of samples){const {mesh,index}=sample,a=mesh.geometry.attributes;let best=0;for(let k=1;k<4;k++)if(a.skinWeight.getComponent(index,k)>a.skinWeight.getComponent(index,best))best=k;const bone=mesh.skeleton.bones[a.skinIndex.getComponent(index,best)];let byBone=groups.get(mesh);if(!byBone){byBone=new Map();groups.set(mesh,byBone);}let extrema=byBone.get(bone);if(!extrema){extrema=Array.from({length:9},()=>({score:-Infinity,sample:null}));byBone.set(bone,extrema);}let slot=0;for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){const score=x*a.position.getX(index)-a.position.getY(index)+z*a.position.getZ(index),e=extrema[slot++];if(score>e.score){e.score=score;e.sample=sample;}}}
 const chosen=new Set();for(const byBone of groups.values())for(const extrema of byBone.values())for(const e of extrema)chosen.add(e.sample);
 samples=[...chosen];cache.set(model,samples);return samples;
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
