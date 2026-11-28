import {loadingSyncWitness} from './loading-sync-witness.js';
import {waitLoadingGpuFence} from '../../tools/experiments/wait-loading-gpu-fence.js';
import {loadingYieldBudget} from './loading-yield-budget.js';
import {Vector4} from 'three';
import {withScreenTarget} from './screen-target.js';

// Keep the screen's output/color recipe while submitting buffers and textures.
// A zero viewport prevents color/depth writes; shadow passes retain their own
// viewport. Renderer state is restored before any asynchronous wait.
export function renderScreenPreload(renderer,scene,camera,{pixels=false}={}){
 const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
 try{withScreenTarget(renderer,()=>{renderer.autoClear=false;if(pixels){renderer.setViewport(viewport);renderer.setScissor(viewport.x+Math.max(0,viewport.z/2-32),viewport.y+Math.max(0,viewport.w/2-32),Math.min(64,viewport.z),Math.min(64,viewport.w));}else{renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);}renderer.setScissorTest(true);renderer.render(scene,camera);});}
 finally{renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
}

export function waitForGpuPreload(renderer,options={}){
 return waitLoadingGpuFence(renderer,options);
}

// Submit the same native screen/shadow recipes in small groups, so first-use
// buffer/texture uploads and shadow variants are spread across real frames.
// Color batches reuse shadows; one complete native shadow pass precedes readiness.
export async function renderScreenPreloadBatched(renderer,scene,camera,{batchSize=4,frameBudget=0,now=()=>performance.now(),warmShadows=false,signal,cancelled=()=>false,nextFrame,onSubmit,frameSlack,cpuBudget=false,getFrame,onBatch=()=>{},pixels=false,focus=null}={}){
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal,cancelled,onYield:onSubmit,frameSlack,cpuBudget,getFrame});
 const allMeshes=[];scene.traverseVisible(object=>{if(object.isMesh||object.isLine||object.isPoints)allMeshes.push(object);});
 const selected=new Set();if(focus)focus.traverse(object=>selected.add(object));const meshes=focus?allMeshes.filter(object=>selected.has(object)):allMeshes;
 const visible=new Map(allMeshes.map(mesh=>[mesh,mesh.visible])),shadows=renderer.shadowMap;
 const lights=[];scene.traverseVisible(object=>{if(object.isLight&&object.shadow)lights.push([object.shadow,object.shadow.needsUpdate,object.shadow.autoUpdate]);});
 const shadowNeeds=shadows.needsUpdate,shadowAuto=shadows.autoUpdate;
 const check=()=>{if(signal?.aborted||cancelled()||renderer.getContext().isContextLost())throw Error('Loading scene upload cancelled');};
 const restore=()=>{for(const [mesh,value] of visible)mesh.visible=value;};
 const restoreShadows=()=>{shadows.needsUpdate=shadowNeeds;shadows.autoUpdate=shadowAuto;for(const [shadow,value,auto] of lights){shadow.needsUpdate=value;shadow.autoUpdate=auto;}};
 const suppressShadows=()=>{shadows.autoUpdate=false;shadows.needsUpdate=false;for(const [shadow] of lights){shadow.autoUpdate=false;shadow.needsUpdate=false;}};
 const invalidate=()=>{shadows.needsUpdate=true;for(const [shadow] of lights)shadow.needsUpdate=true;};
 try{
  for(let start=0;start<meshes.length;start+=batchSize){
   check();const batch=new Set(meshes.slice(start,start+batchSize));
   for(const mesh of batch)for(let parent=mesh.parent;parent;parent=parent.parent)if(visible.has(parent))batch.add(parent);
   const submitStart=frameSlack||cpuBudget?now():0,programsBefore=onSubmit?renderer.info?.programs?.length:null,keysBefore=onSubmit?new Set(renderer.info?.programs?.map(p=>p.cacheKey)??[]):null;
   const witness=onSubmit?span=>{if(span.duration>=50)Object.assign(span,{batchIndex:start/batchSize,programsBefore,programsAfter:renderer.info?.programs?.length??null,addedPrograms:(renderer.info?.programs??[]).filter(p=>!keysBefore.has(p.cacheKey)).map(p=>({name:p.name,key:p.cacheKey})),objects:meshes.slice(start,start+batchSize).map(o=>({name:o.name,type:o.type,parent:o.parent?.name,entityId:o.parent?.userData?.entityId??null,vertices:o.geometry?.attributes?.position?.count??0,instances:o.isInstancedMesh?o.count:null,material:Array.isArray(o.material)?o.material.map(m=>m?.name):o.material?.name,textures:(Array.isArray(o.material)?o.material:[o.material]).flatMap(m=>Object.entries(m??{}).filter(([,v])=>v?.isTexture).map(([slot,v])=>({slot,name:v.name,width:v.image?.width??null,height:v.image?.height??null}))) }))});onSubmit(span);}:null;
   try{for(const mesh of allMeshes)mesh.visible=batch.has(mesh);if(warmShadows)invalidate();else suppressShadows();if(witness)loadingSyncWitness(witness,'loading-screen-upload-submit',()=>renderScreenPreload(renderer,scene,camera,{pixels}),now);else renderScreenPreload(renderer,scene,camera,{pixels});}finally{restore();restoreShadows();if(frameSlack||cpuBudget)yieldWork.recordWork(now()-submitStart);}
   onBatch(Math.min(meshes.length,start+batchSize),meshes.length);await yieldWork();
  }
  check();invalidate();if(onSubmit)loadingSyncWitness(onSubmit,'loading-screen-upload-final-submit',()=>renderScreenPreload(renderer,scene,camera),now);else renderScreenPreload(renderer,scene,camera);
 }finally{restore();restoreShadows();}
}
