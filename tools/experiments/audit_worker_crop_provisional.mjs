import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-worker-coalesce&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="growth"]').click();
 const start=await page.evaluate(()=>window.wildGuardiansWorkerCropSpellQa());
 if(!start.event?.provisional||!start.event.commandId)throw Error('No immediate provisional summon: '+JSON.stringify(start));
 await page.waitForFunction(id=>{const e=window.wildGuardiansWorkerSummonQa().event;return e?.commandId===id&&!e.provisional;},start.event.commandId,{timeout:30000});
 const end=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),game:window.wildGuardiansWorkerQa()}));
 if(end.game.status?.fault||errors.length)throw Error(JSON.stringify({end,errors}));
 const rejected=await page.evaluate(()=>window.wildGuardiansWorkerCropSpellQa());
 if(!rejected.event?.provisional||rejected.event.commandId===start.event.commandId)throw Error('No new provisional summon: '+JSON.stringify(rejected));
 await page.waitForFunction(id=>window.wildGuardiansWorkerSummonQa().event?.commandId!==id,rejected.event.commandId,{timeout:30000});
 const final=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),game:window.wildGuardiansWorkerQa(),error:document.querySelector('.error-banner')?.textContent??null}));
 if(final.game.status?.fault||errors.length||final.game.events.filter(type=>type==='SpellActivated').length!==1)throw Error(JSON.stringify({final,errors}));
 console.log(JSON.stringify({start,end,rejected,final,scope:'Opt-in Worker game using a peaceful fixture and direct crop input handler; headless SwiftShader, no visual comparison or latency benchmark.'}));
}finally{await browser.close();}
