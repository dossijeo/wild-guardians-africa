import {EventLifecycleWildRenderer} from './event-lifecycle.js';
export async function createEnginePackedWildRenderer(suppressed){
 const {instance}=await WebAssembly.instantiate(await(await fetch(new URL('./core.wasm',import.meta.url))).arrayBuffer(),{wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Renderer exited ${code}`)}}});
 return new EnginePackedWildRenderer(instance.exports,suppressed);
}
export class EnginePackedWildRenderer extends EventLifecycleWildRenderer {
 constructor(wasm,suppressed){super(wasm);this.suppressed=suppressed;this.packedChunks=new Map();}
 initializeLocal(e,r){
  const snapshot=e.group.userData.propSources?.qaPacked;
  if(snapshot?.format!=='wild-engine-props-v1')throw Error('Missing packed Engine payload');
  let chunk=this.packedChunks.get(e.group);
  if(!chunk){
   const bytes=Math.max(8,snapshot.records.byteLength),ptr=this.alloc(bytes);
   new Uint8Array(this.wasm.memory.buffer,ptr,snapshot.records.byteLength).set(snapshot.records);
   chunk={ptr,bytes,snapshot};this.packedChunks.set(e.group,chunk);
   this.addMetric('engineCopiedBytes',snapshot.records.byteLength);
  }
  if(chunk.snapshot!==snapshot)throw Error('Packed payload changed without chunk replacement');
  // Only invoked on registration/invalidation, never on camera-only frames.
  const ids=[];
  for(const id of this.suppressed()){
   const match=/^spatial:([0-5]):(-?\d+):(-?\d+)$/.exec(id);
   if(match)ids.push(Number(match[1]),Number(match[2]),Number(match[3]));
  }
  const count=snapshot.count,bytes=Math.max(8,count*68+ids.length*4),ptr=this.alloc(bytes);
  try{
   const order=ptr+count*64,hidden=ptr+count*68;
   new Int32Array(this.wasm.memory.buffer,hidden,ids.length).set(ids);
   const n=this.wasm.wr_props(chunk.ptr,count,e.batch.slot,hidden,ids.length/3,...e.batch.chunkOrigin,ptr,order);
   if(n!==r.n)throw Error(`Engine/renderer population mismatch: ${n} != ${r.n}`);
   r.local.set(new Float32Array(this.wasm.memory.buffer,ptr,n*16));
   this.addMetric('nativePropRegistrations',1);
   this.addMetric('engineCopiedBytes',ids.length*4);
  }finally{this.wasm.free(ptr);this.liveBytes-=bytes;}
 }
 releaseOwner(group){
  const chunk=this.packedChunks.get(group);
  if(chunk){this.wasm.free(chunk.ptr);this.liveBytes-=chunk.bytes;this.packedChunks.delete(group);}
  super.releaseOwner(group);
 }
}
