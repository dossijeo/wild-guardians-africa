// Explicit QA-only installation. Nothing in the production app imports this.
import * as THREE from 'three';
import {sharedLeafReverseGeometry,preserveSharedLeafBackRecipe} from './frontside-shared-leaf-reverse.mjs';
export function installWorldYoungMaizeQaAdapter(world,payload,{worldDepth=false}={}){
 const descriptor=Object.getOwnPropertyDescriptor(world,'cropBatch');
 if(!descriptor?.configurable||!('value' in descriptor)||!world.cropBatch||!world.scene||payload.mesh!=='maiz_02_joven')throw Error('Unsupported loaded WorldScene QA contract');
 let current=world.cropBatch,active=null,closed=false;const events=[];
 function disposeOwnedGeometry(geometry,source){
  // Three's WebGLGeometries disposal removes every attached attribute buffer.
  // Borrowed native attributes must remain owned by the source geometry.
  for(const [name,attribute] of Object.entries(geometry.attributes))if(attribute===source.getAttribute(name))geometry.deleteAttribute(name);
  geometry.dispose();
 }
 function release(record){
  if(!record||record.released)return;record.released=true;
  record.mesh.geometry=record.originalGeometry;record.mesh.material=record.originalMaterial;
  if(record.excluded===undefined)delete record.mesh.userData.materialRegistryExcluded;else record.mesh.userData.materialRegistryExcluded=record.excluded;
  if(record.hadWorldDepth)record.mesh.customWorldDepthMaterial=record.originalWorldDepth;else delete record.mesh.customWorldDepthMaterial;
  world.materialRegistry?.attach(record.mesh);record.batch.dispose=record.originalDispose;
  disposeOwnedGeometry(record.geometry,record.originalGeometry);record.materials.forEach(m=>m.dispose());record.worldDepth?.dispose();if(active===record)active=null;
  events.push({event:'restored',capacity:record.batch.capacity});
 }
 function apply(batch){
  if(closed||!batch)throw Error('Closed/missing QA crop batch');
  const matches=world.scene.children.filter(mesh=>mesh.isInstancedMesh&&mesh.name===payload.mesh);
  if(matches.length!==1)throw Error('Expected exactly one native young maize batch');
  const mesh=matches[0],originalGeometry=mesh.geometry,originalMaterial=mesh.material;
  if(Array.isArray(originalMaterial)||!originalMaterial.isMeshStandardMaterial)throw Error('Unexpected native crop material');
  const sourceDepth=mesh.customDepthMaterial;if(worldDepth&&(!sourceDepth?.isMeshDepthMaterial||!sourceDepth.userData.worldDepthCompatible))throw Error('Missing authored native growth depth contract');
  const result=sharedLeafReverseGeometry(originalGeometry,payload),materials=[];
  try{for(let part=0;part<3;part++){const m=originalMaterial.clone();m.onBeforeCompile=originalMaterial.onBeforeCompile;m.customProgramCacheKey=originalMaterial.customProgramCacheKey;m.side=THREE.FrontSide;m.defines={...m.defines,DOUBLE_SIDED:''};m.shadowSide=THREE.DoubleSide;if(part===2)preserveSharedLeafBackRecipe(m);materials.push(m);}}
  catch(error){disposeOwnedGeometry(result.geometry,originalGeometry);materials.forEach(m=>m.dispose());throw error;}
  let authoredWorldDepth=null;if(worldDepth){authoredWorldDepth=sourceDepth.clone();authoredWorldDepth.userData={...sourceDepth.userData};authoredWorldDepth.onBeforeCompile=sourceDepth.onBeforeCompile;authoredWorldDepth.customProgramCacheKey=sourceDepth.customProgramCacheKey;authoredWorldDepth.side=THREE.FrontSide;authoredWorldDepth.needsUpdate=true;}
  const record={mesh,batch,geometry:result.geometry,materials,worldDepth:authoredWorldDepth,hadWorldDepth:Object.hasOwn(mesh,'customWorldDepthMaterial'),originalWorldDepth:mesh.customWorldDepthMaterial,originalGeometry,originalMaterial,originalDispose:batch.dispose,excluded:mesh.userData.materialRegistryExcluded,released:false};
  // Source has already been wrapped when the native batch entered the registry.
  // Re-observing these clones would wrap that inherited shader a second time.
  world.materialRegistry?.detach(mesh);mesh.userData.materialRegistryExcluded=true;mesh.geometry=result.geometry;mesh.material=materials;if(authoredWorldDepth)mesh.customWorldDepthMaterial=authoredWorldDepth;
  batch.dispose=function(...args){release(record);return record.originalDispose.apply(this,args);};active=record;
  events.push({event:'installed',capacity:batch.capacity,vertices:result.uniqueVertices,triangles:result.geometry.index.count/3,attributeBytes:result.attributeBytes,indexBytes:result.indexBytes,liveGrowthShared:result.geometry.getAttribute('iGrowth')===originalGeometry.getAttribute('iGrowth')});
 }
 apply(current);
 Object.defineProperty(world,'cropBatch',{configurable:true,enumerable:descriptor.enumerable,get:()=>current,set:batch=>{if(active)release(active);current=batch;apply(batch);}});
 return {
  events,
  snapshot(){return{status:'QA_WORLD_YOUNG_MAIZE_ONLY_NOT_PRODUCTION_APPROVAL',closed,authoredWorldDepth:Boolean(active?.worldDepth),worldDepthSide:active?.worldDepth?.side??null,capacity:current?.capacity,youngCount:active?.mesh.count??0,youngVisible:active?.mesh.visible??false,groups:active?.geometry.groups.map(g=>({...g}))??[],materialSides:active?.materials.map(m=>m.side)??[],shadowSides:active?.materials.map(m=>m.shadowSide)??[],events:events.map(e=>({...e}))};},
  dispose(){if(closed)return;release(active);closed=true;Object.defineProperty(world,'cropBatch',{...descriptor,value:current});events.push({event:'adapter-uninstalled'});}
 };
}
