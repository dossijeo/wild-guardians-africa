import {createRemoteWebGpuHost} from '../../src/rendering/remote-webgpu-host.js';
import {createRemoteWebGpuClient} from '../../src/rendering/remote-webgpu-client.js';
import {externalImageUploadRegions} from '../../src/rendering/remote-resource-uploads.js';
import {prepareRemoteImageCopies} from '../../src/rendering/remote-image-copy-preparation.js';

// One actual device and the production Host/client/MessageChannel. Native copy
// is the pixel oracle, not another renderer or a model of colour conversion.
window.runRemoteImageRegions=async()=>{
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'}),device=await adapter.requestDevice(),errors=[];
 device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 const imageCopyPreparation=await prepareRemoteImageCopies(device);
 const canvas=new OffscreenCanvas(1,1),context=canvas.getContext('webgpu'),channel=new MessageChannel();
 const host=createRemoteWebGpuHost({device,canvas,context,port:channel.port2,requestFrame:()=>0,cancelFrame(){}});
 const client=createRemoteWebGpuClient({port:channel.port1,capabilities:{width:1,height:1,resourceTransportVersion:1},onError:e=>errors.push(e.message)});
 const width=1050,height=799,pitch=Math.ceil(width*4/256)*256,results=[];
 async function readPixels(texture,remote){
  const d=remote?client.device:device,buffer=d.createBuffer({size:pitch*height,usage:9}),encoder=d.createCommandEncoder();
  encoder.copyTextureToBuffer({texture},{buffer,bytesPerRow:pitch},[width,height,1]);d.queue.submit([encoder.finish()]);await buffer.mapAsync(1);
  const bytes=new Uint8Array(buffer.getMappedRange()).slice();buffer.unmap();buffer.destroy();return bytes;
 }
 const pixels=new Uint8ClampedArray(1080*800*4);
 for(let y=0;y<800;y++)for(let x=0;x<1080;x++){const i=(y*1080+x)*4;pixels.set([x%256,y%256,(x+y)%256,[0,37,128,200,255][(x+y)%5]],i);}
 const image=await createImageBitmap(new ImageData(pixels,1080,800),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 try{
  for(const format of ['rgba8unorm','rgba8unorm-srgb'])for(const flipY of [false,true])for(const premultipliedAlpha of [false,true]){
   const descriptor={size:[width,height,1],format,usage:1|2|4|16},native=device.createTexture(descriptor),remote=client.device.createTexture(descriptor);
   const source={source:image,origin:{x:7,y:9},flipY},destination={origin:{x:5,y:3,z:0},premultipliedAlpha,colorSpace:'srgb'},extent=[1033,769,1];
   device.queue.copyExternalImageToTexture(source,{...destination,texture:native},extent);
   client.device.queue.copyExternalImageToTexture(source,{...destination,texture:remote},extent);
   const expected=await readPixels(native,false),actual=await readPixels(remote,true);let mismatches=0;for(let i=0;i<expected.length;i++)if(expected[i]!==actual[i])mismatches++;
   if(image.width!==1080||image.height!==800)throw Error('Transport detached the asset owner');
   results.push({format,flipY,premultipliedAlpha,mismatches});native.destroy();remote.destroy();
  }
  await client.device.queue.onSubmittedWorkDone();const closeReceipt=await client.disposeAsync();
  if(errors.length||results.some(r=>r.mismatches))throw Error(JSON.stringify({errors,results}));
  return {adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture},imageCopyPreparation,results,errors,closeReceipt,remainingResources:host.inspect().resources,assetPreserved:image.width===1080};
 }finally{image.close();client.dispose();await host.dispose();channel.port1.close();channel.port2.close();device.destroy();}
};

// Report native call cost separately from cooperative elapsed time. A smaller
// call is not an optimization if it silently multiplies total upload work.
window.measureRemoteImageRegions=async()=>{
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'}),device=await adapter.requestDevice(),results=[];
 const pixels=new Uint8ClampedArray(4096*2048*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=i%251;pixels[i+1]=97;pixels[i+2]=201;pixels[i+3]=128;}
 let original;
 try{for(const edge of [4096,1024,512,256])for(let sample=0;sample<3;sample++){
  original=await createImageBitmap(new ImageData(pixels,4096,2048),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
  const image=structuredClone(original),texture=device.createTexture({size:[4096,2048],format:'rgba8unorm',usage:18}),calls=[],started=performance.now();
  const op={method:'copyExternalImageToTexture',args:[{source:image,flipY:true},{texture,premultipliedAlpha:false},[4096,2048,1]]};
  for(const region of externalImageUploadRegions(op,texture,edge)){const at=performance.now();device.queue.copyExternalImageToTexture(...region.args);calls.push(performance.now()-at);await scheduler.yield();}
  await device.queue.onSubmittedWorkDone();results.push({edge,sample,calls:calls.length,totalCallMs:calls.reduce((a,b)=>a+b,0),maxCallMs:Math.max(...calls),elapsedMs:performance.now()-started});image.close();original.close();texture.destroy();
 }return {adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture},results};}finally{original.close();device.destroy();}
};
