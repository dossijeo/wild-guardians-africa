import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const shared=process.env.QA_SHARED_CLIPS==='1',base=process.env.QA_BASE_URL??'http://127.0.0.1:5175';
 await page.goto(`${base}/?qa-worker-game&qa-worker-clock&qa-worker-raid&qa-worker-diagnostics&wildEngineThreads=0${shared?'&qa-worker-shared-clips':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q.animals>0&&q.elapsed>=12;},null,{timeout:180000});
 const selected=await page.evaluate(()=>{const animals=window.wildGuardiansWorkerCombatQa().animals.filter(a=>!['gone','retreating'].includes(a.status));for(const a of animals){const b=animals.find(x=>x.id!==a.id&&x.species===a.species);if(b)return [a,b];}throw Error('No same-species pair');});
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();
 const hits=[];for(const target of selected){
  if(hits.length)await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerCombatQa();return Number.isFinite(q.gestureAt)&&q.elapsed-q.gestureAt>=1.74;},null,{timeout:60000});
  const started=Date.now();await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),target.id);
  await page.waitForFunction(id=>{const a=window.wildGuardiansWorkerCombatQa().animals.find(x=>x.id===id);return a?.impactAt!==undefined;},target.id,{timeout:60000});
  const result=await page.evaluate(id=>({combat:window.wildGuardiansWorkerCombatQa().animals.find(x=>x.id===id),status:window.wildGuardiansWorkerQa().status}),target.id);
  if(result.status.fault||errors.length)throw Error(JSON.stringify({result,errors}));hits.push({id:target.id,confirmationMs:Date.now()-started,diagnostics:result.status.lastAttackDiagnostic});
 }
 console.log(JSON.stringify({shared,species:selected[0].species,hits,scope:'One headless day-31 real-game QA run, direct attack input, not pointer timing or a frame-time benchmark. Wall-clock diagnostics are influenced by asynchronous status publication and contention.'}));
}finally{await browser.close();}
