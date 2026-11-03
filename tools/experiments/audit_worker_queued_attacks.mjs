import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:process.env.QA_NATIVE_GPU==='1'?[]:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-worker-delay-attack&qa-worker-provisional-recoil&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q.animals>1&&q.elapsed>=12;},null,{timeout:180000});
 const ids=await page.evaluate(()=>window.wildGuardiansWorkerCombatQa().animals.filter(a=>!['gone','retreating'].includes(a.status)).slice(0,2).map(a=>a.id));if(ids.length!==2)throw Error('Missing targets');
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),ids[0]);
 await page.waitForFunction(id=>window.wildGuardiansWorkerSummonQa()?.event?.targetId===id&&window.wildGuardiansWorkerSummonQa()?.event?.provisional,ids[0],{timeout:10000});
 await page.waitForFunction(id=>{const p=window.wildGuardiansWorkerProvisionalImpactQa(id);return p.pending&&p.applied&&!window.wildGuardiansWorkerCombatQa().hits.includes(id);},ids[0],{timeout:10000});
 const first=await page.evaluate(()=>window.wildGuardiansWorkerSummonQa());await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),ids[0]);const repeated=await page.evaluate(()=>window.wildGuardiansWorkerSummonQa());if(repeated.event?.commandId!==first.event.commandId)throw Error('Pending target started another gesture');
 await page.waitForTimeout(2100);const before=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),hits:window.wildGuardiansWorkerCombatQa().hits}));if(before.hits.includes(ids[0]))throw Error('Delay was not observed');
 await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),ids[1]);const second=await page.evaluate(()=>window.wildGuardiansWorkerSummonQa());if(second.event?.targetId!==ids[1]||!second.event.provisional)throw Error('Second provisional gesture did not start: '+JSON.stringify(second));
 if(process.env.QA_CAPTURE==='1')await page.screenshot({path:'.cache/worker-attack-provisional.png'});
 await page.waitForFunction(ids=>{const q=window.wildGuardiansWorkerCombatQa();return ids.every(id=>q.hits.includes(id))||window.wildGuardiansWorkerQa().status.fault;},ids,{timeout:60000});
 const result=await page.evaluate(()=>({combat:window.wildGuardiansWorkerCombatQa(),status:window.wildGuardiansWorkerQa().status,summon:window.wildGuardiansWorkerSummonQa()}));if(result.status.fault||!ids.every(id=>result.combat.hits.filter(hit=>hit===id).length===1)||errors.length)throw Error(JSON.stringify({result,errors}));
 if(process.env.QA_CAPTURE==='1')await page.screenshot({path:'.cache/worker-attack-confirmed.png'});
 await page.waitForFunction(id=>{const q=window.wildGuardiansWorkerCombatQa(),a=q.animals.find(x=>x.id===id);return a?.down&&Number.isFinite(q.gestureAt)&&q.elapsed-q.gestureAt>=1.74;},ids[0],{timeout:30000});
 const downBefore=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),hits:window.wildGuardiansWorkerCombatQa().hits}));await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),ids[0]);const downAfter=await page.evaluate(()=>({summon:window.wildGuardiansWorkerSummonQa(),hits:window.wildGuardiansWorkerCombatQa().hits}));if(downAfter.summon.event?.commandId!==downBefore.summon.event?.commandId||JSON.stringify(downAfter.hits)!==JSON.stringify(downBefore.hits))throw Error('Downed target started another attack');
 console.log(JSON.stringify({ids,provisionalRecoilBeforeConfirmation:true,firstPendingAtSecond:true,secondProvisional:second.event,confirmed:result.combat.hits.filter(id=>ids.includes(id)),downedRejected:true,scope:'Real opt-in game, artificial five-second delay before first Worker attack; direct QA input, no pointer or visual-quality comparison.'}));
}finally{await browser.close();}
