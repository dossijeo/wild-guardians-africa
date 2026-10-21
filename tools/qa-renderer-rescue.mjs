// Production comparison: immutable main/candidate JS, real application materials.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const {chromium}=await import(process.env.RENDERER_PLAYWRIGHT??'playwright');
const baseline=process.env.RR_MAIN??'cd6c9af0d350ff1f79cd9a1dea0da0786eca4e2a';
const source=execFileSync('git',['show',baseline+':src/rendering/asset-groups.js'],{encoding:'utf8'});
const candidate=await readFile('src/rendering/asset-groups.js','utf8');
const out=process.env.RR_OUT??'test-results/renderer-rescue';
await mkdir(out,{recursive:true});
const config={baseline,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),mainSourceSHA:createHash('sha256').update(source).digest('hex'),candidateSHA:createHash('sha256').update(candidate).digest('hex'),environment:Object.fromEntries(Object.entries(process.env).filter(([k])=>k.startsWith('RR_')))};
await writeFile(out+'/config.json',JSON.stringify(config,null,2));
const base=process.env.RR_URL??'http://127.0.0.1:5197',rows=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.RR_QUALITY??'media').split(','))for(const biome of (process.env.RR_BIOMES??'sabana').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/src/rendering/qa-groups-*.js',async route=>{
  const response=await route.fetch({url:base+'/src/rendering/asset-groups.js'}),body=await response.text();
  const three=body.match(/import \* as THREE from ["']([^"']+)["']/);if(!three)throw Error('Three import missing');
  let code=route.request().url().includes('qa-groups-main')?source:candidate;
  if(route.request().url().includes('qa-groups-naive')){
   const matrix='if(matrixEnd){g.mesh.instanceMatrix.addUpdateRange(matrixStart,matrixEnd-matrixStart);g.mesh.instanceMatrix.needsUpdate=true;}';
   const coverage='if(coverageEnd){visibility.addUpdateRange(coverageStart,coverageEnd-coverageStart);visibility.needsUpdate=true;}';
   if(!code.includes(matrix)||!code.includes(coverage))throw Error('Naive diagnostic anchors changed');
   code=code.replace(matrix,'g.mesh.instanceMatrix.needsUpdate=true;').replace(coverage,'if(visibility)visibility.needsUpdate=true;').replace('if(matrixEnd||coverageEnd)stats.uploads++;','stats.uploads++;');
  }
  await route.fulfill({status:200,contentType:'text/javascript',body:code.replace("import * as THREE from 'three';",three[0]+';')});
 });
 await page.route('**/src/rendering/scene.js*',async route=>{
  const r=await route.fetch(),body=await r.text();if(!body.includes('this.raycaster=new'))throw Error('World hook missing');
  await route.fulfill({response:r,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});
 });
 await page.addInitScript(q=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:q})),quality);
 await page.goto(base+'/?qa-seed=712');await page.waitForSelector('#native-menu',{timeout:60000});
 const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{
  const w=window.qaCampaignWorld,{pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;
  w.updateCamera=()=>{w.camera.lookAt(w.qaLookAt??w.controls.target);w.camera.updateMatrixWorld()};
  globalThis.rrClasses={main:(await import('/src/rendering/qa-groups-main.js')).NativeAssetGroups,candidate:(await import('/src/rendering/qa-groups-candidate.js')).NativeAssetGroups,naive:(await import('/src/rendering/qa-groups-naive.js')).NativeAssetGroups};
  globalThis.rrSwap=variant=>{const old=w.assetGroups,next=new rrClasses[variant](w.scene);next.omitZeroColor=old.omitZeroColor;old.dispose();w.assetGroups=next;};
  globalThis.rrPose=t=>{const p=w.controls.target,x=p.x+22-40*t,z=p.z+18+4*t;w.camera.position.set(x,Math.max(p.y+16-7*t,w.nav.field.surface(x,z)+1.2),z);w.updateCamera()};
  rrPose(0);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.render(0);
  await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));
 });
 console.log('ready',biome,quality);
 if(process.env.RR_DENSE==='1')await page.evaluate(async()=>await(await import('/tools/qa-renderer-dense.js')).installDenseFixture(window.qaCampaignWorld));
 if(process.env.RR_MUTATE==='1'){const mutation=await page.evaluate(async()=>await(await import('/tools/qa-renderer-mutations.js')).exerciseRendererMutations(window.qaCampaignWorld));await writeFile(out+'/'+biome+'-'+quality+'-mutations.json',JSON.stringify({mutation,errors},null,2));}
 if(process.env.RR_PERF==='1'){
  await page.evaluate(async()=>{
   const w=window.qaCampaignWorld,{nativeNearRegion}=await import('/src/rendering/horizon.js');
   if(w.state.biome!=='sabana')throw Error('Performance fixed residency requires Sabana');
   const fixed=nativeNearRegion(w.camera.position,w.quality,3);w.horizon.update=()=>fixed;w.streamPlanKey=null;w.syncChunks();await w.whenChunksReady();
   w.qaResidentKeys=JSON.stringify([...w.chunks.keys()].sort());
  });
  for(const variant of (process.env.RR_ORDER??'main,candidate,candidate,main').split(','))for(const phase of ['day','night']){
   const result=await page.evaluate(async({variant,phase,samples,warmup,trace,staticCamera})=>{
    const w=window.qaCampaignWorld;rrSwap(variant);w.state.time=phase==='day'?150:350;w.state.day=1;
    const renderer=w.renderer,gl=renderer.getContext(),{GpuTimer}=await import('/tests/browser/gpu-timer.js');
    const traffic=trace?(await import('/tools/qa-renderer-upload-traffic.js')).traceUploadTraffic(gl):null;
    const run=async gpuEnabled=>{
     const gpu=gpuEnabled?new GpuTimer(gl):null,frames=[],original=w.render,update=w.assetGroups.update;
     let index=0,last=null,groupCpuMs=0;
     w.assetGroups.update=function(...args){const start=performance.now();try{return update.apply(this,args)}finally{groupCpuMs=performance.now()-start}};
     try{await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Measure timeout')),180000);
      w.render=function(){
       if(!staticCamera)rrPose(.5-.5*Math.cos(2*Math.PI*index/180));
       const now=performance.now(),interval=last===null?null:now-last;last=now;traffic?.reset();
       const recording=index>=warmup,auto=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();
       if(recording)gpu?.begin(index-warmup);const start=performance.now();
       try{original.call(this,0)}catch(e){clearTimeout(timeout);reject(e);throw e}finally{
        const cpuMs=performance.now()-start;if(recording)gpu?.end();
        if(recording)frames.push({frame:index-warmup,cpuMs,groupCpuMs,intervalMs:interval,uploads:w.assetGroups.stats.uploads,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:w.camera.position.toArray(),traffic:traffic?.snapshot()});
        renderer.info.autoReset=auto;if(++index===samples+warmup){clearTimeout(timeout);resolve()}
       }
      };
     });
     if(gpu)for(let i=0;i<120&&gpu.pending.length;i++){await new Promise(r=>setTimeout(r,8));gpu.poll()}
     return {frames,gpu:gpu?.report()};
     }finally{w.render=original;w.assetGroups.update=update;gpu?.dispose()}
    };
    try{const gpu=await run(true),cadence=await run(false),ext=gl.getExtension('WEBGL_debug_renderer_info');
     if(w.qaResidentKeys!==JSON.stringify([...w.chunks.keys()].sort()))throw Error('Residency changed');
     const arrays=new Set();let groupCapacityBytes=0;
     for(const cache of [w.assetGroups.colors,w.assetGroups.shadows])for(const g of cache.values())for(const a of [g.mesh.instanceMatrix,g.mesh.geometry.attributes.nativeVisibility].filter(Boolean))if(!arrays.has(a.array)){arrays.add(a.array);groupCapacityBytes+=a.array.byteLength}
     return {gpu,cadence,groupCapacityBytes,jsHeap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,memory:{...renderer.info.memory},device:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[renderer.domElement.width,renderer.domElement.height],residentKeys:w.qaResidentKeys,glError:gl.getError()};
    }finally{traffic?.dispose()}
   },{variant,phase,samples:Number(process.env.RR_SAMPLES??180),warmup:Number(process.env.RR_WARMUP??180),trace:process.env.RR_TRACE==='1',staticCamera:process.env.RR_STATIC==='1'});
   const client=await page.context().newCDPSession(page);await client.send('HeapProfiler.collectGarbage');result.collectedHeap=await client.send('Runtime.getHeapUsage');await client.detach();
   rows.push({biome,quality,variant,phase,diagnostic:process.env.RR_TRACE==='1',...result,errors:[...errors]});
   await writeFile(out+'/results.json',JSON.stringify({config,rows},null,2));console.log('measured',variant,phase);
   if(errors.length||result.glError)throw Error(JSON.stringify(errors));
  }
 }else{
  for(const phase of ['day','night'])for(const pose of (process.env.RR_POSES??'0,.5,1').split(',').map(Number)){
   await page.evaluate(async({phase,pose})=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;rrPose(pose>1?0:pose);if(pose===2){w.qaLookAt=w.controls.target.clone().add({x:25,y:0,z:-15});w.updateCamera()}else{w.qaLookAt=null;w.updateCamera()}w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();for(let i=0;i<12;i++)w.render(0)},{phase,pose});
   console.log('capture',biome,quality,phase,pose);
   let control=null;
   for(const variant of ['main','candidate','main']){
    const capture=await page.evaluate(variant=>{
     const w=window.qaCampaignWorld;rrSwap(variant);for(let i=0;i<12;i++)w.render(0);
     const shadows=[...w.assetGroups.shadows].map(([key,g])=>[key,g.mesh.count,Array.from(g.mesh.instanceMatrix.array.slice(0,g.mesh.count*16))]);
     return {png:w.renderer.domElement.toDataURL('image/png').split(',')[1],shadows,keys:[...w.chunks.keys()].sort(),camera:w.camera.position.toArray(),glError:w.renderer.getContext().getError(),colorCount:[...w.assetGroups.colors.values()].reduce((n,g)=>n+g.mesh.count,0)};
    },variant);
    const bytes=Buffer.from(capture.png,'base64'),raw=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const name=`${biome}-${quality}-${phase}-${pose}-${variant}-${rows.length}.webp`;await sharp(bytes).webp({lossless:true}).toFile(out+'/'+name);
    let difference=null;if(control){if(raw.data.length!==control.raw.length)throw Error('Resolution changed');let pixels=0,max=0;for(let i=0;i<raw.data.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(raw.data[i+k]-control.raw[i+k]));if(d)pixels++;max=Math.max(max,d)}difference={pixels,max,shadowsEqual:JSON.stringify(capture.shadows)===control.shadows,residencyEqual:JSON.stringify(capture.keys)===control.keys};}
    else control={raw:raw.data,shadows:JSON.stringify(capture.shadows),keys:JSON.stringify(capture.keys)};
    const {png,shadows,...proof}=capture;rows.push({biome,quality,phase,pose,variant,name,...proof,difference,errors:[...errors]});
    await writeFile(out+'/results.json',JSON.stringify({config,rows},null,2));
    if(errors.length||capture.glError||difference&&!difference.shadowsEqual)throw Error('Capture validation failed: '+JSON.stringify({errors,difference}));
   }
  }
 }
 await page.close();
}}finally{await browser.close()}
