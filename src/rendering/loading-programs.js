import {loadingSyncWitness} from './loading-sync-witness.js';
import {compileGpuPreparation} from '../../tools/experiments/compile-gpu-preparation.js';
import {loadingYieldBudget} from './loading-yield-budget.js';
import {withScreenTarget} from './screen-target.js';
// Use the shared bounded compiler, selecting every borrowed recipe needed by
// loading. Screen state and materials are restored before asynchronous waiting.
// A loss event is latched even if the context is restored between polls.
export function compileLoadingPrograms(renderer,scene,camera,targetScene,{signal,cancelled=()=>false,getEpoch=()=>0,timeout=30000,now=()=>performance.now(),screen=false,onSubmit,onCpu,onJob,batchInfo}={}) {
 const begin=now(),gl=renderer.getContext(),epoch=getEpoch(),owner=new AbortController();let lost=false;
 const check=()=>{if(signal?.aborted||owner.signal.aborted||cancelled()||lost||renderer.getContext()!==gl||getEpoch()!==epoch||gl.isContextLost())throw Error('Loading compilation cancelled');if(now()-begin>timeout)throw Error('Loading compilation timed out');};
 const lose=()=>{lost=true;owner.abort();},abort=()=>owner.abort();
 const cleanup=()=>{gl.canvas?.removeEventListener('webglcontextlost',lose);signal?.removeEventListener('abort',abort);};
 check();gl.canvas?.addEventListener('webglcontextlost',lose);signal?.addEventListener('abort',abort,{once:true});
 let materials;const submitWitness=onSubmit||onCpu?span=>{try{onSubmit?.(span);}catch{}try{onCpu?.(span.duration);}catch{}}:null;
 try{materials=submitWitness?loadingSyncWitness(submitWitness,'loading-compile-submit',()=>screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene),now):(screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene));check();}
 catch(error){cleanup();throw error;}
 // Submission has already restored screen state. Snapshot all variants through
 // the shared core without submitting or querying the native renderer twice.
 const submitted={compile:()=>materials,properties:renderer.properties};
 let onProgress;if(onJob)try{const candidate=onJob({start:begin,screen,batch:batchInfo??null});if(typeof candidate==='function')onProgress=candidate;}catch{};
 const waitStart=onSubmit?now():null;let waitFailed=false;
 return compileGpuPreparation(submitted,scene,camera,targetScene,{check,signal:owner.signal,selectPrograms:properties=>properties.programs?.size?properties.programs.values():[properties.currentProgram],onProgress,now}).then(()=>scene,error=>{waitFailed=true;throw error;}).finally(()=>{cleanup();if(onSubmit){const end=now();try{onSubmit({label:'loading-compile-readiness-wait',start:waitStart,end,duration:end-waitStart,failed:waitFailed,scope:'Awaited program-readiness wall time after synchronous submission; includes polling/driver scheduling, not CPU or GPU duration.'});}catch{}}});
}

// Compile bounded views of the original objects against the complete native
// scene. No mesh is cloned, reparented or hidden: lights, fog, clipping, skinning
// and instancing retain the actual target-scene/object recipe. Restore screen
// state synchronously in each submission before yielding to the loading RAF.
export async function compileLoadingProgramsBatched(renderer,scene,camera,targetScene,{batchSize=4,frameBudget=0,now=()=>performance.now(),nextFrame,readinessWindow=1,...options}={}) {
 if(!Number.isInteger(batchSize)||batchSize<1)throw Error('Loading compile batch size must be positive');
 if(readinessWindow!==1&&readinessWindow!==2)throw Error('Loading compile window must be one or two');
 const objects=[];scene.traverse(object=>{if(object.isMesh||object.isPoints||object.isLine||object.isSprite)objects.push(object);});
 const target=targetScene??scene;
 if(readinessWindow===2)return compileLoadingProgramsWindowed(renderer,objects,camera,target,{batchSize,frameBudget,now,nextFrame,...options});
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal:options.signal,cancelled:options.cancelled,onYield:options.onSubmit,frameSlack:options.frameSlack,cpuBudget:options.cpuBudget,getFrame:options.getFrame});
 for(let start=0;start<objects.length;start+=batchSize){
  const batch=objects.slice(start,start+batchSize);
  const view={traverse:callback=>{for(const object of batch)callback(object);},traverseVisible:()=>{}};
  let batchInfo;if(options.onJob)try{const categories={mesh:0,points:0,line:0,sprite:0,instanced:0,batched:0,skinned:0};for(const object of batch){for(const [key,flag] of [['mesh','isMesh'],['points','isPoints'],['line','isLine'],['sprite','isSprite'],['instanced','isInstancedMesh'],['batched','isBatchedMesh'],['skinned','isSkinnedMesh']])if(object[flag])categories[key]++;}batchInfo={ordinal:start/batchSize+1,batches:Math.ceil(objects.length/batchSize),start,end:start+batch.length,objects:objects.length,categories,names:batch.slice(0,8).map(object=>({type:typeof object.type==='string'?object.type.slice(0,80):null,name:typeof object.name==='string'?object.name.slice(0,160):null,uuid:typeof object.uuid==='string'?object.uuid.slice(0,80):null})),namesOmitted:Math.max(0,batch.length-8)};}catch{}
  await compileLoadingPrograms(renderer,view,camera,target,options.frameSlack||options.cpuBudget?{...options,now,batchInfo,onCpu:duration=>{yieldWork.recordWork(duration);options.onCpu?.(duration);}}:{...options,now,batchInfo});
  await yieldWork();
 }
}

