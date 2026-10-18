import {NativeChunkStream} from '../../rendering/chunk-stream.js';

// Shared renderer/navigation stream. Chunk work is
// scheduled by NativeChunkStream, while one C++ world supplies both the
// renderer payload and subsequent synchronous route/surface queries.
export function createSpatialChunkStream(core,{loaded,onData,onError=()=>{},schedule,cancel}){
  if(!core?.currentChunk())throw Error('Generate the spatial world before streaming chunks');
  const build=(_config,_profile,cx,cz)=>{
    // A resident chunk with zero props still returns 0; only a negative
    // result means it is absent. Do not regenerate such a chunk on every read.
    if(core.selectChunk(cx,cz)<0&&core.addChunk(cx,cz)<0)
      throw Error(`Could not generate spatial chunk ${cx},${cz}`);
    return core.chunkPayload();
  };
  const stream=new NativeChunkStream({}, {},{loaded,onData,onError,build,
    workerFactory:()=>null,...(schedule?{schedule}:{}),...(cancel?{cancel}:{})});
  // The renderer owns its installed meshes. Releasing a spatial chunk after
  // those meshes are evicted keeps the graph and prop records bounded too.
  stream.releaseChunk=(cx,cz)=>core.removeChunk(cx,cz);
  return stream;
}
