import {treeTransitionRange} from './tree-transition-range.js';
import {treeAtlasAnchor} from './far-tree-sampling.js';
import {lodMix} from './far-impostor-math.js';
// Compose into the native color coverage only; never overwrite logical
// obstruction coverage or change native shadow geometry.
export class NativeFarCoverage {
 constructor(localBase,{start=40,end=60,slot=0,transitionHeight=null,treeHeight=1}={}){if(!(end>start))throw Error('Invalid far transition');this.base=[...localBase];this.start=start;this.end=end;this.slot=slot;this.transitionHeight=transitionHeight;this.treeHeight=treeHeight;this.cache=new WeakMap();this.scans=0;}
 update(chunks,camera,stateFor,revision){
  let uploads=0;
  for(const group of chunks.values())for(const batch of group.userData.lodBatches??[]){
   if(batch.slot!==this.slot||!batch.fade)continue;
   let record=this.cache.get(batch);if(!record){record={anchors:batch.instances.map(t=>treeAtlasAnchor(t,this.base)),ranges:batch.instances.map(t=>treeTransitionRange(t,this.treeHeight,this.start,this.end,this.transitionHeight)),stamp:null};this.cache.set(batch,record);}
   const stamp=[camera.position.x,camera.position.z,revision,batch.fade.attribute.version,batch.key,...batch.meshes.map(m=>m.instanceMatrix.version+':'+m.count)].join('|');if(stamp===record.stamp)continue;this.scans++;
   for(const [level,mesh] of batch.meshes.entries()){
    const attribute=mesh.geometry.attributes.nativeVisibility;let first=Infinity,last=-1;if(!attribute)continue;
    for(const [j,index] of batch.orders[level].entries()){
     const tree=record.anchors[index],state=stateFor(tree.id),base=batch.fade.attribute.getX(index),distance=Math.hypot(camera.position.x-tree.x,camera.position.z-tree.z);
     const value=Math.fround(state?(state.enabled?base*(1-lodMix(distance,...record.ranges[index],state.ready)):0):base);
     if(attribute.getX(j)!==value){attribute.setX(j,value);first=Math.min(first,j);last=j;}
    }
    if(last>=first){attribute.addUpdateRange(first,last-first+1);attribute.needsUpdate=true;uploads++;}
   }
   record.stamp=stamp;
  }
  return uploads;
 }
}
