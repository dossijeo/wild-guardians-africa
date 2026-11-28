import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-worker-clock&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game'||document.querySelector('.error-banner'),null,{timeout:180000});
 const deadline=Date.now()+180000;let result=null,last=null;while(Date.now()<deadline){last=await page.evaluate(async()=>({gpu:await window.wildGuardiansWebGpuWorldQa().catch(()=>null),game:window.wildGuardiansWorkerQa(),error:document.querySelector('.error-banner')?.textContent??null}));if(last.error||last.game?.status?.fault)throw Error(JSON.stringify(last));const effect=last.gpu?.agricultureVfx?.active?.find(e=>e.family==='wall'&&e.sprites>0);if(last.gpu?.backend==='WebGPU'&&effect&&last.game.events.includes('AnimalLogicalHit')){result={effect,elapsed:last.game.elapsed,events:last.game.events};break;}await page.waitForTimeout(100);}
 if(!result||errors.length)throw Error('No confirmed raid wall effect '+JSON.stringify({last,errors}));console.log(JSON.stringify({backend:'WebGPU',result,scope:'Real Worker raid with original snapshot and natural confirmed wall attack; no screenshot comparison or performance claim.'}));
}finally{await browser.close();}
