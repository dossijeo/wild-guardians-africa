import {createWriteStream} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {once} from 'node:events';

export async function installRaidStallInventory(context) {
 await context.route('**/src/rendering/webgpu-world-worker.js*',async route=>{
  const response=await route.fetch(),source=await response.text(),anchor="postMessage({kind:'inspection',workerState,";
  if(!source.includes(anchor))throw Error('World inspection trace anchor missing');
  const inventory=`materialInventory:(()=>{const items=new Map();surface?.scene?.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m)continue;let a=items.get(m.id);if(!a){a={id:m.id,name:m.name,type:m.type,map:m.map?.name??null,objects:0,examples:[]};items.set(m.id,a);}a.objects++;if(a.examples.length<3){const path=[];for(let p=o;p&&path.length<5;p=p.parent)path.push(p.name||p.type);a.examples.push({path,skinned:!!o.isSkinnedMesh,instanced:!!o.isInstancedMesh,vertices:o.geometry?.attributes?.position?.count??0,instances:o.count??null});}}});return [...items.values()];})(),`;
  const probe=`\nif(globalThis.GPUDevice){for(const method of ['createRenderPipeline','createRenderPipelineAsync','createShaderModule']){const original=GPUDevice.prototype[method];GPUDevice.prototype[method]=function(descriptor,...rest){const start=performance.now();performance.mark('WG_GPU_REQUEST',{detail:{method,label:descriptor?.label??'',codeLength:descriptor?.code?.length??0}});try{return original.call(this,descriptor,...rest);}finally{performance.measure('WG_GPU_CALL',{start,end:performance.now(),detail:{method,label:descriptor?.label??''}});}};}}\n`;
  await route.fulfill({response,body:probe+source.replace(anchor,anchor+inventory)});
 });
}

// Opt-in browser-wide diagnostics. No game scheduling or rendering changes.
export async function beginRaidStallTrace(browser, page, path) {
 if (!path) return null;
 await mkdir(dirname(path), {recursive:true});
 const cdp=await browser.newBrowserCDPSession();
 const version=await cdp.send('Browser.getVersion');
 const system=await cdp.send('SystemInfo.getInfo');
 const categories='toplevel,devtools.timeline,blink.user_timing,gpu,v8,loading,renderer.scheduler,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-v8.cpu_profiler,disabled-by-default-v8.cpu_profiler.hires,disabled-by-default-gpu.service,disabled-by-default-gpu.device,disabled-by-default-gpu.dawn,disabled-by-default-gpu.decoder,dawn,gpu.dawn';
 await cdp.send('Tracing.start',{categories,transferMode:'ReturnAsStream',options:'record-until-full',bufferUsageReportingInterval:1000});
 const buffer=[];cdp.on('Tracing.bufferUsage',e=>buffer.push(e));
 await page.evaluate(()=>{performance.mark('WG_RAID_TRACE_START');window.qaTraceLongTasks=[];window.qaTraceFrames=[];window.qaTraceObserver=new PerformanceObserver(list=>{for(const e of list.getEntries())window.qaTraceLongTasks.push({start:e.startTime,duration:e.duration,name:e.name});});window.qaTraceObserver.observe({type:'longtask',buffered:false});let last=performance.now();window.qaTraceActive=true;function tick(t){window.qaTraceFrames.push({at:t,delta:t-last});last=t;if(window.qaTraceActive)requestAnimationFrame(tick);}requestAnimationFrame(tick);});
 return async()=>{
  const observations=await page.evaluate(()=>{performance.mark('WG_RAID_TRACE_END');window.qaTraceActive=false;window.qaTraceObserver.disconnect();return {timeOrigin:performance.timeOrigin,frames:window.qaTraceFrames,longTasks:window.qaTraceLongTasks};});
  const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const result=await complete;
  const file=createWriteStream(path);for(;;){const part=await cdp.send('IO.read',{handle:result.stream,size:1048576});if(!file.write(part.base64Encoded?Buffer.from(part.data,'base64'):part.data))await once(file,'drain');if(part.eof)break;}file.end();await once(file,'finish');await cdp.send('IO.close',{handle:result.stream});
  const inventory=await page.evaluate(async()=>{const g=await window.wildGuardiansWebGpuWorldQa?.();return g?.materialInventory??null;});
  await writeFile(path+'.metadata.json',JSON.stringify({version,system,categories,buffer,dataLossOccurred:result.dataLossOccurred,observations,inventory},null,2));await cdp.detach();
 };
}
