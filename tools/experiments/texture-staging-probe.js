// Private resources in the real renderer/context, never installed in the scene.
// Diagnostic feasibility only; explicit waits/readbacks invalidate frame metrics.
export async function probeTextureStaging(world,{strategy='scheduled'}={}){
 const modes={original:['bitmap','stripes'],control:['bitmap','pixels','stripes'],scheduled:['bitmap','pixels','scheduled-stripes']}[strategy];if(!modes)throw Error('Unknown probe strategy');
 const renderer=world.renderer,gl=renderer.getContext(),sources=[];
 for(const [url,model]of world.assets.modelSources){
  if(!url.includes('5ac817bcc'))continue;
  model.scene.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))for(const slot of ['map','normalMap','roughnessMap']){
   const texture=material[slot];if(texture?.image instanceof ImageBitmap&&!sources.some(x=>x.texture===texture))sources.push({url,slot,texture});
  }});
 }
 if(!sources.length)throw Error('Missing actual lion textures');
 const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),rows=[];
 const worker=new Worker(new URL('./texture-pixel-probe-worker.js',import.meta.url),{type:'module'});
 const atomic=fn=>{try{return fn();}finally{renderer.resetState();}};
 try{for(const {url,slot,texture}of sources){
  const image=texture.image,width=image.width,height=image.height,levels=1+Math.floor(Math.log2(Math.max(width,height)));
  const cloneStart=performance.now(),clonePromise=createImageBitmap(image),cloneSubmitMs=performance.now()-cloneStart,bitmap=await clonePromise,cloneElapsedMs=performance.now()-cloneStart;
  const convertStart=performance.now();
  const conversion=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Pixel conversion timeout')),30000);worker.onmessage=({data})=>{clearTimeout(timer);data.error?reject(Error(data.error)):resolve(data);};worker.onerror=error=>{clearTimeout(timer);reject(error);};worker.postMessage({bitmap},[bitmap]);});
  const conversionElapsedMs=performance.now()-convertStart,pixels=conversion.pixels;
  const trials=[];
  for(const mode of [...modes,...modes]){
   const tex=gl.createTexture(),calls=[];const began=performance.now();
   const invoke=(label,fn)=>{const start=performance.now();atomic(()=>{gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);fn();});calls.push({label,ms:performance.now()-start});};
   try{
    invoke('allocate',()=>{gl.texStorage2D(gl.TEXTURE_2D,levels,gl.RGBA8,width,height);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);});
    await nextFrame();
    if(mode==='bitmap')invoke('upload',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,image));
    else if(mode==='pixels')invoke('upload-pixels',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels));
    else if(mode==='stripes'){for(let y=0;y<height;y+=64){invoke('stripe',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,y,width,Math.min(64,height-y),gl.RGBA,gl.UNSIGNED_BYTE,pixels,y*width*4));await nextFrame();}}
    else if(mode==='scheduled-stripes'){
     if(!world.frameScheduler)throw Error('Scheduled probe needs active scheduler');
     const owner=new AbortController(),timer=setTimeout(()=>owner.abort(),30000);
     try{await world.frameScheduler.submit((function*(){for(let y=0;y<height;y+=64){invoke('stripe',()=>gl.texSubImage2D(gl.TEXTURE_2D,0,0,y,width,Math.min(64,height-y),gl.RGBA,gl.UNSIGNED_BYTE,pixels,y*width*4));yield;}})(),{signal:owner.signal,priority:30,deadline:performance.now()+250,estimateMs:.25,valid:()=>!world.disposed,label:'qa-texture-stripe'});if(owner.signal.aborted)throw Error('Scheduled stripe timeout');}finally{clearTimeout(timer);}
    }else throw Error('Unknown texture probe mode');
    invoke('mipmaps',()=>gl.generateMipmap(gl.TEXTURE_2D));
    const preparationElapsedMs=performance.now()-began;
    const readbackStart=performance.now(),frameBuffer=gl.createFramebuffer(),mips=[];
    try{atomic(()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,frameBuffer);for(let level=0;level<levels;level++){
     const w=Math.max(1,width>>level),h=Math.max(1,height>>level),data=new Uint8Array(w*h*4);
     gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,level);
     if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Probe framebuffer incomplete');
     gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);mips.push(data);
    }});}finally{gl.deleteFramebuffer(frameBuffer);}
    const errors=[];for(let error=gl.getError();error!==gl.NO_ERROR;error=gl.getError()){errors.push(error);if(errors.length>8)break;}
    trials.push({mode,calls,preparationElapsedMs,readbackMs:performance.now()-readbackStart,mips,errors});
   }finally{gl.deleteTexture(tex);renderer.resetState();}
   await nextFrame();
  }
  const reference=trials[0].mips;
  for(const trial of trials){trial.differences=trial.mips.map((data,level)=>{let changed=0,max=0,sum=0;const a=reference[level];for(let i=0;i<data.length;i++){const d=Math.abs(data[i]-a[i]);if(d)changed++;max=Math.max(max,d);sum+=d;}return {level,bytes:data.length,changed,max,mean:sum/data.length};});delete trial.mips;}
  rows.push({url,slot,width,height,cloneSubmitMs,cloneElapsedMs,conversionElapsedMs,workerConversionMs:conversion.conversionMs,pixelBytes:pixels.byteLength,trials});
 }}finally{worker.terminate();renderer.resetState();}
 return {strategy,scope:'Diagnostic private RGBA8 textures on actual renderer context. ABAB invocation timings include state reset; explicit frame waits/readbacks, not whole-game or GPU benchmark. No texture replacement. Pixel conversion and every generated mip compared. Does not validate sRGB sampling, context loss, production memory lifecycle or scheduler throughput.',rows};
}
