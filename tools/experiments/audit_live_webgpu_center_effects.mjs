import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.route('**/tests/fixtures/microevent-wood.json',async route=>{const response=await route.fetch(),fixture=await response.json(),center=fixture.structures.find(s=>s.kind==='center');center.hp=0;center.status='collapsing';center.collapseRemaining=3.2;await route.fulfill({response,json:fixture});});
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-webgpu-world&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game'||document.querySelector('.error-banner'),null,{timeout:180000});
 const deadline=Date.now()+120000;let result=null,last=null;while(Date.now()<deadline){last=await page.evaluate(async()=>({gpu:await window.wildGuardiansWebGpuWorldQa().catch(()=>null),game:window.wildGuardiansWorkerQa(),error:document.querySelector('.error-banner')?.textContent??null}));if(last.error||last.game?.status?.fault||last.gpu?.guardianError)throw Error(JSON.stringify(last));const fx=last.gpu?.settlements?.destruction?.[0];if(last.gpu?.backend==='WebGPU'&&last.gpu.settlements.damagedCenters>0&&fx?.emitted>0&&fx.smoke>0&&fx.debris>0){result={...fx,elapsed:last.game.elapsed};break;}await page.waitForTimeout(100);}
 if(!result||errors.length)throw Error('No confirmed destruction effects '+JSON.stringify({last,errors}));console.log(JSON.stringify({backend:'WebGPU',result,scope:'Real Worker game loaded from an already collapsing center fixture; native smoke and debris, not a visual A/B or performance benchmark.'}));
}finally{await browser.close();}
