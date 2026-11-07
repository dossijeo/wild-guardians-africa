// Approximation only: object headers and shared backing stores vary between
// engines. Count all reachable payloads without serializing or copying them.
export function estimateRetainedBytes(value,seen=new WeakSet()){
 if(typeof value==='string')return value.length*2;
 if(value===null||typeof value!=='object')return 8;
 if(seen.has(value))return 0;seen.add(value);
 if(value instanceof ArrayBuffer||typeof SharedArrayBuffer!=='undefined'&&value instanceof SharedArrayBuffer)return value.byteLength;
 if(ArrayBuffer.isView(value))return value.byteLength;
 if(value instanceof Map){let size=32;for(const [key,item] of value)size+=estimateRetainedBytes(key,seen)+estimateRetainedBytes(item,seen)+16;return size;}
 if(value instanceof Set){let size=32;for(const item of value)size+=estimateRetainedBytes(item,seen)+8;return size;}
 let size=Array.isArray(value)?value.length*8:32;
 for(const [key,item] of Object.entries(value))size+=key.length*2+estimateRetainedBytes(item,seen);
 return size;
}

// Reuse the preliminary traversal when the confirmed checkpoint only adds the
// work payload. Values shared between the two payloads may be counted twice.
export function createRecoveryCheckpointEstimator(){
 let base=null,sequence=null,bytes=0;
 return {estimate(checkpoint,{preflight=false}={}){
  if(!checkpoint||typeof checkpoint!=='object'||!Number.isSafeInteger(checkpoint.sequence))throw TypeError('Invalid recovery checkpoint');
  if(preflight){base=typeof WeakRef==='function'?new WeakRef(checkpoint):null;sequence=checkpoint.sequence;bytes=estimateRetainedBytes(checkpoint);return bytes;}
  const previous=base?.deref();
  if(previous&&sequence===checkpoint.sequence&&!Object.hasOwn(previous,'workCheckpoint')){
   const keys=Object.keys(previous),actual=Object.keys(checkpoint),added=Object.hasOwn(checkpoint,'workCheckpoint');
   if(actual.length===keys.length+(added?1:0)&&keys.every(key=>Object.hasOwn(checkpoint,key)&&Object.is(checkpoint[key],previous[key])))return bytes+(added?'workCheckpoint'.length*2+estimateRetainedBytes(checkpoint.workCheckpoint):0);
  }
  return estimateRetainedBytes(checkpoint);
 }};
}
