import {buildHorizonData,horizonTransferables} from './horizon-data.js';

self.onmessage=({data:request})=>{
  try{const data=buildHorizonData(request);self.postMessage({id:request.id,data},horizonTransferables(data));}
  catch(error){self.postMessage({id:request.id,error:String(error.stack??error)});}
};
