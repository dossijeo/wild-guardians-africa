import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-webgpu-all-actors&qa-worker-batch=1&wildEngineThreads=0',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q?.animals>0||document.querySelector('.error-banner');},null,{timeout:180000});
 await page.waitForFunction(async()=>{try{const s=await window.wildGuardiansWebGpuWorldQa();return s.backend==='WebGPU'&&s.actors?.ready>=1;}catch{return false;}},null,{timeout:120000});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().elapsed>=12,null,{timeout:60000});await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();
 const target=await page.evaluate(()=>window.wildGuardiansWorkerCombatQa().animals.find(a=>a.species==='hyena'&&!['gone','retreating'].includes(a.status)&&!a.down)?.id);if(!target)throw Error('No eligible hyena');await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),target);
 await page.waitForFunction(async()=>{try{return (await window.wildGuardiansWebGpuWorldQa()).actors?.physicalApplied>0;}catch{return false;}},null,{timeout:60000});
 await page.locator('#menuButton').click();await page.waitForFunction(()=>window.wildGuardiansWorkerQa().pauses.includes('menu'),null,{timeout:30000});
 const restored=await page.evaluate(async()=>{try{return await window.wildGuardiansRestoreTerrainCheckpointQa();}catch(error){throw Error(JSON.stringify({error:error.message,banner:document.querySelector('.error-banner')?.textContent,runtime:window.wildGuardiansWorkerQa?.(),gpu:await window.wildGuardiansWebGpuWorldQa?.().catch(e=>({error:e.message}))}));}});
 if(!restored.activePoses||errors.length)throw Error('Checkpoint did not restore an active pose '+JSON.stringify({restored,errors}));console.log(JSON.stringify({target,...restored,backend:'WebGPU',scope:'Real QA raid, confirmed Rapier pose and terrain checkpoint in the existing graphics worker; not worker restart or full recovery.'}));
}finally{await browser.close();}
