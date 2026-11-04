import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const backend=process.env.WG_BACKEND??'webgpu',mode=process.env.WG_MODE??'async',source=process.env.WG_SOURCE??'lod';
if(!['webgpu','webgl'].includes(backend)||!['async','direct','swap','swap-direct'].includes(mode)||!['lod','full'].includes(source))throw Error('Invalid WG_BACKEND, WG_MODE or WG_SOURCE');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu-shader-disk-cache','--disable-http-cache',...(process.env.WG_UNSAFE_WEBGPU==='1'?['--enable-unsafe-webgpu']:[])]});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error.stack??error)));
 await page.addInitScript(()=>{window.__pipelineTrace=[];window.__pipelineCounts={};});
 if(process.env.WG_TRACE==='1')await page.addInitScript(()=>{
  const trace=[];window.__pipelineTrace=trace;
  function wrap(proto,name,promise=false){if(!proto||typeof proto[name]!=='function')return;const original=proto[name];proto[name]=function(...args){const start=performance.now();try{const value=original.apply(this,args),row={name,start,returnMs:performance.now()-start,settledMs:null};if(name==='createRenderPipeline'||name==='createRenderPipelineAsync'){const d=args[0];row.pipeline={label:d.label??'',vertex:d.vertex?.module?.label??'',fragment:d.fragment?.module?.label??'',depth:d.depthStencil?.format??null,targets:d.fragment?.targets?.map(t=>t?.format??null)??[]};}window.__pipelineCounts[name]=(window.__pipelineCounts[name]??0)+1;if(!['writeBuffer','createBuffer'].includes(name)||row.returnMs>=2)trace.push(row);if(promise&&value?.then)value.then(()=>{row.settledMs=performance.now()-start;},error=>{row.settledMs=performance.now()-start;row.error=String(error);});return value;}catch(error){trace.push({name,start,returnMs:performance.now()-start,error:String(error)});throw error;}};}
  for(const name of ['createRenderPipeline','createRenderPipelineAsync','createShaderModule','createBuffer','createTexture'])wrap(globalThis.GPUDevice?.prototype,name,name.endsWith('Async'));
  for(const name of ['writeBuffer','writeTexture','copyExternalImageToTexture'])wrap(globalThis.GPUQueue?.prototype,name);
  for(const name of ['createProgram','linkProgram','getProgramInfoLog','createTexture','texImage2D','texSubImage2D','compressedTexImage2D','bufferData'])wrap(globalThis.WebGL2RenderingContext?.prototype,name);
 });
 const base=process.env.WG_BASE_URL??'http://127.0.0.1:5175',started=Date.now();
 await page.goto(`${base}/webgpu-on-demand.html?backend=${backend}&source=${source}${process.env.WG_QUEUE_FENCE==='1'?'&queueFence=1':''}${process.env.WG_TARGET==='live'?'&target=live':''}${['actor','scope'].includes(process.env.WG_SWAP_PREPARATION)?`&swapPreparation=${process.env.WG_SWAP_PREPARATION}`:''}${process.env.WG_MATCH_SWAP_TARGET==='1'?'&matchSwapTarget=1':''}${process.env.WG_SHARED_FALLBACK==='1'?'&sharedFallback=1':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWebGpuLabStatus?.().backend||window.wildGuardiansWebGpuLabStatus?.().errors,null,{timeout:60000});
 let initial=await page.evaluate(()=>window.wildGuardiansWebGpuLabReport());
 if(initial.errors.length||initial.backendActual!==(backend==='webgpu'?'WebGPU real':'WebGL2'))throw Error('Backend mismatch: '+JSON.stringify(initial));
 if(process.env.WG_EXPECT_GPU&&!JSON.stringify(initial.backendDetails).toLowerCase().includes(process.env.WG_EXPECT_GPU.toLowerCase()))throw Error('Unexpected adapter: '+JSON.stringify(initial.backendDetails));
 await page.selectOption('#mode',mode);await page.click('#load');
 await page.waitForFunction(()=>!document.querySelector('#sequence').disabled||window.wildGuardiansWebGpuLabStatus().errors,null,{timeout:180000});
 initial=await page.evaluate(()=>window.wildGuardiansWebGpuLabReport());if(initial.errors.length||initial.resources.length!==10)throw Error('Assets failed: '+JSON.stringify(initial));
 let profiler=null;if(process.env.WG_CPU_PROFILE==='1'){profiler=await page.context().newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.setSamplingInterval',{interval:1000});}
 const samples=[];
 for(const cache of ['fresh-context','warm-same-context']){
  if(cache!=='fresh-context')await page.click('#clear');
  await page.click('#reset');const {start,countsBefore}=await page.evaluate(()=>({start:performance.now(),countsBefore:{...window.__pipelineCounts}}));
  if(profiler&&cache==='fresh-context')await profiler.send('Profiler.start');
  await page.click('#sequence');
  await page.waitForFunction(()=>{const status=window.wildGuardiansWebGpuLabStatus();return status.appearances===10&&!status.running;},null,{timeout:240000});
  await page.waitForTimeout(1000);
  let cpuProfile=null;if(profiler&&cache==='fresh-context'){const {profile}=await profiler.send('Profiler.stop'),nodes=new Map(profile.nodes.map(node=>[node.id,node])),counts=new Map();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);cpuProfile=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([id,count])=>({samples:count,frame:nodes.get(id)?.callFrame??null}));}
  const sample=await page.evaluate(start=>({report:window.wildGuardiansWebGpuLabReport(),trace:window.__pipelineTrace.filter(row=>row.start>=start),countsAfter:{...window.__pipelineCounts}}),start);sample.countsBefore=countsBefore;
  sample.cpuProfile=cpuProfile;
  if(sample.report.errors.length||sample.report.appearances.some(row=>!row.success||row.drewBeforeReady))throw Error('Scenario failed: '+JSON.stringify(sample.report.errors));
  if(mode==='swap'||mode==='swap-direct')for(const row of sample.report.appearances){if(row.fallbackFirstDrawAt===null||row.finalFirstDrawAt===null||row.upgradedAt===null||(mode==='swap'&&(row.compileResolvedAt===null||row.upgradedAt<row.compileResolvedAt)))throw Error('Material replacement was not observed in order: '+JSON.stringify(row));}
  samples.push({cache,start,...sample});
  if(cache==='fresh-context'&&process.env.WG_SCREENSHOT)await page.screenshot({path:process.env.WG_SCREENSHOT});
 }
 if(errors.length)throw Error('Page errors: '+JSON.stringify(errors));
 const result={backend,mode,source,target:process.env.WG_TARGET==='live'?'live':'separate',traceEnabled:process.env.WG_TRACE==='1',elapsedMs:Date.now()-started,initial,samples,limitations:['Fresh browser context and disabled browser disk shader cache do not prove an empty operating-system or driver cache.','Warm run reuses the same renderer, assets and GPU context.','CPU API timings and RAF intervals do not measure GPU execution time.','Compile scene and visible scene may use different pipeline variants.','A first draw callback observes CPU submission, not display scanout.']};
 const json=JSON.stringify(result);if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,json);else console.log(json);
}finally{await browser.close();}
