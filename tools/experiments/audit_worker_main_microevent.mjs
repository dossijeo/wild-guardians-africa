import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',microevents:'adaptive'})));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-clock&qa-microevents&qa-microevents-fixture=wood&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__microevents?.workerEconomy&&window.wildGuardiansWorkerQa?.().status?.running,null,{timeout:180000});
 const attempt=await page.evaluate(async()=>{const c=window.__microevents;await c.billboards.ready;c.world.focusFarm();return {forced:await c.force('seeds',{economy:true}),blocked:c.blocked(),anchors:c.anchors.length};});
 if(!attempt.forced)throw Error('Could not start microevent: '+JSON.stringify(attempt));
 const before=await page.evaluate(()=>({ticket:window.__microevents.active.ticket,confirmed:window.__microevents.state.microevents?.ticket,seq:window.wildGuardiansWorkerQa().status.confirmedSequence}));
 if(before.ticket.id!==before.confirmed?.id)throw Error('Reservation was not confirmed');
 if(process.env.QA_RECOVER_PENDING==='1'){
  const slot=await page.evaluate(()=>window.wildGuardiansWorkerQa().slotId);
  await page.waitForFunction(async({slot,id})=>{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js');try{return (await new BrowserSaveRepository(localStorage).load(slot)).microevents?.ticket?.id===id;}catch{return false;}},{slot,id:before.ticket.id},{timeout:30000});
  await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-clock&qa-microevents&qa-worker-load-slot=${encodeURIComponent(slot)}&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__microevents?.workerEconomy&&window.wildGuardiansWorkerQa?.().status?.running,null,{timeout:180000});
  const after=await page.evaluate(async old=>{const c=window.__microevents;await c.workerEconomy.ready;const cleared=c.state.microevents.ticket===null,rewarded=Object.hasOwn(c.state.ledger.entries,old.id),replacement=await c.workerEconomy.reserve('seeds',old.targetId);return {cleared,rewarded,replacement,confirmed:c.state.microevents.ticket,fault:window.wildGuardiansWorkerQa().status.fault};},before.ticket);
  if(!after.cleared||after.rewarded||!after.replacement||after.replacement.id===before.ticket.id||after.confirmed?.id!==after.replacement.id||after.fault||errors.length)throw Error(JSON.stringify({after,errors}));
  console.log(JSON.stringify({original:before.ticket.id,replacement:after.replacement.id,cleared:after.cleared,rewarded:after.rewarded,scope:'Real opt-in game reload through BrowserSaveRepository; replacement requested through the director economy adapter, without a second visual gesture or performance comparison.'}));
 }else{
 await page.evaluate(()=>window.__microevents.finish('completed'));
 await page.waitForFunction(id=>window.__microevents?.state.microevents?.ticket===null&&window.__microevents.records.some(e=>e.type==='economy')&&window.wildGuardiansWorkerQa().status.confirmedSequence>id,before.seq,{timeout:30000});
 const after=await page.evaluate(()=>({state:window.__microevents.state.microevents,records:window.__microevents.records.slice(-8),fault:window.wildGuardiansWorkerQa().status.fault}));
 if(after.fault||errors.length||!after.state.history.includes('seeds')||!(after.state.eventCooldowns.seeds>0))throw Error(JSON.stringify({after,errors}));
 await page.waitForFunction(async()=>{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js'),repo=new BrowserSaveRepository(localStorage);try{const state=await repo.load(window.wildGuardiansWorkerQa().slotId);return state.microevents?.ticket===null&&state.microevents.history.includes('seeds')&&state.microevents.eventCooldowns.seeds>0;}catch{return false;}},null,{timeout:30000});
 console.log(JSON.stringify({ticket:before.ticket.id,cleared:after.state.ticket===null,records:after.records,scope:'Real opt-in game, two Workers, synthetic wood fixture, forced visual event and programmatic completion; saved state reloaded, no gesture, real economic reward or campaign.'}));
 }
}finally{await browser.close();}
