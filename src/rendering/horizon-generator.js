export const createHorizonWorker=()=>typeof Worker==='undefined'?null:new Worker(new URL('./horizon-worker.js',import.meta.url),{type:'module'});

// One active job and one latest destination; camera motion cannot accumulate
// a queue of obsolete horizons. Geometry stays untouched until take() succeeds.
export class HorizonGenerator{
  constructor({workerFactory=createHorizonWorker,onFallback=()=>{}}={}){Object.assign(this,{workerFactory,onFallback,worker:null,disabled:false,dead:false,latest:null,busy:null,ready:null,serial:0,waiters:[]});}
  plan(task,force=false){
    if(this.dead||this.disabled)return false;
    if(!this.worker){try{this.worker=this.workerFactory();}catch(error){this.onFallback(error);}if(!this.worker){this.disabled=true;return false;}this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=e=>this.fallback(e);}
    if(!force&&this.latest?.key===task.key)return true;
    this.latest={...task,id:++this.serial};this.ready=null;this.dispatch();return !this.disabled;
  }
  dispatch(){if(this.dead||this.disabled||this.busy||!this.latest||this.ready)return;this.busy=this.latest;try{this.worker.postMessage(this.busy);}catch(error){this.fallback(error);}}
  receive(message){
    if(this.dead||message.id!==this.busy?.id)return;
    const job=this.busy;this.busy=null;
    if(message.id===this.latest?.id){
      if(message.error){this.fallback(new Error(message.error));return;}
      if(!(message.data?.terrain instanceof Float32Array)||!(message.data?.water instanceof Float32Array)||message.data.terrain.length%9||message.data.water.length%9){this.fallback(new Error('Invalid horizon vertex buffers'));return;}
      this.ready={key:job.key,data:message.data};this.settle();
    }
    this.dispatch();
  }
  take(key){if(this.ready?.key!==key)return null;const data=this.ready.data;this.ready=this.latest=null;return data;}
  cancel(){this.ready=this.latest=null;this.settle();}
  whenReady(){if(this.dead||this.disabled||this.ready||!this.latest)return Promise.resolve();return new Promise(resolve=>this.waiters.push(resolve));}
  settle(){if(this.dead||this.disabled||this.ready||!this.latest){for(const resolve of this.waiters.splice(0))resolve();}}
  fallback(error){this.worker?.terminate();this.worker=null;this.busy=null;this.disabled=true;this.onFallback(error);this.settle();}
  dispose(){this.dead=true;this.worker?.terminate();this.worker=null;this.busy=this.latest=this.ready=null;this.settle();}
}
