// QA only: recalculate resident immutable chunks without publishing results.
export async function probeMudEdgeWorker(world){
 const worker=new Worker(new URL('./mud-edge-worker-probe-worker.js',import.meta.url),{type:'module'}),rows=[];
 const attribute=a=>{const array=a.isInterleavedBufferAttribute?a.data.array:a.array;if(!(array instanceof Float32Array)||a.normalized)throw Error('Probe requires original non-normalized float attributes');return {array,stride:a.isInterleavedBufferAttribute?a.data.stride:a.itemSize,offset:a.offset??0,count:a.count};};
 const request=input=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Mud worker probe timeout')),10000);worker.onmessage=e=>{clearTimeout(timeout);e.data.error?reject(Error(e.data.error)):resolve(e.data);};worker.onerror=e=>{clearTimeout(timeout);reject(Error(e.message));};const start=performance.now();worker.postMessage(input);input.postCpuMs=performance.now()-start;});
 try{
  for(const group of world.chunks.values()){
   const ground=group.children.find(m=>m.userData.ground),mud=group.children.find(m=>m.name==='mangrove-mud-patches');if(!ground||!mud?.geometry.attributes.qaMudEdge)continue;
   const start=performance.now(),g=mud.geometry,input={gp:attribute(ground.geometry.attributes.position),gc:attribute(ground.geometry.attributes.color),gn:attribute(ground.geometry.attributes.normal),p:attribute(g.attributes.position),origin:group.userData.nativeChunkOrigin,outlines:g.userData.mudOutlines};
   const setupCpuMs=performance.now()-start,{result,computeMs}=await request(input),roundTripMs=performance.now()-start;
   for(const [key,name]of [['colors','color'],['normals','normal'],['edges','qaMudEdge']]){const expected=new Uint8Array(g.attributes[name].array.buffer,g.attributes[name].array.byteOffset,g.attributes[name].array.byteLength),actual=new Uint8Array(result[key].buffer);if(expected.length!==actual.length||expected.some((v,i)=>v!==actual[i]))throw Error('Worker changed '+name);}
   rows.push({origin:input.origin,vertices:input.p.count,setupCpuMs,postCpuMs:input.postCpuMs,computeMs,roundTripMs,outputBytes:result.colors.byteLength+result.normals.byteLength+result.edges.byteLength,inputBytes:[...new Set([input.gp.array.buffer,input.gc.array.buffer,input.gn.array.buffer,input.p.array.buffer])].reduce((n,b)=>n+b.byteLength,0),byteIdentical:true});
  }
  if(!rows.length)throw Error('No real mud chunks probed');return {rows,scope:'One serial reusable Web Worker, structured-clone inputs (original buffers never detached), transferable outputs. Includes first boot in first round trip. Main world still renders; no scheduler/streaming integration or FPS improvement claimed.'};
 }finally{worker.terminate();}
}
