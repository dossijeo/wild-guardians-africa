import * as THREE from 'three';
// Private resources in the real renderer/context, never installed in the scene.
// Diagnostic feasibility only; explicit waits/readbacks invalidate frame metrics.
export async function probeTextureStaging(world,{strategy='scheduled'}={}){
 const modes={original:['bitmap','stripes'],control:['bitmap','pixels','stripes'],scheduled:['bitmap','pixels','scheduled-stripes'],three:['bitmap','pixels','three-stripes'],interop:['bitmap','interop-stripes']}[strategy];if(!modes)throw Error('Unknown probe strategy');
 const renderer=world.renderer,gl=renderer.getContext(),sources=[];
 for(const [url,model]of world.assets.modelSources){
  if(!url.includes('5ac817bcc'))continue;
  model.scene.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))for(const slot of ['map','normalMap','roughnessMap']){
   const texture=material[slot];if(texture?.image instanceof ImageBitmap&&!sources.some(x=>x.texture===texture))sources.push({url,slot,texture});
  }});
 }
 if(!sources.length)throw Error('Missing actual lion textures');
 // Synthetic translucent texels expose canvas premultiply/unpremultiply loss.
 const alphaPixels=new Uint8ClampedArray(64*64*4);for(let i=0;i<alphaPixels.length;i+=4){alphaPixels[i]=(i*17)%256;alphaPixels[i+1]=37;alphaPixels[i+2]=213;alphaPixels[i+3]=(i/4)%256;}
 const alphaBitmap=await createImageBitmap(new ImageData(alphaPixels,64,64),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 sources.push({url:'qa:translucent-gradient',slot:'alpha-control',texture:{image:alphaBitmap,colorSpace:'srgb'}});
 const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),rows=[];
 const worker=new Worker(new URL('./texture-pixel-probe-worker.js',import.meta.url),{type:'module'});
 const atomic=fn=>{try{return fn();}finally{renderer.resetState();}};
 try{for(const {url,slot,texture}of sources){
  const image=texture.image,width=image.width,height=image.height,levels=1+Math.floor(Math.log2(Math.max(width,height)));
  const cloneStart=performance.now(),clonePromise=createImageBitmap(image),cloneSubmitMs=performance.now()-cloneStart,bitmap=await clonePromise,cloneElapsedMs=performance.now()-cloneStart;
  const convertStart=performance.now();
  const conversion=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Pixel conversion timeout')),30000);worker.onmessage=({data})=>{clearTimeout(timer);data.error?reject(Error(data.error)):resolve(data);};worker.onerror=error=>{clearTimeout(timer);reject(error);};worker.postMessage({bitmap},[bitmap]);});
  const conversionElapsedMs=performance.now()-convertStart,pixels=conversion.pixels;
  const trials=[];let reference=null;
  for(const mode of [...modes,...modes]){
   const texturesBefore=renderer.info.memory.textures;
   const staged=(mode==='three-stripes'||mode==='interop-stripes')?new THREE.Texture(image):null;
   if(staged){staged.colorSpace=texture.colorSpace;staged.flipY=false;staged.needsUpdate=true;}
   let tex=staged?null:gl.createTexture();const calls=[],glCalls=[];const began=performance.now();
   const copyThree=()=>{const names=['getParameter','texSubImage2D','generateMipmap','texStorage2D'],originals=names.map(name=>gl[name]);try{for(const [index,name]of names.entries())gl[name]=function(...args){const start=performance.now();try{return originals[index].apply(this,args);}finally{glCalls.push({name,parameter:name==='getParameter'?args[0]:null,ms:performance.now()-start});}};renderer.copyTextureToTexture(dataTexture,staged,region,position);}finally{for(const [index,name]of names.entries())gl[name]=originals[index];}};
   const dataTexture=staged?new THREE.DataTexture(pixels,width,height):null,region=new THREE.Box2(),position=new THREE.Vector2();
   const invoke=(label,fn)=>{const start=performance.now();atomic(()=>{gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);fn();});calls.push({label,ms:performance.now()-start});};
   try{
    if(staged){invoke('allocate-three',()=>{staged.source.dataReady=false;try{renderer.initTexture(staged);}finally{staged.source.dataReady=true;}tex=renderer.properties.get(staged).__webglTexture;});}
    else invoke('allocate',()=>{gl.texStorage2D(gl.TEXTURE_2D,levels,texture.colorSpace==='srgb'?gl.SRGB8_ALPHA8:gl.RGBA8,width,height);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);});
    await nextFrame();
    if(mode==='bitmap')invoke('upload',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,image));
    else if(mode==='pixels')invoke('upload-pixels',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels));
    else if(mode==='stripes'){for(let y=0;y<height;y+=64){invoke('stripe',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,y,width,Math.min(64,height-y),gl.RGBA,gl.UNSIGNED_BYTE,pixels,y*width*4));await nextFrame();}}
    else if(mode==='scheduled-stripes'||mode==='three-stripes'||mode==='interop-stripes'){
     if(!world.frameScheduler)throw Error('Scheduled probe needs active scheduler');
     const owner=new AbortController(),timer=setTimeout(()=>owner.abort(),30000);
     try{await world.frameScheduler.submit((function*(){for(let y=0;y<height;y+=64){invoke('stripe',()=>{if(mode==='three-stripes'){region.min.set(0,y);region.max.set(width,Math.min(height,y+64));position.set(0,y);staged.generateMipmaps=false;try{copyThree();}finally{staged.generateMipmaps=true;}}else gl.texSubImage2D(gl.TEXTURE_2D,0,0,y,width,Math.min(64,height-y),gl.RGBA,gl.UNSIGNED_BYTE,pixels,y*width*4);});yield;}})(),{signal:owner.signal,priority:30,deadline:performance.now()+250,estimateMs:.25,valid:()=>!world.disposed,label:'qa-texture-stripe'});if(owner.signal.aborted){globalThis.qaQualityFailure={textureProbe:{slot,mode,calls,glCalls,scheduler:world.frameScheduler.snapshot()}};throw Error('Scheduled stripe timeout');}}finally{clearTimeout(timer);}
    }else throw Error('Unknown texture probe mode');
    invoke('mipmaps',()=>{if(mode==='three-stripes'){region.min.set(0,height-1);region.max.set(width,height);position.set(0,height-1);copyThree();}else gl.generateMipmap(gl.TEXTURE_2D);});
    const preparationElapsedMs=performance.now()-began;
    const readbackStart=performance.now(),frameBuffer=gl.createFramebuffer(),mips=[];
    try{atomic(()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,frameBuffer);for(let level=0;level<levels;level++){
     const w=Math.max(1,width>>level),h=Math.max(1,height>>level),data=new Uint8Array(w*h*4);
     gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,level);
     if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Probe framebuffer incomplete');
     gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);mips.push(data);
    }});}finally{gl.deleteFramebuffer(frameBuffer);}
    const errors=[];for(let error=gl.getError();error!==gl.NO_ERROR;error=gl.getError()){errors.push(error);if(errors.length>8)break;}
    const readbackMs=performance.now()-readbackStart;
    reference??=mips;
    const differences=mips.map((data,level)=>{let changed=0,max=0,sum=0;const a=reference[level];for(let i=0;i<data.length;i++){const d=Math.abs(data[i]-a[i]);if(d)changed++;max=Math.max(max,d);sum+=d;}return {level,bytes:data.length,changed,max,mean:sum/data.length};});
    trials.push({mode,calls,glCalls,preparationElapsedMs,readbackMs,differences,errors});
   }finally{if(staged)staged.dispose();else gl.deleteTexture(tex);dataTexture?.dispose();renderer.resetState();if(trials.length&&trials.at(-1).mode===mode)trials.at(-1).textureResourceDelta=renderer.info.memory.textures-texturesBefore;}
   await nextFrame();
  }
  rows.push({url,slot,colorSpace:texture.colorSpace,validationRetainedBytes:reference.reduce((sum,data)=>sum+data.byteLength,0),width,height,cloneSubmitMs,cloneElapsedMs,conversionElapsedMs,workerConversionMs:conversion.conversionMs,pixelBytes:pixels.byteLength,trials});
 }}finally{worker.terminate();alphaBitmap.close();renderer.resetState();}
 return {strategy,scope:'Diagnostic private native-color-space textures on actual renderer context. ABAB invocation timings include state reset; explicit frame waits/readbacks, not whole-game or GPU benchmark. No texture replacement. Pixel conversion and every generated mip compared. Uses SRGB8_ALPHA8 for sRGB sources; reads encoded bytes and generated mipmaps, not shader screenshots. Bounded reference plus current readback; includes adversarial alpha fixture. Does not validate context loss, production memory lifecycle or scheduler throughput.',rows};
}
