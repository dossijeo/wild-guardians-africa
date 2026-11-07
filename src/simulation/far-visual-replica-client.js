// A read-only terrain lane. There is one operation in flight and one latest
// snapshot slot, so neither camera motion nor authority updates grow a queue.
export function createFarVisualReplicaClient({session,timeoutMs=30000,workerFactory=()=>new Worker(new URL('./far-visual-replica-worker.js',import.meta.url),{type:'module'})}){
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw TypeError('Invalid far replica timeout');
 let worker=null,closed=false,failure=null,latest=null,applied=null,busy=null,pending=null,serial=0,confirmed=null,timer=null,retryTimer=null,retries=0;
 const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 const arm=()=>{clearTimer();timer=setTimeout(()=>fail(Error('Far replica operation timed out')),timeoutMs);};
 const finish=value=>{const item=pending;if(!item)return;pending=null;item.signal?.removeEventListener('abort',item.abort);item.resolve(value);};
 function fail(error){clearTimer();failure=String(error?.message??error);finish(null);busy=null;applied=null;worker?.terminate();worker=null;if(!closed&&latest&&retries<1){retries++;retryTimer=setTimeout(()=>{retryTimer=null;if(closed)return;failure=null;startWorker();},1000);}}
 function startWorker(){
  try{
   const instance=workerFactory();worker=instance;instance.onmessage=({data})=>{
    if(closed||failure||worker!==instance)return;
    if(data?.session!==session){fail(Error('Far replica session mismatch'));return;}
    if(data.kind==='error'){fail(Error(data.message));return;}
    if(data.kind==='snapshotReady'&&busy?.kind==='snapshot'&&data.revision===busy.revision){applied={revision:data.revision};clearTimer();busy=null;pump();return;}
    if(data.kind==='result'&&busy?.kind==='query'&&data.id===busy.id){clearTimer();busy=null;if(pending?.id===data.id){const value=data.result,request=pending.request;if(value!==null&&(!value||!Number.isSafeInteger(value.sequence)||value.sequence<request.expectedSequence||request.expectedRevision==null&&value.sequence!==request.expectedSequence||value.cx!==request.cx||value.cz!==request.cz||!Number.isSafeInteger(value.revision)||value.revision<1||!Number.isFinite(value.elapsed)||!Array.isArray(value.instances)||value.instances.length!==20||value.instances.some((items,slot)=>!Array.isArray(items)||!request.slots.includes(slot)&&items.length>0||items.some(item=>typeof item?.id!=='string'||!item.id||item.slot!==slot||![item.x,item.y,item.z,item.yaw,item.sx,item.sy,item.sz].every(Number.isFinite))))){fail(Error('Invalid far replica result'));return;}finish(current(request)&&value?.revision===confirmed?.revision?value:null);}pump();return;}
    fail(Error('Unexpected far replica response'));
   };instance.onerror=event=>{if(worker===instance)fail(Error(event.message||'Far replica worker failed'));};instance.onmessageerror=()=>{if(worker===instance)fail(Error('Far replica message failed'));};
  }catch(error){fail(error);return;}
  pump();
 }
 const current=request=>confirmed&&confirmed.sequence>=request.expectedSequence&&(request.expectedRevision!=null?confirmed.revision===request.expectedRevision:confirmed.sequence===request.expectedSequence);
 function pump(){
  if(closed||failure||busy||!worker)return;
  try{
   if(latest&&latest.revision!==applied?.revision){const snapshot=latest;busy={kind:'snapshot',revision:snapshot.revision};arm();worker.postMessage({kind:'snapshot',session,...snapshot});return;}
   if(!pending)return;
   if(!current(pending.request)||applied?.revision!==confirmed.revision){finish(null);return;}
   busy={kind:'query',id:pending.id};arm();worker.postMessage({kind:'query',session,id:pending.id,request:pending.request,confirmed});
  }catch(error){fail(error);}
 }
 return {
  updateSnapshot(envelope){
   if(closed)return;
   if(!envelope||!Number.isSafeInteger(envelope.sequence)||envelope.sequence<0||!Number.isFinite(envelope.elapsed)||!Number.isSafeInteger(envelope.revision)||envelope.revision<1||envelope.snapshot?.revision!==envelope.revision){fail(Error('Invalid far replica snapshot'));return;}
   if(latest&&envelope.revision<latest.revision){fail(Error('Far replica revision regressed'));return;}
   latest={sequence:envelope.sequence,elapsed:envelope.elapsed,revision:envelope.revision,snapshot:envelope.snapshot};
   this.confirm(latest);
   if(!worker&&!retryTimer&&!failure)startWorker();
   pump();
  },
  confirm(value){
   if(!value||!Number.isSafeInteger(value.sequence)||value.sequence<0||!Number.isSafeInteger(value.revision)||value.revision<1||!Number.isFinite(value.elapsed))return;
   if(confirmed&&value.sequence<confirmed.sequence)return;
   confirmed={sequence:value.sequence,revision:value.revision,elapsed:value.elapsed};
   if(pending&&!current(pending.request))finish(null);
   pump();
  },
  query(request,{signal=null}={}){
   if(closed||failure||!latest||pending||busy?.kind==='query'||signal?.aborted||!current(request))return Promise.resolve(null);
   return new Promise(resolve=>{const item={id:++serial,request:structuredClone(request),resolve,signal,abort:()=>finish(null)};pending=item;signal?.addEventListener('abort',item.abort,{once:true});pump();});
  },
  status:()=>({mode:'replica',state:closed?'closed':failure?'failed':applied?'ready':'preparing',failure,pending:pending?.id??null,outstanding:busy?.kind==='query'?busy.id:null,revision:applied?.revision??null,pendingRevision:latest?.revision??null,expectedSequence:pending?.request.expectedSequence??null,expectedRevision:pending?.request.expectedRevision??null,dispatchAllowed:!closed&&!failure}),
  dispose(){if(closed)return;closed=true;clearTimer();if(retryTimer!==null)clearTimeout(retryTimer);finish(null);latest=null;applied=null;busy=null;worker?.terminate();worker=null;}
 };
}
