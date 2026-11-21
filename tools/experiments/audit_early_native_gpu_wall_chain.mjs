import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:5218',prefix=process.env.QA_ARTIFACT_PREFIX??'.cache/native-build-stroke';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-webgpu']});
const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1,reducedMotion:'reduce'});
const browserErrors=[],httpFailures=[];
page.on('pageerror',error=>browserErrors.push(String(error.stack??error)));
page.on('console',message=>{if(message.type()==='error')browserErrors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)httpFailures.push([response.status(),response.url()]);});
const trace=()=>page.evaluate(()=>({timing:globalThis.__buildTiming??[],runtime:globalThis.wildGuardiansWorkerQa?.()}));
const inspect=()=>page.evaluate(()=>globalThis.wildGuardiansEarlyGpuQa());
const report={browserErrors,httpFailures,attempts:[]};
const record=(name,fields='')=>`(globalThis.__buildTiming??=[]).push({name:${JSON.stringify(name)},at:performance.now()${fields}});`;
async function instrument(glob,transforms){await page.context().route(glob,async route=>{const response=await route.fetch();let source=await response.text();for(const [anchor,replacement]of transforms){if(source.split(anchor).length!==2)throw Error('Missing unique audit anchor '+anchor.slice(0,80));source=source.replace(anchor,replacement);}return route.fulfill({response,body:source});});}
try{
 const up="this.activity('release');";
 await instrument('**/src/rendering/wall-drawing.js*',[[up,record('release')+up]]);
 const wait='await client.waitForCurrentFrame({minSequence,signal:abort.signal});';
 const pickAnchor='const result=await client.pickTerrainStroke(samples,{minSequence});';
 await instrument('**/src/app/webgpu-wall-stroke-ready.js*',[
  [wait,wait+record('current-frame',',floor:minSequence,sequence:client.guardianFrame()?.sequence??null')],
  [pickAnchor,record('pick-sent',',floor:minSequence')+pickAnchor+record('pick-result',',sequence:result.sequence,points:result.points?.length')],
 ]);
 const feedback='binding.sync();return pickReadyTerrainStroke';
 const fail='strokeOwner.wallDrawing.onResolveError=failure=>{';
 const submit="owner.workerRuntime.submit({kind:'buildWallChain',id,material:ownerTool.material,points,capacityLimit:true}).then(async result=>{";
 await instrument('**/src/app/main.js*',[
  [feedback,record('feedback',',present:!!feedback,floor:minSequence,previous:binding.client.guardianFrame()?.sequence??null')+feedback],
  [fail,fail+record('input-error',',error:failure.message,reason:failure.reason??null')],
  [submit,'('+record('build-sent',',id,points:points.length').slice(0,-1)+','+submit.replace('.then(async result=>{',').then(async result=>{')+record('build-result',',id,accepted:result.value===true,rejection:result.rejection??null,events:result.events.filter(event=>event.type===\'WallChainBuilt\')')],
 ]);
 await page.goto(base+'/tests/browser/create-early-native-chain-save.html');
 await page.waitForFunction(()=>window.ready,null,{timeout:15000});report.fixture=await page.evaluate(()=>window.makeSave());
 await page.goto(`${base}/?qa-worker-load-slot=${encodeURIComponent(report.fixture.slotId)}&qa-worker-game&qa-webgpu-world&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof globalThis.wildGuardiansEarlyGpuQa==='function',null,{timeout:90000});
 await page.waitForFunction(()=>globalThis.wildGuardiansEarlyGpuQa().then(s=>s.backend==='WebGPU'&&s.renderer.props?.ready&&s.renderer.preparation?.timeline?.pending===0&&s.renderer.settlements?.selectableReady),null,{timeout:120000});
 await page.waitForTimeout(3500);
 const before=await inspect();report.before={adapter:before.renderer.device.adapter,walls:before.walls,elapsed:before.elapsed,backend:before.backend};
 if(before.backend!=='WebGPU'||!report.before.adapter.vendor||/swiftshader|software/i.test(JSON.stringify(report.before.adapter)))throw Error('Physical WebGPU unavailable');
 await page.locator('[data-menu="build"]').click();
 await page.locator('#native-wall:not([disabled])').click();
 await page.locator('[data-wall="zarzas"]:not([disabled])').click();
 const box=await page.locator('.qa-webgpu-world').boundingBox();if(!box)throw Error('No WebGPU canvas');
 const strokes=[[[.35,.65],[.55,.65]],[[.38,.75],[.6,.75]],[[.25,.55],[.45,.55]]];
 for(const stroke of strokes){
  const previous=(await trace()).timing.length;
  const [[x1,y1],[x2,y2]]=stroke;
  await page.mouse.move(box.x+box.width*x1,box.y+box.height*y1);await page.mouse.down();
  await page.mouse.move(box.x+box.width*x2,box.y+box.height*y2,{steps:12});await page.mouse.up();
  for(let i=0;i<130;i++){
   const {timing}=await trace(),sample=timing.slice(previous);
   const result=sample.find(row=>row.name==='build-result'),picked=sample.find(row=>row.name==='pick-result'),err=sample.find(row=>row.name==='input-error');
   if(result||err||picked&&picked.points<2){report.attempts.push({stroke,timing:sample});break;}
   await page.waitForTimeout(200);
  }
  const attempt=report.attempts.at(-1);
  if(attempt?.stroke!==stroke)throw Error('Stroke did not reach a bounded outcome');
  if(attempt.timing.some(row=>row.name==='build-result'&&row.accepted))break;
 }
 const accepted=report.attempts.flatMap(item=>item.timing).filter(row=>row.name==='build-result'&&row.accepted);
 if(accepted.length!==1||accepted[0].events.length!==1)throw Error('Expected one paid multi-piece Build command');
 const winning=report.attempts.find(item=>item.timing.includes(accepted[0])),start=winning.timing.find(row=>row.name==='feedback'),ready=winning.timing.find(row=>row.name==='current-frame'),pick=winning.timing.find(row=>row.name==='pick-result');
 if(!start?.present||!ready||!pick||ready.sequence<start.floor||pick.sequence<start.floor||winning.timing.filter(row=>row.name==='pick-sent').length!==1||winning.timing.filter(row=>row.name==='build-sent').length!==1)throw Error('Incomplete or late admission trace');
 report.observedWaitMs=ready.at-start.at;
 const event=accepted[0].events[0];
 const deadline=Date.now()+30000;
 for(;;){const current=await inspect();if(current.walls>=before.walls+event.count&&current.renderer.settlements?.walls>=before.renderer.settlements.walls+event.count&&current.renderer.settlements.selectableReady&&!current.renderer.settlements.provisional){report.after={at:await page.evaluate(()=>performance.now()),walls:current.walls,event,settlements:current.renderer.settlements,gpuErrors:current.renderer.drawExecution.consumer.gpuErrors};break;}if(Date.now()>deadline)throw Error('Paid wall did not reach visible Surface');await page.waitForTimeout(100);}
 if(report.after.event.count<2||report.after.gpuErrors||browserErrors.length||httpFailures.length)throw Error('Build acceptance invalid');
 report.ok=true;console.log(JSON.stringify({ok:true,event,observedWaitMs:report.observedWaitMs,timing:winning.timing}));
}catch(error){report.error=String(error.stack??error);report.context=await trace().catch(error=>String(error));report.body=await page.locator('body').innerText().catch(error=>String(error));process.exitCode=1;console.log(report.error);}
finally{writeFileSync(prefix+'.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
