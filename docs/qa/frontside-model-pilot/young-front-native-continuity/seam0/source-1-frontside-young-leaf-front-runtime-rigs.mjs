// Isolated young shared-reverse Front candidate, source controls untouched.
import * as THREE from 'three';
import {createCropBatch} from '../../src/rendering/crop-batch.js';
import {sharedLeafReverseGeometry,preserveSharedLeafBackRecipe} from './frontside-shared-leaf-reverse.mjs';
export function createYoungLeafFrontRuntimeRigs({scene,renderer,gltf,bridges,payload,capacity,scope,wrapSourceMaterials}){
 const rigs=[];function disposeOwned(geometry,source){for(const[name,a]of Object.entries(geometry.attributes))if(a===source.getAttribute(name))geometry.deleteAttribute(name);geometry.dispose();}
 for(let arm=0;arm<4;arm++){const group=new THREE.Group(),batch=createCropBatch(group,renderer,gltf,bridges,capacity);scope.defer('crop batch '+arm,()=>batch.dispose());scene.add(group);const target=group.getObjectByName(payload.mesh);if(!target?.isInstancedMesh)throw Error('Young source mesh missing');rigs.push({arm,group,batch,target});}
 wrapSourceMaterials();const resources=[];
 for(const {arm,target} of rigs){const source=target.geometry,original=target.material;
  if(arm===1){const indexed=source.clone();for(const [name,attribute] of Object.entries(source.attributes))if(attribute.isInstancedBufferAttribute)indexed.setAttribute(name,attribute);scope.defer('indexed control '+arm,()=>disposeOwned(indexed,source));target.geometry=indexed;}
  if(arm>=2){const result=sharedLeafReverseGeometry(source,payload,{reverseLeaves:arm===3});scope.defer('derived geometry '+arm,()=>disposeOwned(result.geometry,source));target.geometry=result.geometry;
   if(arm===3){const materials=[0,1,2].map(part=>{const material=original.clone();material.onBeforeCompile=original.onBeforeCompile;material.customProgramCacheKey=original.customProgramCacheKey;material.side=THREE.FrontSide;material.defines={...material.defines,DOUBLE_SIDED:''};material.shadowSide=THREE.DoubleSide;if(part===2)preserveSharedLeafBackRecipe(material);scope.defer('derived material '+part,()=>material.dispose());return material;});target.material=materials;target.userData.materialRegistryExcluded=true;scope.defer('restore source material',()=>{target.material=original;});}
   resources.push({arm,vertices:result.uniqueVertices,triangles:result.geometry.index.count/3,attributeBytes:result.attributeBytes,indexBytes:result.indexBytes,groups:result.geometry.groups,liveGrowthShared:result.geometry.getAttribute('iGrowth')===source.getAttribute('iGrowth')});
  }
 }
 return {rigs,resources,select(arm){scope.assertOpen();if(!Number.isInteger(arm)||arm<0||arm>=rigs.length)throw Error('Invalid runtime arm');rigs.forEach((rig,i)=>rig.group.visible=i===arm);}};
}