// Experimental smoke-only backpressure. Two original readiness jobs maximum,
// never a whole-scene union; each native variant and per-job deadline survives.
async function compileLoadingProgramsWindowed(renderer,objects,camera,target,{batchSize,frameBudget,now,nextFrame,...options}){
 const owner=new AbortController(),active=new Set();let failed=false,failure;
 const abort=()=>owner.abort(),fail=error=>{if(!failed){failed=true;failure=error;}abort();};
 const check=()=>{if(failed)throw failure;if(owner.signal.aborted||options.cancelled?.())throw Error('Loading compilation cancelled');};
 let yieldWork;
 try{
  options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
  yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal:owner.signal,cancelled:options.cancelled,onYield:options.onSubmit,frameSlack:options.frameSlack,cpuBudget:options.cpuBudget,getFrame:options.getFrame});
  check();
  for(let start=0;start<objects.length;start+=batchSize){
   while(active.size===2){await Promise.race([...active].map(entry=>entry.settled));check();}
   check();const batch=objects.slice(start,start+batchSize),view={traverse:callback=>{for(const object of batch)callback(object);},traverseVisible:()=>{}};
   let batchInfo;if(options.onJob)try{const categories={mesh:0,points:0,line:0,sprite:0,instanced:0,batched:0,skinned:0};for(const object of batch){for(const [key,flag] of [['mesh','isMesh'],['points','isPoints'],['line','isLine'],['sprite','isSprite'],['instanced','isInstancedMesh'],['batched','isBatchedMesh'],['skinned','isSkinnedMesh']])if(object[flag])categories[key]++;}batchInfo={ordinal:start/batchSize+1,batches:Math.ceil(objects.length/batchSize),start,end:start+batch.length,objects:objects.length,categories,names:batch.slice(0,8).map(object=>({type:typeof object.type==='string'?object.type.slice(0,80):null,name:typeof object.name==='string'?object.name.slice(0,160):null,uuid:typeof object.uuid==='string'?object.uuid.slice(0,80):null})),namesOmitted:Math.max(0,batch.length-8),window:{limit:2,inFlight:active.size+1}};}catch{}
   const ready=compileLoadingPrograms(renderer,view,camera,target,options.frameSlack||options.cpuBudget?{...options,signal:owner.signal,now,batchInfo,onCpu:duration=>{yieldWork.recordWork(duration);options.onCpu?.(duration);}}:{...options,signal:owner.signal,now,batchInfo});
   const entry={settled:null};active.add(entry);
   entry.settled=ready.then(()=>{active.delete(entry);},error=>{fail(error);active.delete(entry);});
   await yieldWork();check();
  }
  await Promise.all([...active].map(entry=>entry.settled));check();
 }catch(error){fail(error);throw failure;}
 finally{abort();await Promise.all([...active].map(entry=>entry.settled));active.clear();try{options.signal?.removeEventListener('abort',abort);}catch(error){if(!failed)throw error;}}
}

export const loadingCompileWindowEnabled=(scope=globalThis)=>scope.__desktopSmokeStarted===true&&scope.__desktopSmokeCompileWindow===true;
