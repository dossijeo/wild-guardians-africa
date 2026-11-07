// Optional request/response lane on a single presentation port. The host never
// queues regional work; closing or replacing the port aborts its one request.
export function createFarVisualPortServer({session,query,send}){
 if(typeof session!=='string'||!session||typeof query!=='function'||typeof send!=='function')throw TypeError('Invalid far visual server');
 let closed=false,lastId=0,pending=null;
 function reply(id,result,error){if(closed)return;try{send({kind:'farVisualResult',session,id,...(error?{error:String(error.message??error)}:{result})});}catch{}}
 return {
  receive(data){
   if(closed||!data||data.session!==session)return false;
   if(data.kind==='farVisualCancel'){if(!Number.isSafeInteger(data.id)||data.id<1)throw TypeError('Invalid far visual cancellation');if(pending?.id===data.id)pending.controller.abort();return true;}
   if(data.kind!=='farVisualQuery')return false;
   if(!Number.isSafeInteger(data.id)||data.id<=lastId)throw TypeError('Invalid far visual request ID');lastId=data.id;
   if(pending){reply(data.id,null);return true;}
   const controller=new AbortController(),item={id:data.id,controller};pending=item;
   Promise.resolve().then(()=>query(data.request,{signal:controller.signal})).then(result=>reply(item.id,controller.signal.aborted?null:result??null),error=>reply(item.id,null,controller.signal.aborted?null:error)).finally(()=>{if(pending===item)pending=null;});
   return true;
  },
  dispose(){if(closed)return;closed=true;pending?.controller.abort();pending=null;}
 };
}

// Each graphical port has its own IDs and accepts a result only at the exact
// confirmed state that requested it. Aborts never create an unbounded queue.
export function createFarVisualPortClient({session,port,sequence,revision=()=>null}){
 if(typeof revision!=='function')throw TypeError('Invalid far visual revision source');
 if(typeof session!=='string'||!session||typeof port?.postMessage!=='function'||typeof sequence!=='function')throw TypeError('Invalid far visual client');
 let closed=false,serial=0,outstanding=null,pending=null;
 const current=request=>request.expectedRevision!=null&&revision()!==null?revision()===request.expectedRevision&&sequence()>=request.expectedSequence:sequence()===request.expectedSequence;
 function finish(value,error){if(!pending)return;const item=pending;pending=null;item.signal?.removeEventListener('abort',item.abort);if(error)item.reject(error);else item.resolve(value);}
 return {
  query(request,{signal=null}={}){
   if(!request||!Number.isSafeInteger(request.expectedSequence)||request.expectedSequence<0||!Number.isSafeInteger(request.cx)||!Number.isSafeInteger(request.cz)||Math.abs(request.cx)>1000000||Math.abs(request.cz)>1000000||!Array.isArray(request.slots)||!request.slots.length||request.slots.some(slot=>!Number.isInteger(slot)||slot<0||slot>=20)||new Set(request.slots).size!==request.slots.length||request.expectedRevision!=null&&(!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<1)||signal!==null&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw TypeError('Invalid far visual request');
   if(closed||outstanding!==null||signal?.aborted||!current(request))return Promise.resolve(null);
   if(serial>=Number.MAX_SAFE_INTEGER)throw Error('Far visual request IDs exhausted');
   return new Promise((resolve,reject)=>{const id=++serial,item={id,request:structuredClone(request),signal,resolve,reject};item.abort=()=>{if(pending!==item)return;try{port.postMessage({kind:'farVisualCancel',session,id});}catch{}finish(null);};pending=item;outstanding=id;signal?.addEventListener('abort',item.abort,{once:true});try{port.postMessage({kind:'farVisualQuery',session,id,request:item.request});}catch(error){outstanding=null;finish(null,error);}if(signal?.aborted)item.abort();});
  },
  receive(data){if(data?.kind!=='farVisualResult'||data.session!==session)return false;if(!Number.isSafeInteger(data.id)||data.id<1||data.id>serial)throw TypeError('Invalid far visual response ID');if(data.id!==outstanding)return true;outstanding=null;if(!pending||pending.id!==data.id)return true;const request=pending.request,value=data.result;if(data.error!==undefined){finish(null,Error(String(data.error)));return true;}if(value===null||!current(request)){finish(null);return true;}if(!value||!Number.isSafeInteger(value.sequence)||value.sequence<request.expectedSequence||(request.expectedRevision==null||revision()===null)&&value.sequence!==request.expectedSequence||value.cx!==request.cx||value.cz!==request.cz||!Number.isSafeInteger(value.revision)||value.revision<1||request.expectedRevision!=null&&value.revision!==request.expectedRevision||!Number.isFinite(value.elapsed)||!Array.isArray(value.instances)||value.instances.length!==20||value.instances.some((items,slot)=>!Array.isArray(items)||!request.slots.includes(slot)&&items.length))throw TypeError('Invalid far visual response');finish(value);return true;},
  dispose(){if(closed)return;closed=true;if(pending){try{port.postMessage({kind:'farVisualCancel',session,id:pending.id});}catch{}finish(null);}outstanding=null;}
 };
}
