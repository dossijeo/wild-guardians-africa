import {loadingSyncWitness} from './loading-sync-witness.js';
import {compileGpuPreparation} from '../../tools/experiments/compile-gpu-preparation.js';
import {loadingYieldBudget} from './loading-yield-budget.js';
import {withScreenTarget} from './screen-target.js';
// Use the shared bounded compiler, selecting every borrowed recipe needed by
// loading. Screen state and materials are restored before asynchronous waiting.
// A loss event is latched even if the context is restored between polls.
export function compileLoadingPrograms(renderer,scene,camera,targetScene,{scheduler=null,deadline,signal,cancelled=()=>false,getEpoch=()=>0,timeout=30000,now=()=>performance.now(),screen=false,onSubmit,onCpu,onProgramReady}={}) {
 const begin=now(),gl=renderer.getContext(),epoch=getEpoch(),owner=new AbortController();let lost=false;
 const check=()=>{if(signal?.aborted||owner.signal.aborted||cancelled()||lost||renderer.getContext()!==gl||getEpoch()!==epoch||gl.isContextLost())throw Error('Loading compilation cancelled');if(now()-begin>timeout)throw Error('Loading compilation timed out');};
 const lose=()=>{lost=true;owner.abort();},abort=()=>owner.abort();
 const cleanup=()=>{gl.canvas?.removeEventListener('webglcontextlost',lose);signal?.removeEventListener('abort',abort);};
 check();gl.canvas?.addEventListener('webglcontextlost',lose);signal?.addEventListener('abort',abort,{once:true});
 const execute=()=>{
 if(scheduler&&onSubmit){const end=now();try{onSubmit({label:'loading-compile-admission-wait',start:begin,end,duration:end-begin,scope:'Queue wall time before submission, not CPU or GPU duration.'});}catch{}}
 let materials;const submitWitness=onSubmit||onCpu?span=>{try{onSubmit?.(span);}catch{}try{onCpu?.(span.duration);}catch{}}:null;
 try{materials=submitWitness?loadingSyncWitness(submitWitness,'loading-compile-submit',()=>screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene),now):(screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene));check();}
 catch(error){cleanup();throw error;}
 // Submission has already restored screen state. Snapshot all variants through
 // the shared core without submitting or querying the native renderer twice.
 const submitted={compile:()=>materials,properties:renderer.properties};
 const waitStart=onSubmit?now():null;let waitFailed=false;
 return compileGpuPreparation(submitted,scene,camera,targetScene,{check,signal:owner.signal,onProgramReady,selectPrograms:properties=>properties.programs?.size?properties.programs.values():[properties.currentProgram]}).then(()=>scene,error=>{waitFailed=true;throw error;}).finally(()=>{cleanup();if(onSubmit){const end=now();try{onSubmit({label:'loading-compile-readiness-wait',start:waitStart,end,duration:end-waitStart,failed:waitFailed,scope:'Awaited program-readiness wall time after synchronous submission; includes polling/driver scheduling, not CPU or GPU duration.'});}catch{}}});
 };
 if(!scheduler)return execute();
 // A scheduled unit owns synchronous submission only. Its returned readiness
 // promise is awaited by the caller, never charged as CPU or run inside a frame.
 return scheduler.submit((function*(){check();return execute();})(),{signal:owner.signal,valid:()=>{check();return true;},priority:20,required:true,deadline:deadline??begin+250}).then(result=>{check();return result;}).finally(cleanup);
}

// Compile bounded views of the original objects against the complete native
// scene. No mesh is cloned, reparented or hidden: lights, fog, clipping, skinning
// and instancing retain the actual target-scene/object recipe. Restore screen
// state synchronously in each submission before yielding to the loading RAF.
export async function compileLoadingProgramsBatched(renderer,scene,camera,targetScene,{batchSize=4,concurrency=1,frameBudget=0,now=()=>performance.now(),nextFrame,guardResourceDisposal=false,...options}={}) {
 if(!Number.isInteger(batchSize)||batchSize<1)throw Error('Loading compile batch size must be positive');
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>8||(concurrency>1&&!options.scheduler))throw Error('Parallel loading compilation requires global admission and concurrency 1..8');
 // All batches serve one operation: do not renew its admission grace period
 // after every driver wait. Explicit caller deadlines remain authoritative.
 if(options.scheduler)options={...options,deadline:options.deadline??now()+250};
 const objects=[];scene.traverse(object=>{if(object.isMesh||object.isPoints||object.isLine||object.isSprite)objects.push(object);});
 // Optional live-scene safety: own cancellation for every borrowed resource,
 // including later batches. This does not freeze scene membership or mutations.
 const resources=new Set(),owner=guardResourceDisposal?new AbortController():null;
 let resourceDisposed=false;
 const context=owner?renderer.getContext():null;
 const externalSignal=options.signal,abort=()=>owner?.abort(),dispose=()=>{resourceDisposed=true;abort();};
 if(owner){
  context.canvas?.addEventListener('webglcontextlost',abort);
  for(const object of objects){if(object.geometry)resources.add(object.geometry);for(const material of (Array.isArray(object.material)?object.material:[object.material]))if(material)resources.add(material);}
  for(const resource of resources)resource.addEventListener?.('dispose',dispose);
  externalSignal?.addEventListener('abort',abort,{once:true});if(externalSignal?.aborted)abort();
  options={...options,signal:owner.signal};
 }
 try{
 const target=targetScene??scene;
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame,signal:options.signal,cancelled:options.cancelled,onYield:options.onSubmit,frameSlack:options.frameSlack,cpuBudget:options.cpuBudget,getFrame:options.getFrame});
 const prepareBatch=async start=>{
  const batch=objects.slice(start,start+batchSize);
  const view={traverse:callback=>{for(const object of batch)callback(object);},traverseVisible:()=>{}};
  await compileLoadingPrograms(renderer,view,camera,target,options.frameSlack||options.cpuBudget?{...options,now,onCpu:duration=>{yieldWork.recordWork(duration);options.onCpu?.(duration);}}:{...options,now});
  if(!options.scheduler)await yieldWork();
 };
 if(concurrency===1){for(let start=0;start<objects.length;start+=batchSize)await prepareBatch(start);}
 else for(let start=0;start<objects.length;start+=batchSize*concurrency){
  const wave=[];
  for(let offset=0;offset<concurrency&&start+offset*batchSize<objects.length;offset++)wave.push(prepareBatch(start+offset*batchSize));
  // Submitted GL state is restored synchronously; only readiness waits overlap.
  const settled=await Promise.allSettled(wave),failed=settled.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
 }
 }catch(error){
  if(resourceDisposed||error.code==='GPU_PROGRAM_DISPOSED'){const cancelled=new Error('Loading compilation cancelled: borrowed resource disposed',{cause:error});cancelled.code='BORROWED_RESOURCE_DISPOSED';throw cancelled;}
  throw error;
 }finally{
  context?.canvas?.removeEventListener('webglcontextlost',abort);
  externalSignal?.removeEventListener('abort',abort);
  for(const resource of resources)resource.removeEventListener?.('dispose',dispose);
 }
}
