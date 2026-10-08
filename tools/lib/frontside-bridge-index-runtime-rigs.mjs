// Two-arm source-only bridge QA preparation. No production import, FrontSide,
// reverse geometry, labels chosen from views or GPU timing implementation.
import * as THREE from 'three';
import {createCropBatch} from '../../src/rendering/crop-batch.js';
import {installBridgeIndexQaControl} from './frontside-runtime-bridge-index-control.mjs';
export function createBridgeIndexRuntimeRigs({scene,renderer,gltf,bridges,scope,wrapSourceMaterials,capacity=2}){
 const rigs=[];
 for(let arm=0;arm<2;arm++){
  const group=new THREE.Group(),batch=createCropBatch(group,renderer,gltf,bridges,capacity);
  scope.defer('native original bridge batch '+arm,()=>batch.dispose());scene.add(group);
  const target=group.getObjectByName('puente_maiz_3_4');if(!target?.isInstancedMesh)throw Error('Native maize03→04 bridge missing');
  rigs.push({arm,group,batch,target});
 }
 wrapSourceMaterials();
 const control=installBridgeIndexQaControl(rigs[1].target);
 // Cleanup scopes run in reverse registration order. Restore geometry and
 // release only owned buffers before disposing the native source batch.
 scope.defer('restore source indexed bridge control',()=>control.dispose());
 return{
  rigs,control,
  select(arm){scope.assertOpen();if(arm!==0&&arm!==1)throw Error('Expected original or indexed DoubleSide arm');rigs.forEach(r=>r.group.visible=r.arm===arm);},
  update(plants,clock,height){scope.assertOpen();for(const rig of rigs)rig.batch.update(plants,clock,height);},
  snapshot(){return{status:'SOURCE_ONLY_BRIDGE_INDEX_RUNTIME_PREPARATION_NOT_APPROVED',control:control.snapshot(),arms:rigs.map(({arm,target})=>({arm,mesh:target.name,visible:target.visible,count:target.count,materialSide:target.material.side,shadowSide:target.customDepthMaterial.side}))};}
 };
}
