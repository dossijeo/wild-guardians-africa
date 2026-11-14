import {prepareSkyPixels} from './sky-pixels.js';
self.onmessage=event=>{
 try{const result=prepareSkyPixels(event.data.buffer,event.data.index,{waterSlope:event.data.waterSlope===true});self.postMessage(result,[result.image.pixels.buffer,result.environment.pixels.buffer,...(result.waterSlope?[result.waterSlope.pixels.buffer]:[])]);}
 catch(error){self.postMessage({error:error.message??String(error)});}
};
