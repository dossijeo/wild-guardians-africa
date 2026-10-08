// Decode compressed pixels off the rendering thread; transfer the bitmap owner.
self.onmessage=async event=>{const {id,buffer,type}=event.data;let bitmap;try{
 if(typeof createImageBitmap!=='function'){self.postMessage({id,error:'ImageBitmap unavailable in Worker',unsupported:true});return;}
 bitmap=await createImageBitmap(new Blob([buffer],{type:type??''}),{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
 self.postMessage({id,bitmap},[bitmap]);bitmap=null;
}catch(error){bitmap?.close();self.postMessage({id,error:error.message??String(error)});}};
