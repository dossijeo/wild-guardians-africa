import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const source=JSON.parse(await readFile(new URL('../../docs/guardian/phase2/performance-components/native-raid-snapshot.json',import.meta.url),'utf8'));
Object.assign(source,{completedNights:10,cinematicSeenAct:0,pauses:['hiring'],raid:null,result:null,postgame:false,dayPlan:null,nightPlan:null});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/docs/guardian/phase2/performance-components/native-raid-snapshot.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(source)}));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-visibility&qa-worker-clock&qa-worker-batch=16&qa-worker-view-ack&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.locator('.campaign-cinema__skip').waitFor({state:'visible',timeout:180000});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().pauses.includes('campaign-cinematic'),null,{timeout:30000});
 const before=await page.evaluate(()=>window.wildGuardiansWorkerQa());await page.waitForTimeout(600);const held=await page.evaluate(()=>window.wildGuardiansWorkerQa());
 if(held.elapsed!==before.elapsed||held.status.saveAvailable)throw Error('Cinematic did not pause or save was available');
 await page.locator('.campaign-cinema__skip').click();await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q&&!q.pauses.includes('campaign-cinematic')&&q.status?.saveAvailable;},null,{timeout:30000});
 await page.waitForFunction(async()=>{const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('wild-guardians-saves',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('slots','readonly'),req=tx.objectStore('slots').get(window.wildGuardiansWorkerQa().slotId);req.onsuccess=()=>{try{resolve(JSON.parse(req.result?.primary??'null')?.cinematicSeenAct===1);}catch{resolve(false);}};req.onerror=()=>reject(req.error);});}finally{db.close();}},null,{timeout:30000});
 const restored=await page.evaluate(async()=>{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js'),repo=new BrowserSaveRepository(localStorage),state=await repo.load(window.wildGuardiansWorkerQa().slotId);return {act:state.cinematicSeenAct,pauses:state.pauses};});if(restored.act!==1||restored.pauses.includes('campaign-cinematic')||!restored.pauses.includes('hiring'))throw Error('Saved cinematic state cannot be restored: '+JSON.stringify(restored));
 const after=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(after.status.fault||errors.length||!after.pauses.includes('hiring'))throw Error(JSON.stringify({after,errors}));
 console.log(JSON.stringify({elapsedBefore:before.elapsed,elapsedHeld:held.elapsed,elapsedAfter:after.elapsed,pauses:after.pauses,savedAct:1,scope:'Real opt-in game and two Workers using a synthetic savanna capture at the first cinematic milestone; skipped cinematic, confirmed pause and saved chapter. No complete campaign or performance comparison.'}));
}finally{await browser.close();}
