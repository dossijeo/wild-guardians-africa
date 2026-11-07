import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:5194';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/tests/browser/create-early-native-build-save.html');await page.waitForFunction(()=>window.ready,{timeout:10000});const seed=await page.evaluate(()=>window.makeSave());
 await page.goto(`${base}/?qa-worker-load-slot=${encodeURIComponent(seed.slotId)}&qa-worker-game&qa-worker-early-native&qa-worker-early-gpu-view&qa-worker-early-biome&qa-webgpu-world&qa-webgpu-picking&qa-webgpu-single-actor&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof globalThis.wildGuardiansEarlyGpuQa==='function',{timeout:30000});
 let status;const deadline=Date.now()+45000;do{status=await page.evaluate(()=>globalThis.wildGuardiansEarlyGpuQa());if(status.renderer.props?.loadedSlots===19||status.renderer.props?.failure)break;await page.waitForTimeout(200);}while(Date.now()<deadline);
 if(status.backend!=='WebGPU'||status.renderer.props?.loadedSlots!==19||status.renderer.props.failure||status.renderer.props.meshes<1||errors.length)throw Error(JSON.stringify({status,errors}));
 console.log(JSON.stringify({backend:status.backend,props:status.renderer.props,resident:status.renderer.resident,scope:'QA Continue, two native chunks; no full-game or visual parity claim'}));
}finally{await browser.close();}
