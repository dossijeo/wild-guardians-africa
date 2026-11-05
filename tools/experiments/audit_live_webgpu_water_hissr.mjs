import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[],consoleErrors=[],consoleWarnings=[];
 page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());if(message.type()==='warning')consoleWarnings.push(message.text());});
 const url=(process.env.QA_BASE_URL??'http://127.0.0.1:5390')+'/?qa-worker-game&qa-worker-start&qa-webgpu-world&qa-webgpu-water-hissr&qa-seed=712&wildEngineThreads=0';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 const deadline=Date.now()+Number(process.env.QA_TIMEOUT_MS??120000);let status=null;
 const ready=value=>value?.backend==='WebGPU'&&value?.state?.sequence>0&&value.resident>0&&!value.terrain?.presentationPending&&value.waterReflection?.active&&value.waterReflection.frames>1&&value.waterReflection.waterChunks>0;
 while(Date.now()<deadline){try{status=await page.evaluate(async()=>{try{return await Promise.race([window.wildGuardiansWebGpuWorldQa?.(),new Promise(resolve=>setTimeout(()=>resolve(null),3000))]);}catch{return null;}});}catch(error){if(!/Execution context was destroyed/.test(String(error)))throw error;}if(ready(status)||errors.length)break;await page.waitForTimeout(300);}
 const adapter=await page.evaluate(async()=>{const adapter=await navigator.gpu?.requestAdapter(),info=adapter?.info;return adapter?{info:{vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:info?.isFallbackAdapter},features:[...adapter.features]}:null;});
 if(!adapter)throw Error('WebGPU adapter unavailable');
 await page.waitForTimeout(1500);if(process.env.QA_CAPTURE)await page.screenshot({path:process.env.QA_CAPTURE});const result={adapter,status,errors,consoleErrors,consoleWarnings};console.log(JSON.stringify(result));
 if(!ready(status)||errors.length||[...consoleErrors,...consoleWarnings].some(error=>/webgpu|shader|pipeline|validation|device lost/i.test(error)))process.exitCode=1;
}finally{await browser.close();}
