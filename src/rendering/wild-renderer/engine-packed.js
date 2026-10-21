import {EventLifecycleWildRenderer} from './event-lifecycle.js';
export async function createEnginePackedWildRenderer(suppressed){
 const {instance}=await WebAssembly.instantiate(await(await fetch(new URL('./core.wasm',import.meta.url))).arrayBuffer(),{wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Renderer exited ${code}`)}}});
 return new EnginePackedWildRenderer(instance.exports,suppressed);
}
export class EnginePackedWildRenderer extends EventLifecycleWildRenderer {
 constructor(wasm,suppressed){super(wasm);this.suppressed=suppressed;this.packedChunks=new Map();this.lodSources=new Map();}
 suppressionRecords(){
  const ids=[];
  for(const id of this.suppressed()){
   const match=/^spatial:([0-5]):(-?\d+):(-?\d+)$/.exec(id);
   if(match)ids.push(Number(match[1]),Number(match[2]),Number(match[3]));
  }
  return ids;
 }
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
  const ids=this.suppressionRecords();
  const count=snapshot.count,bytes=Math.max(8,count*68+ids.length*4),ptr=this.alloc(bytes);
  try{
   const order=ptr+count*64,hidden=ptr+count*68;
   new Int32Array(this.wasm.memory.buffer,hidden,ids.length).set(ids);
   const n=this.wasm.wr_props(chunk.ptr,count,e.batch.slot,hidden,ids.length/3,...e.batch.chunkOrigin,ptr,order);
   if(n!==r.n)throw Error(`Engine/renderer population mismatch: ${n} != ${r.n}`);
   r.local.set(new Float32Array(this.wasm.memory.buffer,ptr,n*16));
   if(this.nativeLod&&(!this.lightweightLod||r.lodOnly)){
    const bytes=n*44+40,lodPtr=this.alloc(bytes),rangesPtr=lodPtr+n*32,indicesPtr=rangesPtr+24,countsPtr=indicesPtr+n*12;
    r.lod={ptr:lodPtr,bytes,rangesPtr,indicesPtr,countsPtr,ranges:new Float64Array(this.wasm.memory.buffer,rangesPtr,3),indices:new Uint32Array(this.wasm.memory.buffer,indicesPtr,n*3),counts:new Uint32Array(this.wasm.memory.buffer,countsPtr,3)};
    const p=e.batch.prototype;this.wasm.wr_lod_props(chunk.ptr,order,n,p.size[0],p.size[2],p.centerY,lodPtr);
   }
   this.addMetric('nativePropRegistrations',1);
   this.addMetric('engineCopiedBytes',ids.length*4);
  }finally{this.wasm.free(ptr);this.liveBytes-=bytes;}
 }
 lodSource(entry){
  this.trackEntry(entry);
  let r=this.lodSources.get(entry.batch);
  if(!r){
   // Registration uses native Engine filtering. Temporary transform scratch is
   // released by initializeLocal; no persistent pack matrices or spheres exist.
   r={n:entry.batch.instances.length,lodOnly:true,local:{set(){}}};
   this.initializeLocal(entry,r);this.lodSources.set(entry.batch,r);
  }
  return r;
 }
 releaseLod(batch){const r=this.lodSources.get(batch);if(r){this.wasm.free(r.lod.ptr);this.liveBytes-=r.lod.bytes;this.lodSources.delete(batch);}}
 invalidate(batch){this.releaseLod(batch);super.invalidate(batch);}
 releaseBatch(group,batch){this.releaseLod(batch);super.releaseBatch(group,batch);}
 nativeLodBins(batch,group,eye,quality){
  const entry={batch,group,mesh:batch.meshes[0],level:0},r=this.lightweightLod?this.lodSource(entry):this.source(entry),p=batch.prototype,g=batch.group;
  const q=quality==='alta'?1.25:['muy_baja','baja'].includes(quality)?.8:1;
  const ranges=p.role==='formation'?[50,105,10000]:g===2?[10,25,64]:g===1?[16,38,95]:g===4?[17,42,110]:g===0?[38,85,10000]:g===5?[35,75,10000]:[24,55,160];
  for(let i=0;i<3;i++)r.lod.ranges[i]=ranges[i]*q;
  this.wasm.wr_lod(r.lod.ptr,r.n,...eye,r.lod.rangesPtr,batch.meshes.length,r.lod.indicesPtr,r.lod.countsPtr);
  // Orders retained by Three.js must not alias the next native selection output.
  return Array.from({length:3},(_,i)=>Array.from(r.lod.indices.subarray(i*r.n,i*r.n+r.lod.counts[i])));
 }
 freeSource(r){if(r.lod){this.wasm.free(r.lod.ptr);this.liveBytes-=r.lod.bytes;}super.freeSource(r);}
 releaseOwner(group){
  const chunk=this.packedChunks.get(group);
  if(chunk){this.wasm.free(chunk.ptr);this.liveBytes-=chunk.bytes;this.packedChunks.delete(group);}
  super.releaseOwner(group);
 }
}
