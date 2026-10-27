// QA-only initial-loading pilot. The world readiness barrier prevents drawing
// partially uploaded actors. Original Texture/Source/bitmap ownership is retained.
export function createTexturePilot(renderer,assets,{scheduler,signal,check}){
 const selected=new Set(),stats={completed:0,fallbacks:0,rejectedAlpha:0,units:0,maxUnitMs:0,workMs:0,conversionMs:0,peakPixelBytes:0,records:[]};
 for(const [url,model]of assets.modelSources)if(url.includes('5ac817bcc'))model.scene.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))for(const slot of ['map','normalMap','roughnessMap'])if(material[slot])selected.add(material[slot]);});
 const worker=new Worker(new URL('./texture-pixel-probe-worker.js',import.meta.url),{type:'module'});
 let closed=false,pending=null;
 const dispose=()=>{if(closed)return;closed=true;worker.terminate();pending?.reject(Error('Pixel pilot disposed'));pending=null;signal?.removeEventListener('abort',dispose);};
 signal?.addEventListener('abort',dispose,{once:true});
 worker.onmessage=({data})=>{const request=pending;pending=null;if(!request)return;data.error?request.reject(Error(data.error)):request.resolve(data);};
 worker.onerror=event=>{pending?.reject(Error(event.message));pending=null;dispose();};
 const alive=()=>{check();if(closed)throw Error('Pixel pilot closed');};
 const upload=async texture=>{
  if(closed||!selected.has(texture)||!scheduler||!(texture.image instanceof ImageBitmap)||renderer.properties.get(texture).__webglTexture)return false;
  alive();let started=false;
  try{
   const bitmap=await createImageBitmap(texture.image);try{alive();}catch(error){bitmap.close();throw error;}
   const data=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{dispose();reject(Error('Pixel pilot conversion timeout'));},30000);pending={resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}};try{worker.postMessage({bitmap},[bitmap]);}catch(error){bitmap.close();pending.reject(error);pending=null;}});
   alive();stats.conversionMs+=data.conversionMs;stats.peakPixelBytes=Math.max(stats.peakPixelBytes,data.pixels.byteLength);
   if(!data.opaque){stats.rejectedAlpha++;return false;}
   const gl=renderer.getContext(),{width,height}=texture.image,pixels=data.pixels;
   const owner=new AbortController(),abort=()=>owner.abort();signal?.addEventListener('abort',abort,{once:true});
   const record={name:texture.name,units:[],began:performance.now()},key=Symbol('texture-pilot');stats.records.push(record);let phase='allocation',lastEnd=performance.now();
   const timer=setTimeout(()=>{record.timeout={phase,cost:scheduler.jobs.get(key)?.cost,scheduler:scheduler.snapshot()};abort();},30000);let finished=false;
   const unit=fn=>{alive();const begin=performance.now();try{fn();}finally{renderer.resetState();const end=performance.now(),duration=end-begin;record.units.push({phase,ms:duration,waitMs:begin-lastEnd});lastEnd=end;stats.units++;stats.workMs+=duration;stats.maxUnitMs=Math.max(stats.maxUnitMs,duration);}};
   try{await scheduler.submit((function*(){
    let handle;
    unit(()=>{started=true;const ready=texture.source.dataReady;texture.source.dataReady=false;try{renderer.initTexture(texture);}finally{texture.source.dataReady=ready;}handle=renderer.properties.get(texture).__webglTexture;if(!handle)throw Error('Missing allocated texture');});phase='rows';yield;
    for(let y=0;y<height;y+=64){unit(()=>{
     gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,handle);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
     gl.texSubImage2D(gl.TEXTURE_2D,0,0,y,width,Math.min(64,height-y),gl.RGBA,gl.UNSIGNED_BYTE,pixels,y*width*4);
    });if(y+64<height)yield;}
    // Finalize the last transfer in the same admitted unit: no pending work
    // inherits the cost of that final driver flush. The full cost is charged.
    phase='mips';
    unit(()=>{gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,handle);if(texture.generateMipmaps)gl.generateMipmap(gl.TEXTURE_2D);});finished=true;
   })(),{key,signal:owner.signal,valid:()=>{alive();return true;},priority:30,deadline:performance.now()+250,estimateMs:.25,label:'qa-initial-texture-pilot'});
   if(!finished)throw Error('Pixel pilot transfer cancelled');stats.completed++;return true;
   }finally{record.elapsedMs=performance.now()-record.began;record.finished=finished;clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }catch(error){check();stats.fallbacks++;if(started)texture.needsUpdate=true;return false;}
 };
 if(signal?.aborted)dispose();
 return {upload,dispose,stats};
}
