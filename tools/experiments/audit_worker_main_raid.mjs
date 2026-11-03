import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-raid&qa-visibility&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game'||document.querySelector('.error-banner'),null,{timeout:180000});
 console.log('STARTUP',JSON.stringify(await page.evaluate(()=>window.wildGuardiansWorkerQa())));
 try{await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.animals>0||q?.status?.fault||document.querySelector('.error-banner');},null,{timeout:60000});}
 catch(error){throw Error('Raid startup timed out: '+JSON.stringify(await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa?.(),text:document.body.innerText.slice(0,500)})))+'; page errors: '+JSON.stringify(errors));}
 const start=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),failure:document.querySelector('.error-banner')?.textContent}));
 if(start.failure||start.qa.status?.fault||!start.qa.animals)throw Error('Worker raid did not start: '+JSON.stringify(start));
 await page.waitForTimeout(4000);const end=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),visibility:window.wildGuardiansVisibilityQa()}));
 if(end.qa.status?.fault||end.qa.elapsed<=start.qa.elapsed||errors.length)throw Error('Worker raid failed: '+JSON.stringify({start,end,errors}));
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();
 let target=null;for(let attempt=0;attempt<20&&!target;attempt++){
  target=await page.evaluate(async()=>{const v=window.wildGuardiansVisibilityQa(),{Vector3,Matrix4}=await import('/node_modules/three/build/three.module.js'),r=v.camera.canvas;
   for(const actor of v.actors.filter(a=>a.ready&&a.visible&&a.position)){const p=new Vector3(...actor.position);p.y+=.6;p.applyMatrix4(new Matrix4().fromArray(v.camera.inverse)).applyMatrix4(new Matrix4().fromArray(v.camera.projection));const cx=r.left+(p.x+1)*r.width/2,cy=r.top+(1-p.y)*r.height/2;for(let radius=0;radius<=70;radius+=5)for(let dy=-radius;dy<=radius;dy+=5)for(let dx=-radius;dx<=radius;dx+=5){const x=cx+dx,y=cy+dy;if(x<r.left||y<r.top||x>=r.right||y>=r.bottom||document.elementFromPoint(x,y)?.id!=='world')continue;if(window.wildGuardiansWorkerPickQa(x,y)===actor.id)return {x,y,id:actor.id};}}return null;});
  if(!target)await page.waitForTimeout(500);
 }
 if(!target)throw Error('No visible clickable animal');await page.mouse.click(target.x,target.y);
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa();return q.events.includes('GuardianMagicHit')||q.status?.fault;},null,{timeout:60000});
 const hit=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(hit.status?.fault||!hit.events.includes('GuardianMagicHit')||errors.length)throw Error('Attack failed: '+JSON.stringify({hit,errors}));
 console.log(JSON.stringify({animals:hit.animals,initialElapsed:start.qa.elapsed,finalElapsed:hit.elapsed,readyActors:end.visibility.actors.filter(a=>a.ready).length,sequence:hit.status.confirmedSequence,attacked:target.id,scope:'Opt-in real game using a day-31 savanna capture: raid starts, and a real pointer attack is confirmed by the Worker. No save/restore, full raid completion or performance comparison.'}));
}finally{await browser.close();}
