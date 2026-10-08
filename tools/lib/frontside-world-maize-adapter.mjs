// Explicit QA-only installation. Nothing in the production app imports this.
import * as THREE from 'three';
import {sharedLeafReverseGeometry,preserveSharedLeafBackRecipe} from './frontside-shared-leaf-reverse.mjs';
export function installWorldMaizeQaAdapter(world,payload){
 const descriptor=Object.getOwnPropertyDescriptor(world,'cropBatch');
 if(!descriptor?.configurable||!('value' in descriptor)||!world.cropBatch||!world.scene||payload.mesh!=='maiz_05_maduro')throw Error('Unsupported loaded WorldScene QA contract');
 let current=world.cropBatch,active=null,closed=false;const events=[];
 function release(record){
  if(!record||record.released)return;record.released=true;
  record.mesh.geometry=record.originalGeometry;record.mesh.material=record.originalMaterial;
  if(record.excluded===undefined)delete record.mesh.userData.materialRegistryExcluded;else record.mesh.userData.materialRegistryExcluded=record.excluded;
  world.materialRegistry?.attach(record.mesh);record.batch.dispose=record.originalDispose;
  record.geometry.dispose();record.materials.forEach(m=>m.dispose());if(active===record)active=null;
  events.push({event:'restored',capacity:record.batch.capacity});
 }
 function apply(batch){
  if(closed||!batch)throw Error('Closed/missing QA crop batch');
  const matches=world.scene.children.filter(mesh=>mesh.isInstancedMesh&&mesh.name===payload.mesh);
  if(matches.length!==1)throw Error('Expected exactly one native mature maize batch');
  const mesh=matches[0],originalGeometry=mesh.geometry,originalMaterial=mesh.material;
  if(Array.isArray(originalMaterial)||!originalMaterial.isMeshStandardMaterial)throw Error('Unexpected native crop material');
  const result=sharedLeafReverseGeometry(originalGeometry,payload),materials=[];
  try{for(let part=0;part<3;part++){const m=originalMaterial.clone();m.onBeforeCompile=originalMaterial.onBeforeCompile;m.customProgramCacheKey=originalMaterial.customProgramCacheKey;m.side=THREE.FrontSide;m.defines={...m.defines,DOUBLE_SIDED:''};m.shadowSide=THREE.DoubleSide;if(part===2)preserveSharedLeafBackRecipe(m);materials.push(m);}}
  catch(error){result.geometry.dispose();materials.forEach(m=>m.dispose());throw error;}
  const record={mesh,batch,geometry:result.geometry,materials,originalGeometry,originalMaterial,originalDispose:batch.dispose,excluded:mesh.userData.materialRegistryExcluded,released:false};
  // Source has already been wrapped when the native batch entered the registry.
  // Re-observing these clones would wrap that inherited shader a second time.
  world.materialRegistry?.detach(mesh);mesh.userData.materialRegistryExcluded=true;mesh.geometry=result.geometry;mesh.material=materials;
  batch.dispose=function(...args){release(record);return record.originalDispose.apply(this,args);};active=record;
  events.push({event:'installed',capacity:batch.capacity,vertices:result.uniqueVertices,triangles:result.geometry.index.count/3,attributeBytes:result.attributeBytes,indexBytes:result.indexBytes,liveGrowthShared:result.geometry.getAttribute('iGrowth')===originalGeometry.getAttribute('iGrowth')});
 }
 apply(current);
 Object.defineProperty(world,'cropBatch',{configurable:true,enumerable:descriptor.enumerable,get:()=>current,set:batch=>{if(active)release(active);current=batch;apply(batch);}});
 return {
  events,
  snapshot(){return{status:'QA_WORLD_MAIZE_ONLY_NOT_PRODUCTION_APPROVAL',closed,capacity:current?.capacity,matureCount:active?.mesh.count??0,matureVisible:active?.mesh.visible??false,groups:active?.geometry.groups.map(g=>({...g}))??[],materialSides:active?.materials.map(m=>m.side)??[],shadowSides:active?.materials.map(m=>m.shadowSide)??[],events:events.map(e=>({...e}))};},
  dispose(){if(closed)return;release(active);closed=true;Object.defineProperty(world,'cropBatch',{...descriptor,value:current});events.push({event:'adapter-uninstalled'});}
 };
}
