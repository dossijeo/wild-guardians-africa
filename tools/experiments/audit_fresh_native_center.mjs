import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:5194';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/?qa-seed=712&qa-worker-game&qa-worker-early-native&qa-worker-early-new&qa-worker-early-gpu-view&qa-webgpu-world&qa-webgpu-picking&qa-webgpu-single-actor&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
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
 console.log(JSON.stringify({backend:status.backend,centers:status.centers,location:event.presentation,events:status.events.map(event=>event.type),scope:'Fresh game QA, one center selected by real WebGPU picker; no full-game parity or performance claim'}));
}finally{await browser.close();}
