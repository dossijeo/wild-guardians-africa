import {buildNativeChunk,chunkTransferables} from './chunk-data.js';

self.onmessage=({data:request})=>{
  const {id,epoch,config,profile,cx,cz}=request;
  try{const data=buildNativeChunk(config,profile,cx,cz);self.postMessage({id,epoch,data},chunkTransferables(data));}
  catch(error){self.postMessage({id,epoch,error:String(error.stack??error)});}
};
