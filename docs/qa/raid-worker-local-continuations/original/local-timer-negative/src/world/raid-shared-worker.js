import {nativeOwnedRaidReply,isComputedRaidEntryResult} from './raid-entry-result.js';
const owned=new WeakMap();
export const isSharedRaidReply=(data,worker,owner,kind)=>{const p=data&&owned.get(data);return !!p&&p.worker===worker&&p.owner===owner&&p.kind===kind;};
// One Worker. A geometry-suspended acknowledgement grants scheduling control
// at a real generator yield, never ownership of a partial graph.
export class SharedRaidPreparationWorker {
 constructor({createWorker=()=>new Worker(new URL('./raid-entry-worker.js',import.meta.url),{type:'module'}),now=()=>performance.now(),verifyOwnedEvent=null}={}){
  this.now=now;this.verifyOwnedEvent=verifyOwnedEvent;this.channels=new Map();this.queue=new Map();this.sequence=0;this.entryStreak=0;
  this.stats={posted:0,replied:0,cancelled:0,rejected:0,failed:0,requestJsonBytes:0,replyJsonBytes:0,packMs:0,postMs:0,workerComputeMs:0,maxQueueWaitMs:0,suspensions:0,resumes:0};this.records=[];
  try{this.worker=createWorker();if(!this.worker)throw Error('Shared raid Worker unavailable');this.worker.onmessage=event=>{try{this.receive(event);}catch(error){this.fail(error);}};this.worker.onerror=error=>this.fail(error);}
  catch(error){this.lastError=String(error);this.stats.failed++;this.worker=null;}
 }
 channel(kind,owner,onReply,onError){
  if(!['entry','geometry'].includes(kind)||typeof owner!=='string'||!owner||this.channels.has(kind))throw Error('Invalid or duplicate shared raid channel');
  const c={kind,owner,onReply,onError,closed:false};this.channels.set(kind,c);
  return {post:request=>this.post(c,request),cancel:()=>this.cancel(c),close:()=>{if(c.closed)return;c.closed=true;this.cancel(c);this.channels.delete(kind);}};
 }
 post(c,request){
  if(this.disposed||!this.worker||c.closed||request.owner!==c.owner)throw Error('Shared raid channel unavailable or owner mismatch');
  this.cancel(c);const job={id:++this.sequence,channel:c,request,queuedAt:this.now(),cancelled:false};this.queue.set(c.kind,job);this.dispatch();return job.id;
 }
 cancel(c){
  if(this.queue.get(c.kind)?.channel===c){this.queue.delete(c.kind);this.stats.cancelled++;}
  if(this.active?.channel===c&&!this.active.cancelled){this.active.cancelled=true;this.stats.cancelled++;}
  if(this.background?.channel===c){const job=this.background;this.background=null;job.cancelled=true;this.stats.cancelled++;this.worker?.postMessage({kind:'raid-geometry-cancel',job:job.id,owner:c.owner});}
 }
 dispatch(){
  if(this.disposed||!this.worker||this.active||!this.queue.size)return;
  const hasGeometry=!this.background&&this.queue.has('geometry'),kind=this.queue.has('entry')&&(this.entryStreak<2||!hasGeometry)?'entry':'geometry';
  if(kind==='geometry'&&this.background)return;
  const job=this.queue.get(kind);this.queue.delete(kind);this.active=job;this.entryStreak=kind==='entry'?this.entryStreak+1:0;
  const envelope={kind:'raid-preparation-job',job:job.id,jobKind:kind,owner:job.channel.owner,request:job.request};
  try{
   const start=this.now(),json=JSON.stringify(envelope);this.stats.packMs+=this.now()-start;const bytes=new TextEncoder().encode(json).byteLength;if(bytes>16000000)throw Error('Shared raid request exceeds finite payload limit');this.stats.requestJsonBytes+=bytes;
   const postedAt=this.now();job.postedAt=postedAt;this.worker.postMessage(envelope);this.stats.postMs+=this.now()-postedAt;this.stats.posted++;job.postedAt=postedAt;this.stats.maxQueueWaitMs=Math.max(this.stats.maxQueueWaitMs,postedAt-job.queuedAt);
  }catch(error){this.fail(error);}
 }
 receive(event){
  const data=event?.data;if(this.disposed)return;
  const origin=nativeOwnedRaidReply(event,this.worker)||isComputedRaidEntryResult(data?.result)||this.verifyOwnedEvent?.(event,this.worker)===true;
  const job=data?.job===this.active?.id?this.active:data?.job===this.background?.id?this.background:null;
  if(!job){if(origin&&Number.isSafeInteger(data?.job)&&data.job<=this.sequence){this.stats.rejected++;return;}if(this.active||this.background)this.fail(Error('Unknown shared raid job'));return;}
  if(data?.kind==='raid-geometry-suspended'){
   if(origin&&job===this.background){this.stats.rejected++;return;}
   if(!origin||job.channel.kind!=='geometry'||job!==this.active||data.owner!==job.channel.owner||data.token!==job.request.token||data.key!==job.request.key||data.slice!==1){this.fail(Error('Unowned or malformed geometry suspension'));return;}
   this.stats.suspensions++;this.active=null;
   if(job.cancelled||job.channel.closed)this.worker.postMessage({kind:'raid-geometry-cancel',job:job.id,owner:job.channel.owner});
   else this.background=job;
   this.dispatch();return;
  }
  if(!origin||data?.kind!=='raid-preparation-reply'||data.job!==job.id||data.jobKind!==job.channel.kind||data.owner!==job.channel.owner){this.stats.rejected++;this.fail(Error('Unowned or malformed shared raid reply'));return;}
  if(!Number.isFinite(data.computeMs)||data.computeMs<0){this.fail(Error('Invalid shared raid timing payload'));return;}
  const start=this.now(),json=JSON.stringify(data);this.stats.packMs+=this.now()-start;const bytes=new TextEncoder().encode(json).byteLength;if(bytes>16000000){this.fail(Error('Shared raid reply exceeds finite payload limit'));return;}this.stats.replyJsonBytes+=bytes;this.stats.workerComputeMs+=data.computeMs;this.stats.replied++;
  if(this.records.length<32)this.records.push({job:job.id,kind:job.channel.kind,queueWaitMs:job.postedAt-job.queuedAt,workerQueueWaitMs:data.workerQueueWaitMs??null,replyElapsedMs:this.now()-job.postedAt,computeMs:data.computeMs,geometryReused:data.geometryReused===true,cancelled:job.cancelled,geometryMetrics:data.geometryMetrics??null});
  if(job===this.active)this.active=null;else this.background=null;
  if(!job.cancelled&&!job.channel.closed){
   if(data.error)job.channel.onError(Error(data.error));
   else if(!data.result||data.result.owner!==job.channel.owner||data.result.token!==job.request.token||data.result.key!==job.request.key){this.fail(Error('Shared raid result identity mismatch'));return;}
   else {owned.set(data.result,{worker:this.worker,owner:job.channel.owner,kind:job.channel.kind});job.channel.onReply({data:data.result,transportEvent:event});}
  }
  this.dispatch();
 }
 fail(error){
  if(this.disposed||this.failing)return;this.failing=true;this.lastError=String(error?.message??error);this.stats.failed++;this.worker?.terminate();this.worker=null;this.active=null;this.background=null;this.queue.clear();const listeners=[...this.channels.values()].filter(c=>!c.closed).map(c=>c.onError);for(const onError of listeners)onError(Error(this.lastError));this.failing=false;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.worker?.terminate();this.worker=null;this.active=null;this.background=null;this.queue.clear();for(const c of this.channels.values())c.closed=true;this.channels.clear();}
}
