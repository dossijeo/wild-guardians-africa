import {NativeChunkStream} from '../../rendering/chunk-stream.js';

// Shared renderer/navigation stream. Chunk work is
// scheduled by NativeChunkStream, while one C++ world supplies both the
// renderer payload and subsequent synchronous route/surface queries.
export function createSpatialChunkStream(core,{loaded,onData,onError=()=>{},schedule,cancel,prepareData=null,discardData=()=>{},preparationRevision=()=>0}){
  if(!core?.currentChunk())throw Error('Generate the spatial world before streaming chunks');
  const build=(_config,_profile,cx,cz)=>{
    // A resident chunk with zero props still returns 0; only a negative
    // result means it is absent. Do not regenerate such a chunk on every read.
    if(core.selectChunk(cx,cz)<0&&core.addChunk(cx,cz)<0)
      throw Error(`Could not generate spatial chunk ${cx},${cz}`);
    return core.chunkPayload();
  };
  const nativeAsync=core.preparation?async(request,current)=>{
    const {cx,cz}=request,p=core.preparation;
    if(!current())return null;
    // Initial/resident invalidated chunks already belong to the authority.
    // Only absent chunks need a native generation job.
    if(core.selectChunk(cx,cz)>=0)return core.chunkPayload();
    while(current()){
      const id=p.start(cx,cz);
      if(id<=0)throw Error(`Could not dispatch native chunk ${cx},${cz}: ${id}`);
      try{
        while(p.status()!==3){
          if(p.status()===5)throw Error('Native generation stopped');
          // Notification polling, not deferred generation: C++ runs on pthread.
          await new Promise(resolve=>setTimeout(resolve,4));
        }
        if(!current())return null;
        const result=p.publish(id,cx,cz);
        if(result>0)return core.chunkPayload();
        if(result!==-2)throw Error(`Native chunk publication failed: ${result}`);
        // A world edit invalidated the snapshot. Retry from current inputs.
      }finally{p.release();}
    }
    return null;
  }:null;
  const buildAsync=nativeAsync?async(request,current)=>{
    while(current()){
      const data=await nativeAsync(request,current);
      if(!data)return null;
      if(!current()){
        const key=request.cx+','+request.cz;
        if(!stream.dead&&!loaded().has(key)&&!stream.desired.has(key))core.removeChunk(request.cx,request.cz);
        return null;
      }
      if(!prepareData)return data;
      const revision=preparationRevision();
      const prepared=await prepareData(data,()=>current()&&preparationRevision()===revision);
      if(prepared&&current()&&preparationRevision()===revision)return prepared;
      discardData(prepared);
      if(!current()){
        const key=request.cx+','+request.cz;
        if(!stream.dead&&!loaded().has(key)&&!stream.desired.has(key))core.removeChunk(request.cx,request.cz);
        return null;
      }
      // World/quality changed while graphics were private. Read fresh payload.
    }
    return null;
  }:null;
  const stream=new NativeChunkStream({}, {},{loaded,onData,onError,build,buildAsync,
    discardData:data=>{
      discardData(data);
      if(data&&!stream.dead){const key=data.cx+','+data.cz;if(!loaded().has(key)&&!stream.desired.has(key))core.removeChunk(data.cx,data.cz);}
    },
    workerFactory:()=>null,...(schedule?{schedule}:{}),...(cancel?{cancel}:{})});
  // The renderer owns its installed meshes. Releasing a spatial chunk after
  // those meshes are evicted keeps the graph and prop records bounded too.
  stream.releaseChunk=(cx,cz)=>core.removeChunk(cx,cz);
  return stream;
}
