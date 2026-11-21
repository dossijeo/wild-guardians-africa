import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const spell=process.env.QA_CROP_SPELL??'growth';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-worker-coalesce&wildEngineThreads=0${process.env.QA_WEBGPU_WORLD==='1'?'&qa-webgpu-world':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="'+spell+'"]').click();
 const start=await page.evaluate(()=>window.wildGuardiansWorkerCropSpellQa());
 if(!start.event?.provisional||!start.event.commandId)throw Error('No immediate provisional summon: '+JSON.stringify(start));
 await page.waitForFunction(id=>{const e=window.wildGuardiansWorkerSummonQa().event;return e?.commandId===id&&!e.provisional;},start.event.commandId,{timeout:30000});
 let gpu=null;if(process.env.QA_WEBGPU_WORLD==='1'){const deadline=Date.now()+20000;while(Date.now()<deadline){gpu=await page.evaluate(async()=>{try{return await window.wildGuardiansWebGpuWorldQa();}catch{return null;}});if(gpu?.agricultureVfx?.effects>0&&gpu?.guardianAttack?.lastCommand===start.event.commandId&&gpu?.guardianAttack?.confirmed>0)break;await page.waitForTimeout(100);}if(!gpu?.agricultureVfx?.effects||gpu?.guardianAttack?.lastCommand!==start.event.commandId||!gpu?.guardianAttack?.confirmed)throw Error('Confirmed agricultural VFX not visible: '+JSON.stringify(gpu));}
 const end=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),game:window.wildGuardiansWorkerQa()}));
 if(end.game.status?.fault||errors.length)throw Error(JSON.stringify({end,errors}));
 const rejected=await page.evaluate(()=>window.wildGuardiansWorkerCropSpellQa());
 if(!rejected.event?.provisional||rejected.event.commandId===start.event.commandId)throw Error('No new provisional summon: '+JSON.stringify(rejected));
 await page.waitForFunction(id=>window.wildGuardiansWorkerSummonQa().event?.commandId!==id,rejected.event.commandId,{timeout:30000});
 let gpuRejected=null;if(process.env.QA_WEBGPU_WORLD==='1'){const until=Date.now()+20000;while(Date.now()<until){gpuRejected=await page.evaluate(()=>window.wildGuardiansWebGpuWorldQa());if(gpuRejected?.guardianAttack?.rejected>0&&gpuRejected.guardianAttack.lastCommand===rejected.event.commandId)break;await page.waitForTimeout(100);}if(!gpuRejected?.guardianAttack?.rejected||gpuRejected.guardianAttack.lastCommand!==rejected.event.commandId)throw Error('WebGPU rejected gesture not cleared: '+JSON.stringify(gpuRejected));}
 const final=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),game:window.wildGuardiansWorkerQa(),error:document.querySelector('.error-banner')?.textContent??null}));
 if(final.game.status?.fault||errors.length||final.game.events.filter(type=>type==='SpellActivated').length!==1)throw Error(JSON.stringify({final,errors}));
 console.log(JSON.stringify({start,end,rejected,final,gpu,gpuRejected:gpuRejected?.guardianAttack,scope:'Opt-in Worker game using a peaceful fixture and direct crop input handler; headless SwiftShader, no visual comparison or latency benchmark.'}));
}finally{await browser.close();}
