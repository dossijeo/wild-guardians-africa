import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{const probe=window.__workerFrameProbe={samples:[],enabled:false};let last=null;function frame(now){if(probe.enabled&&last!==null)probe.samples.push(now-last);last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);});
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-visibility&qa-worker-diagnostics&wildEngineThreads=0&qa-worker-batch=${process.env.QA_BATCH??1}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game'||document.querySelector('.error-banner'),null,{timeout:180000});
 console.log('STARTUP',JSON.stringify(await page.evaluate(()=>window.wildGuardiansWorkerQa())));
 try{await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.animals>0||q?.status?.fault||document.querySelector('.error-banner');},null,{timeout:60000});}
 catch(error){throw Error('Raid startup timed out: '+JSON.stringify(await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa?.(),text:document.body.innerText.slice(0,500)})))+'; page errors: '+JSON.stringify(errors));}
 const start=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),failure:document.querySelector('.error-banner')?.textContent}));
 if(start.failure||start.qa.status?.fault||!start.qa.animals)throw Error('Worker raid did not start: '+JSON.stringify(start));
 await page.waitForTimeout(4000);const end=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),visibility:window.wildGuardiansVisibilityQa()}));
 if(end.qa.status?.fault||end.qa.elapsed<=start.qa.elapsed||errors.length)throw Error('Worker raid failed: '+JSON.stringify({start,end,errors}));
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();
 const scanInitial=await page.evaluate(()=>window.wildGuardiansWorkerQa()),scanStarted=Date.now();let target=null;for(let attempt=0;attempt<20&&!target;attempt++){
  target=await page.evaluate(async()=>{const v=window.wildGuardiansVisibilityQa(),{Vector3,Matrix4}=await import('/node_modules/three/build/three.module.js'),r=v.camera.canvas;
   for(const actor of v.actors.filter(a=>a.ready&&a.visible&&a.position)){const p=new Vector3(...actor.position);p.y+=.6;p.applyMatrix4(new Matrix4().fromArray(v.camera.inverse)).applyMatrix4(new Matrix4().fromArray(v.camera.projection));const cx=r.left+(p.x+1)*r.width/2,cy=r.top+(1-p.y)*r.height/2;for(let radius=0;radius<=70;radius+=5)for(let dy=-radius;dy<=radius;dy+=5)for(let dx=-radius;dx<=radius;dx+=5){if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;const x=cx+dx,y=cy+dy;if(x<r.left||y<r.top||x>=r.right||y>=r.bottom||document.elementFromPoint(x,y)?.id!=='world')continue;if(window.wildGuardiansWorkerPickQa(x,y)===actor.id)return {x,y,id:actor.id};}}return null;});
  if(!target)await page.waitForTimeout(500);
 }
 if(!target)throw Error('No visible clickable animal');const beforeAttack=await page.evaluate(()=>{window.__workerFrameProbe.samples=[];window.__workerFrameProbe.enabled=true;return window.wildGuardiansWorkerQa();}),attackRequested=Date.now();console.log('SCAN_DIAGNOSTIC',JSON.stringify({scanMs:attackRequested-scanStarted,before:scanInitial.status,after:beforeAttack.status,target:target.id}));await page.mouse.click(target.x,target.y);
 try{await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa();return q.events.includes('GuardianMagicHit')||q.status?.fault;},null,{timeout:60000});}
 catch{throw Error('Attack was not confirmed: '+JSON.stringify(await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),text:document.body.innerText.slice(-800)})))+'; page errors: '+JSON.stringify(errors));}
 const hit=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(hit.status?.fault||!hit.events.includes('GuardianMagicHit')||errors.length)throw Error('Attack failed: '+JSON.stringify({hit,errors}));
 const attackLatencyMs=Date.now()-attackRequested,frames=await page.evaluate(()=>{const p=window.__workerFrameProbe;p.enabled=false;const values=p.samples.slice().sort((a,b)=>a-b),at=q=>values.length?values[Math.min(values.length-1,Math.ceil(values.length*q)-1)]:null;return {count:values.length,p95:at(.95),p99:at(.99),max:values.at(-1)??null};});
 console.log('ATTACK_DIAGNOSTIC',JSON.stringify({batch:Number(process.env.QA_BATCH??1),scanMs:attackRequested-scanStarted,attackLatencyMs,before:beforeAttack.status,after:hit.status,frames}));
 let saved=null;if(process.argv.includes('--save-check')){
  if(hit.status.saveAvailable)throw Error('Impact was unexpectedly advertised as restorable');
  const pauseRequested=Date.now();await page.locator('#menuButton').evaluate(element=>element.click());try{await page.waitForFunction(()=>window.wildGuardiansWorkerQa().pauses.includes('menu')||window.wildGuardiansWorkerQa().status.fault,null,{timeout:30000});}catch{throw Error('Pause was not confirmed: '+JSON.stringify(await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),text:document.body.innerText.slice(-800)}))));}console.log('PAUSE',JSON.stringify({batch:Number(process.env.QA_BATCH??1),realMs:Date.now()-pauseRequested,hitElapsed:hit.elapsed,paused:await page.evaluate(()=>window.wildGuardiansWorkerQa())}));
  const paused=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(paused.status.saveAvailable)throw Error('Physics completed before pause: '+JSON.stringify({hit,paused}));
  await page.locator('#save').click();await page.waitForFunction(()=>document.body.innerText.includes('espera a que termine la caída física'),null,{timeout:30000});
  await page.locator('#resume').click();await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa();return !q.pauses.includes('menu')&&q.status.saveAvailable||q.status.fault;},null,{timeout:90000});
  const ready=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(ready.status.fault)throw Error('Worker failed before safe save: '+JSON.stringify(ready));
  await page.locator('#menuButton').click();await page.waitForFunction(()=>window.wildGuardiansWorkerQa().pauses.includes('menu'),null,{timeout:30000});
  const before=await page.evaluate(()=>window.wildGuardiansWorkerQa());await page.locator('#save').click();
  await page.waitForFunction(async({slot,elapsed})=>{try{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js');const value=await new BrowserSaveRepository(localStorage).load(slot);return value?.elapsed>=elapsed&&Array.isArray(value.workerRaidWaitBindings);}catch{return false;}},{slot:before.slotId,elapsed:before.elapsed},{timeout:30000});
  saved={elapsed:before.elapsed,physicsBlocked:true,safeCheckpointStored:true};await page.locator('#resume').click();
 }
 let completed=null;if(process.argv.includes('--complete')){
  for(let i=0;i<12;i++){
   await page.waitForTimeout(15000);const q=await page.evaluate(()=>window.wildGuardiansWorkerQa());console.log('RAID',JSON.stringify({elapsed:q.elapsed,time:q.time,animals:q.animals,sequence:q.status?.confirmedSequence,fault:q.status?.fault}));
   if(q.status?.fault||errors.length)throw Error('Raid failed: '+JSON.stringify({q,errors}));if(!q.animals&&q.events.includes('RaidEnded')){completed=q;break;}
  }
  if(!completed)throw Error('Raid did not complete within the test window: '+JSON.stringify(await page.evaluate(()=>window.wildGuardiansWorkerQa())));
 }
 console.log(JSON.stringify({animals:hit.animals,initialElapsed:start.qa.elapsed,finalElapsed:(completed??hit).elapsed,readyActors:end.visibility.actors.filter(a=>a.ready).length,sequence:(completed??hit).status.confirmedSequence,attacked:target.id,completed:!!completed,saved,scope:'Opt-in real game using a day-31 savanna capture and a real pointer attack; no active-physics restore, full deterministic comparison or performance comparison.'}));
}finally{await browser.close();}
