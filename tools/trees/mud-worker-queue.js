// Experimental presentation-only queue. Caller owns terrain revisions and must
// invalidate on unload, edits or world replacement before publishing results.
export class MudWorkerQueue {
 constructor(worker,{limit=16,timeoutMs=30000}={}){if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Invalid timeout');if(!Number.isInteger(limit)||limit<1)throw Error('Invalid queue limit');this.worker=worker;this.limit=limit;this.timeoutMs=timeoutMs;this.timer=null;this.nextId=1;this.pending=new Map();this.queue=[];this.active=null;this.closed=false;worker.addEventListener('message',this.onMessage=e=>this.receive(e.data));worker.addEventListener('error',this.onError=e=>this.fail(e.message||'Worker error'));}
 request(key,revision,input){
  if(this.closed)return Promise.reject(Error('Queue closed'));
  if(this.pending.has(key))this.invalidate(key);
  if(this.queue.length+(this.active?1:0)>=this.limit)return Promise.reject(Error('Queue saturated'));
  return new Promise((resolve,reject)=>{const job={id:this.nextId++,key,revision,input,resolve,reject};this.pending.set(key,job);this.queue.push(job);this.pump();});
 }
 invalidate(key){const job=this.pending.get(key);if(!job)return false;this.pending.delete(key);job.reject(Error('Cancelled or stale'));if(job!==this.active)this.queue=this.queue.filter(x=>x!==job);return true;}
 pump(){if(this.closed||this.active||!this.queue.length)return;const job=this.active=this.queue.shift();try{this.timer=setTimeout(()=>this.fail('Worker timeout'),this.timeoutMs);this.worker.postMessage({id:job.id,input:job.input,sentAt:performance.now()},[job.input.heights.buffer]);}catch(e){clearTimeout(this.timer);this.timer=null;this.active=null;this.pending.delete(job.key);job.reject(e);this.pump();}}
 receive(data){const job=this.active;if(!job||data.id!==job.id)return;clearTimeout(this.timer);this.timer=null;this.active=null;if(this.pending.get(job.key)===job){this.pending.delete(job.key);if(data.error)job.reject(Error(data.error));else job.resolve({key:job.key,revision:job.revision,result:data.result,elapsed:data.elapsed});}this.pump();}
 fail(message){if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.timer=null;for(const job of this.pending.values())job.reject(Error(message));this.pending.clear();this.queue=[];this.active=null;this.worker.terminate();}
 dispose(){this.fail('Queue disposed');}
}
