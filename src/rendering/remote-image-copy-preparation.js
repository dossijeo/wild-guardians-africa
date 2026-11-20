// Dawn keeps its browser-image copy pipelines on the native device, keyed by
// destination format. A Promise-returning game pipeline factory does not warm
// these hidden first-use pipelines. Exercise the two Three r180 byte-image
// formats before this device is advertised READY, on this same queue/device.
// This pays startup work explicitly; it does not claim to eliminate its cost.
export async function prepareRemoteImageCopies(device,{capture=()=>createImageBitmap(new ImageData(new Uint8ClampedArray([197,31,83,128,17,139,251,64,51,103,211,192,7,41,91,255]),2,2),{premultiplyAlpha:'none',colorSpaceConversion:'none'}),now=()=>performance.now()}={}){
 const started=now(),image=await capture(),textures=[],formats=['rgba8unorm','rgba8unorm-srgb'];
 device.pushErrorScope('validation');let validation,completion;
 try{
  for(const format of formats){
   const texture=device.createTexture({label:'Remote image copy first use: '+format,size:[2,2,1],format,usage:2|16});textures.push(texture);
   // Non-identity flip/alpha avoids a native direct-copy optimization. Both are
   // uniforms of the same per-format copy pipeline, not separate shader keys.
   device.queue.copyExternalImageToTexture({source:image,flipY:true},{texture,premultipliedAlpha:true},[2,2,1]);
  }
  validation=device.popErrorScope();validation.catch(()=>{});
  completion=Promise.resolve(device.queue.onSubmittedWorkDone());
  const [,error]=await Promise.all([completion,validation]);
  if(error)throw Error('Remote image copy preparation failed: '+error.message);
  return {version:1,formats,completed:true,milliseconds:now()-started};
 }finally{
  try{
   validation??=device.popErrorScope();completion??=Promise.resolve(device.queue.onSubmittedWorkDone());
   await Promise.allSettled([completion,validation]);
  }finally{for(const texture of textures)texture.destroy();image.close();}
 }
}
