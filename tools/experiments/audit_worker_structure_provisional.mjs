import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.route('**/tests/fixtures/microevent-wood.json',async route=>{const response=await route.fetch(),fixture=await response.json();fixture.ledger.balance={n:'2000',d:'1'};await route.fulfill({response,json:fixture});});
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-worker-coalesce&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 await page.locator('[data-menu="build"]').click();await page.locator('#native-wall').click();await page.locator('#gate').check();await page.locator('[data-wall="empalizada"]').click();
 const gate=await page.evaluate(()=>window.wildGuardiansWorkerStructureQa({x:80,z:20}));if(gate.walls.length!==1)throw Error('Missing provisional gate: '+JSON.stringify(gate));
 await page.waitForFunction(count=>{const q=window.wildGuardiansWorkerStructureStatusQa();return q.count>count&&q.walls===0;},gate.count,{timeout:30000});
 await page.locator('[data-menu="build"]').click();await page.locator('#native-center').click();
 const center=await page.evaluate(()=>window.wildGuardiansWorkerStructureQa({x:83,z:0}));if(center.buildings.length!==1)throw Error('Missing provisional center: '+JSON.stringify(center));
 await page.waitForFunction(()=>window.wildGuardiansWorkerStructureStatusQa().buildings===0,null,{timeout:30000});
 const end=await page.evaluate(()=>({structure:window.wildGuardiansWorkerStructureStatusQa(),game:window.wildGuardiansWorkerQa()}));
 if(end.structure.count!==center.count||end.game.status?.fault||errors.length)throw Error(JSON.stringify({end,errors}));
 console.log(JSON.stringify({gate,center,end,scope:'Opt-in Worker game, altered-balance peaceful fixture, direct input handler; gate accepted and overlapping center rejected. Headless SwiftShader; no visual or performance comparison.'}));
}finally{await browser.close();}
