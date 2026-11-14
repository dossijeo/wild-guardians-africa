import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',microevents:'off'})));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&wildEngineThreads=0${process.env.QA_MAIN_CLOCK==='1'?'&qa-worker-main-clock':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().status?.running,null,{timeout:180000});
 const hosted=await page.evaluate(()=>window.wildGuardiansWorkerQa().hostedClock);if(hosted!==(process.env.QA_MAIN_CLOCK!=='1'))throw Error('Unexpected clock mode');await page.evaluate(()=>window.wildGuardiansWorkerRenderFailureQa());
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().pauses.includes('runtime-error'),null,{timeout:30000});
 const first=await page.evaluate(()=>window.wildGuardiansWorkerQa());
 await page.waitForTimeout(500);
 const second=await page.evaluate(()=>window.wildGuardiansWorkerQa());
 if(first.status.fault||second.status.fault||!second.pauses.includes('runtime-error')||first.elapsed!==second.elapsed)throw Error(JSON.stringify({first,second}));
 console.log(JSON.stringify({pause:second.pauses,elapsed:first.elapsed,confirmedSequence:second.status.confirmedSequence,scope:'Injected presentation exception in the real opt-in Worker game; confirmed authoritative pause and stable simulation time, not a frame-time measurement.'}));
}finally{await browser.close();}
