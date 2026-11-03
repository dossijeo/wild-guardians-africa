import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 const base=process.env.QA_BASE_URL??'http://127.0.0.1:5175',flags='qa-worker-game&qa-worker-clock&qa-worker-physics-save&wildEngineThreads=0';
 await page.goto(`${base}/?${flags}&qa-worker-raid`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q.animals>0&&q.elapsed>=12;},null,{timeout:180000});
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();await page.evaluate(()=>window.wildGuardiansWorkerAttackQa('animal-368'));
 await page.waitForFunction(()=>window.wildGuardiansWorkerCombatQa().animals.find(a=>a.id==='animal-368')?.down,null,{timeout:60000});
 if(process.env.QA_RECOVERY==='1')await page.waitForFunction(()=>window.wildGuardiansWorkerCombatQa().animals.find(a=>a.id==='animal-368')?.down==='recovering',null,{timeout:90000});
 await page.locator('#menuButton').evaluate(element=>element.click());await page.waitForFunction(()=>window.wildGuardiansWorkerQa().pauses.includes('menu'),null,{timeout:30000});
 const paused=await page.evaluate(()=>window.wildGuardiansWorkerQa());await page.locator('#save').click();
 const saved=await page.waitForFunction(async slot=>{try{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js'),s=await new BrowserSaveRepository(localStorage).load(slot),a=s.raid?.animals.find(x=>x.id==='animal-368');return s.workerPhysicsCheckpoint&&a?.magicDown?{slot:s.slotId,elapsed:s.elapsed,phase:a.magicDown.phase,checkpointChars:s.workerPhysicsCheckpoint.length}:false;}catch{return false;}},paused.slotId,{timeout:30000}).then(h=>h.jsonValue());
 await page.goto(`${base}/?${flags}&qa-worker-load-slot=${encodeURIComponent(saved.slot)}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game'||document.querySelector('.error-banner'),null,{timeout:180000});
 const loaded=await page.evaluate(()=>({game:window.wildGuardiansWorkerQa(),animal:window.wildGuardiansWorkerCombatQa().animals.find(a=>a.id==='animal-368'),failure:document.querySelector('.error-banner')?.textContent}));
 if(loaded.failure||loaded.game.status?.fault||!loaded.animal?.down||errors.length)throw Error(JSON.stringify({saved,loaded,errors}));
 await page.goto(`${base}/?qa-worker-game&qa-worker-clock&wildEngineThreads=0&qa-worker-load-slot=${encodeURIComponent(saved.slot)}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.innerText.includes('Esta partida experimental necesita el modo Worker'),null,{timeout:180000});
 const blocked=await page.evaluate(async slot=>{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js'),state=await new BrowserSaveRepository(localStorage).load(slot);return {stillHasCheckpoint:!!state.workerPhysicsCheckpoint,elapsed:state.elapsed};},saved.slot);
 if(!blocked.stillHasCheckpoint||errors.length)throw Error(JSON.stringify({blocked,errors}));
 console.log(JSON.stringify({saved,loaded,blocked,scope:'Experimental game, direct attack input and save UI, IndexedDB reload during active fall or authored recovery, and incompatible-mode rejection. No campaign comparison, visual assessment or procedural recovery/baked fallback checkpoint.'}));
}finally{await browser.close();}
