// QA only. Attribute ownership scans occur before/after measurement, never per frame.
export function inspectBufferUploads(w){
 const gl=w.renderer.getContext(),original=gl.bufferSubData,ids=new WeakMap(),owners=new Map(),rows=new Map();let next=1;
 const id=b=>{let n=ids.get(b);if(!n){n=next++;ids.set(b,n);}return n;};
 const scan=()=>w.scene.traverse(o=>{
  const attrs={...o.geometry?.attributes,instanceMatrix:o.instanceMatrix,instanceColor:o.instanceColor,index:o.geometry?.index};
  for(const [name,a]of Object.entries(attrs)){const array=a?.array??a?.data?.array;if(!array)continue;const n=id(array.buffer),list=owners.get(n)??new Set();list.add([o.type,o.name,o.parent?.name,name,a.usage??a.data?.usage].join('|'));owners.set(n,list);}
 });
 scan();const start=performance.now();
 gl.bufferSubData=function(target,offset,data,sourceOffset=0,length){
  const begin=performance.now();try{return original.apply(this,arguments);}finally{
   if(data?.buffer){const n=id(data.buffer),key=n+':'+target,r=rows.get(key)??{source:n,target,calls:0,bytes:0,cpuMs:0,maxCpuMs:0,sourceBytes:data.buffer.byteLength};const bytes=data.BYTES_PER_ELEMENT??1,available=data.byteLength-sourceOffset*bytes;const count=length===undefined||length===0?available:length*bytes;const ms=performance.now()-begin;r.calls++;r.bytes+=count;r.cpuMs+=ms;r.maxCpuMs=Math.max(r.maxCpuMs,ms);rows.set(key,r);}
  }
 };
 return ()=>{gl.bufferSubData=original;const end=performance.now();scan();return {start,end,rows:[...rows.values()].map(r=>({...r,owners:[...(owners.get(r.source)??[])].slice(0,12)})).sort((a,b)=>b.bytes-a.bytes),scope:'Synchronous JS WebGL call timings, not GPU execution. Source buffer owners scanned only at endpoints; intermediate/disposed objects can be unknown. Shared backing buffers may have multiple owners. Diagnostic overhead included.'};};
}
