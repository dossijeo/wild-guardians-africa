// Optional telemetry only: callers still own one native request and one body read.
const listeners=new Set();let sequence=0;
export function subscribeAssetTransfers(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
// Telemetry must never turn a successful asset request into a gameplay failure.
const emit=(token,event)=>{if(token)for(const listener of token.listeners)if(listeners.has(listener)){try{listener({...event,id:token.id,url:token.url,kind:token.kind,start:token.start});}catch{}}};
export function beginAssetTransfer(url,kind='fetch'){
 if(!listeners.size||/^(?:blob|data):/.test(url))return null;
 const start=performance.now();let name=url;try{name=new URL(url,globalThis.location?.href??'http://localhost/').href;}catch{}
 const token={id:++sequence,url:name,kind,start,listeners:[...listeners]};emit(token,{type:'start'});return token;
}
export function updateAssetTransfer(token,loaded,total=null,evidence='loader-estimate'){emit(token,{type:'progress',loaded,total,evidence});}
function timingFor(token){if(!token||!performance.getEntriesByName)return null;const now=performance.now();return performance.getEntriesByName(token.url,'resource').findLast(entry=>entry.startTime>=token.start-5&&entry.responseEnd<=now+5)??null;}
export function finishAssetTransfer(token,{loaded=null,failed=false}={}){emit(token,{type:'end',loaded,failed,timing:timingFor(token),end:performance.now()});}
export function cachedAssetTransfer(url){if(!listeners.size)return;const token=beginAssetTransfer(url,'collection-cache');emit(token,{type:'cache'});}
export function observeLoadingManager(manager,{skip=()=>false}={}){
 const pending=new Map(),start=manager.itemStart.bind(manager),end=manager.itemEnd.bind(manager),error=manager.itemError.bind(manager);
 manager.itemStart=url=>{const token=skip(url)?null:beginAssetTransfer(url,'three-loader');if(token){const queue=pending.get(url)??[];queue.push(token);pending.set(url,queue);}start(url);};
 manager.itemEnd=url=>{const queue=pending.get(url),token=queue?.shift();if(queue&&!queue.length)pending.delete(url);finishAssetTransfer(token,{failed:!!token?.failed});end(url);};
 manager.itemError=url=>{const token=pending.get(url)?.[0];if(token)token.failed=true;error(url);};
 return {progress(url,event){const token=pending.get(url)?.[0];updateAssetTransfer(token,event.loaded,event.lengthComputable?event.total:null);},release(){pending.clear();}};
}
export async function readAssetBody(response,type,token){
 if(!token||!response.body?.getReader||typeof ReadableStream==='undefined')return response[type]();
 const length=Number(response.headers.get('Content-Length')),encoding=response.headers.get('Content-Encoding');const total=length>0&&(!encoding||encoding==='identity')?length:null;
 const reader=response.body.getReader();let loaded=0;
 const stream=new ReadableStream({async pull(controller){try{const step=await reader.read();if(step.done){controller.close();reader.releaseLock();return;}loaded+=step.value.byteLength;updateAssetTransfer(token,loaded,total,total?'decoded-content-length':'unknown');controller.enqueue(step.value);}catch(error){reader.releaseLock();controller.error(error);}},async cancel(reason){try{await reader.cancel(reason);}finally{reader.releaseLock();}}});
 const result=await new Response(stream,{headers:response.headers})[type]();
 return result;
}
