import {buildNativeChunk} from './chunk-data.js';

export function createChunkWorker(){return typeof Worker==='undefined'?null:new Worker(new URL('./chunk-worker.js',import.meta.url),{type:'module'});}

// One native generation request at a time. Epochs invalidate forced rebuilds;
// request IDs prevent an old or duplicated response from completing a new job.
export class NativeChunkStream{
  constructor(config,profile,{loaded,onData,onError=()=>{},onFallback=()=>{},workerFactory=createChunkWorker,build=buildNativeChunk,buildAsync=null,discardData=()=>{},schedule=(callback,delay)=>setTimeout(callback,delay),cancel=handle=>clearTimeout(handle)}){
    Object.assign(this,{config:structuredClone(config),profile:structuredClone(profile),loaded,onData,onError,onFallback,build,buildAsync,discardData,schedule,cancel});
    this.queue=[];this.desired=new Map();this.failed=new Set();this.stale=new Set();this.busy=null;this.serial=0;this.epoch=0;this.dead=false;this.waiters=[];this.timer=null;
    this.stats={created:0,discarded:0,failed:0,fallbacks:0};
    try{this.worker=workerFactory();}catch(error){this.worker=null;this.stats.fallbacks++;onFallback(error);}
    if(this.worker){this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=e=>this.fallback(e);}
  }
  plan(desired,force=false){
    if(this.dead)return;
    if(force){this.epoch++;this.failed.clear();}
    this.desired=new Map(desired);
    for(const key of this.failed)if(!this.desired.has(key))this.failed.delete(key);
    this.queue=[...this.desired.values()].filter(job=>{
      const key=job.cx+','+job.cz;
      return (!this.loaded().has(key)||this.stale.has(key))&&!this.failed.has(key)&&
        !(this.busy?.epoch===this.epoch&&this.busy.cx===job.cx&&this.busy.cz===job.cz);
    }).sort((a,b)=>a.score-b.score);
    this.dispatch();this.settle();
  }
  invalidate(keys){
    if(this.dead)return;
    let active=false;
    for(const key of keys){
      if(!this.loaded().has(key)&&!this.desired.has(key))continue;
      this.stale.add(key);
      if(this.desired.has(key))active=true;
    }
    if(active)this.plan(this.desired,true);
  }
  dispatch(){
    if(this.dead||this.busy)return;
    while(this.queue.length){
      const job=this.queue.shift(),key=job.cx+','+job.cz;
      if(!this.desired.has(key)||this.loaded().has(key)&&!this.stale.has(key)||this.failed.has(key))continue;
      const request={...job,id:++this.serial,epoch:this.epoch,config:this.config,profile:this.profile};this.busy=request;
      if(this.buildAsync){
        const current=()=>!this.dead&&this.busy===request&&request.epoch===this.epoch&&
          this.desired.has(key)&&(!this.loaded().has(key)||this.stale.has(key));
        Promise.resolve().then(()=>this.buildAsync(request,current)).then(
          data=>this.receive({id:request.id,epoch:request.epoch,data}),
          error=>this.receive({id:request.id,epoch:request.epoch,error:String(error.stack??error)}));
      }
      else if(this.worker){try{this.worker.postMessage(request);}catch(error){this.fallback(error);}}
      else this.timer=this.schedule(()=>{this.timer=null;if(this.dead)return;try{this.receive({id:request.id,epoch:request.epoch,data:this.build(this.config,this.profile,job.cx,job.cz)});}catch(error){this.receive({id:request.id,epoch:request.epoch,error:String(error.stack??error)});}},0);
      return;
    }
    this.settle();
  }
  receive(message){
    if(this.dead||!this.busy||message.id!==this.busy.id||message.epoch!==this.busy.epoch){this.stats.discarded++;this.discardData(message.data);return;}
    const job=this.busy,key=job.cx+','+job.cz;this.busy=null;
    if(message.epoch!==this.epoch||!this.desired.has(key)||this.loaded().has(key)&&!this.stale.has(key)){this.stats.discarded++;this.discardData(message.data);}
    else if(message.data===null&&!message.error&&this.buildAsync){
      // An async builder may have cancelled a job while demand disappeared.
      // If that demand returned meanwhile, schedule a fresh job for it.
      this.stats.discarded++;this.plan(this.desired);
    }
    else if(message.error){this.failed.add(key);this.stats.failed++;this.onError(new Error(message.error));}
    else{
      try{if(message.data.cx!==job.cx||message.data.cz!==job.cz)throw new Error('Respuesta de chunk con coordenadas incorrectas');this.onData(message.data);this.stale.delete(key);this.stats.created++;}
      catch(error){this.failed.add(key);this.stats.failed++;this.onError(error);}
    }
    this.dispatch();this.settle();
  }
  fallback(error){
    if(this.dead||!this.worker)return;
    this.worker.terminate();this.worker=null;this.busy=null;this.stats.fallbacks++;this.onFallback(error);
    this.plan(this.desired,true);
  }
  whenIdle(){if(this.dead)return Promise.resolve({cancelled:true});if(!this.busy&&!this.queue.length)return this.failed.size?Promise.reject(new Error('No se pudieron generar todos los chunks')):Promise.resolve({cancelled:false});return new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));}
  freshLoaded(){let count=0;for(const key of this.loaded().keys())if(!this.stale.has(key))count++;return count;}
  whenReady(minimum=9){if(this.dead)return Promise.resolve({cancelled:true});if(this.freshLoaded()>=minimum||!this.busy&&!this.queue.length)return this.failed.size?Promise.reject(new Error('No se pudieron generar todos los chunks')):Promise.resolve({cancelled:false});return new Promise((resolve,reject)=>this.waiters.push({resolve,reject,minimum}));}
  settle(){const idle=!this.busy&&!this.queue.length;for(const waiter of [...this.waiters])if(idle||waiter.minimum&&this.freshLoaded()>=waiter.minimum){this.waiters.splice(this.waiters.indexOf(waiter),1);this.failed.size?waiter.reject(new Error('No se pudieron generar todos los chunks')):waiter.resolve({cancelled:this.dead});}}
  summary(){return {...this.stats,worker:!!this.worker,asyncPreparation:!!this.buildAsync,queued:this.queue.length,busy:!!this.busy,stale:this.stale.size,epoch:this.epoch};}
  dispose(){if(this.dead)return;this.dead=true;this.epoch++;this.worker?.terminate();this.worker=null;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.busy=null;this.queue=[];this.desired.clear();this.failed.clear();this.stale.clear();this.settle();}
}
