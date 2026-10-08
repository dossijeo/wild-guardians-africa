import {compileGpuPreparation} from '../../tools/experiments/compile-gpu-preparation.js';
import {loadingYieldBudget} from './loading-yield-budget.js';
import {withScreenTarget} from './screen-target.js';
// Use the shared bounded compiler, selecting every borrowed recipe needed by
// loading. Screen state and materials are restored before asynchronous waiting.
// A loss event is latched even if the context is restored between polls.
export function compileLoadingPrograms(renderer,scene,camera,targetScene,{signal,cancelled=()=>false,getEpoch=()=>0,timeout=30000,now=()=>performance.now(),screen=false}={}) {
 const begin=now(),gl=renderer.getContext(),epoch=getEpoch(),owner=new AbortController();let lost=false;
 const check=()=>{if(signal?.aborted||owner.signal.aborted||cancelled()||lost||renderer.getContext()!==gl||getEpoch()!==epoch||gl.isContextLost())throw Error('Loading compilation cancelled');if(now()-begin>timeout)throw Error('Loading compilation timed out');};
 const lose=()=>{lost=true;owner.abort();},abort=()=>owner.abort();
 const cleanup=()=>{gl.canvas?.removeEventListener('webglcontextlost',lose);signal?.removeEventListener('abort',abort);};
 check();gl.canvas?.addEventListener('webglcontextlost',lose);signal?.addEventListener('abort',abort,{once:true});
 let materials;
 try{materials=screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene);check();}
 catch(error){cleanup();throw error;}
 // Submission has already restored screen state. Snapshot all variants through
 // the shared core without submitting or querying the native renderer twice.
 const submitted={compile:()=>materials,properties:renderer.properties};
 return compileGpuPreparation(submitted,scene,camera,targetScene,{check,signal:owner.signal,selectPrograms:properties=>properties.programs?.size?properties.programs.values():[properties.currentProgram]}).then(()=>scene).finally(cleanup);
}

// Compile bounded views of the original objects against the complete native
// scene. No mesh is cloned, reparented or hidden: lights, fog, clipping, skinning
// and instancing retain the actual target-scene/object recipe. Restore screen
// state synchronously in each submission before yielding to the loading RAF.
export async function compileLoadingProgramsBatched(renderer,scene,camera,targetScene,{batchSize=4,frameBudget=0,now=()=>performance.now(),nextFrame,...options}={}) {
 if(!Number.isInteger(batchSize)||batchSize<1)throw Error('Loading compile batch size must be positive');
 const objects=[];scene.traverse(object=>{if(object.isMesh||object.isPoints||object.isLine||object.isSprite)objects.push(object);});
 const target=targetScene??scene;
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal:options.signal,cancelled:options.cancelled});
 for(let start=0;start<objects.length;start+=batchSize){
  const batch=objects.slice(start,start+batchSize);
  const view={traverse:callback=>{for(const object of batch)callback(object);},traverseVisible:()=>{}};
  await compileLoadingPrograms(renderer,view,camera,target,options);
  await yieldWork();
 }
}
