// A bounded, presentation-only view of regional vegetation. The authority is
// queried one chunk at a time and remains the only owner of world state.
// The receiver owns graphical admission and must preserve 3D coverage while
// replacing or retiring a chunk.
export function createWebGpuFarRegion({query,currentSequence,currentRevision=()=>null,onChunk,onRemove,onInvalidate,getSuppressed=()=>[],now=()=>performance.now(),slots=[0,1,2,3],start=90,end=330,retryMs=100,maxChunks=256}={}){
 if(typeof query!=='function'||typeof currentSequence!=='function'||typeof currentRevision!=='function'||typeof onChunk!=='function'||typeof onRemove!=='function'||typeof onInvalidate!=='function'||typeof getSuppressed!=='function'||typeof now!=='function'||!Array.isArray(slots)||!slots.length||slots.some(slot=>!Number.isInteger(slot)||slot<0||slot>=20)||new Set(slots).size!==slots.length||![start,end,retryMs].every(Number.isFinite)||start<0||end<=start||retryMs<0||!Number.isSafeInteger(maxChunks)||maxChunks<1)throw TypeError('Invalid far region');
 const selectedSlots=[...slots],wanted=new Map(),offered=new Map(),known=new Map(),deferred=new Set(),retryAt=new Map();let closed=false,pending=null,generation=0,revision=null,nextRetry=0,camera=null;
 const sequence=()=>{const n=currentSequence();if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid confirmed sequence');return n;};
 const key=(cx,cz)=>`${cx},${cz}`;
 function cancel(){if(pending){pending.controller.abort();pending=null;}}
 function updateCamera(value){
  if(closed)throw Error('Far region disposed');if(!value||![value.x,value.z].every(Number.isFinite))throw TypeError('Invalid far region camera');
  const minX=Math.floor((value.x-end+24)/48),maxX=Math.floor((value.x+end+24)/48),minZ=Math.floor((value.z-end+24)/48),maxZ=Math.floor((value.z+end+24)/48),next=[];
  // Reject impossible regions before iterating over an arbitrarily large box.
  if(Math.max(Math.abs(minX),Math.abs(maxX),Math.abs(minZ),Math.abs(maxZ))>1000000||(maxX-minX+1)*(maxZ-minZ+1)>maxChunks*4)throw RangeError('Far region exceeds chunk budget');
  for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++){
   const dx=Math.abs(cx*48-value.x),dz=Math.abs(cz*48-value.z),near=Math.hypot(Math.max(0,dx-24),Math.max(0,dz-24)),far=Math.hypot(dx+24,dz+24);
   if(near<=end&&far>=start)next.push({cx,cz,near});
  }
  if(next.length>maxChunks)throw RangeError('Far region exceeds chunk budget');next.sort((a,b)=>a.near-b.near||a.cz-b.cz||a.cx-b.cx);
  camera={x:value.x,z:value.z};const nextKeys=new Set(next.map(item=>key(item.cx,item.cz)));if(pending&&!nextKeys.has(pending.key))cancel();
  for(const [id,item] of known)if(!nextKeys.has(id)){onRemove({cx:item.cx,cz:item.cz,reason:'camera'});offered.delete(id);known.delete(id);}
  for(const id of deferred)if(!nextKeys.has(id))deferred.delete(id);for(const id of retryAt.keys())if(!nextKeys.has(id))retryAt.delete(id);
  wanted.clear();for(const item of next)wanted.set(key(item.cx,item.cz),item);return wanted.size;
 }
 function invalidate({reason='world',chunks=null}={}){
  if(closed)throw Error('Far region disposed');if(typeof reason!=='string'||!reason||chunks!==null&&(!Array.isArray(chunks)||chunks.some(item=>!Number.isSafeInteger(item?.cx)||!Number.isSafeInteger(item?.cz))))throw TypeError('Invalid far region invalidation');
  const at=sequence(),affected=chunks?.map(({cx,cz})=>({cx,cz}))??null;generation++;cancel();onInvalidate({reason,sequence:at,chunks:affected});if(affected){for(const item of affected){const id=key(item.cx,item.cz);offered.delete(id);deferred.delete(id);retryAt.delete(id);}}else{offered.clear();deferred.clear();retryAt.clear();revision=null;}nextRetry=0;
 }
 function pump(){
  if(closed||!camera||pending)return false;const time=now();if(time<nextRetry)return false;const at=sequence(),item=[...wanted.entries()].find(([id])=>!offered.has(id)&&!deferred.has(id)&&time>=(retryAt.get(id)??0));if(!item)return false;
  // Request the current native revision so an unannounced revision change can
  // be detected instead of repeatedly receiving a stale-revision null.
  const [id,{cx,cz}]=item,controller=new AbortController(),expectedRevision=currentRevision();if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1))throw Error('Invalid confirmed far visual revision');const request={cx,cz,slots:[...selectedSlots],expectedSequence:at,expectedRevision},ticket={key:id,controller,generation,sequence:at};pending=ticket;const current=()=>expectedRevision===null?sequence()===at:currentRevision()===expectedRevision&&sequence()>=at;
  Promise.resolve().then(()=>query(request,{signal:controller.signal})).then(async value=>{
   if(closed||pending!==ticket||controller.signal.aborted||ticket.generation!==generation||!wanted.has(id))return;
   if(!value||!current()){pending=null;nextRetry=now()+retryMs;return;}
   if(value.cx!==cx||value.cz!==cz||!Number.isSafeInteger(value.sequence)||value.sequence<at||expectedRevision===null&&value.sequence!==at||expectedRevision!==null&&value.revision!==expectedRevision||!Number.isSafeInteger(value.revision)||value.revision<1||!Array.isArray(value.instances)||value.instances.length!==20||value.instances.some((items,slot)=>!Array.isArray(items)||!selectedSlots.includes(slot)&&items.length))throw Error('Invalid far region response');
   if(revision!==null&&revision!==value.revision){pending=null;generation++;onInvalidate({reason:'revision',sequence:at});offered.clear();deferred.clear();retryAt.clear();revision=null;nextRetry=now()+retryMs;return;}
   const hidden=new Set(getSuppressed()),seen=new Set(),instances=value.instances.map(items=>items.filter(tree=>{if(!tree||typeof tree.id!=='string'||!tree.id||seen.has(tree.id)||![tree.x,tree.y,tree.z,tree.yaw,tree.sx??tree.scale,tree.sy??tree.scale,tree.sz??tree.scale].every(Number.isFinite))throw Error('Invalid far region instance');seen.add(tree.id);return !hidden.has(tree.id);}));
   const accepted=await onChunk({cx,cz,sequence:sequence(),revision:value.revision,instances},{signal:controller.signal});
   if(closed||pending!==ticket||controller.signal.aborted||ticket.generation!==generation||!wanted.has(id))return;
   pending=null;if(accepted==='deferred'){deferred.add(id);return;}if(accepted===false||!current()){retryAt.set(id,now()+retryMs);return;}
   revision=value.revision;retryAt.delete(id);offered.set(id,{cx,cz,revision});known.set(id,{cx,cz});nextRetry=0;
  }).catch(error=>{if(pending===ticket)pending=null;if(!closed&&!controller.signal.aborted){generation++;onInvalidate({reason:'error',sequence:sequence(),error});offered.clear();deferred.clear();retryAt.clear();revision=null;nextRetry=now()+retryMs;}});
  return true;
 }
 return {updateCamera,invalidate,pump,retry(){if(closed)throw Error('Far region disposed');deferred.clear();retryAt.clear();nextRetry=0;},status(){return {closed,sequence:closed?null:sequence(),revision,wanted:wanted.size,offered:offered.size,deferred:deferred.size,pending:pending?.key??null};},dispose(){if(closed)return;closed=true;cancel();wanted.clear();offered.clear();known.clear();deferred.clear();retryAt.clear();}};
}
