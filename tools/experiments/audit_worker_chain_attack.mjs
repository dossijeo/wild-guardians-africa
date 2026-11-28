import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-worker-clock&qa-worker-coalesce&qa-worker-diagnostics${process.env.QA_FOLD_VIEW==='1'?'&qa-worker-view-ack&qa-worker-fold-view':''}&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q.animals>1&&q.elapsed>=12;},null,{timeout:180000});
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();
 const initial=await page.evaluate(()=>window.wildGuardiansWorkerCombatQa()),first=initial.animals.find(a=>!['gone','retreating'].includes(a.status));
 await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),first.id);
 await page.waitForFunction(id=>window.wildGuardiansWorkerCombatQa().hits.includes(id),first.id,{timeout:60000});
 await page.waitForFunction(id=>{const q=window.wildGuardiansWorkerCombatQa(),a=q.animals.find(a=>a.id===id);return q.elapsed>=q.gestureAt+1.74&&a?.down;},first.id,{timeout:60000});
 const before=await page.evaluate(()=>window.wildGuardiansWorkerCombatQa()),second=before.animals.find(a=>a.id!==first.id&&!['gone','retreating'].includes(a.status)&&!a.down&&!a.impactAt);
 if(!second)throw Error('No second standing animal: '+JSON.stringify(before));
 await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),second.id);
 await page.waitForFunction(id=>window.wildGuardiansWorkerCombatQa().hits.includes(id),second.id,{timeout:60000});
 await page.waitForFunction(id=>{const q=window.wildGuardiansWorkerCombatQa();return q.elapsed>=q.gestureAt+1.74&&q.animals.find(a=>a.id===id)?.down;},first.id,{timeout:60000});
 const rejectedBefore=await page.evaluate(id=>({combat:window.wildGuardiansWorkerCombatQa(),sequence:window.wildGuardiansWorkerQa().status.confirmedSequence,health:window.wildGuardiansWorkerCombatQa().animals.find(a=>a.id===id).health}),first.id);
 const attempt=await page.evaluate(id=>{window.wildGuardiansWorkerAttackQa(id);return window.wildGuardiansWorkerSummonQa().event;},first.id);
 if(attempt?.provisional)throw Error('A downed animal started an attack animation: '+JSON.stringify(attempt));
 await page.waitForFunction(sequence=>window.wildGuardiansWorkerQa().status.confirmedSequence>sequence,rejectedBefore.sequence,{timeout:60000});
 const end=await page.evaluate(()=>({combat:window.wildGuardiansWorkerCombatQa(),game:window.wildGuardiansWorkerQa()}));
 if(end.combat.animals.find(a=>a.id===first.id)?.health!==rejectedBefore.health)throw Error('A downed animal was damaged: '+JSON.stringify({rejectedBefore,end}));
 if(end.game.status?.fault||errors.length)throw Error(JSON.stringify({end,errors}));
 console.log(JSON.stringify({first:first.id,second:second.id,before,end,scope:'Opt-in real Worker raid, direct attack input, headless SwiftShader; no visual or frame-time comparison.'}));
}finally{await browser.close();}
