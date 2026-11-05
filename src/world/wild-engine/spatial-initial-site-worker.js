import {findSpatialStart} from './spatial-initial-site.js';

self.onmessage=async({data})=>{
 try{if(!data||!(data.module instanceof WebAssembly.Module)||!data.state||!data.payload)throw TypeError('Invalid initial site request');const result=await findSpatialStart(data.module,data.state,data.payload);self.postMessage({kind:'result',result});}
 catch(error){self.postMessage({kind:'error',message:String(error?.message??error)});}
};
