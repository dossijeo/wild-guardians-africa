import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:5194';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/?qa-seed=712&qa-worker-game&qa-worker-early-native&qa-worker-early-new&qa-worker-early-gpu-view&qa-webgpu-world&qa-webgpu-picking&qa-webgpu-camera-terrain&qa-guardian-origin&qa-webgpu-single-actor&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 const menu=page.frameLocator('#native-menu');await menu.locator('body').waitFor();await menu.locator('body').evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'suajili'},location.origin));
 await page.waitForFunction(()=>typeof globalThis.wildGuardiansEarlyGpuQa==='function',{timeout:60000});
 await page.waitForFunction(async()=>{const status=await globalThis.wildGuardiansEarlyGpuQa();return status.backend==='WebGPU'&&status.renderer.resident>=25;},{timeout:45000});
 await page.locator('[data-menu=build]').click();await page.locator('#native-center').click();
 await page.waitForFunction(async()=>{const status=await globalThis.wildGuardiansEarlyGpuQa();return status.tool==='center';},{timeout:30000});
 const box=await page.locator('#world').boundingBox();if(!box)throw Error('Canvas unavailable');
 await page.mouse.click(box.x+box.width*.2,box.y+box.height*.85);
 let status;const deadline=Date.now()+20000;do{status=await page.evaluate(()=>globalThis.wildGuardiansEarlyGpuQa());if(status.centers===1)break;const text=await page.locator('body').innerText();if(text.includes('SpatialChunkUnavailable'))throw Error(text);await page.waitForTimeout(100);}while(Date.now()<deadline);
 const event=status.events.find(event=>event.type==='PlacementCommitted'&&event.kind==='center');
 if(status.backend!=='WebGPU'||status.renderer.state.fault||status.centers!==1||!event||errors.length)throw Error(JSON.stringify({status,errors}));
 await page.locator('#menuButton').click();await page.waitForFunction(async()=>{const s=await globalThis.wildGuardiansEarlyGpuQa();return s.pauses.includes('menu');},{timeout:10000});let origin=null,last;for(let i=0;i<30&&!origin;i++){try{origin=await page.evaluate(id=>globalThis.wildGuardiansGuardianOriginQa(id),event.targetId);}catch(error){last=error.message;await page.waitForTimeout(200);}}if(!origin)throw Error('Real guardian origin unavailable: '+last);console.log(JSON.stringify({backend:status.backend,origin,center:event.targetId,scope:'Real WebGPU structures and authority query; paused world; no Attack or independent legacy comparison'}));
}finally{await browser.close();}
