import {renderGuardianProbe} from './guardian-worker-probe-render.js';
self.onmessage=async({data:{url,width,height,dpr,poses}})=>{
 let bitmap;
 try{
  const start=performance.now();bitmap=await createImageBitmap(await(await fetch(url)).blob(),{premultiplyAlpha:'premultiply',colorSpaceConversion:'default'});
  const canvas=new OffscreenCanvas(width,height),magicCanvas=new OffscreenCanvas(width,width),contexts=[];
  // QA adapter for the DOM sizing fields of the unchanged generated renderer.
  // Production needs an explicit sizing interface and lifecycle, not this shim.
  globalThis.devicePixelRatio=dpr;
  for(const c of [canvas,magicCanvas]){c.clientWidth=width;c.clientHeight=c===canvas?height:width;c.dataset={};const original=c.getContext.bind(c);c.getContext=(...args)=>{const t=performance.now();try{return original(...args);}finally{contexts.push({type:args[0],ms:performance.now()-t});}};}
  const result=renderGuardianProbe(canvas,magicCanvas,bitmap,poses);
  self.postMessage({...result,contexts,elapsedMs:performance.now()-start},result.results.flatMap(r=>[r.pixels.buffer,r.magic.buffer,r.positions.buffer]));
 }catch(error){self.postMessage({error:String(error),stack:error.stack});}finally{bitmap?.close();}
};
