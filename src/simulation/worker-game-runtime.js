// Coordinates one authoritative Worker with a presentation-only WorldScene.
// Its timer is independent of rendering; it never advances the game locally.
export function createWorkerGameRuntime({client,world,session,stepSeconds=.05,nightFastForward=true,maxCommands=128,controlReserve=8,now=()=>performance.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),onError=()=>{}}){
 if(!client?.ready||typeof client.submit!=='function'||typeof world?.createConfirmedReceiver!=='function'||typeof session!=='string'||!session||!Number.isFinite(stepSeconds)||stepSeconds<=0||stepSeconds>1||typeof nightFastForward!=='boolean'||!Number.isSafeInteger(maxCommands)||maxCommands<1||!Number.isSafeInteger(controlReserve)||controlReserve<1)throw TypeError('Invalid worker game runtime');
 const receiver=world.createConfirmedReceiver(session),queue=[],pendingChunks=new Set();let starting=false,running=false,closed=false,fault=null,busy=false,activeItem=null,timer=null,last=null,fraction=0,fast=nightFastForward,confirmed=null;
 function fail(error){if(fault||closed)return;fault=error instanceof Error?error:Error(String(error));running=false;if(timer!==null)cancel(timer);timer=null;if(activeItem?.kind==='command')activeItem.reject(fault);for(const item of queue)if(item.kind==='command')item.reject(fault);queue.length=0;try{onError(fault);}catch{}client.dispose();}
 function enqueueElapsed(at){
  if(!Number.isFinite(at)||last!==null&&at<last)throw RangeError('Runtime clock must be monotonic');
  if(last!==null){const total=fraction+(at-last)/1000,steps=Math.floor((total+1e-10)/stepSeconds);if(!Number.isSafeInteger(steps))throw RangeError('Runtime clock overflow');fraction=Math.max(0,total-steps*stepSeconds);if(steps){const previous=queue.at(-1);if(previous?.kind==='steps'&&previous.fast===fast){previous.count+=steps;if(!Number.isSafeInteger(previous.count))throw RangeError('Runtime backlog overflow');}else queue.push({kind:'steps',count:steps,fast});}}
  last=at;
 }
 function addDemands(result){
  const missing=result.residency?.missing;if(!Array.isArray(missing))throw TypeError('Missing authority residency');
  const add=[];for(const key of missing){if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid authority residency');if(!pendingChunks.has(key)){pendingChunks.add(key);add.push({kind:'chunk',key});}}
  queue.unshift(...add);
 }
 function pump(){
  if(!running||busy||closed||fault||!queue.length)return;
  const item=queue[0],command=item.kind==='steps'?{kind:'advance',seconds:stepSeconds,nightFastForward:item.fast}:item.kind==='chunk'?{kind:'addChunk',key:item.key}:item.command;
  if(item.kind==='steps'){if(!--item.count)queue.shift();}else queue.shift();
  let request;try{request=client.submit(command);if(!request.accepted)throw Error('Worker command not admitted: '+request.reason);busy=true;activeItem=item;}
  catch(error){if(item.kind==='command')item.reject(error);fail(error);return;}
  request.result.then(result=>{
   if(closed||fault)return;const accepted=receiver.accept(result);if(!accepted.accepted)throw Error('Confirmed scene publication rejected: '+accepted.reason);
   confirmed=result;if(item.kind==='chunk')pendingChunks.delete(item.key);addDemands(result);if(item.kind==='command')item.resolve(result);busy=false;activeItem=null;pump();
  }).catch(error=>{busy=false;if(item.kind==='command')item.reject(error);activeItem=null;fail(error);});
 }
 function wake(){timer=null;if(!running||closed||fault)return;try{enqueueElapsed(now());pump();if(running&&!closed&&!fault)timer=schedule(wake,stepSeconds*1000);}catch(error){fail(error);}}
 async function start(){
  if(closed||fault||running||starting)throw Error('Worker runtime cannot start');starting=true;try{await client.ready;if(closed||fault)throw Error('Worker runtime closed before start');running=true;last=now();
   // The first publication supplies residency demand before the first tick.
   const initial=await submit({kind:'snapshot'});if(closed||fault)throw fault??Error('Worker runtime closed');last=now();fraction=0;timer=schedule(wake,stepSeconds*1000);return initial;
  }catch(error){fail(error);throw error;}finally{starting=false;}
 }
 function submit(command){
  if(!running||closed||fault)return Promise.reject(fault??Error('Worker runtime is not running'));
  if(!command||typeof command!=='object'||Array.isArray(command)||['advance','addChunk'].includes(command.kind))return Promise.reject(TypeError('Invalid external worker runtime command'));
  try{enqueueElapsed(now());const count=queue.filter(item=>item.kind==='command').length,control=['pause','resume','snapshot'].includes(command.kind);if(count>=maxCommands+(control?controlReserve:0))return Promise.reject(Error('Worker runtime command queue is full'));const captured=structuredClone(command);return new Promise((resolve,reject)=>{queue.push({kind:'command',command:captured,resolve,reject});pump();});}catch(error){fail(error);return Promise.reject(error);}
 }
 return {start,submit,setNightFastForward(value){if(typeof value!=='boolean'||!running||closed||fault)throw TypeError('Invalid runtime speed policy');enqueueElapsed(now());fast=value;pump();},status(){return {running,closed,fault:fault?.message??null,busy,queued:queue.length,pendingSteps:queue.reduce((sum,item)=>sum+(item.kind==='steps'?item.count:0),activeItem?.kind==='steps'?1:0),pendingChunks:pendingChunks.size,confirmedSequence:receiver.status().sequence,confirmedElapsed:receiver.status().lastElapsed,saveAvailable:confirmed?.saveAvailable??false};},dispose(){if(closed)return;closed=true;running=false;if(timer!==null)cancel(timer);timer=null;const error=Error('Worker runtime disposed');if(activeItem?.kind==='command')activeItem.reject(error);for(const item of queue)if(item.kind==='command')item.reject(error);queue.length=0;client.dispose();}};
}
