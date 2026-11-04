import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-worker-start&qa-visibility&qa-seed=712&wildEngineThreads=0${process.env.QA_CLOCK==='1'?'&qa-worker-clock':''}${process.env.QA_GUARDIAN_WEBGPU==='1'?'&qa-guardian-webgpu-worker':process.env.QA_GUARDIAN_WORKER==='1'?'&qa-guardian-3d-worker':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q?.status?.running||document.querySelector('.error-banner');},null,{timeout:180000});
 const initial=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),failure:document.querySelector('.error-banner')?.textContent}));
 if(initial.failure||!initial.qa.status?.running)throw Error('Worker game did not start: '+JSON.stringify(initial));
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().elapsed>0,null,{timeout:30000});
 await page.locator('#menuButton').click();
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().pauses.includes('menu'),null,{timeout:30000});
 const paused=await page.evaluate(()=>window.wildGuardiansWorkerQa());await page.waitForTimeout(600);
 const still=await page.evaluate(()=>window.wildGuardiansWorkerQa());
 if(still.elapsed!==paused.elapsed)throw Error('Simulation advanced while menu was open');
 await page.locator('#resume').click();try{await page.waitForFunction(t=>{const q=window.wildGuardiansWorkerQa();return !q.pauses.includes('menu')&&(q.elapsed>t||q.pauses.includes('tutorial-action'));},still.elapsed,{timeout:30000});}catch{throw Error('Resume not observed: '+JSON.stringify(await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),text:document.body.innerText.slice(-800)})))+' errors='+JSON.stringify(errors));}
 const resumed=await page.evaluate(()=>window.wildGuardiansWorkerQa());
 if(resumed.status.fault||errors.length)throw Error(JSON.stringify({fault:resumed.status.fault,errors}));
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().tutorial?.step==='center',null,{timeout:60000});
 await page.locator('[data-menu="build"]').click();await page.locator('#native-center').click();
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().guide?.target==='center-site',null,{timeout:30000});
 const guidePoint=()=>page.evaluate(async()=>{const q=window.wildGuardiansWorkerQa(),v=window.wildGuardiansVisibilityQa(),{Vector3,Matrix4}=await import('/node_modules/three/build/three.module.js');const p=new Vector3(...q.guide.position).applyMatrix4(new Matrix4().fromArray(v.camera.inverse)).applyMatrix4(new Matrix4().fromArray(v.camera.projection)),r=v.camera.canvas;return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 const point=await guidePoint();
 await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>window.wildGuardiansWorkerQa().centers===1,null,{timeout:30000});
 const built=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(built.status.fault||errors.length)throw Error(JSON.stringify({fault:built.status.fault,errors}));
 await page.locator('[data-menu="grow"]').click();await page.locator('[data-crop="mijo"]').click();
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().guide?.target==='plant-site',null,{timeout:30000});const seed=await guidePoint();await page.mouse.click(seed.x,seed.y);
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().plants===1,null,{timeout:30000});
 const planted=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(planted.status.fault||errors.length)throw Error(JSON.stringify({fault:planted.status.fault,errors}));
 await page.locator('#hiring-dialog').waitFor({state:'visible',timeout:30000});await page.locator('[data-crew-step="0"][data-delta="1"]').click();await page.locator('#hireConfirm').click();
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().workers===1,null,{timeout:30000});
 const hired=await page.evaluate(()=>window.wildGuardiansWorkerQa());if(hired.status.fault||errors.length)throw Error(JSON.stringify({fault:hired.status.fault,errors}));
 let guardianWorker=null;if(process.env.QA_GUARDIAN_WEBGPU==='1'){guardianWorker={live:page.workers().some(worker=>worker.url().includes('guardian-3d-worker.js')),backend:await page.locator('#guardian-root').getAttribute('data-guardian-backend'),transferred:await page.evaluate(()=>{try{document.querySelector('#guardian-avatar').transferControlToOffscreen();return false;}catch(error){return error.name==='InvalidStateError';}})};if(!guardianWorker.live||!guardianWorker.transferred||guardianWorker.backend!=='webgpu-worker')throw Error('Guardian Worker failed: '+JSON.stringify(guardianWorker));}
 console.log(JSON.stringify({initial:initial.qa.elapsed,paused:paused.elapsed,resumed:resumed.elapsed,sequence:hired.status.confirmedSequence,tutorial:hired.tutorial.step,centers:hired.centers,plants:hired.plants,workers:hired.workers,guardianWorker,scope:'Opt-in development startup in the real game, new savanna world, Worker tutorial, pause menu, center, crop and hiring through the UI; no raid, saved restore or performance comparison.'}));
}finally{await browser.close();}
