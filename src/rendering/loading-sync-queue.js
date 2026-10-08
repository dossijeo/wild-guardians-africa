import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
const abortError=()=>new DOMException('Loading actor preparation cancelled','AbortError');
// One loading owner has one pump and at most one pending frame. Tasks stay
// synchronous; this spreads complete native actor adoptions, not fake async.
export class LoadingSyncQueue {
 constructor({signal,cancelled=()=>false,getEpoch=()=>0,frameBudget=6,timeout=30000,pollIntervalMs=100,nextFrame,now=()=>performance.now(),onDiagnostic=()=>{}}={}){
  if(!Number.isFinite(frameBudget)||frameBudget<=0||!Number.isFinite(timeout)||timeout<=0)throw new RangeError('Invalid loading actor queue budget');
  this.signal=signal;this.cancelled=cancelled;this.getEpoch=getEpoch;this.epoch=getEpoch();this.frameBudget=frameBudget;this.timeout=timeout;this.pollIntervalMs=pollIntervalMs;this.nextFrame=nextFrame;this.now=now;this.onDiagnostic=onDiagnostic;
  this.owner=new AbortController();this.jobs=[];this.pumping=false;this.closed=false;this.spent=0;this.stats={submitted:0,completed:0,failed:0,yields:0,cpuMs:0,maxTaskMs:0};
  this.abort=()=>this.close(signal?.reason??abortError());signal?.addEventListener('abort',this.abort,{once:true});if(signal?.aborted)this.abort();
 }
 report(){try{this.onDiagnostic({...this.stats,pending:this.jobs.length,closed:this.closed,scope:'Accumulated synchronous task CPU wall time; yields and queue waits are not GPU work.'});}catch{}}
 check(deadline){if(this.closed||this.signal?.aborted||this.cancelled()||this.getEpoch()!==this.epoch)throw this.failure??abortError();if(this.now()>=deadline)throw new DOMException('Loading actor preparation timed out','TimeoutError');}
 run(task){
  if(typeof task!=='function')return Promise.reject(new TypeError('Loading actor task must be a function'));
  if(this.closed)return Promise.reject(this.failure??abortError());
  return new Promise((resolve,reject)=>{this.jobs.push({task,resolve,reject,deadline:this.now()+this.timeout});this.stats.submitted++;this.start();});
 }
 // Empty queues do not reset CPU: asset promise continuations may refill them
 // within the same browser frame. Only an actual yielded frame resets it.
 start(){if(this.pumping||this.closed)return;this.pumping=true;void this.pump().finally(()=>{this.pumping=false;if(this.jobs.length&&!this.closed)this.start();}).catch(error=>this.close(error));}
 async pump(){
  try{while(this.jobs.length&&!this.closed){
   const job=this.jobs[0];this.check(job.deadline);
   if(this.spent>=this.frameBudget){this.stats.yields++;this.report();await waitGpuFrame({check:()=>this.check(job.deadline),signal:this.owner.signal,nextFrame:this.nextFrame,pollIntervalMs:this.pollIntervalMs});this.spent=0;}
   this.check(job.deadline);this.jobs.shift();const began=this.now();
   try{const value=job.task();if(value?.then){Promise.resolve(value).catch(()=>{});throw new TypeError('Loading actor queue accepts only synchronous tasks');}this.check(job.deadline);this.stats.completed++;job.resolve(value);}
   catch(error){this.stats.failed++;job.reject(error);}
   finally{const cpu=this.now()-began;this.spent+=cpu;this.stats.cpuMs+=cpu;this.stats.maxTaskMs=Math.max(this.stats.maxTaskMs,cpu);this.report();}
  }}catch(error){this.close(error);}
 }
 close(error=abortError()){
  if(this.closed)return;this.closed=true;this.failure=error;this.signal?.removeEventListener('abort',this.abort);this.owner.abort(error);
  for(const job of this.jobs.splice(0))job.reject(error);this.report();
 }
 dispose(){this.close();}
}
