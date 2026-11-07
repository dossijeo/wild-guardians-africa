// Applies a checkpoint and then complete historical boundaries. The supplied
// callbacks own the transaction; this channel never acknowledges a partial
// restoration or synthesizes a successful result.
export function createTemporalRecoveryReceiver({port,session,signal=null,restoreCheckpoint,applyBoundary,onBoundary=()=>{},onError=()=>{}}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||signal!==null&&typeof signal?.addEventListener!=='function'||typeof restoreCheckpoint!=='function'||typeof applyBoundary!=='function'||typeof onBoundary!=='function'||typeof onError!=='function')throw TypeError('Invalid temporal recovery receiver');
 let closed=false,busy=false,lastId=0,cursor=null,failed=false;
 function fail(error){if(closed||failed)return;failed=true;try{port.postMessage({kind:'recoveryFailure',session,message:String(error?.message??error)});}catch{}try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 function dispose(){if(closed)return;closed=true;signal?.removeEventListener('abort',dispose);port.onmessage=null;port.onmessageerror=null;}
 port.onmessage=async({data})=>{if(closed||failed)return;try{
  if(busy||data?.session!==session||!Number.isSafeInteger(data.id)||data.id!==lastId+1||!Number.isSafeInteger(data.sequence)||data.sequence<1)throw Error('Invalid temporal recovery identity');
  let phase;if(data.kind==='recoveryCheckpoint'){if(cursor!==null||data.checkpoint?.sequence!==data.sequence)throw Error('Invalid temporal recovery checkpoint');phase='checkpoint';}
  else if(data.kind==='recoveryBoundary'){if(cursor===null||data.sequence!==cursor+1||data.publication?.sequence!==data.sequence||!Array.isArray(data.publication.events)||!Array.isArray(data.terrain)||data.terrain.some(batch=>!batch||!Array.isArray(batch.chunks))||typeof data.tick!=='boolean')throw Error('Invalid temporal recovery boundary');phase='boundary';}
  else throw Error('Invalid temporal recovery message');
  busy=true;const options=signal===null?{}:{signal},committed=phase==='checkpoint'?await restoreCheckpoint(data.checkpoint,options):await applyBoundary(data,options);if(committed!==true)throw Error('Temporal recovery transaction not committed');
  if(closed||failed||signal?.aborted)return;
  if(phase==='boundary')onBoundary(data.publication.events,data.sequence);cursor=data.sequence;lastId=data.id;busy=false;port.postMessage({kind:'recoveryAck',session,id:data.id,sequence:data.sequence,phase});
 }catch(error){busy=false;fail(error);}};
 port.onmessageerror=()=>fail(Error('Temporal recovery transfer failed'));port.start?.();if(signal?.aborted)dispose();else signal?.addEventListener('abort',dispose,{once:true});
 return {dispose,status(){return {closed,failed,busy,cursor,lastId};}};
}
