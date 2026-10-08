import {prepareSkyPixels} from './sky-pixels.js';
self.onmessage=event=>{
 try{const result=prepareSkyPixels(event.data.buffer,event.data.index);self.postMessage(result,[result.image.pixels.buffer,result.environment.pixels.buffer]);}
 catch(error){self.postMessage({error:error.message??String(error)});}
};
