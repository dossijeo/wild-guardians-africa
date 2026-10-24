import {encodeMudEdgeInput} from './mangrove-mud-edge-codec.js';
// One world-owned worker, bounded immutable snapshots; never owns simulation data.
export class MudEdgeExecutor {
 constructor({workerFactory=()=>new Worker(new URL('./mangrove-mud-edge-worker.js',import.meta.url),{type:'module'}),maxPending=2,timeoutMs=30000,now=()=>performance.now()}={}){
  Object.assign(this,{maxPending,timeoutMs,now});this.jobs=new Map();this.active=null;this.serial=0;this.closed=false;
  this.stats={submitted:0,completed:0,cancelled:0,failed:0,postCpuMs:0,computeMs:0,peakPending:0};
  try{this.worker=workerFactory();this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=e=>this.fail(Error(e.message));}catch(error){this.fail(error);}
 }
 run(input,{signal}={}){
  if(this.closed)return Promise.reject(Error('Mud worker unavailable'));
  if(signal?.aborted)return Promise.reject(new DOMException('Mud preparation cancelled','AbortError'));
  if(this.jobs.size+(this.active&&!this.jobs.has(this.active.id)?1:0)>=this.maxPending)return Promise.reject(Error('Mud worker backpressure'));
  return new Promise((resolve,reject)=>{
   const id=++this.serial,job={id,input:encodeMudEdgeInput(input),resolve,reject,signal};
   job.abort=()=>{if(!this.jobs.has(id))return;this.jobs.delete(id);signal?.removeEventListener('abort',job.abort);this.stats.cancelled++;reject(new DOMException('Mud preparation cancelled','AbortError'));if(this.active!==job)this.dispatch();};
   this.jobs.set(id,job);signal?.addEventListener('abort',job.abort,{once:true});this.stats.submitted++;this.stats.peakPending=Math.max(this.stats.peakPending,this.jobs.size);this.dispatch();
  });
 }
 dispatch(){
  if(this.closed||this.active)return;const job=this.jobs.values().next().value;if(!job)return;
  this.active=job;this.timer=setTimeout(()=>this.fail(Error('Mud worker timeout')),this.timeoutMs);
  const start=this.now();try{this.worker.postMessage({id:job.id,input:job.input});job.input=null;}catch(error){this.fail(error);}finally{this.stats.postCpuMs+=this.now()-start;}
 }
 receive(message){
  const job=this.active;if(this.closed||!job||job.id!==message.id)return;
  clearTimeout(this.timer);this.active=null;
  if(this.jobs.delete(job.id)){job.signal?.removeEventListener('abort',job.abort);if(message.error){this.stats.failed++;job.reject(Error(message.error));}else{this.stats.completed++;this.stats.computeMs+=message.computeMs;job.resolve(message.result);}}
  this.dispatch();
 }
 fail(error,{cancelled=false}={}){if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.worker?.terminate();for(const job of this.jobs.values()){job.signal?.removeEventListener('abort',job.abort);job.reject(error);this.stats[cancelled?'cancelled':'failed']++;}this.jobs.clear();this.active=null;}
 dispose(){this.fail(new DOMException('Mud worker disposed','AbortError'),{cancelled:true});}
}
