import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:5194';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));if(process.env.QA_REQUIRE_NO_WEBGL)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2'||kind==='experimental-webgl')throw Error('Main-thread WebGL prohibited');return original.call(this,kind,...args);};});
 await page.goto(`${base}/?qa-seed=712&qa-worker-game&qa-worker-early-native&qa-worker-early-new&qa-worker-early-gpu-view${process.env.QA_REQUIRE_NO_WEBGL?'&qa-worker-no-webgl':''}${process.env.QA_CONFIRMED_CAMERA?'&qa-webgpu-camera-terrain':''}&qa-webgpu-world&qa-webgpu-picking&qa-webgpu-single-actor&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 const menu=page.frameLocator('#native-menu');await menu.locator('body').waitFor();await menu.locator('body').evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'suajili'},location.origin));
 await page.waitForFunction(()=>typeof globalThis.wildGuardiansEarlyGpuQa==='function',{timeout:60000});
 let probe;const readyDeadline=Date.now()+45000;do{probe=await page.evaluate(()=>globalThis.wildGuardiansEarlyGpuQa());if(probe.backend==='WebGPU'&&probe.renderer.resident>=25)break;await page.waitForTimeout(100);}while(Date.now()<readyDeadline);if(probe.renderer.resident<25)throw Error('Terrain not ready');if(process.env.QA_CONFIRMED_CAMERA){const limit=Date.now()+15000;let camera;do{camera=await page.evaluate(()=>globalThis.wildGuardiansConfirmedCameraQa?.());if(camera?.confirmed&&camera.status?.chunks>0)break;await page.waitForTimeout(100);}while(Date.now()<limit);if(!camera?.confirmed||!camera.status?.chunks)throw Error(JSON.stringify({message:'Confirmed camera terrain unavailable',camera}));}
 await page.locator('[data-menu=build]').click();await page.locator('#native-center').click();
 const toolDeadline=Date.now()+30000;do{probe=await page.evaluate(()=>globalThis.wildGuardiansEarlyGpuQa());if(probe.tool==='center')break;await page.waitForTimeout(100);}while(Date.now()<toolDeadline);if(probe.tool!=='center')throw Error('Center tool unavailable');
 const box=await page.locator('#world').boundingBox();if(!box)throw Error('Canvas unavailable');
 await page.mouse.click(box.x+box.width*.2,box.y+box.height*.85);
 let status;const deadline=Date.now()+20000;do{status=await page.evaluate(()=>globalThis.wildGuardiansEarlyGpuQa());if(status.centers===1)break;const text=await page.locator('body').innerText();if(text.includes('SpatialChunkUnavailable'))throw Error(text);await page.waitForTimeout(100);}while(Date.now()<deadline);
 const event=status.events.find(event=>event.type==='PlacementCommitted'&&event.kind==='center');
 if(status.backend!=='WebGPU'||status.renderer.state.fault||status.centers!==1||!event||errors.length)throw Error(JSON.stringify({status,errors}));
 console.log(JSON.stringify({backend:status.backend,centers:status.centers,location:event.presentation,events:status.events.map(event=>event.type),scope:'Fresh game QA, one center selected by real WebGPU picker; no full-game parity or performance claim'}));
}finally{await browser.close();}
