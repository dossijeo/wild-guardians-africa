import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-worker-coalesce&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 await page.locator('[data-menu="grow"]').click();await page.locator('[data-crop="mijo"]').click();
 const start=await page.evaluate(()=>window.wildGuardiansWorkerPlantQa());
 if(start.pending.length!==1)throw Error('Missing provisional crop: '+JSON.stringify(start));
 await page.waitForFunction(({count,id})=>{const q=window.wildGuardiansWorkerPlantStatusQa();return q.count===count+1&&q.events[0]?.commandId===id&&q.pending===0;},{count:start.count,id:start.pending[0]},{timeout:30000});
 const end=await page.evaluate(()=>({plant:window.wildGuardiansWorkerPlantStatusQa(),game:window.wildGuardiansWorkerQa()}));
 if(end.game.status?.fault||errors.length||Math.hypot(end.plant.position.x-start.point.x,end.plant.position.z-start.point.z)<1)throw Error(JSON.stringify({end,errors}));
 console.log(JSON.stringify({start,end,scope:'Opt-in Worker game, peaceful fixture, direct crop input on an existing crop; headless SwiftShader, no visual or performance comparison.'}));
}finally{await browser.close();}
