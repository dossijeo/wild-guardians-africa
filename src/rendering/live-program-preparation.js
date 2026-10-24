import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
import {compileLoadingProgramsBatched} from './loading-programs.js';
const renderable=o=>o.isMesh||o.isPoints||o.isLine||o.isSprite;
function recipe(object,version=material=>material?.version){return {geometry:object.geometry,materials:(Array.isArray(object.material)?object.material:[object.material]).map(material=>[material,version(material)])};}
function same(a,b){return !!a&&a.geometry===b.geometry&&a.materials.length===b.materials.length&&a.materials.every(([material,version],i)=>material===b.materials[i][0]&&version===b.materials[i][1]);}
function belongs(object,scene){for(let p=object;p;p=p.parent)if(p===scene)return true;return false;}
// A changing scene is not a single borrowed-resource transaction. Commit each
// completed batch separately; cancelled batches never invalidate earlier work.
export async function prepareLiveScenePrograms(renderer,scene,camera,{batchSize=8,timeout=30000,now=()=>performance.now(),compile=compileLoadingProgramsBatched,...options}={}){
 const versions=new WeakMap();
 const version=material=>{
  if(!material)return undefined;
  let entry=versions.get(material);
  if(!entry){entry={observed:material.version,revision:0};versions.set(material,entry);}
  else if(entry.observed!==material.version){entry.observed=material.version;entry.revision++;}
  return entry.revision;
 };
 const snapshot=object=>recipe(object,version);
 const epoch=options.getEpoch?.();
 const begin=now(),completed=new WeakMap(),stats={rounds:0,batches:0,objects:0,invalidatedBatches:0,retiredObjects:0,lastPending:0};
 const check=()=>{if(options.signal?.aborted||options.cancelled?.()||options.getEpoch?.()!==epoch)throw Error('Live program preparation cancelled');if(now()-begin>timeout){const error=Error('Live program preparation timed out');error.preparation={...stats};throw error;}};
 if(!Number.isInteger(batchSize)||batchSize<1)throw new RangeError('Invalid live program batch size');
 for(;;){
  check();stats.rounds++;const pending=[];
  scene.traverse(object=>{if(renderable(object)&&!same(completed.get(object),snapshot(object)))pending.push(object);});
  stats.lastPending=pending.length;if(!pending.length)return stats;
  for(let i=0;i<pending.length;i+=batchSize){
   check();const batch=pending.slice(i,i+batchSize).filter(object=>{if(belongs(object,scene))return true;stats.retiredObjects++;return false;});
   if(!batch.length)continue;
   let recipes=batch.map(snapshot);
   const view={traverse:callback=>{for(const object of batch)callback(object);},traverseVisible:()=>{}};
   try{
    // Three r180 mutates material.version while compiling transparent sides.
    // Accept only synchronous compiler mutations; later edits remain invalidations.
    await compile(renderer,view,camera,scene,{...options,timeout:Math.max(1,timeout-(now()-begin)),now,batchSize,guardResourceDisposal:true,onSubmit:span=>{if(span.label==='loading-compile-submit'){for(const object of batch)for(const material of (Array.isArray(object.material)?object.material:[object.material])){const entry=material&&versions.get(material);if(entry)entry.observed=material.version;}recipes=batch.map(snapshot);}options.onSubmit?.(span);}});
    check();stats.batches++;
    for(let j=0;j<batch.length;j++)if(belongs(batch[j],scene)&&same(recipes[j],snapshot(batch[j]))){completed.set(batch[j],recipes[j]);stats.objects++;}
   }catch(error){if(error.code!=='BORROWED_RESOURCE_DISPOSED')throw error;stats.invalidatedBatches++;await waitGpuFrame({check,signal:options.signal,nextFrame:options.nextFrame});}
  }
  // Bound mutation churn even if all readiness promises resolve immediately.
  await waitGpuFrame({check,signal:options.signal,nextFrame:options.nextFrame});
 }
}
