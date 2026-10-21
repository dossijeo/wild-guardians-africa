export async function createWildRenderer(url=new URL('./core.wasm',import.meta.url)){
 const {instance}=await WebAssembly.instantiate(await(await fetch(url)).arrayBuffer(),{wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Renderer exited ${code}`)}}});
 return new WildRenderer(instance.exports);
}
export class WildRenderer{
 constructor(wasm){this.wasm=wasm;this.liveBytes=0;this.metrics={};}
 alloc(bytes){const p=this.wasm.malloc(bytes);if(!p)throw Error('Wild Renderer allocation failed');this.liveBytes+=bytes;return p;}
 release(g){if(!g.wr)return;this.wasm.free(g.wr.ptr);this.liveBytes-=g.wr.bytes;delete g.wr;}
 pack(g,entries,source,frustum,origin,omitZero){
  const start=performance.now(),n=entries.reduce((s,e)=>s+e.mesh.count,0),cap=g.capacity,ec=entries.length;
  if(g.wr&&(g.wr.entryCapacity<ec))this.release(g);
  if(!g.wr){
   const entryCapacity=Math.max(8,2**Math.ceil(Math.log2(ec))),bytes=cap*136+entryCapacity*176+192,ptr=this.alloc(bytes),buffer=this.wasm.memory.buffer;
   const inputPtr=ptr,visPtr=ptr+cap*64,outputPtr=ptr+cap*68,outVisPtr=ptr+cap*132,descPtr=ptr+cap*136,planesPtr=descPtr+entryCapacity*176;
   g.wr={ptr,bytes,entryCapacity,inputPtr,visPtr,outputPtr,outVisPtr,descPtr,planesPtr,input:new Float32Array(buffer,inputPtr,cap*16),vis:new Float32Array(buffer,visPtr,cap),output:new Float32Array(buffer,outputPtr,cap*16),outVis:new Float32Array(buffer,outVisPtr,cap),desc:new Float64Array(buffer,descPtr,entryCapacity*22),planes:new Float64Array(buffer,planesPtr,24),versions:[]};
   g.mesh.instanceMatrix.array=g.wr.output;g.mesh.geometry.attributes.nativeVisibility.array=g.wr.outVis;
  }
  const w=g.wr;let offset=0,copiedBytes=0;
  if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();const sphere=source.geometry.boundingSphere;
  for(let k=0;k<ec;k++){
   const e=entries[k],a=e.mesh.instanceMatrix,v=e.mesh.geometry.attributes.nativeVisibility,old=w.versions[k];
   if(!old||old.mesh!==e.mesh||old.offset!==offset||old.count!==e.mesh.count||old.version!==a.version){w.input.set(a.array.subarray(0,e.mesh.count*16),offset*16);copiedBytes+=e.mesh.count*64;}
   if(!old||old.mesh!==e.mesh||old.offset!==offset||old.count!==e.mesh.count||old.visibility!==v?.version){if(v)w.vis.set(v.array.subarray(0,e.mesh.count),offset);else w.vis.fill(1,offset,offset+e.mesh.count);copiedBytes+=e.mesh.count*4;}
   w.versions[k]={mesh:e.mesh,offset,count:e.mesh.count,version:a.version,visibility:v?.version};
   w.desc.set(e.group.matrixWorld.elements,k*22);w.desc.set([sphere.center.x,sphere.center.y,sphere.center.z,sphere.radius,offset,e.mesh.count],k*22+16);offset+=e.mesh.count;
  }
  w.versions.length=ec;
  for(let p=0;p<6;p++){const q=frustum.planes[p];w.planes.set([q.normal.x,q.normal.y,q.normal.z,q.constant],p*4);}
  const kernelStart=performance.now();
  const count=this.wasm.wr_pack(w.inputPtr,w.visPtr,w.descPtr,ec,w.planesPtr,origin.x,origin.z,w.outputPtr,w.outVisPtr,omitZero?1:0);
  const end=performance.now();this.metrics.descriptorBytes=(this.metrics.descriptorBytes??0)+ec*176+192;this.metrics.calls=(this.metrics.calls??0)+1;this.metrics.inputMs=(this.metrics.inputMs??0)+kernelStart-start;this.metrics.kernelMs=(this.metrics.kernelMs??0)+end-kernelStart;this.metrics.copiedBytes=(this.metrics.copiedBytes??0)+copiedBytes;this.metrics.instances=(this.metrics.instances??0)+n;
  return count;
 }
}
